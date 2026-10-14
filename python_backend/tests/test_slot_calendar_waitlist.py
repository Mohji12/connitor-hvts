"""Calendar available dates, slot waitlist, and WhatsApp alerts when slots are published."""

from datetime import datetime, timedelta
from unittest.mock import patch

import pytest
from fastapi import HTTPException
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import Base
from app.models import DoctorAvailabilitySlot, User, VisitorAccount
from app.models.slot_waitlist_entities import SlotWaitlist
from app.services.appointments_service import AppointmentsService
from app.services.doctor_schedule_service import DoctorScheduleService
from app.services.slot_waitlist_service import SlotWaitlistService
from app.utils.timezone import now_ist


@pytest.fixture()
def db():
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(bind=engine)
    session = sessionmaker(bind=engine)()
    try:
        yield session
    finally:
        session.close()


def _doctor(db) -> User:
    doctor = User(id="doc-1", name="Dr. Rao", phone="9000000001", role="STAFF", isActive=True)
    db.add(doctor)
    db.commit()
    return doctor


def _account(db, account_id: str = "acct-1", phone: str = "9876543210") -> VisitorAccount:
    account = VisitorAccount(
        id=account_id,
        firstName="Asha",
        lastName="K",
        phone=phone,
        email=f"{account_id}@example.com",
        profileStatus="ACTIVE",
    )
    db.add(account)
    db.commit()
    return account


def _slot(db, start: datetime, booked: bool = False) -> None:
    db.add(
        DoctorAvailabilitySlot(
            doctorId="doc-1", slotStart=start, slotEnd=start + timedelta(minutes=30), isBooked=booked
        )
    )
    db.commit()


def test_available_dates_lists_only_days_with_free_future_slots(db):
    _doctor(db)
    tomorrow = (now_ist() + timedelta(days=1)).replace(hour=10, minute=0, second=0, microsecond=0)
    in_three = tomorrow + timedelta(days=2)
    in_five = tomorrow + timedelta(days=4)
    _slot(db, tomorrow)
    _slot(db, tomorrow + timedelta(hours=1))
    _slot(db, in_three, booked=True)
    _slot(db, in_five)

    with patch.object(AppointmentsService, "_earliest_bookable_start", lambda self, d, now=None: now):
        dates = AppointmentsService(db).list_available_dates(
            "doc-1",
            tomorrow.strftime("%Y-%m-%d"),
            (tomorrow + timedelta(days=10)).strftime("%Y-%m-%d"),
        )

    assert dates == [tomorrow.strftime("%Y-%m-%d"), in_five.strftime("%Y-%m-%d")]


def test_available_dates_rejects_long_ranges(db):
    _doctor(db)
    with pytest.raises(HTTPException) as exc:
        AppointmentsService(db).list_available_dates("doc-1", "2026-01-01", "2026-06-01")
    assert exc.value.status_code == 400


def test_join_waitlist_is_idempotent(db):
    _doctor(db)
    _account(db)
    day = (now_ist() + timedelta(days=3)).strftime("%Y-%m-%d")
    svc = SlotWaitlistService(db)

    first = svc.join("acct-1", "doc-1", day)
    second = svc.join("acct-1", "doc-1", day)

    assert first["created"] is True
    assert second["created"] is False
    assert db.query(SlotWaitlist).count() == 1


def test_join_waitlist_rejects_past_dates(db):
    _doctor(db)
    _account(db)
    with pytest.raises(HTTPException) as exc:
        SlotWaitlistService(db).join("acct-1", "doc-1", "2020-01-01")
    assert exc.value.status_code == 400


def test_publishing_slots_notifies_waiting_visitors_once(db):
    _doctor(db)
    _account(db, "acct-1", "9876543210")
    _account(db, "acct-2", "9876543211")
    day = (now_ist() + timedelta(days=3)).date()
    other_day = day + timedelta(days=1)
    svc = SlotWaitlistService(db)
    svc.join("acct-1", "doc-1", day.isoformat())
    svc.join("acct-2", "doc-1", other_day.isoformat())

    with patch(
        "app.services.slot_waitlist_service.SmsService.send_slot_available_whatsapp",
        return_value=True,
    ) as send:
        DoctorScheduleService(db).create_slots(
            {"id": "doc-1", "role": "STAFF"},
            date=day.isoformat(),
            start_time="10:00",
            end_time="11:00",
        )
        DoctorScheduleService(db).create_slots(
            {"id": "doc-1", "role": "STAFF"},
            date=day.isoformat(),
            start_time="11:00",
            end_time="12:00",
        )

    assert send.call_count == 1
    assert send.call_args.args[0] == "9876543210"
    waiting = {row.visitorAccountId: row for row in db.query(SlotWaitlist).all()}
    assert waiting["acct-1"].notifiedAt is not None
    assert waiting["acct-2"].notifiedAt is None
