"""Global visitor pre-registration identity (platform-wide, not branch-scoped)."""

from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.utils.timezone import now_ist


def _uuid() -> str:
    return str(uuid.uuid4())


class VisitorAccount(Base):
    __tablename__ = "VisitorAccount"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    firstName: Mapped[str] = mapped_column(String(191))
    lastName: Mapped[str] = mapped_column(String(191))
    phone: Mapped[str] = mapped_column(String(191), unique=True)
    email: Mapped[str] = mapped_column(String(191), unique=True)
    emailType: Mapped[str] = mapped_column(String(20), default="PERSONAL")
    companyName: Mapped[str | None] = mapped_column(String(191), nullable=True)
    jobTitle: Mapped[str | None] = mapped_column(String(191), nullable=True)
    linkedinUrl: Mapped[str | None] = mapped_column(String(500), nullable=True)
    photoStorageKey: Mapped[str | None] = mapped_column(String(500), nullable=True)
    profileStatus: Mapped[str] = mapped_column(String(30), default="DRAFT")
    emailVerified: Mapped[bool] = mapped_column(Boolean, default=False)
    phoneVerified: Mapped[bool] = mapped_column(Boolean, default=False)
    phoneVerificationOtpHash: Mapped[str | None] = mapped_column(String(191), nullable=True)
    phoneVerificationExpiry: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    phoneVerificationAttempts: Mapped[int] = mapped_column(Integer, default=0)
    emailVerificationOtpHash: Mapped[str | None] = mapped_column(String(191), nullable=True)
    emailVerificationExpiry: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    emailVerificationAttempts: Mapped[int] = mapped_column(Integer, default=0)
    termsAcceptedAt: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    privacyPolicyVersion: Mapped[str | None] = mapped_column(String(32), nullable=True)
    createdAt: Mapped[datetime] = mapped_column(DateTime, default=now_ist)
    updatedAt: Mapped[datetime] = mapped_column(DateTime, default=now_ist, onupdate=now_ist)

    auth_methods = relationship("VisitorAccountAuth", back_populates="account", cascade="all, delete-orphan")
    documents = relationship("VisitorAccountDocument", back_populates="account", cascade="all, delete-orphan")
    branch_visitors = relationship("Visitor", back_populates="visitor_account")


class VisitorAccountAuth(Base):
    __tablename__ = "VisitorAccountAuth"
    __table_args__ = (
        UniqueConstraint("visitorAccountId", "provider", name="VisitorAccountAuth_account_provider_key"),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    visitorAccountId: Mapped[str] = mapped_column(String(36), ForeignKey("VisitorAccount.id"))
    provider: Mapped[str] = mapped_column(String(20))
    passwordHash: Mapped[str | None] = mapped_column(String(191), nullable=True)
    providerSubject: Mapped[str | None] = mapped_column(String(191), nullable=True)
    createdAt: Mapped[datetime] = mapped_column(DateTime, default=now_ist)
    updatedAt: Mapped[datetime] = mapped_column(DateTime, default=now_ist, onupdate=now_ist)

    account = relationship("VisitorAccount", back_populates="auth_methods")


class VisitorAccountDocument(Base):
    __tablename__ = "VisitorAccountDocument"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    visitorAccountId: Mapped[str] = mapped_column(String(36), ForeignKey("VisitorAccount.id"))
    docType: Mapped[str] = mapped_column(String(20))
    govtIdType: Mapped[str | None] = mapped_column(String(30), nullable=True)
    storageKey: Mapped[str] = mapped_column(String(500))
    mimeType: Mapped[str] = mapped_column(String(100))
    capturedAt: Mapped[datetime] = mapped_column(DateTime, default=now_ist)
    createdAt: Mapped[datetime] = mapped_column(DateTime, default=now_ist)

    account = relationship("VisitorAccount", back_populates="documents")


class EmailVerificationToken(Base):
    __tablename__ = "EmailVerificationToken"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    visitorAccountId: Mapped[str] = mapped_column(String(36), ForeignKey("VisitorAccount.id"))
    tokenHash: Mapped[str] = mapped_column(String(191), unique=True)
    expiresAt: Mapped[datetime] = mapped_column(DateTime)
    usedAt: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    createdAt: Mapped[datetime] = mapped_column(DateTime, default=now_ist)


class VisitorAccountAuditLog(Base):
    __tablename__ = "VisitorAccountAuditLog"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    visitorAccountId: Mapped[str] = mapped_column(String(36), ForeignKey("VisitorAccount.id"))
    action: Mapped[str] = mapped_column(String(64))
    actorType: Mapped[str] = mapped_column(String(32))
    actorId: Mapped[str | None] = mapped_column(String(36), nullable=True)
    metadataJson: Mapped[str | None] = mapped_column(Text, nullable=True)
    createdAt: Mapped[datetime] = mapped_column(DateTime, default=now_ist)
