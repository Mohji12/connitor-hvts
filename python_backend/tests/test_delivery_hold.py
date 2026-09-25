"""Tests for security delivery hold (internal bypass)."""

import uuid
from datetime import timedelta
from unittest.mock import MagicMock, patch

import pytest
from fastapi import HTTPException
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import Base
from app.delivery.gate_service import DeliveryGateService
from app.delivery.inbound_delivery_service import InboundDeliveryService
from app.models import Branch, HospitalChain, User
from app.models.delivery_entities import (
    DeliveryAgent,
    DeliveryVehicle,
    Distributor,
    InboundDelivery,
    VendorBranchMapping,
)
from app.models.enums import DeliveryStatus, DeliveryType
import app.models.delivery_entities  # noqa: F401
import app.models.attendant_entities  # noqa: F401
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
        name="Test Branch",
        email="branch@test.com",
        phone="9000000001",
        street="St",
        city="City",
        state="ST",
        pinCode="000000",
        hospitalChainId=chain.id,
    )
    session.add_all([chain, branch])
    session.commit()
    yield session
    session.close()


def _seed_scheduled(db, branch_id: str) -> tuple[InboundDelivery, dict]:
    dist = Distributor(
        id=str(uuid.uuid4()),
        vendorCode="VEN-HOLD1",
        vendorName="Hold Vendor",
        vendorType="MEDICAL",
        email="vendor@hold.test",
        isActive=True,
        verificationStatus="APPROVED",
    )
    db.add(dist)
    db.flush()
    db.add(
        VendorBranchMapping(
            vendorId=dist.id, branchId=branch_id, approvalStatus="APPROVED"
        )
    )
    vehicle = DeliveryVehicle(
        id=str(uuid.uuid4()),
        distributorId=dist.id,
        registrationNumber="KA01HOLD",
        isActive=True,
    )
    agent = DeliveryAgent(
        id=str(uuid.uuid4()),
        distributorId=dist.id,
        name="Hold Driver",
        email="driver@hold.test",
        isActive=True,
    )
    security = User(
        id=str(uuid.uuid4()),
        name="Security",
        phone="9222222222",
        email="sec@hold.test",
        role="SECURITY",
        branchId=branch_id,
        passwordHash=hash_password("Password1!"),
        isActive=True,
    )
    arrival = now_ist() + timedelta(hours=2)
    delivery = InboundDelivery(
        deliveryNumber=f"DLV-HOLD-{uuid.uuid4().hex[:6]}",
        branchId=branch_id,
        vendorId=dist.id,
        vehicleId=vehicle.id,
        agentId=agent.id,
        goodsType="Medicines",
        deliveryType=DeliveryType.STANDARD.value,
        status=DeliveryStatus.SCHEDULED.value,
        expectedArrivalTime=arrival,
        totalBoxes=2,
    )
    db.add_all([vehicle, agent, security, delivery])
    db.commit()
    user = {"id": security.id, "role": "SECURITY", "branchId": branch_id}
    return delivery, user


def test_hold_and_release_restores_schedule(db):
    branch = db.query(Branch).first()
    delivery, user = _seed_scheduled(db, branch.id)
    original_arrival = delivery.expectedArrivalTime
    svc = InboundDeliveryService(db)
    mock_ns = MagicMock()

    with patch(
        "app.services.notifications_service.NotificationsService",
        return_value=mock_ns,
    ):
        held = svc.hold_delivery(
            delivery.id, user, "Internal pharmacy dock use", None
        )
        assert held["status"] == DeliveryStatus.ON_HOLD.value
        mock_ns.notify_on_delivery_hold.assert_called_once()

        db.refresh(delivery)
        assert delivery.status == DeliveryStatus.ON_HOLD.value
        assert delivery.holdReason == "Internal pharmacy dock use"
        assert delivery.heldById == user["id"]
        assert delivery.expectedArrivalTime == original_arrival

        released = svc.release_hold(delivery.id, user)
        assert released["status"] == DeliveryStatus.SCHEDULED.value
        mock_ns.notify_on_delivery_hold_released.assert_called_once()

    db.refresh(delivery)
    assert delivery.status == DeliveryStatus.SCHEDULED.value
    assert delivery.holdReason is None
    assert delivery.heldAt is None
    assert delivery.heldById is None
    assert delivery.expectedArrivalTime == original_arrival


def test_allow_entry_blocked_while_on_hold(db):
    branch = db.query(Branch).first()
    delivery, user = _seed_scheduled(db, branch.id)
    svc = InboundDeliveryService(db)
    mock_ns = MagicMock()

    with patch(
        "app.services.notifications_service.NotificationsService",
        return_value=mock_ns,
    ):
        svc.hold_delivery(delivery.id, user, "Internal transfer", None)

    gate = DeliveryGateService(db)
    with pytest.raises(HTTPException) as exc:
        gate.allow_entry(user, delivery.id)
    assert exc.value.status_code == 400
    assert "hold" in str(exc.value.detail).lower()


def test_today_list_includes_on_hold(db):
    branch = db.query(Branch).first()
    delivery, user = _seed_scheduled(db, branch.id)
    svc = InboundDeliveryService(db)
    mock_ns = MagicMock()

    with patch(
        "app.services.notifications_service.NotificationsService",
        return_value=mock_ns,
    ):
        svc.hold_delivery(delivery.id, user, "Bay blocked", None)

    today = svc.list_today_deliveries(user, branch.id)
    ids = {d["id"] for d in today["deliveries"]}
    assert delivery.id in ids
    row = next(d for d in today["deliveries"] if d["id"] == delivery.id)
    assert row["status"] == DeliveryStatus.ON_HOLD.value
    assert row["holdReason"] == "Bay blocked"
