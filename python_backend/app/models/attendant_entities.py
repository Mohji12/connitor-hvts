"""Attendant pass and patient admission ORM models (branch-scoped)."""

from __future__ import annotations

import uuid
from datetime import date, datetime

from sqlalchemy import Boolean, Date, DateTime, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship as orm_relationship

from app.database import Base
from app.utils.timezone import now_ist


def _uuid() -> str:
    return str(uuid.uuid4())


class Patient(Base):
    __tablename__ = "Patient"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    branchId: Mapped[str] = mapped_column(String(36), ForeignKey("Branch.id"), index=True)
    mrn: Mapped[str] = mapped_column(String(50), index=True)
    firstName: Mapped[str] = mapped_column(String(191))
    lastName: Mapped[str] = mapped_column(String(191))
    phone: Mapped[str | None] = mapped_column(String(20), nullable=True)
    isActive: Mapped[bool] = mapped_column(Boolean, default=True)
    createdAt: Mapped[datetime] = mapped_column(DateTime, default=now_ist)

    admissions: Mapped[list["Admission"]] = orm_relationship(back_populates="patient")


class Admission(Base):
    __tablename__ = "Admission"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    patientId: Mapped[str] = mapped_column(String(36), ForeignKey("Patient.id"), index=True)
    branchId: Mapped[str] = mapped_column(String(36), ForeignKey("Branch.id"), index=True)
    wardName: Mapped[str | None] = mapped_column(String(100), nullable=True)
    roomNumber: Mapped[str | None] = mapped_column(String(50), nullable=True)
    bedNumber: Mapped[str | None] = mapped_column(String(50), nullable=True)
    department: Mapped[str | None] = mapped_column(String(100), nullable=True)
    status: Mapped[str] = mapped_column(String(30), default="ACTIVE")
    admittedAt: Mapped[datetime] = mapped_column(DateTime, default=now_ist)
    dischargedAt: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    patient: Mapped["Patient"] = orm_relationship(back_populates="admissions")
    attendants: Mapped[list["Attendant"]] = orm_relationship(back_populates="admission")
    visitSlots: Mapped[list["AdmissionVisitSlot"]] = orm_relationship(back_populates="admission")


class Attendant(Base):
    __tablename__ = "Attendant"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    admissionId: Mapped[str] = mapped_column(String(36), ForeignKey("Admission.id"), index=True)
    branchId: Mapped[str] = mapped_column(String(36), ForeignKey("Branch.id"), index=True)
    name: Mapped[str] = mapped_column(String(255))
    email: Mapped[str] = mapped_column(String(255), index=True)
    phone: Mapped[str] = mapped_column(String(20))
    relationship: Mapped[str | None] = mapped_column(String(50), nullable=True)
    photoUrl: Mapped[str | None] = mapped_column(Text, nullable=True)
    idProofType: Mapped[str | None] = mapped_column(String(50), nullable=True)
    idProofUrl: Mapped[str | None] = mapped_column(Text, nullable=True)
    remarks: Mapped[str | None] = mapped_column(Text, nullable=True)
    specialPermissions: Mapped[str | None] = mapped_column(Text, nullable=True)
    maxEntries: Mapped[int | None] = mapped_column(Integer, nullable=True)
    isEmergency: Mapped[bool] = mapped_column(Boolean, default=False)
    status: Mapped[str] = mapped_column(String(30), default="PENDING")
    approvalLinkTokenHash: Mapped[str | None] = mapped_column(String(191), nullable=True, index=True)
    approvalLinkExpiresAt: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    approvalLinkUsedAt: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    createdAt: Mapped[datetime] = mapped_column(DateTime, default=now_ist)

    admission: Mapped["Admission"] = orm_relationship(back_populates="attendants")
    passes: Mapped[list["AttendantPass"]] = orm_relationship(back_populates="attendant")


class AttendantPassNumberSequence(Base):
    __tablename__ = "AttendantPassNumberSequence"

    year: Mapped[int] = mapped_column(Integer, primary_key=True)
    lastNumber: Mapped[int] = mapped_column(Integer, default=0)


