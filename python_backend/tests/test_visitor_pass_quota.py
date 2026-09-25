"""Daily per-branch visitor pass pool: issue, consume, exhaust, recycle."""

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
from app.models import Branch, Department, HospitalChain, SubDepartment, User, Visit, Visitor, VisitorPass
from app.models.enums import AppointmentMode, Role, VisitStatus, VisitorPassStatus
from app.services.appointments_service import AppointmentsService
from app.services.staff_service import StaffService
from app.services.visitor_pass_service import VisitorPassService
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
        name="El City",
        phone="9000000000",
        email="c@t.com",
        street="S",
        city="C",
        state="ST",
        pinCode="000000",
    )
    branch = Branch(
        id=str(uuid.uuid4()),
        name="El City Main",
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
        name="General Medicine",
        code="GEN",
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
        name="AI Doctor Priya",
        email="priya@test.com",
        phone="9100100004",
        role=Role.STAFF.value,
        userType="DOCTOR",
        hospitalChainId=chain.id,
        branchId=branch.id,
        departmentId=dept.id,
        subDepartmentId=sub.id,
        passwordHash=hash_password("Connitor@123"),
        isActive=True,
    )
    admin = User(
        id=str(uuid.uuid4()),
        name="Hospital Admin",
        email="admin@test.com",
        phone="9100100099",
        role=Role.HOSPITAL_ADMIN.value,
        hospitalChainId=chain.id,
        branchId=branch.id,
        passwordHash=hash_password("Connitor@123"),
        isActive=True,
    )
    security = User(
        id=str(uuid.uuid4()),
        name="Gate Security",
        email="sec@test.com",
        phone="9100100088",
        role=Role.SECURITY.value,
        hospitalChainId=chain.id,
        branchId=branch.id,
        passwordHash=hash_password("Connitor@123"),
        isActive=True,
    )
    session.add_all([chain, branch, dept, sub, doctor, admin, security])
    session.commit()
    yield session
    session.close()


def _admin(db) -> dict:
    user = db.query(User).filter(User.role == Role.HOSPITAL_ADMIN.value).one()
    return {"id": user.id, "role": user.role, "branchId": user.branchId}


def _security(db) -> dict:
    user = db.query(User).filter(User.role == Role.SECURITY.value).one()
    return {"id": user.id, "role": user.role, "branchId": user.branchId}


def _book(db, *, phone: str, mode: str = "IN_PERSON", email: str | None = None) -> Visit:
    doctor = db.query(User).filter(User.userType == "DOCTOR").first()
    branch = db.query(Branch).first()
    dept = db.query(Department).first()
    sub = db.query(SubDepartment).first()
    offset = int(phone[-2:]) % 50
    appt = (now_ist() + timedelta(hours=2, minutes=offset)).replace(second=0, microsecond=0)
    svc = AppointmentsService(db)
    svc.notifications = MagicMock()
    result = svc.book_appointment(
        {
            "branchId": branch.id,
            "departmentId": dept.id,
            "subDepartmentId": sub.id,
            "doctorId": doctor.id,
            "firstName": "Family",
            "lastName": "Member",
            "phone": phone,
            "email": email or f"{phone}@example.com",
            "appointmentDate": appt.isoformat(),
            "purpose": "Need a visit",
            "appointmentMode": mode,
            "requestCustomSlot": True,
        }
    )
    return db.get(Visit, result["bookingId"])


def _approve(db, visit: Visit) -> dict:
    doctor = db.query(User).filter(User.userType == "DOCTOR").first()
    staff = StaffService(db)
    staff.notifications = MagicMock()
    with patch.object(staff, "_generate_qr_base64", return_value="data:image/png;base64,xx"):
        return staff.approve_visit(visit.id, doctor.id)


def _issue(db, *, count: int = 50, day=None) -> dict:
    branch = db.query(Branch).first()
    return VisitorPassService(db).issue_pool(_admin(db), branch.id, pass_date=day, count=count)


def test_issue_50_leaves_50_unused(db):
    issued = _issue(db, count=50)
    listed = VisitorPassService(db).list_passes(_admin(db), db.query(Branch).first().id, pass_date=issued["date"])
    assert issued["created"] == 50
    assert listed["allotted"] == 50
    assert listed["unused"] == 50
    assert listed["assigned"] == 0
    assert len(listed["items"]) == 50


def test_approve_in_person_consumes_one_pass(db):
    visit = _book(db, phone="9876500001")
    issued = _issue(db, count=50, day=visit.appointmentDate.date())
    result = _approve(db, visit)
    db.refresh(visit)
    listed = VisitorPassService(db).list_passes(_admin(db), visit.branchId, pass_date=issued["date"])
    assert listed["unused"] == 49
    assert listed["assigned"] == 1
    assert visit.visitorPassId is not None
    assert result["visitorPassId"] == visit.visitorPassId
    row = db.query(VisitorPass).filter(VisitorPass.passId == visit.visitorPassId).one()
    assert row.status == VisitorPassStatus.ASSIGNED.value
    assert row.visitId == visit.id


def test_second_consume_does_not_double_assign(db):
    visit_a = _book(db, phone="9876500002")
    visit_b = _book(db, phone="9876500003")
    _issue(db, count=2, day=visit_a.appointmentDate.date())
    _approve(db, visit_a)
    _approve(db, visit_b)
    db.refresh(visit_a)
    db.refresh(visit_b)
    assert visit_a.visitorPassId != visit_b.visitorPassId
    ids = {
        row.passId
        for row in db.query(VisitorPass).filter(VisitorPass.visitId.is_not(None)).all()
    }
    assert ids == {visit_a.visitorPassId, visit_b.visitorPassId}


