"""Tests for delivery management module."""

import uuid
from decimal import Decimal
from unittest.mock import MagicMock

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import Base
from app.delivery.distributor_service import DistributorService
from app.delivery.inbound_delivery_service import InboundDeliveryService
from app.delivery.onboarding_service import DistributorOnboardingService
from app.models import Branch, HospitalChain, User
from app.models.delivery_entities import (
    DeliveryAgent,
    DeliveryVehicle,
    Distributor,
    InboundDelivery,
    VendorWallet,
)
from app.models.enums import DeliveryStatus, Role
import app.models.delivery_entities  # noqa: F401
import app.models.attendant_entities  # noqa: F401
import app.models.permission_entities  # noqa: F401


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


def test_create_distributor_and_delivery(db):
    branch = db.query(Branch).first()
    user = {"id": str(uuid.uuid4()), "role": "HOSPITAL_ADMIN", "branchId": branch.id}

    dist = DistributorService(db).create_distributor(
        user,
        {"vendorName": "Acme Medical", "vendorType": "MEDICAL", "branchId": branch.id},
    )
    assert dist["vendorCode"].startswith("VEN-")

    distributor = db.query(Distributor).filter(Distributor.id == dist["id"]).first()
    agent = DeliveryAgent(
        id=str(uuid.uuid4()),
        distributorId=distributor.id,
        name="Agent",
        isActive=True,
    )
    vehicle = DeliveryVehicle(
        id=str(uuid.uuid4()),
        distributorId=distributor.id,
        registrationNumber="TN99ZZ9999",
        isActive=True,
    )
    wallet = db.query(VendorWallet).filter(VendorWallet.vendorId == distributor.id).first()
    wallet.balance = Decimal("10000")
    db.add_all([agent, vehicle])
    db.commit()

    delivery = InboundDeliveryService(db).create_delivery(
        user,
        {
            "branchId": branch.id,
            "vendorId": distributor.id,
            "vehicleId": vehicle.id,
            "agentId": agent.id,
            "poNumber": "PO-001",
            "items": [{"itemName": "Gloves", "quantityOrdered": 10}],
        },
    )
    assert delivery["status"] == "DRAFT"
    assert delivery["poNumber"] == "PO-001"


def test_distributor_dashboard_summary_is_scoped_and_detailed(db):
    branch = db.query(Branch).first()
    dist = DistributorService(db).create_distributor(
        {"id": "u1", "role": "HOSPITAL_ADMIN", "branchId": branch.id},
        {"vendorName": "CityGen", "vendorType": "MEDICAL", "branchId": branch.id},
    )
    other = DistributorService(db).create_distributor(
        {"id": "u1", "role": "HOSPITAL_ADMIN", "branchId": branch.id},
        {"vendorName": "Other Co", "vendorType": "MEDICAL", "branchId": branch.id},
    )
    mine = db.query(Distributor).filter(Distributor.id == dist["id"]).first()
    theirs = db.query(Distributor).filter(Distributor.id == other["id"]).first()
    agent = DeliveryAgent(distributorId=mine.id, name="Driver A", isActive=True)
    vehicle = DeliveryVehicle(
        distributorId=mine.id, registrationNumber="TN01AA1111", isActive=True
    )
    other_agent = DeliveryAgent(distributorId=theirs.id, name="Driver B", isActive=True)
    other_vehicle = DeliveryVehicle(
        distributorId=theirs.id, registrationNumber="TN01BB2222", isActive=True
    )
    db.add_all([agent, vehicle, other_agent, other_vehicle])
    db.commit()

    svc = InboundDeliveryService(db)
    admin = {"id": "admin", "role": "HOSPITAL_ADMIN", "branchId": branch.id}
    mine_draft = svc.create_delivery(
        admin,
        {
            "branchId": branch.id,
            "vendorId": mine.id,
            "vehicleId": vehicle.id,
            "agentId": agent.id,
            "totalBoxes": 4,
        },
    )
    mine_row = db.get(InboundDelivery, mine_draft["id"])
    mine_row.status = DeliveryStatus.COMPLETED.value
    mine_row.walletFee = 299
    mine_row.goodsType = "Medicines"
    mine_row.unloadMinutes = 30
    svc.create_delivery(
        admin,
        {
            "branchId": branch.id,
            "vendorId": theirs.id,
            "vehicleId": other_vehicle.id,
            "agentId": other_agent.id,
            "totalBoxes": 99,
        },
    )
    db.commit()

    vendor_user = {"id": "dist-user", "role": "DISTRIBUTOR", "distributorId": mine.id}
    summary = svc.dashboard_summary(vendor_user)
    assert summary["total"] == 1
    assert summary["completed"] == 1
    assert summary["totalBoxes"] == 4
    assert summary["totalSpend"] == 299
    assert summary["byHospital"][0]["branchName"] == branch.name
    assert summary["byGoodsType"][0]["goodsType"] == "Medicines"
    assert len(summary["trend"]) == 14

    leaked = svc.dashboard_summary({"id": "x", "role": "DISTRIBUTOR", "distributorId": None})
    assert leaked["total"] == 0


def test_distributor_can_read_and_update_own_profile(db):
    dist = DistributorService(db).create_distributor(
        {"id": "u1", "role": "SUPER_ADMIN"},
        {
            "vendorName": "CityGen",
            "vendorType": "MEDICAL",
            "email": "ops@citygen.demo",
            "phone": "9000000102",
            "contactPerson": "Ops",
        },
    )
    user = User(
        name="Ops",
        phone="9000000102",
        email="ops@citygen.demo",
        role=Role.DISTRIBUTOR.value,
        distributorId=dist["id"],
    )
    db.add(user)
    row = db.get(Distributor, dist["id"])
    row.goodsDescription = "IV fluids"
    row.deliveryMode = "OWN_FLEET"
    row.supplyCategoriesJson = '["medicines"]'
    db.commit()

    svc = DistributorOnboardingService(db)
    me = {"id": user.id, "role": "DISTRIBUTOR", "distributorId": dist["id"]}
    profile = svc.get_me(me)
    assert profile["vendorName"] == "CityGen"
    updated = svc.update_me(
        me,
        {
            "vendorName": "CityGen Logistics",
            "contactPerson": "Priya",
            "phone": "9000000199",
            "email": "priya@citygen.demo",
            "goodsDescription": "IV fluids and consumables",
            "registeredAddress": {
                "line1": "12 Warehouse Rd",
                "city": "Chennai",
                "state": "Tamil Nadu",
                "pinCode": "600001",
            },
        },
    )
    assert updated["vendorName"] == "CityGen Logistics"
    assert updated["contactPerson"] == "Priya"
    assert updated["phone"] == "9000000199"
    assert updated["city"] == "Chennai"
    account = db.query(User).filter(User.id == user.id).first()
    assert account.name == "Priya"
    assert account.phone == "9000000199"
    assert account.email == "priya@citygen.demo"
