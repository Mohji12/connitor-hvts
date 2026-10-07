"""Visitor prepaid wallet. No withdrawal. Visit fees are held until the doctor confirms."""

from __future__ import annotations

import uuid
from datetime import datetime
from decimal import Decimal

from sqlalchemy import DateTime, ForeignKey, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base
from app.utils.timezone import now_ist


def _uuid() -> str:
    return str(uuid.uuid4())


class VisitorWallet(Base):
    __tablename__ = "VisitorWallet"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    visitorAccountId: Mapped[str] = mapped_column(
        String(36), ForeignKey("VisitorAccount.id"), unique=True, index=True
    )
    balance: Mapped[Decimal] = mapped_column(Numeric(14, 2), default=0)
    updatedAt: Mapped[datetime] = mapped_column(DateTime, default=now_ist, onupdate=now_ist)


class VisitorWalletTransaction(Base):
    __tablename__ = "VisitorWalletTransaction"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    walletId: Mapped[str] = mapped_column(String(36), ForeignKey("VisitorWallet.id"), index=True)
    amount: Mapped[Decimal] = mapped_column(Numeric(14, 2))
    transactionType: Mapped[str] = mapped_column(String(20))
    status: Mapped[str] = mapped_column(String(20), default="SETTLED")
    referenceType: Mapped[str | None] = mapped_column(String(50), nullable=True)
    referenceId: Mapped[str | None] = mapped_column(String(64), nullable=True, index=True)
    razorpayOrderId: Mapped[str | None] = mapped_column(String(64), nullable=True)
    razorpayPaymentId: Mapped[str | None] = mapped_column(String(64), nullable=True, unique=True)
    createdAt: Mapped[datetime] = mapped_column(DateTime, default=now_ist)
