"""Custom slot request booking and doctor approval materializes the slot."""

import uuid
from datetime import timedelta
from unittest.mock import MagicMock, patch

import pytest
from fastapi import HTTPException
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import Base
from app.models import Branch, Department, DoctorAvailabilitySlot, HospitalChain, SubDepartment, User, Visit
from app.models.enums import Role, VisitStatus
import app.models.delivery_entities  # noqa: F401
import app.models.attendant_entities  # noqa: F401
import app.models.permission_entities  # noqa: F401
from app.services.appointments_service import AppointmentsService
from app.services.staff_service import StaffService
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
    session.add_all([chain, branch, dept, sub, doctor])
    session.commit()
    yield session
    session.close()


def test_custom_slot_request_keeps_visitor_datetime(db):
    doctor = db.query(User).filter(User.userType == "DOCTOR").first()
    branch = db.query(Branch).first()
    dept = db.query(Department).first()
    sub = db.query(SubDepartment).first()
    appt = (now_ist() + timedelta(days=1)).replace(hour=11, minute=15, second=0, microsecond=0)

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
            "phone": "9876543210",
            "email": "family@example.com",
            "appointmentDate": appt.isoformat(),
            "requestCustomSlot": True,
            "purpose": "Need a visit",
            "appointmentMode": "IN_PERSON",
        }
    )
    assert result["isCustomSlotRequest"] is True
    assert result["appointmentMode"] == "IN_PERSON"
    visit = db.get(Visit, result["bookingId"])
    assert visit.purpose.startswith("[CUSTOM SLOT]")
    assert visit.appointmentDate.replace(microsecond=0) == appt.replace(microsecond=0)
    assert visit.appointmentMode == "IN_PERSON"

    from app.models.enums import Role
    from app.services.visitor_pass_service import VisitorPassService

    VisitorPassService(db).issue_pool(
        {"id": doctor.id, "role": Role.HOSPITAL_ADMIN.value, "branchId": branch.id},
        branch.id,
        pass_date=visit.appointmentDate.date(),
        count=5,
    )

    staff = StaffService(db)
    staff.notifications = MagicMock()
    with patch.object(staff, "_generate_qr_base64", return_value="data:image/png;base64,xx"):
        staff.approve_visit(visit.id, doctor.id)

    db.refresh(visit)
    assert visit.status == VisitStatus.APPROVED.value
    slot = (
        db.query(DoctorAvailabilitySlot)
        .filter(DoctorAvailabilitySlot.visitId == visit.id)
        .first()
    )
    assert slot is not None
    assert slot.slotStart == appt.replace(second=0, microsecond=0)


def test_custom_slot_request_and_approve_creates_slot(db):
    """Timed custom requests materialize a slot on approve."""
    doctor = db.query(User).filter(User.userType == "DOCTOR").first()
    branch = db.query(Branch).first()
    dept = db.query(Department).first()
    sub = db.query(SubDepartment).first()
    appt = (now_ist() + timedelta(days=1)).replace(hour=16, minute=30, second=0, microsecond=0)

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
            "phone": "9876543211",
            "email": "family2@example.com",
            "appointmentDate": appt.isoformat(),
            "requestCustomSlot": True,
            "purpose": "Need evening consult",
            "appointmentMode": "IN_PERSON",
        }
    )
    visit = db.get(Visit, result["bookingId"])
    assert visit.appointmentDate.replace(microsecond=0) == appt.replace(microsecond=0)
    from app.models.enums import Role
    from app.services.visitor_pass_service import VisitorPassService

    VisitorPassService(db).issue_pool(
        {"id": doctor.id, "role": Role.HOSPITAL_ADMIN.value, "branchId": branch.id},
        branch.id,
        pass_date=visit.appointmentDate.date(),
        count=5,
    )
    staff = StaffService(db)
    staff.notifications = MagicMock()
    with patch.object(staff, "_generate_qr_base64", return_value="data:image/png;base64,xx"):
        staff.approve_visit(visit.id, doctor.id)

    db.refresh(visit)
    assert visit.status == VisitStatus.APPROVED.value
    slot = (
        db.query(DoctorAvailabilitySlot)
        .filter(DoctorAvailabilitySlot.visitId == visit.id)
        .first()
    )
    assert slot is not None
    assert slot.isBooked is True
    assert slot.slotStart == appt.replace(second=0, microsecond=0)


def test_custom_slot_request_rejects_collision(db):
    doctor = db.query(User).filter(User.userType == "DOCTOR").first()
    branch = db.query(Branch).first()
    dept = db.query(Department).first()
    sub = db.query(SubDepartment).first()
    appt = (now_ist() + timedelta(days=1)).replace(hour=12, minute=0, second=0, microsecond=0)

    svc = AppointmentsService(db)
    svc.notifications = MagicMock()
    payload = {
        "branchId": branch.id,
        "departmentId": dept.id,
        "subDepartmentId": sub.id,
        "doctorId": doctor.id,
        "firstName": "Family",
        "lastName": "Member",
        "phone": "9876543212",
        "email": "family3@example.com",
        "appointmentDate": appt.isoformat(),
        "requestCustomSlot": True,
        "purpose": "First request",
    }
    svc.book_appointment(payload)
    payload["phone"] = "9876543213"
    payload["email"] = "family4@example.com"
    with pytest.raises(HTTPException) as ctx:
        svc.book_appointment(payload)
    assert ctx.value.status_code == 409


def test_custom_slot_request_stores_online_mode(db):
    doctor = db.query(User).filter(User.userType == "DOCTOR").first()
    branch = db.query(Branch).first()
    dept = db.query(Department).first()
    sub = db.query(SubDepartment).first()
    appt = (now_ist() + timedelta(days=1)).replace(hour=13, minute=0, second=0, microsecond=0)

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
            "phone": "9876543214",
            "email": "family5@example.com",
            "appointmentDate": appt.isoformat(),
            "requestCustomSlot": True,
            "purpose": "Video consult",
            "appointmentMode": "ONLINE",
        }
    )
    visit = db.get(Visit, result["bookingId"])
    assert result["appointmentMode"] == "ONLINE"
    assert visit.appointmentMode == "ONLINE"
    assert visit.appointmentDate.replace(microsecond=0) == appt.replace(microsecond=0)
