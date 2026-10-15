"""Visitor asks a doctor for a specific date/time; the doctor confirms or rejects on WhatsApp."""

from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base
from app.utils.timezone import now_ist

SLOT_REQUEST_PENDING = "PENDING"
SLOT_REQUEST_APPROVED = "APPROVED"
SLOT_REQUEST_REJECTED = "REJECTED"


def _uuid() -> str:
    return str(uuid.uuid4())


class SlotRequest(Base):
    __tablename__ = "SlotRequest"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    visitorAccountId: Mapped[str] = mapped_column(
        String(36), ForeignKey("VisitorAccount.id"), index=True
    )
    doctorId: Mapped[str] = mapped_column(String(36), ForeignKey("User.id"), index=True)
    branchId: Mapped[str] = mapped_column(String(36), ForeignKey("Branch.id"))
    departmentId: Mapped[str] = mapped_column(String(36), ForeignKey("Department.id"))
    subDepartmentId: Mapped[str] = mapped_column(String(36), ForeignKey("SubDepartment.id"))
    requestedStart: Mapped[datetime] = mapped_column(DateTime)
    purpose: Mapped[str] = mapped_column(String(191))
    status: Mapped[str] = mapped_column(String(20), default=SLOT_REQUEST_PENDING, index=True)
    approvalCode: Mapped[str] = mapped_column(String(6), index=True)
    """Slot created when the doctor confirms; only this visitor can book it."""
    slotId: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("DoctorAvailabilitySlot.id"), nullable=True, index=True
    )
    createdAt: Mapped[datetime] = mapped_column(DateTime, default=now_ist)
    decidedAt: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
