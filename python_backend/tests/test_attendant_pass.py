"""Tests for attendant visit pass lifecycle."""

import uuid
from datetime import datetime, timedelta
from io import BytesIO
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi import UploadFile
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.attendant.pass_service import AttendantPassService
from app.database import Base
from app.email_templates import build_attendant_pass_email
from app.models import Branch, HospitalChain, User
from app.models.attendant_entities import Admission, Attendant, AttendantPass, Patient
import app.models.attendant_entities  # noqa: F401
import app.models.delivery_entities  # noqa: F401
import app.models.permission_entities  # noqa: F401
from app.services.messaging_service import ATTENDANT_PASS_QR_CID, EmailService
from app.utils.passwords import hash_password
from app.utils.timezone import now_ist


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


def _ward_user(branch_id: str) -> dict:
    return {"id": str(uuid.uuid4()), "role": "WARD_ADMIN", "branchId": branch_id}


def _seed_admission(db, branch_id: str) -> Admission:
    patient = Patient(
        branchId=branch_id,
        mrn="MRN-100",
        firstName="Ravi",
        lastName="Kumar",
        phone="9111111111",
    )
    db.add(patient)
    db.flush()
    admission = Admission(
        patientId=patient.id,
        branchId=branch_id,
        wardName="ICU",
        roomNumber="12",
        bedNumber="1",
        status="ACTIVE",
    )
    db.add(admission)
    db.commit()
    db.refresh(admission)
    return admission


def test_public_apply_creates_pending(db):
    branch = db.query(Branch).first()
    admission = _seed_admission(db, branch.id)
    with patch("app.attendant.approval_link_service.AttendantApprovalLinkService.notify_ward_admins") as notify:
        notify.return_value = {"approvalUrl": "http://example/x", "emailsSent": 0, "recipients": []}
        result = AttendantPassService(db).public_apply(
            {
                "admissionId": admission.id,
                "name": "Anita",
                "email": "anita@example.com",
                "phone": "9222222222",
                "relationship": "Sister",
            }
        )
    assert result["status"] == "PENDING"
    assert result["email"] == "anita@example.com"


def test_one_active_pass_rule(db):
    branch = db.query(Branch).first()
    admission = _seed_admission(db, branch.id)
    svc = AttendantPassService(db)
    user = _ward_user(branch.id)

    a1 = svc.register_attendant(
        user,
        {
            "admissionId": admission.id,
            "name": "Visitor One",
            "email": "v1@example.com",
            "phone": "9333333333",
        },
    )
    svc.approve_attendant(user, a1["id"])

    with patch.object(EmailService, "send_attendant_pass_email"):
        first = svc.issue_pass(user, a1["id"])
    assert first["status"] == "ACTIVE"

    a2 = svc.register_attendant(
        user,
        {
            "admissionId": admission.id,
            "name": "Visitor Two",
            "email": "v2@example.com",
            "phone": "9444444444",
        },
    )
    svc.approve_attendant(user, a2["id"])

    with pytest.raises(Exception) as exc:
        with patch.object(EmailService, "send_attendant_pass_email"):
            svc.issue_pass(user, a2["id"], revoke_existing=False)
    assert "ACTIVE pass already exists" in str(exc.value.detail)

    with patch.object(EmailService, "send_attendant_pass_email"):
        second = svc.issue_pass(user, a2["id"], revoke_existing=True)
    assert second["status"] == "ACTIVE"
    old = db.get(AttendantPass, first["id"])
    assert old.status == "REVOKED"


def test_qr_signature_and_expiry_reject(db):
    branch = db.query(Branch).first()
    admission = _seed_admission(db, branch.id)
    svc = AttendantPassService(db)
    user = _ward_user(branch.id)
    att = svc.register_attendant(
        user,
        {
            "admissionId": admission.id,
            "name": "Visitor",
            "email": "v@example.com",
            "phone": "9555555555",
        },
    )
    svc.approve_attendant(user, att["id"])
    with patch.object(EmailService, "send_attendant_pass_email"):
        issued = svc.issue_pass(user, att["id"])

    pass_row = db.get(AttendantPass, issued["id"])
    assert pass_row.qrPayload
    assert pass_row.qrSignature
    assert pass_row.qrSignature == svc._sign_payload(pass_row.qrPayload)

    pass_row.expiresAt = now_ist() - timedelta(hours=1)
    db.commit()

    upload = UploadFile(filename="id.jpg", file=BytesIO(b"fake-image"), headers={"content-type": "image/jpeg"})

    async def _run():
        with patch.object(svc.gcp, "upload_visitor_document", new_callable=AsyncMock) as up:
            up.return_value = "local://id.jpg"
            with pytest.raises(Exception) as exc:
                await svc.scan_pass(
                    {"id": user["id"]},
                    qr_payload=pass_row.qrPayload,
                    signature=pass_row.qrSignature,
                    govt_id_file=upload,
                )
            assert "expired" in str(exc.value.detail).lower()

    import asyncio

    asyncio.get_event_loop().run_until_complete(_run())


