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
from app.models import Branch, HospitalChain, User
from app.models.delivery_entities import (
    DeliveryAgent,
    DeliveryVehicle,
    Distributor,
    VendorWallet,
)
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
