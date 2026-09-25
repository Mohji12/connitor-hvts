"""Delivery management ORM models (branch-scoped). Ported from Connitor_delivery with branchId."""

from __future__ import annotations

import uuid
from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import Boolean, Date, DateTime, ForeignKey, Integer, Numeric, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.utils.timezone import now_ist


def _uuid() -> str:
    return str(uuid.uuid4())


class BranchDeliverySlot(Base):
    __tablename__ = "BranchDeliverySlot"
    __table_args__ = (
        UniqueConstraint("branchId", "slotStart", name="BranchDeliverySlot_branch_slot_key"),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    branchId: Mapped[str] = mapped_column(String(36), ForeignKey("Branch.id"), index=True)
    slotStart: Mapped[datetime] = mapped_column(DateTime, index=True)
    slotEnd: Mapped[datetime] = mapped_column(DateTime)
    maxDeliveries: Mapped[int] = mapped_column(Integer, default=1)
    bookedCount: Mapped[int] = mapped_column(Integer, default=0)
    # Minute pool inside the window (e.g. 120-min hospital window; each booking consumes unload minutes)
    bookedMinutes: Mapped[int] = mapped_column(Integer, default=0)
    isActive: Mapped[bool] = mapped_column(Boolean, default=True)
    createdAt: Mapped[datetime] = mapped_column(DateTime, default=now_ist)
    updatedAt: Mapped[datetime] = mapped_column(DateTime, default=now_ist, onupdate=now_ist)


class BranchDeliverySettings(Base):
    __tablename__ = "BranchDeliverySettings"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    branchId: Mapped[str] = mapped_column(String(36), ForeignKey("Branch.id"), unique=True, index=True)
    otpTimeoutMinutes: Mapped[int] = mapped_column(Integer, default=10)
    allowUnscheduledDeliveries: Mapped[bool] = mapped_column(Boolean, default=True)
    allowEcommerceDeliveries: Mapped[bool] = mapped_column(Boolean, default=True)
    requireAgentPhoto: Mapped[bool] = mapped_column(Boolean, default=False)
    requireVehiclePhoto: Mapped[bool] = mapped_column(Boolean, default=False)
    requirePoValidation: Mapped[bool] = mapped_column(Boolean, default=True)
    enableQrPass: Mapped[bool] = mapped_column(Boolean, default=True)
    createdAt: Mapped[datetime] = mapped_column(DateTime, default=now_ist)
    updatedAt: Mapped[datetime] = mapped_column(DateTime, default=now_ist, onupdate=now_ist)


class ReceivingDock(Base):
    __tablename__ = "ReceivingDock"
    __table_args__ = (UniqueConstraint("branchId", "dockCode", name="ReceivingDock_branch_code_key"),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    branchId: Mapped[str] = mapped_column(String(36), ForeignKey("Branch.id"), index=True)
    dockName: Mapped[str] = mapped_column(String(100))
    dockCode: Mapped[str] = mapped_column(String(50))
    locationDescription: Mapped[str | None] = mapped_column(Text, nullable=True)
    maxVehicleCapacity: Mapped[int | None] = mapped_column(Integer, nullable=True)
    isActive: Mapped[bool] = mapped_column(Boolean, default=True)
    createdAt: Mapped[datetime] = mapped_column(DateTime, default=now_ist)


class DeliveryGate(Base):
    __tablename__ = "DeliveryGate"
    __table_args__ = (UniqueConstraint("branchId", "gateCode", name="DeliveryGate_branch_code_key"),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    branchId: Mapped[str] = mapped_column(String(36), ForeignKey("Branch.id"), index=True)
    gateName: Mapped[str] = mapped_column(String(100))
    gateCode: Mapped[str] = mapped_column(String(50))
    gateType: Mapped[str] = mapped_column(String(30))
    securityHeadId: Mapped[str | None] = mapped_column(String(36), ForeignKey("User.id"), nullable=True)
    isActive: Mapped[bool] = mapped_column(Boolean, default=True)


class VendorCodeSequence(Base):
    __tablename__ = "VendorCodeSequence"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, default=1)
    lastNumber: Mapped[int] = mapped_column(Integer, default=0)


class Distributor(Base):
    __tablename__ = "Distributor"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    vendorCode: Mapped[str] = mapped_column(String(50), unique=True, index=True)
    vendorName: Mapped[str] = mapped_column(String(255))
    vendorType: Mapped[str] = mapped_column(String(30), index=True)
    gstNumber: Mapped[str | None] = mapped_column(String(50), unique=True, nullable=True)
    panNumber: Mapped[str | None] = mapped_column(String(20), nullable=True)
    contactPerson: Mapped[str | None] = mapped_column(String(255), nullable=True)
    email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    phone: Mapped[str | None] = mapped_column(String(20), nullable=True)
    city: Mapped[str | None] = mapped_column(String(100), nullable=True)
    state: Mapped[str | None] = mapped_column(String(100), nullable=True)
    isActive: Mapped[bool] = mapped_column(Boolean, default=True)
    verificationStatus: Mapped[str] = mapped_column(String(20), default="PENDING")
    # Onboarding / India hospital vendor profile
    legalEntityType: Mapped[str | None] = mapped_column(String(50), nullable=True)
    tradeName: Mapped[str | None] = mapped_column(String(255), nullable=True)
    cin: Mapped[str | None] = mapped_column(String(50), nullable=True)
    udyamNumber: Mapped[str | None] = mapped_column(String(50), nullable=True)
    website: Mapped[str | None] = mapped_column(String(255), nullable=True)
    yearEstablished: Mapped[int | None] = mapped_column(Integer, nullable=True)
    gstRegistrationType: Mapped[str | None] = mapped_column(String(30), nullable=True)
    registeredAddressJson: Mapped[str | None] = mapped_column(Text, nullable=True)
    operatingAddressJson: Mapped[str | None] = mapped_column(Text, nullable=True)
    serviceableStatesJson: Mapped[str | None] = mapped_column(Text, nullable=True)
    supplyCategoriesJson: Mapped[str | None] = mapped_column(Text, nullable=True)
    deliveryMode: Mapped[str | None] = mapped_column(String(40), nullable=True)
    goodsDescription: Mapped[str | None] = mapped_column(Text, nullable=True)
    accountsEmail: Mapped[str | None] = mapped_column(String(255), nullable=True)
    dispatchPhone: Mapped[str | None] = mapped_column(String(20), nullable=True)
    alternatePhone: Mapped[str | None] = mapped_column(String(20), nullable=True)
    designation: Mapped[str | None] = mapped_column(String(100), nullable=True)
    preferredLanguage: Mapped[str | None] = mapped_column(String(20), nullable=True)
    onboardingStatus: Mapped[str] = mapped_column(String(30), default="APPROVED")
    rejectionReason: Mapped[str | None] = mapped_column(Text, nullable=True)
    submittedAt: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    reviewedAt: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    reviewedById: Mapped[str | None] = mapped_column(String(36), ForeignKey("User.id"), nullable=True)
    termsAcceptedAt: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    createdAt: Mapped[datetime] = mapped_column(DateTime, default=now_ist)
    updatedAt: Mapped[datetime] = mapped_column(DateTime, default=now_ist, onupdate=now_ist)

    agents: Mapped[list["DeliveryAgent"]] = relationship(back_populates="distributor")
    vehicles: Mapped[list["DeliveryVehicle"]] = relationship(back_populates="distributor")
    branchMappings: Mapped[list["VendorBranchMapping"]] = relationship(back_populates="vendor")
    documents: Mapped[list["DistributorDocument"]] = relationship(
        back_populates="distributor", cascade="all, delete-orphan"
    )


class DistributorDocument(Base):
    __tablename__ = "DistributorDocument"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    distributorId: Mapped[str] = mapped_column(String(36), ForeignKey("Distributor.id"), index=True)
    documentType: Mapped[str] = mapped_column(String(50), index=True)
    documentNumber: Mapped[str | None] = mapped_column(String(100), nullable=True)
    expiresAt: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    fileUrl: Mapped[str | None] = mapped_column(Text, nullable=True)
    verificationStatus: Mapped[str] = mapped_column(String(20), default="PENDING")
    createdAt: Mapped[datetime] = mapped_column(DateTime, default=now_ist)

    distributor: Mapped["Distributor"] = relationship(back_populates="documents")


class DeliveryAgent(Base):
    __tablename__ = "DeliveryAgent"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    distributorId: Mapped[str] = mapped_column(String(36), ForeignKey("Distributor.id"), index=True)
    name: Mapped[str] = mapped_column(String(255))
    email: Mapped[str | None] = mapped_column(String(255), unique=True, nullable=True)
    phone: Mapped[str | None] = mapped_column(String(20), nullable=True)
    licenseNumber: Mapped[str | None] = mapped_column(String(50), nullable=True)
    userId: Mapped[str | None] = mapped_column(String(36), ForeignKey("User.id"), nullable=True)
    isActive: Mapped[bool] = mapped_column(Boolean, default=True)
    createdAt: Mapped[datetime] = mapped_column(DateTime, default=now_ist)

    distributor: Mapped["Distributor"] = relationship(back_populates="agents")


class DeliveryVehicle(Base):
    __tablename__ = "DeliveryVehicle"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    distributorId: Mapped[str] = mapped_column(String(36), ForeignKey("Distributor.id"), index=True)
    registrationNumber: Mapped[str] = mapped_column(String(30), unique=True)
    vehicleType: Mapped[str | None] = mapped_column(String(30), nullable=True)
    lengthCm: Mapped[float | None] = mapped_column(Numeric(12, 2), nullable=True)
    breadthCm: Mapped[float | None] = mapped_column(Numeric(12, 2), nullable=True)
    heightCm: Mapped[float | None] = mapped_column(Numeric(12, 2), nullable=True)
    volumeCm3: Mapped[float | None] = mapped_column(Numeric(18, 2), nullable=True)
    isActive: Mapped[bool] = mapped_column(Boolean, default=True)
    createdAt: Mapped[datetime] = mapped_column(DateTime, default=now_ist)

    distributor: Mapped["Distributor"] = relationship(back_populates="vehicles")


class VendorBranchMapping(Base):
    __tablename__ = "VendorBranchMapping"
    __table_args__ = (UniqueConstraint("vendorId", "branchId", name="VendorBranchMapping_vendor_branch_key"),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    vendorId: Mapped[str] = mapped_column(String(36), ForeignKey("Distributor.id"), index=True)
    branchId: Mapped[str] = mapped_column(String(36), ForeignKey("Branch.id"), index=True)
    approvalStatus: Mapped[str] = mapped_column(String(20), default="PENDING")
    createdAt: Mapped[datetime] = mapped_column(DateTime, default=now_ist)

    vendor: Mapped["Distributor"] = relationship(back_populates="branchMappings")


class DeliveryNumberSequence(Base):
    __tablename__ = "DeliveryNumberSequence"

    year: Mapped[int] = mapped_column(Integer, primary_key=True)
    lastNumber: Mapped[int] = mapped_column(Integer, default=0)


class InboundDelivery(Base):
    __tablename__ = "InboundDelivery"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    deliveryNumber: Mapped[str] = mapped_column(String(30), unique=True, index=True)
    branchId: Mapped[str] = mapped_column(String(36), ForeignKey("Branch.id"), index=True)
    vendorId: Mapped[str] = mapped_column(String(36), ForeignKey("Distributor.id"), index=True)
    vehicleId: Mapped[str] = mapped_column(String(36), ForeignKey("DeliveryVehicle.id"))
    agentId: Mapped[str] = mapped_column(String(36), ForeignKey("DeliveryAgent.id"))
    slotId: Mapped[str | None] = mapped_column(String(36), ForeignKey("BranchDeliverySlot.id"), nullable=True)
    goodsType: Mapped[str | None] = mapped_column(String(255), nullable=True)
    deliveryType: Mapped[str] = mapped_column(String(20), index=True)
    status: Mapped[str] = mapped_column(String(30), index=True, default="DRAFT")
    poNumber: Mapped[str | None] = mapped_column(String(100), nullable=True)
    invoiceNumber: Mapped[str | None] = mapped_column(String(100), nullable=True)
    expectedDeliveryDate: Mapped[date | None] = mapped_column(Date, nullable=True)
    expectedArrivalTime: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    actualArrivalTime: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    totalBoxes: Mapped[int] = mapped_column(Integer, default=0)
    remarks: Mapped[str | None] = mapped_column(Text, nullable=True)
    urgentReason: Mapped[str | None] = mapped_column(Text, nullable=True)
    boxLengthCm: Mapped[float | None] = mapped_column(Numeric(12, 2), nullable=True)
    boxBreadthCm: Mapped[float | None] = mapped_column(Numeric(12, 2), nullable=True)
    boxHeightCm: Mapped[float | None] = mapped_column(Numeric(12, 2), nullable=True)
    cargoVolumeCm3: Mapped[float | None] = mapped_column(Numeric(18, 2), nullable=True)
    vehicleVolumeCm3: Mapped[float | None] = mapped_column(Numeric(18, 2), nullable=True)
    unloadMinutes: Mapped[float | None] = mapped_column(Numeric(12, 2), nullable=True)
    walletFee: Mapped[Decimal] = mapped_column(Numeric(14, 2), default=0)
    holdReason: Mapped[str | None] = mapped_column(Text, nullable=True)
    holdUntil: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    heldAt: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    heldById: Mapped[str | None] = mapped_column(String(36), ForeignKey("User.id"), nullable=True)
    isActive: Mapped[bool] = mapped_column(Boolean, default=True)
    createdById: Mapped[str | None] = mapped_column(String(36), ForeignKey("User.id"), nullable=True)
    createdAt: Mapped[datetime] = mapped_column(DateTime, default=now_ist)
    updatedAt: Mapped[datetime] = mapped_column(DateTime, default=now_ist, onupdate=now_ist)

    items: Mapped[list["InboundDeliveryItem"]] = relationship(back_populates="delivery", cascade="all, delete-orphan")
    qrCodes: Mapped[list["DeliveryQrCode"]] = relationship(
        back_populates="delivery", cascade="all, delete-orphan"
    )
    statusHistory: Mapped[list["InboundDeliveryStatusHistory"]] = relationship(back_populates="delivery")

    @property
    def qrCode(self) -> "DeliveryQrCode | None":
        """Entry/check-in QR (legacy single-QR accessor)."""
        for qr in self.qrCodes or []:
            if (qr.qrKind or "ENTRY") == "ENTRY":
                return qr
        return None

    def qr_for_kind(self, kind: str) -> "DeliveryQrCode | None":
        for qr in self.qrCodes or []:
            if (qr.qrKind or "ENTRY") == kind:
                return qr
        return None


class InboundDeliveryItem(Base):
    __tablename__ = "InboundDeliveryItem"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    deliveryId: Mapped[str] = mapped_column(String(36), ForeignKey("InboundDelivery.id"), index=True)
    itemName: Mapped[str] = mapped_column(String(255))
    quantityOrdered: Mapped[int] = mapped_column(Integer, default=0)
    quantityReceived: Mapped[int] = mapped_column(Integer, default=0)
    unit: Mapped[str | None] = mapped_column(String(20), nullable=True)

    delivery: Mapped["InboundDelivery"] = relationship(back_populates="items")


class InboundDeliveryStatusHistory(Base):
    __tablename__ = "InboundDeliveryStatusHistory"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    deliveryId: Mapped[str] = mapped_column(String(36), ForeignKey("InboundDelivery.id"), index=True)
    oldStatus: Mapped[str | None] = mapped_column(String(30), nullable=True)
    newStatus: Mapped[str] = mapped_column(String(30))
    changedById: Mapped[str | None] = mapped_column(String(36), ForeignKey("User.id"), nullable=True)
    remarks: Mapped[str | None] = mapped_column(Text, nullable=True)
    createdAt: Mapped[datetime] = mapped_column(DateTime, default=now_ist)

    delivery: Mapped["InboundDelivery"] = relationship(back_populates="statusHistory")


class DeliveryQrCode(Base):
    __tablename__ = "DeliveryQrCode"
    __table_args__ = (
        UniqueConstraint("deliveryId", "qrKind", name="DeliveryQrCode_delivery_kind_key"),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    deliveryId: Mapped[str] = mapped_column(String(36), ForeignKey("InboundDelivery.id"), index=True)
    qrKind: Mapped[str] = mapped_column(String(20), default="ENTRY")  # ENTRY | EXIT
    qrPayload: Mapped[str] = mapped_column(Text)
    signature: Mapped[str] = mapped_column(String(255))
    expiresAt: Mapped[datetime] = mapped_column(DateTime)
    createdAt: Mapped[datetime] = mapped_column(DateTime, default=now_ist)

    delivery: Mapped["InboundDelivery"] = relationship(back_populates="qrCodes")


class DeliverySecurityScan(Base):
    __tablename__ = "DeliverySecurityScan"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    deliveryId: Mapped[str] = mapped_column(String(36), ForeignKey("InboundDelivery.id"), index=True)
    scannedById: Mapped[str] = mapped_column(String(36), ForeignKey("User.id"))
    scanResult: Mapped[str] = mapped_column(String(30))
    createdAt: Mapped[datetime] = mapped_column(DateTime, default=now_ist)


class DeliveryGateEntry(Base):
    __tablename__ = "DeliveryGateEntry"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    deliveryId: Mapped[str] = mapped_column(String(36), ForeignKey("InboundDelivery.id"), index=True)
    gateId: Mapped[str | None] = mapped_column(String(36), ForeignKey("DeliveryGate.id"), nullable=True)
    passNumber: Mapped[str | None] = mapped_column(String(30), nullable=True)
    entryTime: Mapped[datetime] = mapped_column(DateTime, default=now_ist)
    allowedById: Mapped[str] = mapped_column(String(36), ForeignKey("User.id"))


class DeliveryGateExit(Base):
    __tablename__ = "DeliveryGateExit"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    deliveryId: Mapped[str] = mapped_column(String(36), ForeignKey("InboundDelivery.id"), index=True)
    exitTime: Mapped[datetime] = mapped_column(DateTime, default=now_ist)
    markedById: Mapped[str] = mapped_column(String(36), ForeignKey("User.id"))


class DeliveryVisitorLog(Base):
    __tablename__ = "DeliveryVisitorLog"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    branchId: Mapped[str] = mapped_column(String(36), ForeignKey("Branch.id"), index=True)
    deliveryId: Mapped[str | None] = mapped_column(String(36), ForeignKey("InboundDelivery.id"), nullable=True)
    agentName: Mapped[str | None] = mapped_column(String(255), nullable=True)
    mobileNumber: Mapped[str | None] = mapped_column(String(20), nullable=True)
    vehicleNumber: Mapped[str | None] = mapped_column(String(30), nullable=True)
    purpose: Mapped[str | None] = mapped_column(String(255), nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="INSIDE")
    entryTime: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    exitTime: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)


class VisitDeliveryLink(Base):
    __tablename__ = "VisitDeliveryLink"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    visitId: Mapped[str | None] = mapped_column(String(36), ForeignKey("Visit.id"), nullable=True, index=True)
    deliveryId: Mapped[str | None] = mapped_column(String(36), ForeignKey("InboundDelivery.id"), nullable=True, index=True)
    visitorLogId: Mapped[str | None] = mapped_column(String(36), ForeignKey("DeliveryVisitorLog.id"), nullable=True)
    createdAt: Mapped[datetime] = mapped_column(DateTime, default=now_ist)


class DockAssignment(Base):
    __tablename__ = "DockAssignment"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    deliveryId: Mapped[str] = mapped_column(String(36), ForeignKey("InboundDelivery.id"), index=True)
    dockId: Mapped[str] = mapped_column(String(36), ForeignKey("ReceivingDock.id"))
    assignedAt: Mapped[datetime] = mapped_column(DateTime, default=now_ist)
    status: Mapped[str] = mapped_column(String(30), default="ASSIGNED")


class ReceivingRecord(Base):
    __tablename__ = "ReceivingRecord"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    deliveryId: Mapped[str] = mapped_column(String(36), ForeignKey("InboundDelivery.id"), unique=True)
    startedAt: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    completedAt: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    status: Mapped[str] = mapped_column(String(30), default="PENDING")


class GrnRecord(Base):
    __tablename__ = "GrnRecord"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    deliveryId: Mapped[str] = mapped_column(String(36), ForeignKey("InboundDelivery.id"), unique=True)
    grnNumber: Mapped[str] = mapped_column(String(30), unique=True)
    generatedAt: Mapped[datetime] = mapped_column(DateTime, default=now_ist)
    generatedById: Mapped[str] = mapped_column(String(36), ForeignKey("User.id"))


class VendorWallet(Base):
    __tablename__ = "VendorWallet"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    vendorId: Mapped[str] = mapped_column(String(36), ForeignKey("Distributor.id"), unique=True)
    balance: Mapped[Decimal] = mapped_column(Numeric(14, 2), default=0)
    updatedAt: Mapped[datetime] = mapped_column(DateTime, default=now_ist, onupdate=now_ist)


class WalletTransaction(Base):
    __tablename__ = "WalletTransaction"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    walletId: Mapped[str] = mapped_column(String(36), ForeignKey("VendorWallet.id"), index=True)
    amount: Mapped[Decimal] = mapped_column(Numeric(14, 2))
    transactionType: Mapped[str] = mapped_column(String(20))
    referenceType: Mapped[str | None] = mapped_column(String(50), nullable=True)
    referenceId: Mapped[str | None] = mapped_column(String(36), nullable=True)
    createdAt: Mapped[datetime] = mapped_column(DateTime, default=now_ist)
