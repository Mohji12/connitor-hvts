"""Tests for ward attendant approval email links."""

import uuid
from datetime import timedelta
from unittest.mock import MagicMock, patch

import pytest
from fastapi import HTTPException
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.attendant.approval_link_service import AttendantApprovalLinkService
from app.attendant.pass_service import AttendantPassService
from app.database import Base
from app.models import Branch, HospitalChain, User
from app.models.attendant_entities import Admission, Attendant, Patient
import app.models.attendant_entities  # noqa: F401
import app.models.delivery_entities  # noqa: F401
import app.models.permission_entities  # noqa: F401
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
        street="St",
        city="City",
        state="ST",
        pinCode="000000",
        hospitalChainId=chain.id,
    )
    ward = User(
        id=str(uuid.uuid4()),
        name="Ward Admin",
        phone="9100100021",
        email="ward.admin@test.com",
        role="WARD_ADMIN",
        branchId=branch.id,
        hospitalChainId=chain.id,
        passwordHash=hash_password("Connitor@123"),
        isActive=True,
    )
    session.add_all([chain, branch, ward])
    session.commit()
    yield session
    session.close()


def _seed_pending_attendant(db) -> Attendant:
    branch = db.query(Branch).first()
    patient = Patient(
        id=str(uuid.uuid4()),
        branchId=branch.id,
        mrn="MRN-100",
        firstName="Ravi",
        lastName="Kumar",
        isActive=True,
    )
    admission = Admission(
        id=str(uuid.uuid4()),
        patientId=patient.id,
        branchId=branch.id,
        wardName="ICU",
        roomNumber="101",
        status="ACTIVE",
    )
    attendant = Attendant(
        id=str(uuid.uuid4()),
        admissionId=admission.id,
        branchId=branch.id,
        name="Anita Kumar",
        email="anita@example.com",
        phone="9222002001",
        relationship="Spouse",
        status="PENDING",
    )
    db.add_all([patient, admission, attendant])
    db.commit()
    db.refresh(attendant)
    return attendant


def test_notify_ward_sends_email(db):
    attendant = _seed_pending_attendant(db)
    svc = AttendantApprovalLinkService(db)
    with patch.object(svc.email, "send_ward_attendant_approval_request_email") as send:
        result = svc.notify_ward_admins(attendant)
    assert result["emailsSent"] == 1
    assert result["recipients"] == ["ward.admin@test.com"]
    assert "/approve-attendant?token=" in result["approvalUrl"]
    send.assert_called_once()
    assert attendant.approvalLinkTokenHash is not None


def test_approve_via_link_issues_pass(db):
    attendant = _seed_pending_attendant(db)
    svc = AttendantApprovalLinkService(db)
    with patch.object(svc.email, "send_ward_attendant_approval_request_email"):
        _, url = svc.create_link(attendant)
    token = url.split("token=")[1]

    with patch.object(AttendantPassService, "_email_pass", return_value=True):
        result = svc.approve(token)

    assert result["status"] == "APPROVED"
    refreshed = db.get(Attendant, attendant.id)
    assert refreshed is not None
    assert refreshed.status == "APPROVED"
    assert refreshed.approvalLinkUsedAt is not None
    assert result["pass"] is not None


def test_reject_via_link(db):
    attendant = _seed_pending_attendant(db)
    svc = AttendantApprovalLinkService(db)
    with patch.object(svc.email, "send_ward_attendant_approval_request_email"):
        _, url = svc.create_link(attendant)
    token = url.split("token=")[1]
    result = svc.reject(token, "Not allowed")
    assert result["status"] == "REJECTED"
    refreshed = db.get(Attendant, attendant.id)
    assert refreshed is not None
    assert refreshed.status == "REJECTED"


def test_expired_link_raises(db):
    attendant = _seed_pending_attendant(db)
    svc = AttendantApprovalLinkService(db)
    with patch.object(svc.email, "send_ward_attendant_approval_request_email"):
        _, url = svc.create_link(attendant)
    token = url.split("token=")[1]
    attendant.approvalLinkExpiresAt = now_ist() - timedelta(hours=1)
    db.commit()
    with pytest.raises(HTTPException) as exc:
        svc.get_preview(token)
    assert exc.value.status_code == 410
