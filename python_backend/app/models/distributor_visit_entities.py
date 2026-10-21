"""Distributor office visits — visitor meets the vendor, not a hospital doctor."""

from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.utils.timezone import now_ist


def _uuid() -> str:
    return str(uuid.uuid4())


class DistributorAvailabilitySlot(Base):
    __tablename__ = "DistributorAvailabilitySlot"
    __table_args__ = (
        UniqueConstraint("distributorId", "slotStart", name="DistributorAvailabilitySlot_dist_slot_key"),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    distributorId: Mapped[str] = mapped_column(String(36), ForeignKey("Distributor.id"), index=True)
    slotStart: Mapped[datetime] = mapped_column(DateTime, index=True)
    slotEnd: Mapped[datetime] = mapped_column(DateTime)
    isBooked: Mapped[bool] = mapped_column(Boolean, default=False)
    visitId: Mapped[str | None] = mapped_column(
        String(36),
        ForeignKey("DistributorVisit.id", use_alter=True, name="fk_dist_slot_visit"),
        nullable=True,
    )
    createdAt: Mapped[datetime] = mapped_column(DateTime, default=now_ist)
    updatedAt: Mapped[datetime] = mapped_column(DateTime, default=now_ist, onupdate=now_ist)


class DistributorVisit(Base):
    __tablename__ = "DistributorVisit"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    visitorAccountId: Mapped[str] = mapped_column(String(36), ForeignKey("VisitorAccount.id"), index=True)
    distributorId: Mapped[str] = mapped_column(String(36), ForeignKey("Distributor.id"), index=True)
    slotId: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("DistributorAvailabilitySlot.id"), nullable=True
    )
    appointmentDate: Mapped[datetime | None] = mapped_column(DateTime, nullable=True, index=True)
    purpose: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(30), default="REQUEST_SENT", index=True)
    visitCode: Mapped[str | None] = mapped_column(String(10), nullable=True)
    visitQRCode: Mapped[str | None] = mapped_column(Text, nullable=True)
    rejectionReason: Mapped[str | None] = mapped_column(Text, nullable=True)
    approvedAt: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    checkInTime: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    checkOutTime: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    checkedInByUserId: Mapped[str | None] = mapped_column(String(36), nullable=True)
    createdAt: Mapped[datetime] = mapped_column(DateTime, default=now_ist)
    updatedAt: Mapped[datetime] = mapped_column(DateTime, default=now_ist, onupdate=now_ist)

    visitor_account = relationship("VisitorAccount")
    distributor = relationship("Distributor")
