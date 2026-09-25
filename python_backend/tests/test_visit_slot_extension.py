"""Visit slot clock, doctor extension link, and next-visitor hold."""

from __future__ import annotations

import uuid
from datetime import timedelta
from unittest.mock import MagicMock, patch

import pytest
from fastapi import HTTPException
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

import app.models.attendant_entities  # noqa: F401
import app.models.delivery_entities  # noqa: F401
import app.models.permission_entities  # noqa: F401
from app.database import Base
from app.models import Branch, Department, DoctorAvailabilitySlot, HospitalChain, SubDepartment, User, Visit, Visitor
from app.models.enums import AppointmentMode, Role, VisitCategory, VisitStatus
from app.services.visit_slot_extension_service import VisitSlotExtensionService
from app.services.visitors_service import VisitorsService
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
        email="c@t.com",
        street="S",
        city="C",
        state="ST",
        pinCode="000000",
    )
    branch = Branch(
        id=str(uuid.uuid4()),
        name="Branch",
        email="b@t.com",
        phone="9000000001",
        street="S",
        city="C",
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
        isActive=True,
    )
    sub = SubDepartment(
        id=str(uuid.uuid4()),
        name="OPD",
        code="OPD",
        departmentId=dept.id,
        branchId=branch.id,
        hospitalChainId=chain.id,
        isActive=True,
    )
    doctor = User(
        id=str(uuid.uuid4()),
        name="Dr Priya",
        email="priya@test.com",
        phone="9100100004",
        role=Role.STAFF.value,
        userType="DOCTOR",
        hospitalChainId=chain.id,
        branchId=branch.id,
        departmentId=dept.id,
        subDepartmentId=sub.id,
        isActive=True,
    )
    security = User(
        id=str(uuid.uuid4()),
        name="Gate",
        email="sec@test.com",
        phone="9100100088",
        role=Role.SECURITY.value,
        hospitalChainId=chain.id,
        branchId=branch.id,
        isActive=True,
    )
    session.add_all([chain, branch, dept, sub, doctor, security])
    session.commit()
    yield session
    session.close()


def _sec(db) -> dict:
    user = db.query(User).filter(User.role == Role.SECURITY.value).one()
    return {"id": user.id, "role": user.role, "branchId": user.branchId}


def _doctor(db) -> User:
    return db.query(User).filter(User.userType == "DOCTOR").one()


def _make_visit(db, *, phone: str, minutes: int = 45, start=None, email: str | None = None) -> Visit:
    doctor = _doctor(db)
    branch = db.query(Branch).first()
    start = start or (now_ist() - timedelta(minutes=1)).replace(second=0, microsecond=0)
    visitor = Visitor(
        firstName="Pat",
        lastName=phone[-4:],
        phone=phone,
        email=email or f"{phone}@ex.com",
        branchId=branch.id,
    )
    db.add(visitor)
    db.flush()
    visit = Visit(
        visitorId=visitor.id,
        staffId=doctor.id,
        staffName=doctor.name,
        branchId=branch.id,
        purpose="Consult",
        appointmentDate=start,
        appointmentMode=AppointmentMode.IN_PERSON.value,
        visitCategory=VisitCategory.MEETING.value,
        status=VisitStatus.APPROVED.value,
        idProofVerified=True,
        isCodeUsed=True,
    )
    db.add(visit)
    db.flush()
    slot = DoctorAvailabilitySlot(
        doctorId=doctor.id,
        slotStart=start,
        slotEnd=start + timedelta(minutes=minutes),
        isBooked=True,
        visitId=visit.id,
    )
    db.add(slot)
    db.commit()
    db.refresh(visit)
    return visit