@pytest.mark.asyncio
async def test_scan_requires_govt_id_and_stores_url(db):
    branch = db.query(Branch).first()
    admission = _seed_admission(db, branch.id)
    svc = AttendantPassService(db)
    user = _ward_user(branch.id)
    att = svc.register_attendant(
        user,
        {
            "admissionId": admission.id,
            "name": "Visitor",
            "email": "scan@example.com",
            "phone": "9666666666",
        },
    )
    svc.approve_attendant(user, att["id"])
    with patch.object(EmailService, "send_attendant_pass_email"):
        issued = svc.issue_pass(user, att["id"])
    pass_row = db.get(AttendantPass, issued["id"])

    upload = UploadFile(filename="aadhaar.jpg", file=BytesIO(b"\xff\xd8\xff"), headers={"content-type": "image/jpeg"})
    with (
        patch.object(svc.gcp, "upload_visitor_document", new_callable=AsyncMock) as up,
        patch("app.attendant.pass_service.now_ist", return_value=datetime(2026, 7, 22, 12, 0, 0)),
        patch.object(EmailService, "send_attendant_checkout_qr_email"),
    ):
        up.return_value = "local://attendant-govt-id/aadhaar.jpg"
        result = await svc.scan_pass(
            {"id": user["id"]},
            qr_payload=pass_row.qrPayload,
            signature=pass_row.qrSignature,
            govt_id_file=upload,
            govt_id_type="Aadhaar",
        )
    assert result["valid"] is True
    assert result["govtIdImageUrl"] == "local://attendant-govt-id/aadhaar.jpg"
    up.assert_awaited_once()


def test_attendant_pass_email_template():
    subject, text, html = build_attendant_pass_email(
        attendant_name="Anita",
        pass_number="AP-2026-000001",
        patient_first_name="Ravi",
        hospital_name="Test Hospital",
        hospital_address="1 Hospital Rd, City",
        hospital_phone="9000000001",
        valid_until="17 Jul 2026 10:00",
        ward_name="ICU",
        room_number="12",
        qr_cid="attendant-pass-qr",
        qr_expires_at="17 Jul 2026 10:00",
    )
    assert "AP-2026-000001" in subject
    assert "1 Hospital Rd" in text
    assert "government id" in text.lower()
    assert 'src="cid:attendant-pass-qr"' in html
    assert "ICU" in html


def test_send_attendant_pass_email_embeds_qr():
    with patch.object(EmailService, "_deliver_email") as mock_deliver:
        EmailService().send_attendant_pass_email(
            "anita@example.com",
            attendant_name="Anita",
            pass_number="AP-1",
            patient_first_name="Ravi",
            hospital_name="Hospital",
            hospital_address="Addr",
            hospital_phone="900",
            valid_until="17 Jul 2026 10:00",
            ward_name="Ward A",
            room_number="1",
            qr_payload="PASS:1:2:ts",
            qr_signature="sig",
            qr_expires_at="17 Jul 2026 10:00",
        )
        mock_deliver.assert_called_once()
        inline = mock_deliver.call_args.kwargs.get("inline_images")
        assert inline[0][0] == ATTENDANT_PASS_QR_CID
        assert inline[0][1].startswith(b"\x89PNG")


def test_lookup_by_mrn(db):
    branch = db.query(Branch).first()
    _seed_admission(db, branch.id)
    result = AttendantPassService(db).lookup_admission_by_mrn(branch.id, "MRN-100")
    assert result["patientFirstName"] == "Ravi"
    assert result["hasActivePass"] is False


