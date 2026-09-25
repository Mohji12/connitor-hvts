"""Tests for distributor self-onboarding validation and booking gates."""

import uuid
from datetime import timedelta
from unittest.mock import patch

import pytest
from fastapi import HTTPException
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import Base
from app.delivery.inbound_delivery_service import InboundDeliveryService
from app.delivery.onboarding_service import DistributorOnboardingService
from app.models import Branch, HospitalChain, User
from app.models.delivery_entities import (
    BranchDeliverySettings,
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


def _valid_payload(branch_id: str, **overrides) -> dict:
    data = {
        "email": "vendor.apply@example.com",
        "password": "Password1!",
        "contactPerson": "Ravi Kumar",
        "phone": "9876543210",
        "vendorName": "Acme Pharma Pvt Ltd",
        "legalEntityType": "Pvt Ltd",
        "vendorType": "GENERAL_STORES",
        "gstNumber": "29AABCU9603R1ZM",
        "gstRegistrationType": "Regular",
        "panNumber": "AABCU9603R",
        "cin": "U12345KA2020PTC123456",
        "addressLine1": "12 MG Road",
        "city": "Bengaluru",
        "state": "Karnataka",
        "pinCode": "560001",
        "operatingSameAsRegistered": True,
        "branchIds": [branch_id],
        "supplyCategories": ["consumables"],
        "deliveryMode": "OWN_FLEET",
        "goodsDescription": "Hospital consumables",
        "acceptTerms": True,
        "declarationTrue": True,
    }
    data.update(overrides)
    return data


def test_validate_apply_rejects_invalid_gstin(db):
    branch = db.query(Branch).first()
    svc = DistributorOnboardingService(db)
    with pytest.raises(HTTPException) as ctx:
        svc._validate_apply(_valid_payload(branch.id, gstNumber="INVALID"))
    assert ctx.value.status_code == 400
    assert "GSTIN" in ctx.value.detail


def test_validate_apply_requires_drug_license_for_pharma(db):
    branch = db.query(Branch).first()
    svc = DistributorOnboardingService(db)
    with pytest.raises(HTTPException) as ctx:
        svc._validate_apply(
            _valid_payload(
                branch.id,
                vendorType="PHARMA",
                documents=[],
            )
        )
    assert "Drug license" in ctx.value.detail


@pytest.mark.asyncio
async def test_apply_creates_pending_distributor_user_wallet_mapping(db):
    branch = db.query(Branch).first()
    svc = DistributorOnboardingService(db)
    with patch.object(svc, "_notify_application_received"):
        result = await svc.apply(_valid_payload(branch.id), files=None)

    assert result["vendorCode"].startswith("VEN-")
    dist = db.query(Distributor).filter(Distributor.id == result["id"]).one()
    assert dist.verificationStatus == "PENDING"
    assert dist.onboardingStatus == "SUBMITTED"
    user = db.query(User).filter(User.email == "vendor.apply@example.com").one()
    assert user.role == "DISTRIBUTOR"
    assert user.distributorId == dist.id
    assert user.isActive is True
    assert db.query(VendorWallet).filter(VendorWallet.vendorId == dist.id).count() == 1
    mapping = (
        db.query(VendorBranchMapping)
        .filter(VendorBranchMapping.vendorId == dist.id, VendorBranchMapping.branchId == branch.id)
        .one()
    )
    assert mapping.approvalStatus == "PENDING"


def test_book_delivery_blocked_when_verification_pending(db):
    branch = db.query(Branch).first()
    dist = Distributor(
        id=str(uuid.uuid4()),
        vendorCode="VEN-PEND01",
        vendorName="Pending Vendor",
        vendorType="OTHER",
        isActive=True,
        verificationStatus="PENDING",
    )
    db.add(dist)
    db.flush()
    db.add(
        VendorBranchMapping(
            vendorId=dist.id,
            branchId=branch.id,
            approvalStatus="APPROVED",
        )
    )
    user = User(
        id=str(uuid.uuid4()),
        name="Pending Dist",
        phone="9222222222",
        email="pending@test.com",
        role="DISTRIBUTOR",
        distributorId=dist.id,
        passwordHash=hash_password("Password1!"),
        isActive=True,
    )
    vehicle = DeliveryVehicle(
        id=str(uuid.uuid4()),
        distributorId=dist.id,
        registrationNumber="KA01PEND",
        isActive=True,
    )
    agent = DeliveryAgent(
        id=str(uuid.uuid4()),
        distributorId=dist.id,
        name="Driver",
        email="penddriver@test.com",
        isActive=True,
    )
    db.add_all([user, vehicle, agent])
    db.commit()

    with pytest.raises(HTTPException) as ctx:
        InboundDeliveryService(db).book_delivery(
            {"id": user.id, "role": "DISTRIBUTOR", "distributorId": dist.id},
            {
                "branchId": branch.id,
                "expectedArrivalTime": (now_ist() + timedelta(hours=2)).isoformat(),
                "goodsType": "Supplies",
                "totalBoxes": 2,
                "vehicleId": vehicle.id,
                "agentId": agent.id,
            },
        )
    assert ctx.value.status_code == 400
    assert "not verified" in ctx.value.detail.lower()


def test_set_verification_approves_profile(db):
    dist = Distributor(
        id=str(uuid.uuid4()),
        vendorCode="VEN-REV001",
        vendorName="Review Vendor",
        vendorType="OTHER",
        email="review@test.com",
        verificationStatus="PENDING",
        onboardingStatus="SUBMITTED",
    )
    db.add(dist)
    db.commit()

    svc = DistributorOnboardingService(db)
    with patch.object(svc, "_notify_verification_result"):
        out = svc.set_verification_status(
            {"id": str(uuid.uuid4())},
            dist.id,
            status="APPROVED",
        )
    assert out["verificationStatus"] == "APPROVED"
    assert out["onboardingStatus"] == "APPROVED"