def test_approve_with_empty_pool_returns_409(db):
    visit = _book(db, phone="9876500004")
    with pytest.raises(HTTPException) as ctx:
        _approve(db, visit)
    assert ctx.value.status_code == 409
    assert "has not been issued" in str(ctx.value.detail)


def test_approve_exhausted_pool_returns_409(db):
    first = _book(db, phone="9876500005")
    second = _book(db, phone="9876500006")
    _issue(db, count=1, day=first.appointmentDate.date())
    _approve(db, first)
    with pytest.raises(HTTPException) as ctx:
        _approve(db, second)
    assert ctx.value.status_code == 409
    assert "exhausted" in str(ctx.value.detail).lower()


def test_online_approve_does_not_consume_pass(db):
    visit = _book(db, phone="9876500007", mode="ONLINE")
    issued = _issue(db, count=50, day=visit.appointmentDate.date())
    _approve(db, visit)
    db.refresh(visit)
    assert visit.meetingProvider == "LIVEKIT"
    listed = VisitorPassService(db).list_passes(_admin(db), visit.branchId, pass_date=issued["date"])
    assert visit.visitorPassId is None
    assert listed["unused"] == 50
    assert listed["assigned"] == 0


def test_reject_before_check_in_recycles_pass(db):
    visit = _book(db, phone="9876500008")
    issued = _issue(db, count=50, day=visit.appointmentDate.date())
    _approve(db, visit)
    db.refresh(visit)
    pass_id = visit.visitorPassId
    assert pass_id
    doctor = db.query(User).filter(User.userType == "DOCTOR").first()
    staff = StaffService(db)
    staff.notifications = MagicMock()
    staff.reject_visit(visit.id, doctor.id, "Visitor cancelled")
    db.refresh(visit)
    row = db.query(VisitorPass).filter(VisitorPass.passId == pass_id).one()
    assert visit.visitorPassId is None
    assert row.status == VisitorPassStatus.UNASSIGNED.value
    assert row.visitId is None
    listed = VisitorPassService(db).list_passes(_admin(db), visit.branchId, pass_date=issued["date"])
    assert listed["unused"] == 50
    assert listed["assigned"] == 0


def test_recycle_skipped_after_check_in(db):
    visit = _book(db, phone="9876500009")
    _issue(db, count=1, day=visit.appointmentDate.date())
    _approve(db, visit)
    db.refresh(visit)
    visit.checkInTime = now_ist()
    visit.status = VisitStatus.CHECKED_IN.value
    db.commit()
    pass_id = visit.visitorPassId
    VisitorPassService(db).recycle_for_visit(visit)
    db.commit()
    db.refresh(visit)
    row = db.query(VisitorPass).filter(VisitorPass.passId == pass_id).one()
    assert visit.visitorPassId == pass_id
    assert row.status == VisitorPassStatus.ASSIGNED.value


def test_security_list_includes_unassigned_hospital_pool(db):
    issued = _issue(db, count=3)
    listed = VisitorPassService(db).list_passes(
        _security(db), db.query(Branch).first().id, pass_date=issued["date"]
    )
    assert listed["unused"] == 3
    assert all(item["status"] == VisitorPassStatus.UNASSIGNED.value for item in listed["items"])
    assert all(item["createdByHospital"] for item in listed["items"])
    found = VisitorPassService(db).list_passes(
        _security(db),
        db.query(Branch).first().id,
        pass_date=issued["date"],
        query=listed["items"][0]["passId"][:7],
    )
    assert any(item["passId"] == listed["items"][0]["passId"] for item in found["items"])


def test_booking_does_not_consume_quota(db):
    visit = _book(db, phone="9876500010")
    issued = _issue(db, count=50, day=visit.appointmentDate.date())
    listed = VisitorPassService(db).list_passes(_admin(db), visit.branchId, pass_date=issued["date"])
    assert listed["unused"] == 50


def test_top_up_only_creates_delta_after_quota_raise(db):
    branch = db.query(Branch).first()
    svc = VisitorPassService(db)
    svc.update_policy(_admin(db), branch.id, 2)
    first = svc.issue_pool(_admin(db), branch.id)
    assert first["created"] == 2
    with pytest.raises(HTTPException) as ctx:
        svc.issue_pool(_admin(db), branch.id)
    assert ctx.value.status_code == 409
    svc.update_policy(_admin(db), branch.id, 5)
    top_up = svc.issue_pool(_admin(db), branch.id)
    assert top_up["created"] == 3
    assert top_up["allotted"] == 5


def test_assign_specific_creates_approved_visit(db):
    branch = db.query(Branch).first()
    svc = VisitorPassService(db)
    issued = svc.issue_pool(_admin(db), branch.id, count=1)
    pass_id = issued["items"][0]["passId"]
    result = svc.assign_specific(
        _security(db),
        pass_id,
        first_name="Walk",
        last_name="In",
        phone="9876500011",
        purpose="Walk-in consult",
    )
    assert result["pass"]["status"] == VisitorPassStatus.ASSIGNED.value
    visit = db.get(Visit, result["pass"]["visitId"])
    assert visit.status == VisitStatus.APPROVED.value
    assert visit.appointmentMode == AppointmentMode.IN_PERSON.value
    visitor = db.get(Visitor, visit.visitorId)
    assert visitor.phone == "9876500011"


def test_list_attaches_pass_when_approve_skipped_allocation(db):
    visit = _book(db, phone="9876500012")
    visit.status = VisitStatus.APPROVED.value
    db.commit()
    issued = _issue(db, count=50, day=visit.appointmentDate.date())
    listed = VisitorPassService(db).list_passes(
        _admin(db), visit.branchId, pass_date=issued["date"]
    )
    db.refresh(visit)
    assert listed["unused"] == 49
    assert listed["assigned"] == 1
    assert visit.visitorPassId is not None
