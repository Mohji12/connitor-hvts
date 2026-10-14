"""Visitors waiting for a doctor to publish slots on a given date."""

from __future__ import annotations

import uuid
from datetime import date, datetime

from sqlalchemy import Date, DateTime, ForeignKey, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base
from app.utils.timezone import now_ist


def _uuid() -> str:
    return str(uuid.uuid4())


class SlotWaitlist(Base):
    __tablename__ = "SlotWaitlist"
    __table_args__ = (
        UniqueConstraint("visitorAccountId", "doctorId", "date", name="SlotWaitlist_visitor_doctor_date"),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    visitorAccountId: Mapped[str] = mapped_column(
        String(36), ForeignKey("VisitorAccount.id"), index=True
    )
    doctorId: Mapped[str] = mapped_column(String(36), ForeignKey("User.id"), index=True)
    date: Mapped[date] = mapped_column(Date, index=True)
    createdAt: Mapped[datetime] = mapped_column(DateTime, default=now_ist)
    notifiedAt: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
