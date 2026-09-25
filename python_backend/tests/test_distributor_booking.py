"""Tests for distributor booking, delivery slots, and email-only drivers."""

import uuid
from datetime import timedelta
from unittest.mock import MagicMock, patch

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import Base
from app.delivery.agent_vehicle_service import AgentVehicleService
from app.delivery.delivery_slot_service import DeliverySlotService
from app.delivery.inbound_delivery_service import InboundDeliveryService
from app.models import Branch, HospitalChain, User
from app.models.delivery_entities import (
    BranchDeliverySettings,
    BranchDeliverySlot,
    DeliveryAgent,
    DeliveryVehicle,
    Distributor,
    VendorBranchMapping,
    VendorWallet,
)
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
    session.add(BranchDeliverySettings(branchId=branch.id, allowUnscheduledDeliveries=True))
    session.commit()
    yield session
    session.close()


def _seed_vendor(db, branch_id: str) -> tuple[Distributor, User]:
    dist = Distributor(
        id=str(uuid.uuid4()),
        vendorCode="VEN-000001",
        vendorName="Test Vendor",
        vendorType="MEDICAL",
        isActive=True,
        verificationStatus="APPROVED",
        onboardingStatus="APPROVED",
    )
    db.add(dist)
    db.flush()
    db.add(
        VendorBranchMapping(
            vendorId=dist.id,
            branchId=branch_id,
            approvalStatus="APPROVED",
        )
    )
    from decimal import Decimal

    db.add(VendorWallet(vendorId=dist.id, balance=Decimal("10000")))
    user = User(
        id=str(uuid.uuid4()),
        name="Distributor User",
        phone="9111111111",
        email="dist@test.com",
        role="DISTRIBUTOR",
        distributorId=dist.id,
        passwordHash=hash_password("Password1!"),
        isActive=True,
    )
    db.add(user)
    db.commit()
    return dist, user


def test_delivery_slot_booking(db):
    branch = db.query(Branch).first()
    slot_start = now_ist() + timedelta(days=1)
    slot = BranchDeliverySlot(
        branchId=branch.id,
        slotStart=slot_start,
        slotEnd=slot_start + timedelta(hours=1),
        maxDeliveries=1,
        bookedCount=0,
        isActive=True,
    )
    db.add(slot)
    db.commit()

    dist, user = _seed_vendor(db, branch.id)
    vehicle = DeliveryVehicle(
        id=str(uuid.uuid4()),
        distributorId=dist.id,
        registrationNumber="KA01TEST",
        lengthCm=50,
        breadthCm=50,
        heightCm=50,
        volumeCm3=125000,
        isActive=True,
    )
    agent = DeliveryAgent(
        id=str(uuid.uuid4()),
        distributorId=dist.id,
        name="Driver One",
        email="driver@test.com",
        isActive=True,
    )
    db.add_all([vehicle, agent])
    db.commit()

    user_dict = {"id": user.id, "role": "DISTRIBUTOR", "distributorId": dist.id}
    with patch.object(InboundDeliveryService, "_generate_qr"), patch(
        "app.delivery.inbound_delivery_service.NotificationsService"
    ):
        result = InboundDeliveryService(db).book_delivery(
            user_dict,
            {
                "branchId": branch.id,
                "slotId": slot.id,
                "poNumber": "PO-1001",
                "packages": [
                    {"packageType": "Medium", "qty": 2, "remarks": "Fragile"},
                    {"packageType": "Small", "qty": 1},
                ],
                "vehicleCategory": "Auto",
                "vehicleId": vehicle.id,
                "agentId": agent.id,
            },
        )

    assert result["status"] == "SCHEDULED"
    assert result["poNumber"] == "PO-1001"
    assert result["pricing"]["walletFee"] == 149
    assert result["pricing"]["usedUnits"] == 5
    db.refresh(slot)
    assert slot.bookedCount == 1


def test_create_agent_does_not_create_user_account(db):
    branch = db.query(Branch).first()
    dist, user = _seed_vendor(db, branch.id)
    user_dict = {"id": user.id, "role": "DISTRIBUTOR", "distributorId": dist.id}

    result = AgentVehicleService(db).create_agent(
        user_dict,
        {"name": "Driver Two", "email": "driver2@test.com", "phone": "9333333333"},
    )

    assert result["email"] == "driver2@test.com"
    assert "credentialsSent" not in result
    agent_users = db.query(User).filter(User.email == "driver2@test.com").all()
    assert agent_users == []
    assert db.query(User).filter(User.role == "DELIVERY_AGENT").count() == 0