class AttendantPass(Base):
    __tablename__ = "AttendantPass"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    passNumber: Mapped[str] = mapped_column(String(30), unique=True, index=True)
    attendantId: Mapped[str] = mapped_column(String(36), ForeignKey("Attendant.id"), index=True)
    branchId: Mapped[str] = mapped_column(String(36), ForeignKey("Branch.id"), index=True)
    status: Mapped[str] = mapped_column(String(30), default="DRAFT")
    validFrom: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    validTo: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    qrPayload: Mapped[str | None] = mapped_column(Text, nullable=True)
    qrSignature: Mapped[str | None] = mapped_column(String(128), nullable=True)
    exitQrPayload: Mapped[str | None] = mapped_column(Text, nullable=True)
    exitQrSignature: Mapped[str | None] = mapped_column(String(128), nullable=True)
    expiresAt: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    enteredAt: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    exitedAt: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    durationMinutes: Mapped[int | None] = mapped_column(Integer, nullable=True)
    maxEntries: Mapped[int | None] = mapped_column(Integer, nullable=True)
    entriesUsed: Mapped[int] = mapped_column(Integer, default=0)
    approvedById: Mapped[str | None] = mapped_column(String(36), ForeignKey("User.id"), nullable=True)
    createdAt: Mapped[datetime] = mapped_column(DateTime, default=now_ist)
    updatedAt: Mapped[datetime] = mapped_column(DateTime, default=now_ist, onupdate=now_ist)

    attendant: Mapped["Attendant"] = orm_relationship(back_populates="passes")


class PassPolicy(Base):
    __tablename__ = "PassPolicy"
    __table_args__ = (UniqueConstraint("branchId", "policyCode", name="PassPolicy_branch_code_key"),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    branchId: Mapped[str] = mapped_column(String(36), ForeignKey("Branch.id"), index=True)
    policyCode: Mapped[str] = mapped_column(String(50))
    name: Mapped[str] = mapped_column(String(191))
    maxPassesPerPatient: Mapped[int] = mapped_column(Integer, default=2)
    maxIcuAttendants: Mapped[int] = mapped_column(Integer, default=1)
    allowNightStay: Mapped[bool] = mapped_column(Boolean, default=False)
    qrValidityHours: Mapped[int] = mapped_column(Integer, default=24)
    defaultVisitStart: Mapped[str] = mapped_column(String(5), default="11:00")
    defaultVisitEnd: Mapped[str] = mapped_column(String(5), default="16:00")
    smsEnabled: Mapped[bool] = mapped_column(Boolean, default=True)
    whatsappEnabled: Mapped[bool] = mapped_column(Boolean, default=True)
    approvalRequired: Mapped[bool] = mapped_column(Boolean, default=True)
    idProofMandatory: Mapped[bool] = mapped_column(Boolean, default=True)
    photoMandatory: Mapped[bool] = mapped_column(Boolean, default=False)
    emergencySkipId: Mapped[bool] = mapped_column(Boolean, default=True)
    isActive: Mapped[bool] = mapped_column(Boolean, default=True)


class AdmissionVisitSlot(Base):
    """Ward-added visiting window for a specific inpatient admission.

    Default hospital hours (11:00–16:00) apply to every patient without a row.
    Extra slots here extend visiting hours for that patient only.
    """

    __tablename__ = "AdmissionVisitSlot"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    admissionId: Mapped[str] = mapped_column(String(36), ForeignKey("Admission.id"), index=True)
    branchId: Mapped[str] = mapped_column(String(36), ForeignKey("Branch.id"), index=True)
    visitDate: Mapped[date | None] = mapped_column(Date, nullable=True, index=True)
    startTime: Mapped[str] = mapped_column(String(5))
    endTime: Mapped[str] = mapped_column(String(5))
    label: Mapped[str | None] = mapped_column(String(100), nullable=True)
    createdById: Mapped[str | None] = mapped_column(String(36), ForeignKey("User.id"), nullable=True)
    isActive: Mapped[bool] = mapped_column(Boolean, default=True)
    createdAt: Mapped[datetime] = mapped_column(DateTime, default=now_ist)

    admission: Mapped["Admission"] = orm_relationship(back_populates="visitSlots")


class AttendantPassScan(Base):
    __tablename__ = "AttendantPassScan"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    passId: Mapped[str] = mapped_column(String(36), ForeignKey("AttendantPass.id"), index=True)
    scannedById: Mapped[str] = mapped_column(String(36), ForeignKey("User.id"))
    scanType: Mapped[str] = mapped_column(String(20))
    govtIdImageUrl: Mapped[str | None] = mapped_column(Text, nullable=True)
    govtIdType: Mapped[str | None] = mapped_column(String(50), nullable=True)
    createdAt: Mapped[datetime] = mapped_column(DateTime, default=now_ist)
