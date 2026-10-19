"""Primary attendant WhatsApp Confirm/Reject for secondary visitor passes."""

import uuid
from datetime import datetime
from unittest.mock import patch

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.attendant.pass_service import AttendantPassService
from app.database import Base
from app.models import Branch, HospitalChain
from app.models.attendant_entities import Admission, Attendant, Patient
import app.models.attendant_entities  # noqa: F401
import app.models.delivery_entities  # noqa: F401
import app.models.permission_entities  # noqa: F401
from app.services.attendant_approval_reply_service import (
    AttendantApprovalReplyService,
    parse_attendant_button_reply,
)
from app.services.messaging_service import EmailService
from app.services.wapblaster_webhook_service import WapBlasterWebhookService


@pytest.fixture()
def db():
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
        name="Test Chain",
        phone="9000000000",
        email="chain@test.com",
        street="St",
        city="City",
        state="ST",
        pinCode="000000",
    )
    branch = Branch(
        id=str(uuid.uuid4()),
        name="Test Hospital",
        email="branch@test.com",
        phone="9000000001",
        street="1 Hospital Rd",
        city="City",
        state="ST",
        pinCode="000000",
        hospitalChainId=chain.id,
    )
    session.add_all([chain, branch])
    session.commit()
    yield session
    session.close()


@pytest.fixture(autouse=True)
def _patch_whatsapp():
    with patch(
        "app.attendant.pass_service.AttendantPassService._send_attendant_pass_whatsapp",
        return_value=False,
    ), patch(
        "app.attendant.pass_service.AttendantPassService._send_primary_approval_whatsapp",
        return_value=True,
    ):
        yield


def _seed_pending_visitor(db) -> tuple[Attendant, Attendant]:
    branch = db.query(Branch).first()
    patient = Patient(
        branchId=branch.id,
        mrn="MRN-A1",
        firstName="Ravi",
        lastName="Kumar",
    )
    db.add(patient)
    db.flush()
    admission = Admission(
        patientId=patient.id,
        branchId=branch.id,
        wardName="ICU",
        department="Paediatrics",
        status="ACTIVE",
    )
    db.add(admission)
    db.commit()
    db.refresh(admission)

    svc = AttendantPassService(db)
    user = {"id": str(uuid.uuid4()), "role": "WARD_ADMIN", "branchId": branch.id}
    primary_data = svc.register_attendant(
        user,
        {
            "admissionId": admission.id,
            "name": "Primary Carer",
            "email": "primary@example.com",
            "phone": "9000111222",
            "attendantKind": "FIXED",
        },
    )
    svc.approve_attendant(user, primary_data["id"])
    primary = db.get(Attendant, primary_data["id"])

    noon = datetime(2026, 10, 6, 12, 0, 0)
    with patch("app.attendant.pass_service.now_ist", return_value=noon):
        pending = svc.public_apply(
            {
                "admissionId": admission.id,
                "name": "Anita",
                "email": "anita@example.com",
                "phone": "9222222222",
                "relationship": "Sister",
            }
        )
    visitor = db.get(Attendant, pending["attendantId"])
    assert primary is not None and visitor is not None
    return primary, visitor


def test_parse_attok_attno():
    assert parse_attendant_button_reply("attok_482901") == ("approve", "482901")
    assert parse_attendant_button_reply("attno_482901") == ("reject", "482901")
    assert parse_attendant_button_reply("confirm_482901") is None


def test_attok_button_issues_pass(db):
    primary, visitor = _seed_pending_visitor(db)
    svc = AttendantApprovalReplyService(db)
    with patch(
        "app.attendant.pass_service.now_ist", return_value=datetime(2026, 10, 6, 12, 30, 0)
    ), patch.object(EmailService, "send_attendant_pass_email"):
        reply = svc.handle_button_reply(
            from_phone=primary.phone,
            button_id=f"attok_{visitor.smsApprovalCode}",
        )
    assert "Approved" in reply
    db.refresh(visitor)
    assert visitor.status == "APPROVED"


def test_attno_button_rejects(db):
    primary, visitor = _seed_pending_visitor(db)
    svc = AttendantApprovalReplyService(db)
    reply = svc.handle_button_reply(
        from_phone=primary.phone,
        button_id=f"attno_{visitor.smsApprovalCode}",
    )
    assert "Rejected" in reply
    db.refresh(visitor)
    assert visitor.status == "REJECTED"


def test_webhook_routes_attok(db):
    primary, visitor = _seed_pending_visitor(db)
    webhook = WapBlasterWebhookService(db)
    with patch.object(webhook, "_reply_sender"), patch(
        "app.attendant.pass_service.now_ist", return_value=datetime(2026, 10, 6, 12, 30, 0)
    ), patch.object(EmailService, "send_attendant_pass_email"):
        result = webhook.handle_payload(
            {
                "from": primary.phone,
                "button_id": f"attok_{visitor.smsApprovalCode}",
                "body": "Confirm",
            }
        )
    assert result["handled"] == 1
    assert "Approved" in result["message"]