def test_book_delivery_sends_driver_assignment_email(db):
    branch = db.query(Branch).first()
    dist, user = _seed_vendor(db, branch.id)
    vehicle = DeliveryVehicle(
        id=str(uuid.uuid4()),
        distributorId=dist.id,
        registrationNumber="KA01MAIL",
        lengthCm=50,
        breadthCm=50,
        heightCm=50,
        volumeCm3=125000,
        isActive=True,
    )
    agent = DeliveryAgent(
        id=str(uuid.uuid4()),
        distributorId=dist.id,
        name="Mail Driver",
        email="maildriver@test.com",
        isActive=True,
    )
    db.add_all([vehicle, agent])
    db.commit()

    user_dict = {"id": user.id, "role": "DISTRIBUTOR", "distributorId": dist.id}
    mock_notify = MagicMock()
    with patch(
        "app.delivery.inbound_delivery_service.NotificationsService",
        return_value=mock_notify,
    ):
        InboundDeliveryService(db).book_delivery(
            user_dict,
            {
                "branchId": branch.id,
                "expectedArrivalTime": (now_ist() + timedelta(hours=2)).isoformat(),
                "packages": [{"packageType": "Small", "qty": 1}],
                "vehicleCategory": "Bike",
                "vehicleId": vehicle.id,
                "agentId": agent.id,
                "remarks": "Use loading bay B",
            },
        )

    mock_notify.notify_on_scheduled_delivery.assert_called_once()


def test_book_delivery_dummy_payment_zero_balance(db):
    """DUMMY payment credits then debits so booking works with empty wallet."""
    from decimal import Decimal

    from app.models.delivery_entities import WalletTransaction

    branch = db.query(Branch).first()
    dist, user = _seed_vendor(db, branch.id)
    wallet = db.query(VendorWallet).filter(VendorWallet.vendorId == dist.id).first()
    wallet.balance = Decimal("0")
    db.commit()

    vehicle = DeliveryVehicle(
        id=str(uuid.uuid4()),
        distributorId=dist.id,
        registrationNumber="KA01DUMMY",
        lengthCm=50,
        breadthCm=50,
        heightCm=50,
        volumeCm3=125000,
        isActive=True,
    )
    agent = DeliveryAgent(
        id=str(uuid.uuid4()),
        distributorId=dist.id,
        name="Dummy Driver",
        email="dummydriver@test.com",
        isActive=True,
    )
    db.add_all([vehicle, agent])
    db.commit()

    user_dict = {"id": user.id, "role": "DISTRIBUTOR", "distributorId": dist.id}
    with patch.object(InboundDeliveryService, "_generate_qr"), patch(
        "app.delivery.inbound_delivery_service.NotificationsService"
    ):
        result = InboundDeliveryService(db).book_delivery(
            user_dict,
            {
                "branchId": branch.id,
                "expectedArrivalTime": (now_ist() + timedelta(hours=2)).isoformat(),
                "packages": [{"packageType": "Small", "qty": 1}],
                "vehicleCategory": "Bike",
                "vehicleId": vehicle.id,
                "agentId": agent.id,
                "paymentMethod": "DUMMY",
            },
        )

    assert result["status"] == "SCHEDULED"
    assert result["paymentMethod"] == "DUMMY"
    assert result["pricing"]["walletFee"] == 48
    db.refresh(wallet)
    assert float(wallet.balance) == 0.0

    txs = (
        db.query(WalletTransaction)
        .filter(WalletTransaction.walletId == wallet.id)
        .order_by(WalletTransaction.createdAt.asc())
        .all()
    )
    assert len(txs) >= 2
    credit = next(t for t in txs if t.referenceType == "DUMMY_PAYMENT")
    debit = next(t for t in txs if t.referenceType == "DELIVERY")
    assert credit.transactionType == "CREDIT"
    assert float(credit.amount) == 48.0
    assert debit.transactionType == "DEBIT"
    assert float(debit.amount) == -48.0


def test_bulk_create_slots(db):
    branch = db.query(Branch).first()
    admin = {"id": str(uuid.uuid4()), "role": "HOSPITAL_ADMIN", "branchId": branch.id}
    start = (now_ist() + timedelta(days=1)).date()
    end = start + timedelta(days=2)
    result = DeliverySlotService(db).bulk_create_slots(
        branch.id,
        admin,
        {"startDate": start.isoformat(), "endDate": end.isoformat(), "slotMinutes": 60},
    )
    assert result["created"] > 0
