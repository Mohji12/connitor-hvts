"""Tests for doctor self-serve schedule slots."""

import uuid
from datetime import timedelta

import pytest
from fastapi import HTTPException
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import Base
from app.models import Branch, DoctorAvailabilitySlot, HospitalChain, User
from app.services.appointments_service import AppointmentsService
from app.services.doctor_schedule_service import DoctorScheduleService
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
    doctor = User(
        id=str(uuid.uuid4()),
        name="Dr Schedule",
        phone="9111111111",
        email="dr.schedule@test.com",
        role="STAFF",
        userType="DOCTOR",
        branchId=branch.id,
        isActive=True,
    )
    session.add_all([chain, branch, doctor])
    session.commit()
    yield session
    session.close()


def _user(doctor: User) -> dict:
    return {"id": doctor.id, "role": "STAFF", "branchId": doctor.branchId}


def test_create_and_list_slots(db):
    doctor = db.query(User).filter(User.role == "STAFF").first()
    svc = DoctorScheduleService(db)
    tomorrow = (now_ist() + timedelta(days=1)).strftime("%Y-%m-%d")
    # Force weekday inclusion for tomorrow
    wd = (now_ist() + timedelta(days=1)).weekday()
    result = svc.create_slots(
        _user(doctor),
        date=tomorrow,
        start_time="09:00",
        end_time="11:00",
        slot_minutes=30,
        weekdays=[wd],
    )
    assert result["created"] == 4
    listed = svc.list_slots(_user(doctor), tomorrow, tomorrow)
    assert len(listed["items"]) == 4
    assert all(not item["isBooked"] for item in listed["items"])


def test_create_slots_includes_sunday_by_default(db):
    doctor = db.query(User).filter(User.role == "STAFF").first()
    svc = DoctorScheduleService(db)
    today = now_ist().date()
    days_until_sunday = (6 - today.weekday()) % 7
    if days_until_sunday == 0:
        sunday = now_ist() + timedelta(days=7)
    else:
        sunday = now_ist() + timedelta(days=days_until_sunday)
    sunday = sunday.replace(hour=0, minute=0, second=0, microsecond=0)
    day = sunday.strftime("%Y-%m-%d")
    result = svc.create_slots(
        _user(doctor),
        date=day,
        start_time="09:00",
        end_time="10:00",
        slot_minutes=30,
    )
    assert result["created"] == 2
    listed = svc.list_slots(_user(doctor), day, day)
    assert len(listed["items"]) == 2


def test_delete_blocked_when_booked(db):
    doctor = db.query(User).filter(User.role == "STAFF").first()
    start = (now_ist() + timedelta(days=1)).replace(hour=10, minute=0, second=0, microsecond=0)
    slot = DoctorAvailabilitySlot(
        doctorId=doctor.id,
        slotStart=start,
        slotEnd=start + timedelta(minutes=30),
        isBooked=True,
    )
    db.add(slot)
    db.commit()
    svc = DoctorScheduleService(db)
    with pytest.raises(HTTPException) as ctx:
        svc.delete_slot(_user(doctor), slot.id)
    assert ctx.value.status_code == 400


def test_delete_open_slot(db):
    doctor = db.query(User).filter(User.role == "STAFF").first()
    start = (now_ist() + timedelta(days=1)).replace(hour=11, minute=0, second=0, microsecond=0)
    slot = DoctorAvailabilitySlot(
        doctorId=doctor.id,
        slotStart=start,
        slotEnd=start + timedelta(minutes=30),
        isBooked=False,
    )
    db.add(slot)
    db.commit()
    svc = DoctorScheduleService(db)
    out = svc.delete_slot(_user(doctor), slot.id)
    assert out["deleted"] is True
    assert db.get(DoctorAvailabilitySlot, slot.id) is None


def test_public_list_hides_booked(db):
    doctor = db.query(User).filter(User.role == "STAFF").first()
    start = (now_ist() + timedelta(days=1)).replace(hour=14, minute=0, second=0, microsecond=0)
    open_slot = DoctorAvailabilitySlot(
        doctorId=doctor.id,
        slotStart=start,
        slotEnd=start + timedelta(minutes=30),
        isBooked=False,
    )
    booked = DoctorAvailabilitySlot(
        doctorId=doctor.id,
        slotStart=start + timedelta(minutes=30),
        slotEnd=start + timedelta(minutes=60),
        isBooked=True,
    )
    db.add_all([open_slot, booked])
    db.commit()
    day = start.strftime("%Y-%m-%d")
    public = AppointmentsService(db).list_doctor_slots(doctor.id, day)
    ids = {s["id"] for s in public}
    assert open_slot.id in ids
    assert booked.id not in ids


def test_reserve_rejects_already_booked(db):
    doctor = db.query(User).filter(User.role == "STAFF").first()
    start = (now_ist() + timedelta(days=1)).replace(hour=15, minute=0, second=0, microsecond=0)
    slot = DoctorAvailabilitySlot(
        doctorId=doctor.id,
        slotStart=start,
        slotEnd=start + timedelta(minutes=30),
        isBooked=True,
    )
    db.add(slot)
    db.commit()
    with pytest.raises(HTTPException) as ctx:
        AppointmentsService(db)._reserve_slot(doctor.id, slot.id, None)
    assert ctx.value.status_code == 409
