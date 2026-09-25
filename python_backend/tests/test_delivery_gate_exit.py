"""Tests for delivery gate QR exit and duration."""

import uuid
from datetime import timedelta
from unittest.mock import patch

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import Base
from app.delivery.gate_service import DeliveryGateService
from app.delivery.inbound_delivery_service import InboundDeliveryService
from app.models import Branch, HospitalChain, User
from app.models.delivery_entities import (
    DeliveryAgent,
    DeliveryQrCode,
    DeliveryVehicle,
    Distributor,
    InboundDelivery,
    VendorBranchMapping,
)
from app.models.enums import DeliveryStatus
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


def _seed_received_delivery(db, branch_id: str) -> tuple[InboundDelivery, dict, str, str]:
    dist = Distributor(
        id=str(uuid.uuid4()),
        vendorCode="VEN-EXIT1",
        vendorName="Exit Vendor",
        vendorType="MEDICAL",
        email="vendor@exit.test",
        isActive=True,
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
    agent = DeliveryAgent(
        id=str(uuid.uuid4()),
        distributorId=dist.id,
        name="Driver Exit",
        email="driver@exit.test",
        phone="9000000999",
        isActive=True,
    )
    vehicle = DeliveryVehicle(
        id=str(uuid.uuid4()),
        distributorId=dist.id,
        registrationNumber="KA01EXIT",
        isActive=True,
    )
    security = User(
        id=str(uuid.uuid4()),
        name="Security",
        phone="9000000888",
        email="sec@exit.test",
        role="SECURITY",
        branchId=branch_id,
        passwordHash=hash_password("Password1!"),
        isActive=True,
    )
    db.add_all([agent, vehicle, security])
    db.flush()

    delivery = InboundDelivery(
        id=str(uuid.uuid4()),
        deliveryNumber="DEL-EXIT-001",
        branchId=branch_id,
        vendorId=dist.id,
        agentId=agent.id,
        vehicleId=vehicle.id,
        status=DeliveryStatus.SCHEDULED.value,
        deliveryType="SCHEDULED",
        goodsType="Medicines",
        totalBoxes=5,
        expectedArrivalTime=now_ist() + timedelta(hours=1),
        isActive=True,
    )
    db.add(delivery)
    db.flush()
    payload = f"{delivery.id}:{delivery.deliveryNumber}:test"
    signature = "sig-exit-test"
    db.add(
        DeliveryQrCode(
            deliveryId=delivery.id,
            qrKind="ENTRY",
            qrPayload=payload,
            signature=signature,
            expiresAt=now_ist() + timedelta(hours=24),
        )
    )
    db.commit()
    db.refresh(delivery)
    user = {"id": security.id, "role": "SECURITY", "branchId": branch_id}
    return delivery, user, payload, signature


def test_scan_suggests_mark_exit_when_received(db):
    branch = db.query(Branch).first()
    delivery, user, payload, signature = _seed_received_delivery(db, branch.id)
    delivery.status = DeliveryStatus.RECEIVED.value
    db.commit()

    # ENTRY QR while RECEIVED should not suggest exit — need checkout QR
    with patch("app.delivery.gate_service.hmac") as mock_hmac:
        mock_hmac.new.return_value.hexdigest.return_value = signature
        mock_hmac.compare_digest.return_value = True
        result = DeliveryGateService(db).scan_qr(user, payload, signature)

    assert result["suggestedAction"] == "INFO"
    assert result["qrKind"] == "ENTRY"
    assert result["delivery"]["status"] == DeliveryStatus.RECEIVED.value


def test_process_qr_auto_exits_and_returns_duration(db):
    branch = db.query(Branch).first()
    delivery, user, payload, signature = _seed_received_delivery(db, branch.id)

    gate = DeliveryGateService(db)
    with patch(
        "app.services.notifications_service.NotificationsService.notify_on_delivery_checkout_qr"
    ) as checkout_notify:
        checkout_notify.return_value = {"emailsSent": 1, "recipients": ["driver@exit.test"]}
        gate.allow_entry(user, delivery.id)
    delivery = db.get(InboundDelivery, delivery.id)
    delivery.status = DeliveryStatus.RECEIVED.value
    db.commit()

    exit_qr = (
        db.query(DeliveryQrCode)
        .filter(DeliveryQrCode.deliveryId == delivery.id, DeliveryQrCode.qrKind == "EXIT")
        .first()
    )
    assert exit_qr is not None

    with patch("app.delivery.gate_service.hmac") as mock_hmac, patch(
        "app.services.notifications_service.NotificationsService.notify_on_delivery_exit"
    ) as notify:
        mock_hmac.new.return_value.hexdigest.return_value = exit_qr.signature
        mock_hmac.compare_digest.return_value = True
        notify.return_value = None
        result = gate.process_scanned_qr(user, exit_qr.qrPayload, exit_qr.signature, auto_exit=True)

    assert result["actionTaken"] == "MARK_EXIT"
    assert result["status"] == DeliveryStatus.EXITED.value
    assert result["entryTime"] is not None
    assert result["exitTime"] is not None
    assert result["durationMinutes"] is not None
    assert result["durationMinutes"] >= 0
    notify.assert_called_once()

    serialized = InboundDeliveryService(db)._serialize_dashboard(db.get(InboundDelivery, delivery.id))
    assert serialized["durationMinutes"] is not None
    assert serialized["entryTime"] is not None
    assert serialized["exitTime"] is not None


def test_entry_qr_does_not_auto_exit_when_received(db):
    branch = db.query(Branch).first()
    delivery, user, payload, signature = _seed_received_delivery(db, branch.id)
    gate = DeliveryGateService(db)
    with patch(
        "app.services.notifications_service.NotificationsService.notify_on_delivery_checkout_qr"
    ) as checkout_notify:
        checkout_notify.return_value = {"emailsSent": 0, "recipients": []}
        gate.allow_entry(user, delivery.id)
    delivery = db.get(InboundDelivery, delivery.id)
    delivery.status = DeliveryStatus.RECEIVED.value
    db.commit()

    with patch("app.delivery.gate_service.hmac") as mock_hmac:
        mock_hmac.new.return_value.hexdigest.return_value = signature
        mock_hmac.compare_digest.return_value = True
        result = gate.process_scanned_qr(user, payload, signature, auto_exit=True)

    assert result.get("actionTaken") is None
    assert result["suggestedAction"] == "INFO"
    assert db.get(InboundDelivery, delivery.id).status == DeliveryStatus.RECEIVED.value


def test_mark_exit_emails_distributor_and_driver(db):
    branch = db.query(Branch).first()
    delivery, user, _payload, _sig = _seed_received_delivery(db, branch.id)

    gate = DeliveryGateService(db)
    with patch(
        "app.services.notifications_service.NotificationsService.notify_on_delivery_checkout_qr"
    ) as checkout_notify:
        checkout_notify.return_value = {"emailsSent": 0, "recipients": []}
        gate.allow_entry(user, delivery.id)
    delivery = db.get(InboundDelivery, delivery.id)
    delivery.status = DeliveryStatus.RECEIVED.value
    db.commit()

    with patch(
        "app.services.messaging_service.EmailService._deliver_email"
    ) as deliver:
        deliver.return_value = None
        result = gate.mark_exit(user, delivery.id)

    assert result["status"] == DeliveryStatus.EXITED.value
    assert result["emailsSent"] >= 2
    emailed = {call.args[0].lower() for call in deliver.call_args_list}
    assert "vendor@exit.test" in emailed
    assert "driver@exit.test" in emailed
