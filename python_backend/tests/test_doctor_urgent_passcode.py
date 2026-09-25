"""Tests for doctor urgent entry passcodes (gate verify → book → dual QR)."""

import uuid
from datetime import timedelta
from unittest.mock import patch

import pytest
from fastapi import HTTPException
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import Base
from app.models import Branch, Department, DoctorUrgentPasscode, HospitalChain, SubDepartment, User, Visit
from app.models.enums import ProfileStatus, VisitStatus
from app.models.visitor_account_entities import VisitorAccount
from app.services.doctor_urgent_passcode_service import DoctorUrgentPasscodeService
from app.services.gate_pass_service import GatePassService
from app.services.visitors_service import VisitorsService
import app.models.attendant_entities  # noqa: F401
import app.models.permission_entities  # noqa: F401
import app.models.delivery_entities  # noqa: F401
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
        name="Chain",
        phone="9000000000",
        email="c@test.com",
        street="St",
        city="City",
        state="ST",
        pinCode="000000",
    )
    branch = Branch(
        id=str(uuid.uuid4()),
        name="Branch",
        email="b@test.com",
        phone="9000000001",
        street="St",
        city="City",
        state="ST",
        pinCode="000000",
        hospitalChainId=chain.id,
    )
    dept = Department(
        id=str(uuid.uuid4()),
        name="Medicine",
        code="MED",
        branchId=branch.id,
        hospitalChainId=chain.id,
    )
    sub = SubDepartment(
        id=str(uuid.uuid4()),
        name="OPD",
        code="OPD",
        departmentId=dept.id,
        branchId=branch.id,
        hospitalChainId=chain.id,
    )
    doctor = User(
        id=str(uuid.uuid4()),
        name="Dr Test",
        phone="9111111111",
        email="dr@test.com",
        role="STAFF",
        userType="DOCTOR",
        branchId=branch.id,
        departmentId=dept.id,
        subDepartmentId=sub.id,
        isActive=True,
    )
    security = User(
        id=str(uuid.uuid4()),
        name="Security",
        phone="9222222222",
        email="sec@test.com",
        role="SECURITY",
        branchId=branch.id,
        isActive=True,
    )
    account = VisitorAccount(
        id=str(uuid.uuid4()),
        firstName="Ravi",
        lastName="Kumar",
        email="ravi@test.com",
        phone="9876543210",
        profileStatus=ProfileStatus.ACTIVE.value,
        phoneVerified=True,
        emailVerified=True,
    )
    session.add_all([chain, branch, dept, sub, doctor, security, account])
    session.commit()
    yield session
    session.close()


def test_issue_and_list(db):
    doctor = db.query(User).filter(User.role == "STAFF").first()
    svc = DoctorUrgentPasscodeService(db)
    issued = svc.issue({"id": doctor.id, "role": "STAFF"}, note="Urgent")
    assert len(issued["code"]) == 6
    assert issued["status"] == "ACTIVE"
    listed = svc.list_for_staff({"id": doctor.id, "role": "STAFF"})
    assert len(listed["items"]) == 1


def test_confirm_verify_and_auto_book(db):
    doctor = db.query(User).filter(User.role == "STAFF").first()
    security = db.query(User).filter(User.role == "SECURITY").first()
    account = db.query(VisitorAccount).first()
    svc = DoctorUrgentPasscodeService(db)
    issued = svc.issue({"id": doctor.id, "role": "STAFF"})
    code = issued["code"]
    sec_user = {"id": security.id, "role": "SECURITY", "branchId": security.branchId}

    preview = svc.verify(sec_user, code)
    assert preview["host"]["name"] == "Dr Test"

    handoff = svc.confirm_verify(sec_user, code)
    assert handoff["status"] == "VERIFIED"
    assert handoff["gateToken"]
    assert "/visitor/urgent/" in handoff["registerUrl"]
    row = db.query(DoctorUrgentPasscode).filter(DoctorUrgentPasscode.code == code).one()
    assert row.status == "VERIFIED"

    session = svc.get_gate_session(handoff["gateToken"])
    assert session["host"]["id"] == doctor.id

    from app.models.enums import Role
    from app.services.visitor_pass_service import VisitorPassService

    VisitorPassService(db).issue_pool(
        {"id": doctor.id, "role": Role.HOSPITAL_ADMIN.value, "branchId": doctor.branchId},
        doctor.branchId,
        count=5,
    )

    with patch.object(svc.notifications, "notify_visitor_booking_received"):
        booked = svc.book_with_gate_token(
            {"accountId": account.id},
            token=handoff["gateToken"],
        )
    assert booked["status"] == VisitStatus.APPROVED.value
    assert booked["entryQrPayload"]
    assert booked["exitQrPayload"]
    visit = db.get(Visit, booked["visitId"])
    assert visit.visitSubType == "URGENT_PASSCODE"
    assert visit.entryQrPayload.startswith("{")
    row = db.query(DoctorUrgentPasscode).filter(DoctorUrgentPasscode.code == code).one()
    assert row.status == "REDEEMED"

    with pytest.raises(HTTPException) as ctx:
        svc.verify(sec_user, code)
    assert ctx.value.detail == "PASSCODE_ALREADY_USED"

    # Entry → check-in, Exit → checkout
    gate = GatePassService(db)
    entry_scan = gate.scan_check_in_qr(visit.entryQrPayload, sec_user)
    assert entry_scan["canCheckIn"] is True
    assert entry_scan["qrType"] == "entry"

    VisitorsService(db).check_in_visitor(visit.id, sec_user)
    db.refresh(visit)
    assert visit.status == VisitStatus.CHECKED_IN.value
    assert visit.checkInTime is not None

    exit_scan = gate.scan_check_in_qr(visit.exitQrPayload, sec_user)
    assert exit_scan["canCheckOut"] is True
    assert exit_scan["qrType"] == "exit"

    VisitorsService(db).checkout(visit.id, sec_user)
    db.refresh(visit)
    assert visit.status == VisitStatus.CHECKED_OUT.value
    assert visit.checkOutTime is not None


