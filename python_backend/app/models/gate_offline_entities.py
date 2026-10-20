"""Registered gate devices, signed manifests, scan events, and redemptions."""

from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base
from app.utils.timezone import now_ist


def _uuid() -> str:
    return str(uuid.uuid4())


class GateDevice(Base):
    __tablename__ = "GateDevice"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    devicePublicId: Mapped[str] = mapped_column(String(40), unique=True, index=True)
    secretHash: Mapped[str] = mapped_column(String(64))
    label: Mapped[str] = mapped_column(String(191))
    gateId: Mapped[str] = mapped_column(String(80), index=True)
    branchId: Mapped[str] = mapped_column(String(36), ForeignKey("Branch.id"), index=True)
    status: Mapped[str] = mapped_column(String(20), default="ACTIVE", index=True)
    offlineEnabled: Mapped[bool] = mapped_column(Boolean, default=False)
    registeredById: Mapped[str | None] = mapped_column(String(36), ForeignKey("User.id"), nullable=True)
    registeredAt: Mapped[datetime] = mapped_column(DateTime, default=now_ist)
    lastSyncAt: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    revokedAt: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)


class GateManifestVersion(Base):
    __tablename__ = "GateManifestVersion"
    __table_args__ = (
        UniqueConstraint("gateId", "version", name="GateManifestVersion_gate_version"),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    gateId: Mapped[str] = mapped_column(String(80), index=True)
    branchId: Mapped[str] = mapped_column(String(36), ForeignKey("Branch.id"), index=True)
    version: Mapped[int] = mapped_column(Integer)
    keyId: Mapped[str] = mapped_column(String(40), default="gate-manifest-v1")
    issuedAt: Mapped[datetime] = mapped_column(DateTime, default=now_ist)
    expiresAt: Mapped[datetime] = mapped_column(DateTime)
    signature: Mapped[str] = mapped_column(String(64))
    payloadJson: Mapped[str] = mapped_column(Text)


class GateScanEvent(Base):
    __tablename__ = "GateScanEvent"
    __table_args__ = (UniqueConstraint("eventId", name="GateScanEvent_eventId"),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    eventId: Mapped[str] = mapped_column(String(64), index=True)
    deviceId: Mapped[str] = mapped_column(String(36), ForeignKey("GateDevice.id"), index=True)
    passId: Mapped[str] = mapped_column(String(80), index=True)
    passType: Mapped[str] = mapped_column(String(20))
    eventType: Mapped[str] = mapped_column(String(20))
    reasonCode: Mapped[str] = mapped_column(String(40))
    decisionMode: Mapped[str] = mapped_column(String(20))
    occurredAt: Mapped[datetime] = mapped_column(DateTime)
    receivedAt: Mapped[datetime] = mapped_column(DateTime, default=now_ist)
    syncStatus: Mapped[str] = mapped_column(String(20), default="ACCEPTED")


class GatePassRedemption(Base):
    __tablename__ = "GatePassRedemption"
    __table_args__ = (
        UniqueConstraint("passId", "eventType", name="GatePassRedemption_pass_event"),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    passId: Mapped[str] = mapped_column(String(80), index=True)
    passType: Mapped[str] = mapped_column(String(20))
    gateId: Mapped[str] = mapped_column(String(80), index=True)
    deviceId: Mapped[str] = mapped_column(String(36), ForeignKey("GateDevice.id"))
    eventId: Mapped[str] = mapped_column(String(64))
    eventType: Mapped[str] = mapped_column(String(20))
    redeemedAt: Mapped[datetime] = mapped_column(DateTime, default=now_ist)