def test_check_in_uses_slot_minutes(db):
    visit = _make_visit(db, phone="9876500101", minutes=45)
    svc = VisitorsService(db)
    svc.notifications = MagicMock()
    before = now_ist()
    result = svc.check_in_visitor(visit.id, _sec(db))
    db.refresh(visit)
    assert visit.allottedMinutes == 45
    assert visit.expectedEndTime is not None
    delta = (visit.expectedEndTime - visit.checkInTime).total_seconds() / 60
    assert abs(delta - 45) < 0.2
    assert result["allottedMinutes"] == 45
    assert visit.expectedEndTime >= before + timedelta(minutes=44)


def test_warning_job_sends_once(db):
    visit = _make_visit(db, phone="9876500102", minutes=30)
    clock = VisitSlotExtensionService(db)
    svc = VisitorsService(db)
    svc.notifications = MagicMock()
    svc.check_in_visitor(visit.id, _sec(db))
    db.refresh(visit)
    visit.extensionWarningDueAt = now_ist() - timedelta(seconds=5)
    visit.extensionWarningSentAt = None
    db.commit()
    with patch("app.services.notifications_service.NotificationsService.notify_doctor_visit_extension") as notify:
        first = clock.send_due_warnings()
        second = clock.send_due_warnings()
    assert first["sent"] == 1
    assert second["sent"] == 0
    notify.assert_called_once()
    db.refresh(visit)
    assert visit.extensionWarningSentAt is not None
    assert visit.extensionTokenHash is not None


def test_confirm_extends_and_invalidates_token(db):
    current = _make_visit(db, phone="9876500103", minutes=30)
    later_start = current.appointmentDate + timedelta(minutes=40)
    nxt = _make_visit(db, phone="9876500104", minutes=30, start=later_start)
    svc = VisitorsService(db)
    svc.notifications = MagicMock()
    svc.check_in_visitor(current.id, _sec(db))
    clock = VisitSlotExtensionService(db)
    db.refresh(current)
    token = clock._mint_token(current)
    db.commit()
    original_end = current.expectedEndTime
    original_next = nxt.appointmentDate
    with patch(
        "app.services.notifications_service.NotificationsService.notify_security_visit_extended"
    ), patch(
        "app.services.notifications_service.NotificationsService.notify_next_visitor_delayed"
    ):
        result = clock.confirm(current.id, token, 10)
    db.refresh(current)
    db.refresh(nxt)
    assert result["extendedByMinutes"] == 10
    assert result["nextVisitorNotified"] is True
    assert abs((current.expectedEndTime - original_end).total_seconds() / 60 - 10) < 0.2
    assert nxt.appointmentDate == original_next + timedelta(minutes=10)
    with pytest.raises(HTTPException) as ctx:
        clock.confirm(current.id, token, 10)
    assert ctx.value.status_code == 410


def test_extend_delays_all_upcoming_and_blocks_check_in(db):
    current = _make_visit(db, phone="9876500201", minutes=10)
    svc = VisitorsService(db)
    svc.notifications = MagicMock()
    svc.check_in_visitor(current.id, _sec(db))
    db.refresh(current)
    original_end = current.expectedEndTime
    nxt = _make_visit(db, phone="9876500202", minutes=10, start=original_end)
    later = _make_visit(
        db, phone="9876500203", minutes=10, start=original_end + timedelta(minutes=10)
    )
    clock = VisitSlotExtensionService(db)
    token = clock._mint_token(current)
    db.commit()
    with patch(
        "app.services.notifications_service.NotificationsService.notify_security_visit_extended"
    ), patch(
        "app.services.notifications_service.NotificationsService.notify_next_visitor_delayed"
    ) as delayed:
        result = clock.confirm(current.id, token, 10)
    db.refresh(current)
    db.refresh(nxt)
    db.refresh(later)
    assert result["upcomingDelayed"] == 2
    assert abs((current.expectedEndTime - original_end).total_seconds() / 60 - 10) < 0.2
    assert abs((nxt.appointmentDate - original_end).total_seconds() / 60 - 10) < 0.2
    assert abs((later.appointmentDate - original_end).total_seconds() / 60 - 20) < 0.2
    nxt_slot = db.query(DoctorAvailabilitySlot).filter(DoctorAvailabilitySlot.visitId == nxt.id).one()
    later_slot = db.query(DoctorAvailabilitySlot).filter(DoctorAvailabilitySlot.visitId == later.id).one()
    assert nxt_slot.slotStart == nxt.appointmentDate
    assert later_slot.slotStart == later.appointmentDate
    assert delayed.call_count == 2
    current.expectedEndTime = now_ist() - timedelta(seconds=1)
    db.commit()
    with pytest.raises(HTTPException) as ctx:
        svc.check_in_visitor(nxt.id, _sec(db))
    assert ctx.value.status_code == 409
    assert "SLOT_NOT_STARTED" in str(ctx.value.detail)
    assert "Meeting will start at" in str(ctx.value.detail)


