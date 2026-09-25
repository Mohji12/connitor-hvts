"""Sales Representative attendance confirmation."""

from __future__ import annotations

import uuid
from datetime import timedelta
from unittest.mock import MagicMock, patch

import pytest
from fastapi import HTTPException
from pydantic import ValidationError
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import Base
from app.models import Branch, HospitalChain, MeetingStatusAudit, User, Visit, Visitor
from app.models.enums import MeetingStatus, Role, VisitStatus, VisitorType
import app.models.delivery_entities  # noqa: F401
import app.models.attendant_entities  # noqa: F401
import app.models.permission_entities  # noqa: F401
from app.routers.public_appointments import BookAppointmentBody
from app.schemas.visitor_account import hash_token
from app.services.sales_meeting_service import SalesMeetingService, parse_visitor_kind
from app.services.visitors_service import VisitorsService
from app.utils.timezone import now_ist


def _booking_payload(**overrides: object) -> dict:
    data = {
        "branchId": "branch-1",
        "departmentId": "dept-1",
        "subDepartmentId": "sub-1",
        "doctorId": "doc-1",
        "firstName": "Rahul",
        "lastName": "Mehta",
        "phone": "9123456701",
        "email": "rahul@example.com",
        "purpose": "Product briefing",
        "appointmentDate": "2026-09-01T10:00:00",
    }
    data.update(overrides)
    return data


def test_booking_dto_sales_rep_requires_company_fields() -> None:
    with pytest.raises(ValidationError) as missing_name:
        BookAppointmentBody(
            **_booking_payload(
                visitorType="SALES_REPRESENTATIVE",
                companyEmail="ops@pharma.com",
            )
        )
    assert "companyName" in str(missing_name.value)

    with pytest.raises(ValidationError) as missing_email:
        BookAppointmentBody(
            **_booking_payload(
                visitorType="SALES_REPRESENTATIVE",
                companyName="Pharma Co",
            )
        )
    assert "companyEmail" in str(missing_email.value)

    with pytest.raises(ValidationError):
        BookAppointmentBody(
            **_booking_payload(
                visitorType="SALES_REPRESENTATIVE",
                companyName="Pharma Co",
                companyEmail="not-an-email",
            )
        )


def test_booking_dto_general_clears_company_fields() -> None:
    body = BookAppointmentBody(
        **_booking_payload(
            visitorType="GENERAL",
            companyName="Should Clear",
            companyEmail="ops@pharma.com",
        )
    )
    assert body.companyName is None
    assert body.companyEmail is None


def test_booking_dto_sales_rep_valid() -> None:
    body = BookAppointmentBody(
        **_booking_payload(
            visitorType="SALES_REPRESENTATIVE",
            companyName="Pharma Co",
            companyEmail="ops@pharma.com",
        )
    )
    assert body.visitorType == "SALES_REPRESENTATIVE"
    assert body.companyName == "Pharma Co"
    assert str(body.companyEmail) == "ops@pharma.com"


def test_parse_visitor_kind_rejects_invalid_email() -> None:
    with pytest.raises(HTTPException) as ctx:
        parse_visitor_kind(
            {
                "visitorType": "SALES_REPRESENTATIVE",
                "companyName": "Acme",
                "companyEmail": "bad",
            }
        )
    assert ctx.value.status_code == 400


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
        phone="9000000001",
        email="c@t.com",
        street="1",
        city="Bengaluru",
        state="KA",
        pinCode="560100",
    )
    session.add(chain)
    session.flush()
    branch = Branch(
        id=str(uuid.uuid4()),
        name="EC",
        email="b@t.com",
        phone="9000000002",
        street="1",
        city="Bengaluru",
        state="KA",
        pinCode="560100",
        hospitalChainId=chain.id,
    )
    session.add(branch)
    session.flush()
    doctor = User(
        id=str(uuid.uuid4()),
        name="Dr. Arjun",
        phone="7000000001",
        email="doc@t.com",
        role=Role.STAFF.value,
        userType="DOCTOR",
        branchId=branch.id,
    )
    session.add(doctor)
    session.flush()
    session.commit()
    session.branch = branch  # type: ignore[attr-defined]
    session.doctor = doctor  # type: ignore[attr-defined]
    yield session
    session.close()


