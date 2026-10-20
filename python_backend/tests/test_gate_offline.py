"""Offline gate: enrollment, signed manifests, verify, idempotent sync."""

import os
import uuid
from datetime import datetime, timedelta
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.config import clear_settings_cache
from app.database import Base
from app.models import Branch, HospitalChain, Visit, Visitor
from app.models.gate_offline_entities import GateDevice, GateScanEvent
from app.schemas.gate_offline import GateSyncEvent
from app.services.gate_offline_service import (
    GateOfflineService,
    parse_pass_from_qr,
    verify_manifest_signature,
)
import app.models.attendant_entities  # noqa: F401
import app.models.delivery_entities  # noqa: F401
import app.models.gate_offline_entities  # noqa: F401
import app.models.permission_entities  # noqa: F401
import app.models.visitor_account_entities  # noqa: F401


@pytest.fixture()
def db(monkeypatch):
    monkeypatch.setenv("GATE_OFFLINE_ENABLED", "true")
    monkeypatch.setenv("JWT_SECRET", "test-jwt-secret-for-gate")
    clear_settings_cache()
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(bind=engine)
    Session = sessionmaker(bind=engine)
    session = Session()
    chain = HospitalChain(
        id=str(uuid.uuid4()),
        name="Gate Chain",
        phone="9111111111",
        email="gate-chain@test.com",
        street="St",
        city="City",
        state="ST",
        pinCode="000000",
    )
    branch = Branch(
        id=str(uuid.uuid4()),
        name="Gate Branch",
        email="gate-branch@test.com",
        phone="9111111112",
        street="St",
        city="City",
        state="ST",
        pinCode="000000",
        hospitalChainId=chain.id,
    )
    visitor = Visitor(
        id=str(uuid.uuid4()),
        firstName="Asha",
        lastName="Rao",
        phone="9888888888",
        branchId=branch.id,
    )
    visit = Visit(
        id=str(uuid.uuid4()),
        status="APPROVED",
        visitorId=visitor.id,
        branchId=branch.id,
        appointmentMode="IN_PERSON",
        appointmentDate=datetime.utcnow(),
        checkInOtpExpiry=datetime.utcnow() + timedelta(hours=6),
        entryQrPayload='{"t":"entry","v":"will-set"}',
    )
    visit.entryQrPayload = f'{{"t":"entry","v":"{visit.id}","j":"{uuid.uuid4()}"}}'
    visit.visitQRCode = visit.entryQrPayload
    session.add_all([chain, branch, visitor, visit])
    session.commit()
    yield session
    session.close()
    os.environ.pop("GATE_OFFLINE_ENABLED", None)
    clear_settings_cache()


def _admin(db) -> dict:
    branch = db.query(Branch).first()
    return {"id": str(uuid.uuid4()), "role": "HOSPITAL_ADMIN", "branchId": branch.id}


def _security(db) -> dict:
    branch = db.query(Branch).first()
    return {"id": str(uuid.uuid4()), "role": "SECURITY", "branchId": branch.id}


def test_parse_qr_formats():
    visit_id = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"
    assert parse_pass_from_qr(f'{{"t":"entry","v":"{visit_id}","j":"x"}}') == (visit_id, "visitor")
    assert parse_pass_from_qr('{"qrPayload":"PASS:pid:aid:ts","signature":"sig"}')[1] == "attendant"
    delivery_id = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb"
    assert parse_pass_from_qr(f'{{"qrPayload":"{delivery_id}:DN-1:ts","signature":"sig"}}')[0] == delivery_id


def test_register_and_signed_manifest(db):
    admin = _admin(db)
    enrolled = GateOfflineService(db).register_device(admin, "Lobby phone", None, None, True)
    device = db.query(GateDevice).filter(GateDevice.devicePublicId == enrolled["devicePublicId"]).one()
    device.offlineEnabled = True
    db.commit()

    auth = GateOfflineService(db).authenticate_device(enrolled["devicePublicId"], enrolled["deviceSecret"])
    manifest = GateOfflineService(db).build_manifest(auth)
    assert verify_manifest_signature(manifest) is True
    assert any(p["passType"] == "visitor" for p in manifest["passes"])
    tampered = {**manifest, "passes": []}
    assert verify_manifest_signature(tampered) is False


def test_revoked_device_cannot_auth(db):
    admin = _admin(db)
    enrolled = GateOfflineService(db).register_device(admin, "Old phone", None, None, False)
    GateOfflineService(db).revoke_device(admin, enrolled["id"])
    with pytest.raises(Exception) as exc:
        GateOfflineService(db).authenticate_device(enrolled["devicePublicId"], enrolled["deviceSecret"])
    assert "REVOKED" in str(exc.value.detail)


def test_online_verify_accepts_approved_visit(db):
    visit = db.query(Visit).first()
    result = GateOfflineService(db).verify_online(_security(db), visit.entryQrPayload)
    assert result["decision"] == "ACCEPT"
    assert result["passId"] == visit.id


def test_sync_is_idempotent_and_conflicts(db):
    admin = _admin(db)
    first = GateOfflineService(db).register_device(admin, "Gate A", None, None, True)
    second = GateOfflineService(db).register_device(admin, "Gate B", None, None, True)
    device_a = db.get(GateDevice, first["id"])
    device_b = db.get(GateDevice, second["id"])
    device_a.offlineEnabled = True
    device_b.offlineEnabled = True
    db.commit()
    visit = db.query(Visit).first()
    occurred = datetime.utcnow()
    event = GateSyncEvent(
        eventId="evt-1-aaaaaaaa",
        passId=visit.id,
        passType="visitor",
        eventType="ACCEPT",
        reasonCode="OFFLINE_OK",
        occurredAt=occurred,
        decisionMode="OFFLINE",
    )
    once = GateOfflineService(db).sync_events(device_a, [event], None)
    assert once["results"][0]["result"] == "ACCEPTED"
    twice = GateOfflineService(db).sync_events(device_a, [event], None)
    assert twice["results"][0]["result"] == "DUPLICATE"

    other = GateSyncEvent(
        eventId="evt-2-bbbbbbbb",
        passId=visit.id,
        passType="visitor",
        eventType="ACCEPT",
        reasonCode="OFFLINE_OK",
        occurredAt=occurred,
        decisionMode="OFFLINE",
    )
    conflict = GateOfflineService(db).sync_events(device_b, [other], None)
    assert conflict["results"][0]["result"] == "CONFLICT"
    assert db.query(GateScanEvent).count() == 2


def test_replayed_previous_manifest_signature_still_verifies_but_expiry_is_separate(db):
    admin = _admin(db)
    enrolled = GateOfflineService(db).register_device(admin, "Gate", None, None, True)
    device = db.get(GateDevice, enrolled["id"])
    device.offlineEnabled = True
    db.commit()
    manifest = GateOfflineService(db).build_manifest(device)
    assert verify_manifest_signature(manifest) is True
    expired = {**manifest, "expiresAt": "2000-01-01T00:00:00"}
    # Signature covers expiry; changing it without resigning fails.
    assert verify_manifest_signature(expired) is False