def test_redeem_disabled(db):
    doctor = db.query(User).filter(User.role == "STAFF").first()
    security = db.query(User).filter(User.role == "SECURITY").first()
    svc = DoctorUrgentPasscodeService(db)
    issued = svc.issue({"id": doctor.id, "role": "STAFF"})
    with pytest.raises(HTTPException) as ctx:
        svc.redeem(
            {"id": security.id, "role": "SECURITY", "branchId": security.branchId},
            code=issued["code"],
            first_name="Ravi",
            last_name="Kumar",
            email="ravi@test.com",
            phone="9876543210",
            reason="Urgent consultation",
        )
    assert "register and book" in str(ctx.value.detail).lower()


def test_expired_passcode(db):
    doctor = db.query(User).filter(User.role == "STAFF").first()
    security = db.query(User).filter(User.role == "SECURITY").first()
    row = DoctorUrgentPasscode(
        code="123456",
        branchId=doctor.branchId,
        staffId=doctor.id,
        status="ACTIVE",
        expiresAt=now_ist() - timedelta(hours=1),
        createdById=doctor.id,
    )
    db.add(row)
    db.commit()
    svc = DoctorUrgentPasscodeService(db)
    with pytest.raises(HTTPException) as ctx:
        svc.verify(
            {"id": security.id, "role": "SECURITY", "branchId": security.branchId},
            "123456",
        )
    assert ctx.value.detail == "PASSCODE_EXPIRED"


def test_revoke(db):
    doctor = db.query(User).filter(User.role == "STAFF").first()
    svc = DoctorUrgentPasscodeService(db)
    issued = svc.issue({"id": doctor.id, "role": "STAFF"})
    svc.revoke({"id": doctor.id, "role": "STAFF"}, issued["id"])
    row = db.get(DoctorUrgentPasscode, issued["id"])
    assert row.status == "REVOKED"


def test_issue_with_metadata_and_update(db):
    doctor = db.query(User).filter(User.role == "STAFF").first()
    svc = DoctorUrgentPasscodeService(db)
    issued = svc.issue(
        {"id": doctor.id, "role": "STAFF"},
        note="Gate note",
        purpose="Lab review",
        theme="Follow-up",
        visit_time="2026-08-01T10:30:00",
        recipient_name="Ravi",
        recipient_phone="9876543210",
        recipient_email="ravi@test.com",
    )
    assert issued["purpose"] == "Lab review"
    assert issued["theme"] == "Follow-up"
    assert issued["recipientName"] == "Ravi"

    updated = svc.update(
        {"id": doctor.id, "role": "STAFF"},
        issued["id"],
        purpose="Updated purpose",
        theme="Emergency",
        visit_time="2026-08-01T11:00:00",
        recipient_name="Ravi Kumar",
        recipient_phone="9876543210",
        recipient_email="ravi@test.com",
        note="Updated note",
    )
    assert updated["purpose"] == "Updated purpose"
    assert updated["theme"] == "Emergency"


def test_share_sms_and_email(db):
    doctor = db.query(User).filter(User.role == "STAFF").first()
    svc = DoctorUrgentPasscodeService(db)
    issued = svc.issue(
        {"id": doctor.id, "role": "STAFF"},
        purpose="Urgent consult",
        theme="Consultation",
    )
    with patch.object(svc.sms, "send_sms_only") as sms_mock, patch.object(
        svc.email, "send_notification"
    ) as email_mock:
        result = svc.share(
            {"id": doctor.id, "role": "STAFF"},
            issued["id"],
            channels=["sms", "email"],
            recipient_name="Anita",
            phone="9876543210",
            email="anita@test.com",
        )
    assert set(result["sent"]) == {"sms", "email"}
    sms_mock.assert_called_once()
    email_mock.assert_called_once()