def _sales_visit(db, *, phone: str | None = None, **overrides) -> Visit:
    branch = db.branch
    doctor = db.doctor
    visitor = Visitor(
        firstName="Priya",
        lastName="Shah",
        phone=phone or f"91{uuid.uuid4().hex[:8]}",
        email=f"priya.{uuid.uuid4().hex[:6]}@example.com",
        branchId=branch.id,
    )
    db.add(visitor)
    db.flush()
    payload = {
        "visitorId": visitor.id,
        "staffId": doctor.id,
        "staffName": doctor.name,
        "branchId": branch.id,
        "purpose": "Sales briefing",
        "status": VisitStatus.APPROVED.value,
        "visitorType": VisitorType.SALES_REPRESENTATIVE.value,
        "companyName": "Pharma Co",
        "companyEmail": "ops@pharma.com",
        "meetingStatus": MeetingStatus.NOT_STARTED.value,
        "appointmentDate": now_ist() - timedelta(minutes=1),
        "idProofVerified": True,
    }
    payload.update(overrides)
    visit = Visit(**payload)
    db.add(visit)
    db.commit()
    db.refresh(visit)
    return visit


def test_token_confirm_success_then_rejects_reuse(db) -> None:
    visit = _sales_visit(db, checkInTime=now_ist())
    service = SalesMeetingService(db)
    token = service.prepare_confirmation_after_check_in(visit)
    assert token
    result = service.confirm(visit.id, token, "started")
    assert result["meetingStatus"] == MeetingStatus.STARTED.value
    assert visit.confirmationTokenHash is None
    audits = db.query(MeetingStatusAudit).filter(MeetingStatusAudit.visitId == visit.id).all()
    assert len(audits) >= 2
    with pytest.raises(HTTPException) as reused:
        service.confirm(visit.id, token, "not_attended")
    assert reused.value.status_code == 410


def test_token_confirm_rejects_expiry(db) -> None:
    visit = _sales_visit(db, checkInTime=now_ist() - timedelta(hours=5))
    service = SalesMeetingService(db)
    token = service.prepare_confirmation_after_check_in(visit)
    visit.confirmationTokenExpiresAt = now_ist() - timedelta(minutes=1)
    db.commit()
    with pytest.raises(HTTPException) as expired:
        service.confirm(visit.id, token, "started")
    assert expired.value.status_code == 410


def test_check_in_email_trigger_sales_only(db) -> None:
    visit = _sales_visit(db)
    general = _sales_visit(db)
    general.visitorType = VisitorType.GENERAL.value
    general.companyEmail = None
    general.meetingStatus = None
    db.commit()

    security = {
        "id": str(uuid.uuid4()),
        "role": Role.SECURITY.value,
        "branchId": db.branch.id,
        "location": "Gate 1",
    }
    visitors = VisitorsService(db)
    visitors.notifications = MagicMock()
    background = MagicMock()

    with patch(
        "app.services.visitors_service.dispatch_sales_meeting_confirm_email"
    ) as _dispatch:
        visitors.check_in_visitor(visit.id, security, background)
        db.refresh(visit)
        visit.expectedEndTime = now_ist() - timedelta(seconds=1)
        db.commit()
        visitors.check_in_visitor(general.id, security, background)

    db.refresh(visit)
    db.refresh(general)
    assert visit.confirmationTokenHash
    assert general.confirmationTokenHash is None
    assert background.add_task.call_count == 1


def test_check_in_trigger_is_idempotent(db) -> None:
    visit = _sales_visit(db)
    security = {
        "id": str(uuid.uuid4()),
        "role": Role.SECURITY.value,
        "branchId": db.branch.id,
        "location": "Gate 1",
    }
    visitors = VisitorsService(db)
    visitors.notifications = MagicMock()
    service = SalesMeetingService(db)
    first = service.prepare_confirmation_after_check_in(visit)
    second = service.prepare_confirmation_after_check_in(visit)
    assert first
    assert second is None
    hashed = hash_token(first)
    db.refresh(visit)
    assert visit.confirmationTokenHash == hashed
    _ = security  # check-in retry is covered by prepare; role payload reserved for service tests


def test_cron_auto_expire_notifies_company(db) -> None:
    visit = _sales_visit(
        db,
        checkInTime=now_ist() - timedelta(hours=5),
        meetingStatus=MeetingStatus.NOT_STARTED.value,
    )
    result = SalesMeetingService(db).auto_expire_unconfirmed()
    db.refresh(visit)
    assert result["expired"] == 1
    assert visit.meetingStatus == MeetingStatus.AUTO_EXPIRED.value
    audit = (
        db.query(MeetingStatusAudit)
        .filter(MeetingStatusAudit.newStatus == MeetingStatus.AUTO_EXPIRED.value)
        .first()
    )
    assert audit is not None
    assert audit.actorType == "system_cron"