def test_list_public_branches(db):
    branch = db.query(Branch).first()
    rows = AttendantPassService(db).list_public_branches()
    assert len(rows) == 1
    assert rows[0]["id"] == branch.id
    assert rows[0]["name"] == branch.name
    assert rows[0]["hospitalChainName"] == "Test Chain"


def test_search_admissions_by_name(db):
    branch = db.query(Branch).first()
    _seed_admission(db, branch.id)
    rows = AttendantPassService(db).search_admissions_by_name(branch.id, "ravi")
    assert len(rows["items"]) == 1
    assert rows["items"][0]["patientFirstName"] == "Ravi"
    assert rows["items"][0]["mrn"] == "MRN-100"


@pytest.mark.asyncio
async def test_entry_exit_duration_and_inside_block(db):
    branch = db.query(Branch).first()
    admission = _seed_admission(db, branch.id)
    svc = AttendantPassService(db)
    user = _ward_user(branch.id)
    security = {"id": str(uuid.uuid4()), "role": "SECURITY", "branchId": branch.id}

    att = svc.register_attendant(
        user,
        {
            "admissionId": admission.id,
            "name": "Inside Visitor",
            "email": "inside@example.com",
            "phone": "9777777777",
        },
    )
    svc.approve_attendant(user, att["id"])
    with patch.object(EmailService, "send_attendant_pass_email"):
        issued = svc.issue_pass(user, att["id"])
    pass_row = db.get(AttendantPass, issued["id"])

    upload = UploadFile(
        filename="id.jpg",
        file=BytesIO(b"\xff\xd8\xff"),
        headers={"content-type": "image/jpeg"},
    )
    with patch.object(svc.gcp, "upload_visitor_document", new_callable=AsyncMock) as up:
        up.return_value = "local://id.jpg"
        with patch(
            "app.attendant.pass_service.now_ist",
            return_value=datetime(2026, 7, 22, 12, 0, 0),
        ), patch.object(EmailService, "send_attendant_checkout_qr_email"):
            entry = await svc.scan_pass(
                security,
                qr_payload=pass_row.qrPayload,
                signature=pass_row.qrSignature,
                govt_id_file=upload,
                scan_type="ENTRY",
            )
    assert entry["scanType"] == "ENTRY"
    assert entry["isInside"] is True
    assert entry["enteredAt"] is not None
    db.refresh(pass_row)
    assert pass_row.exitQrPayload
    assert pass_row.exitQrSignature
    assert pass_row.exitQrPayload.startswith("PASS-EXIT:")

    lookup = svc.lookup_admission_by_mrn(branch.id, "MRN-100")
    assert lookup["hasAttendantInside"] is True

    with pytest.raises(Exception) as blocked:
        svc.public_apply(
            {
                "admissionId": admission.id,
                "name": "Second Person",
                "email": "second@example.com",
                "phone": "9888888888",
            }
        )
    assert "currently inside" in str(blocked.value.detail).lower()

    # Entry QR while inside must not check out
    with pytest.raises(Exception) as entry_blocked:
        await svc.scan_pass(
            security,
            qr_payload=pass_row.qrPayload,
            signature=pass_row.qrSignature,
            govt_id_file=None,
            scan_type="ENTRY",
        )
    assert "checkout qr" in str(entry_blocked.value.detail).lower()

    with patch.object(svc, "_notify_visit_exit"):
        exit_result = await svc.scan_pass(
            security,
            qr_payload=pass_row.exitQrPayload,
            signature=pass_row.exitQrSignature,
            govt_id_file=None,
            scan_type="EXIT",
        )
    assert exit_result["scanType"] == "EXIT"
    assert exit_result["isInside"] is False
    assert exit_result["durationMinutes"] is not None
    assert exit_result["durationMinutes"] >= 0
    db.refresh(pass_row)
    assert pass_row.status == "USED"
    assert svc._active_pass_for_admission(admission.id) is None

    lookup2 = svc.lookup_admission_by_mrn(branch.id, "MRN-100")
    assert lookup2["hasAttendantInside"] is False

    with patch(
        "app.attendant.approval_link_service.AttendantApprovalLinkService.notify_ward_admins"
    ) as notify:
        notify.return_value = {"emailsSent": 0, "recipients": []}
        again = svc.public_apply(
            {
                "admissionId": admission.id,
                "name": "Second Person",
                "email": "second@example.com",
                "phone": "9888888888",
            }
        )
    assert again["status"] == "PENDING"
