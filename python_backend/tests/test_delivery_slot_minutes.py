"""Unit tests for shared minute-capacity delivery windows."""

from __future__ import annotations

import uuid
from datetime import timedelta

import pytest
from fastapi import HTTPException
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import Base
from app.delivery.delivery_slot_service import DeliverySlotService
from app.models import Branch, HospitalChain
from app.models.delivery_entities import BranchDeliverySlot
import app.models.attendant_entities  # noqa: F401
import app.models.permission_entities  # noqa: F401
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
        id="b1",
        name="Branch",
        hospitalChainId=chain.id,
        phone="9000000001",
        email="b@test.com",
        street="St",
        city="City",
        state="ST",
        pinCode="560100",
    )
    session.add_all([chain, branch])
    session.commit()
    yield session
    session.close()


def _admin() -> dict:
    return {"role": "HOSPITAL_ADMIN", "branchId": "b1", "id": "u1"}


def _future_window(hours_ahead: int = 3, duration_hours: int = 2):
    start = (now_ist() + timedelta(hours=hours_ahead)).replace(second=0, microsecond=0)
    end = start + timedelta(hours=duration_hours)
    return start, end


def test_create_windows_not_grid(db):
    start, end = _future_window()
    day = start.date().isoformat()
    svc = DeliverySlotService(db)
    result = svc.bulk_create_slots(
        "b1",
        _admin(),
        {
            "startDate": day,
            "endDate": day,
            "mode": "windows",
            "windows": [
                {"start": start.strftime("%H:%M"), "end": end.strftime("%H:%M")},
            ],
        },
    )
    assert result["created"] == 1
    assert result["mode"] == "windows"
    slot = db.query(BranchDeliverySlot).one()
    assert DeliverySlotService.capacity_minutes(slot) == 120


def test_reserve_consumes_minutes_and_leaves_rest(db):
    start, end = _future_window()
    slot = BranchDeliverySlot(
        branchId="b1",
        slotStart=start,
        slotEnd=end,
        maxDeliveries=999,
        bookedCount=0,
        bookedMinutes=0,
        isActive=True,
    )
    db.add(slot)
    db.commit()

    svc = DeliverySlotService(db)
    svc.reserve_slot(slot.id, minutes=10)
    db.refresh(slot)
    assert slot.bookedMinutes == 10
    assert slot.bookedCount == 1
    assert DeliverySlotService.remaining_minutes(slot) == 110

    svc.reserve_slot(slot.id, minutes=10)
    db.refresh(slot)
    assert slot.bookedMinutes == 20
    assert DeliverySlotService.remaining_minutes(slot) == 100


def test_reserve_rejects_when_not_enough_minutes(db):
    start, end = _future_window(duration_hours=1)
    slot = BranchDeliverySlot(
        branchId="b1",
        slotStart=start,
        slotEnd=end,
        maxDeliveries=999,
        bookedCount=0,
        bookedMinutes=55,
        isActive=True,
    )
    db.add(slot)
    db.commit()

    svc = DeliverySlotService(db)
    with pytest.raises(HTTPException) as exc:
        svc.reserve_slot(slot.id, minutes=10)
    assert exc.value.status_code == 400
    assert "Not enough time" in str(exc.value.detail)


def test_list_filters_by_needed_minutes(db):
    start, end = _future_window()
    slot = BranchDeliverySlot(
        branchId="b1",
        slotStart=start,
        slotEnd=end,
        maxDeliveries=999,
        bookedCount=1,
        bookedMinutes=115,
        isActive=True,
    )
    db.add(slot)
    db.commit()

    svc = DeliverySlotService(db)
    full = svc.list_slots("b1", _admin(), slot_date=start.date(), needed_minutes=10)
    assert full["slots"] == []
    leftover = svc.list_slots("b1", _admin(), slot_date=start.date(), needed_minutes=5)
    assert len(leftover["slots"]) == 1
    assert leftover["slots"][0]["remainingMinutes"] == 5