def test_next_same_doctor_check_in_held_until_end(db):
    first = _make_visit(db, phone="9876500105", minutes=30)
    second = _make_visit(db, phone="9876500106", minutes=30, start=now_ist() - timedelta(seconds=5))
    svc = VisitorsService(db)
    svc.notifications = MagicMock()
    svc.check_in_visitor(first.id, _sec(db))
    with pytest.raises(HTTPException) as ctx:
        svc.check_in_visitor(second.id, _sec(db))
    assert ctx.value.status_code == 409
    assert "HOLD_CURRENT_VISIT" in str(ctx.value.detail)

    db.refresh(first)
    first.expectedEndTime = now_ist() - timedelta(seconds=1)
    db.commit()
    svc.check_in_visitor(second.id, _sec(db))
    db.refresh(second)
    assert second.status == VisitStatus.CHECKED_IN.value


def test_checkout_releases_hold(db):
    first = _make_visit(db, phone="9876500107", minutes=30)
    second = _make_visit(db, phone="9876500108", minutes=30, start=now_ist() - timedelta(seconds=5))
    svc = VisitorsService(db)
    svc.notifications = MagicMock()
    svc.check_in_visitor(first.id, _sec(db))
    svc.checkout(first.id, _sec(db))
    db.refresh(first)
    assert first.extensionTokenHash is None
    svc.check_in_visitor(second.id, _sec(db))
    db.refresh(second)
    assert second.status == VisitStatus.CHECKED_IN.value


def test_fallback_30_minutes_without_slot(db):
    visit = _make_visit(db, phone="9876500109", minutes=30)
    slot = db.query(DoctorAvailabilitySlot).filter(DoctorAvailabilitySlot.visitId == visit.id).first()
    db.delete(slot)
    db.commit()
    db.expire_all()
    svc = VisitorsService(db)
    svc.notifications = MagicMock()
    svc.check_in_visitor(visit.id, _sec(db))
    db.refresh(visit)
    assert visit.allottedMinutes == 30


def test_check_in_blocked_before_slot_start(db):
    start = (now_ist() + timedelta(minutes=10)).replace(second=0, microsecond=0)
    visit = _make_visit(db, phone="9876500199", minutes=5, start=start)
    svc = VisitorsService(db)
    svc.notifications = MagicMock()
    with pytest.raises(HTTPException) as ctx:
        svc.check_in_visitor(visit.id, _sec(db))
    assert ctx.value.status_code == 409
    detail = str(ctx.value.detail)
    assert "SLOT_NOT_STARTED" in detail
    assert "Meeting will start at" in detail
    db.refresh(visit)
    assert visit.status == VisitStatus.APPROVED.value


def test_check_in_allowed_once_slot_started(db):
    visit = _make_visit(
        db,
        phone="9876500198",
        minutes=5,
        start=now_ist() - timedelta(minutes=1),
    )
    svc = VisitorsService(db)
    svc.notifications = MagicMock()
    result = svc.check_in_visitor(visit.id, _sec(db))
    assert result["success"] is True
    db.refresh(visit)
    assert visit.status == VisitStatus.CHECKED_IN.value
