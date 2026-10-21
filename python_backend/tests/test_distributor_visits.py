"""Distributor office visit slots, public booking, and vendor approval."""

import uuid
from datetime import timedelta

import pytest
from fastapi import HTTPException
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

import app.models  # noqa: F401 — register ORM tables
from app.database import Base
from app.delivery.distributor_visit_service import DistributorVisitService
from app.models.delivery_entities import Distributor
from app.models.distributor_visit_entities import DistributorAvailabilitySlot, DistributorVisit
from app.models.entities import User
from app.models.enums import ProfileStatus, Role
from app.models.visitor_account_entities import VisitorAccount
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
    yield session
    session.close()


def _distributor(db, *, status: str = "APPROVED", name: str = "Acme Pharma") -> Distributor:
    row = Distributor(
        vendorCode=f"V{uuid.uuid4().hex[:8]}",
        vendorName=name,
        vendorType="GENERAL_STORES",
        city="Bengaluru",
        goodsDescription="Hospital consumables",
        isActive=True,
        verificationStatus=status,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


def _account(db, phone: str = "9876500001") -> VisitorAccount:
    row = VisitorAccount(
        firstName="Riya",
        lastName="Shah",
        phone=phone,
        email=f"{phone}@example.com",
        companyName="Helix Labs",
        profileStatus=ProfileStatus.ACTIVE.value,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


def _vendor_user(dist: Distributor) -> dict:
    return {"role": "DISTRIBUTOR", "distributorId": dist.id}


def test_list_public_distributors_hides_non_approved(db):
    visible = _distributor(db, status="APPROVED", name="Open Vendor")
    _distributor(db, status="PENDING", name="Hidden Vendor")
    items = DistributorVisitService(db).list_public_distributors()
    names = {item["vendorName"] for item in items}
    assert visible.vendorName in names
    assert "Hidden Vendor" not in names


def test_slot_crud_and_cannot_delete_booked(db):
    dist = _distributor(db)
    account = _account(db)
    svc = DistributorVisitService(db)
    day = (now_ist() + timedelta(days=2)).strftime("%Y-%m-%d")
    created = svc.create_slots(
        _vendor_user(dist),
        date=day,
        start_time="10:00",
        end_time="11:00",
        slot_minutes=60,
    )
    assert created["created"] == 1
    slot_id = created["items"][0]["id"]

    svc.book(account.id, {"distributorId": dist.id, "slotId": slot_id, "purpose": "Warehouse walkthrough"})
    with pytest.raises(HTTPException) as ctx:
        svc.delete_slot(_vendor_user(dist), slot_id)
    assert ctx.value.status_code == 400


def test_book_and_double_book_blocked(db):
    dist = _distributor(db)
    first = _account(db, "9876500001")
    second = _account(db, "9876500002")
    svc = DistributorVisitService(db)
    day = (now_ist() + timedelta(days=3)).strftime("%Y-%m-%d")
    slot = svc.create_slots(
        _vendor_user(dist),
        date=day,
        start_time="14:00",
        end_time="14:30",
        slot_minutes=30,
    )["items"][0]

    booked = svc.book(first.id, {"distributorId": dist.id, "slotId": slot["id"], "purpose": "Account review"})
    assert booked["status"] == "REQUEST_SENT"
    assert booked["hostKind"] == "DISTRIBUTOR"

    with pytest.raises(HTTPException) as ctx:
        svc.book(second.id, {"distributorId": dist.id, "slotId": slot["id"], "purpose": "Second try"})
    assert ctx.value.status_code == 400

    row = db.get(DistributorAvailabilitySlot, slot["id"])
    assert row is not None
    assert row.isBooked


def test_approve_issues_qr(db):
    dist = _distributor(db)
    account = _account(db)
    svc = DistributorVisitService(db)
    day = (now_ist() + timedelta(days=4)).strftime("%Y-%m-%d")
    slot = svc.create_slots(
        _vendor_user(dist),
        date=day,
        start_time="09:00",
        end_time="09:30",
        slot_minutes=30,
    )["items"][0]
    visit = svc.book(account.id, {"distributorId": dist.id, "slotId": slot["id"], "purpose": "Product demo"})
    approved = svc.approve(_vendor_user(dist), visit["id"])
    assert approved["status"] == "APPROVED"
    assert approved["visitCode"] and len(approved["visitCode"]) == 6
    assert approved["visitQRCode"]
    assert approved["checkInQrCode"].startswith("data:image/png;base64,")
    stored = db.get(DistributorVisit, visit["id"])
    assert stored is not None
    assert stored.visitQRCode


def test_reject_frees_slot(db):
    dist = _distributor(db)
    account = _account(db)
    svc = DistributorVisitService(db)
    day = (now_ist() + timedelta(days=5)).strftime("%Y-%m-%d")
    slot = svc.create_slots(
        _vendor_user(dist),
        date=day,
        start_time="16:00",
        end_time="16:30",
        slot_minutes=30,
    )["items"][0]
    visit = svc.book(account.id, {"distributorId": dist.id, "slotId": slot["id"], "purpose": "Intro meeting"})
    rejected = svc.reject(_vendor_user(dist), visit["id"], "Calendar clash")
    assert rejected["status"] == "REJECTED"
    row = db.get(DistributorAvailabilitySlot, slot["id"])
    assert row is not None
    assert not row.isBooked
    assert row.visitId is None


def _booked_approved(db, dist: Distributor, purpose: str = "Desk visit") -> dict:
    account = _account(db, phone=f"9{uuid.uuid4().hex[:9]}")
    svc = DistributorVisitService(db)
    day = (now_ist() + timedelta(days=6)).strftime("%Y-%m-%d")
    slot = svc.create_slots(
        _vendor_user(dist),
        date=day,
        start_time="11:00",
        end_time="11:30",
        slot_minutes=30,
    )["items"][0]
    visit = svc.book(account.id, {"distributorId": dist.id, "slotId": slot["id"], "purpose": purpose})
    return svc.approve(_vendor_user(dist), visit["id"])


def test_create_desk_security_and_check_in(db):
    dist = _distributor(db)
    other = _distributor(db, name="Other Vendor")
    svc = DistributorVisitService(db)
    staff = svc.create_security_staff(
        _vendor_user(dist),
        {
            "name": "Gate Ravi",
            "email": "ravi.desk@example.com",
            "phone": "9000011122",
            "password": "Password1!",
        },
    )
    user = db.get(User, staff["id"])
    assert user is not None
    assert user.role == Role.DISTRIBUTOR_SECURITY.value
    assert user.distributorId == dist.id

    approved = _booked_approved(db, dist)
    desk = {"id": staff["id"], "role": "DISTRIBUTOR_SECURITY", "distributorId": dist.id}
    scanned = svc.scan_pass(desk, approved["visitCode"])
    assert scanned["id"] == approved["id"]
    checked = svc.check_in(desk, approved["id"])
    assert checked["status"] == "CHECKED_IN"
    assert checked["checkInTime"]
    out = svc.check_out(desk, approved["id"])
    assert out["status"] == "CHECKED_OUT"

    stranger = {"id": "x", "role": "DISTRIBUTOR_SECURITY", "distributorId": other.id}
    with pytest.raises(HTTPException) as ctx:
        svc.scan_pass(stranger, approved["visitCode"])
    assert ctx.value.status_code == 404


def test_public_slots_skip_pending_distributor(db):
    dist = _distributor(db, status="PENDING")
    svc = DistributorVisitService(db)
    day = (now_ist() + timedelta(days=1)).strftime("%Y-%m-%d")
    with pytest.raises(HTTPException) as ctx:
        svc.list_public_slots(dist.id, day)
    assert ctx.value.status_code == 400
