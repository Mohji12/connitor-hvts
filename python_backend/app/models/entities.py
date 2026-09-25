import uuid
from datetime import date, datetime

from sqlalchemy import Boolean, Date, DateTime, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.utils.timezone import now_ist


def _uuid() -> str:
    return str(uuid.uuid4())


class User(Base):
    __tablename__ = "User"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    name: Mapped[str | None] = mapped_column(String(191), nullable=True)
    phone: Mapped[str] = mapped_column(String(191), unique=True)
    email: Mapped[str | None] = mapped_column(String(191), unique=True, nullable=True)
    role: Mapped[str] = mapped_column(String(50))
    userType: Mapped[str | None] = mapped_column(String(50), nullable=True)
    isActive: Mapped[bool] = mapped_column(Boolean, default=True)
    otp: Mapped[str | None] = mapped_column(String(191), nullable=True)
    otpExpires: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    passwordHash: Mapped[str | None] = mapped_column(String(191), nullable=True)
    department: Mapped[str | None] = mapped_column(String(50), nullable=True)
    location: Mapped[str | None] = mapped_column(String(191), nullable=True)
    hospitalChainId: Mapped[str | None] = mapped_column(String(36), ForeignKey("HospitalChain.id"), nullable=True)
    branchId: Mapped[str | None] = mapped_column(String(36), ForeignKey("Branch.id"), nullable=True)
    departmentId: Mapped[str | None] = mapped_column(String(36), ForeignKey("Department.id"), nullable=True)
    subDepartmentId: Mapped[str | None] = mapped_column(String(36), ForeignKey("SubDepartment.id"), nullable=True)
    distributorId: Mapped[str | None] = mapped_column(String(36), nullable=True)
    deliveryAgentId: Mapped[str | None] = mapped_column(String(36), nullable=True)
    createdAt: Mapped[datetime] = mapped_column(DateTime, default=now_ist)
    updatedAt: Mapped[datetime] = mapped_column(DateTime, default=now_ist, onupdate=now_ist)

    hospitalChain = relationship("HospitalChain", back_populates="users")
    branch = relationship("Branch", back_populates="users")
    dept = relationship("Department", back_populates="users", foreign_keys=[departmentId])
    subDept = relationship("SubDepartment", back_populates="users", foreign_keys=[subDepartmentId])
    availabilitySlots = relationship("DoctorAvailabilitySlot", back_populates="doctor")


class HospitalChain(Base):
    __tablename__ = "HospitalChain"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    name: Mapped[str] = mapped_column(String(191))
    phone: Mapped[str] = mapped_column(String(191), unique=True)
    email: Mapped[str] = mapped_column(String(191), unique=True)
    street: Mapped[str] = mapped_column(String(191))
    city: Mapped[str] = mapped_column(String(191))
    state: Mapped[str] = mapped_column(String(191))
    pinCode: Mapped[str] = mapped_column(String(191))
    country: Mapped[str] = mapped_column(String(191), default="India")
    createdAt: Mapped[datetime] = mapped_column(DateTime, default=now_ist)
    updatedAt: Mapped[datetime] = mapped_column(DateTime, default=now_ist, onupdate=now_ist)

    users = relationship("User", back_populates="hospitalChain")
    branches = relationship("Branch", back_populates="hospitalChain")


class Branch(Base):
    __tablename__ = "Branch"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    name: Mapped[str] = mapped_column(String(191))
    email: Mapped[str] = mapped_column(String(191), unique=True)
    phone: Mapped[str] = mapped_column(String(191), unique=True)
    street: Mapped[str] = mapped_column(String(191))
    city: Mapped[str] = mapped_column(String(191))
    state: Mapped[str] = mapped_column(String(191))
    pinCode: Mapped[str] = mapped_column(String(191))
    country: Mapped[str] = mapped_column(String(191), default="India")
    qrCode: Mapped[str | None] = mapped_column(Text, nullable=True)
    hospitalChainId: Mapped[str] = mapped_column(String(36), ForeignKey("HospitalChain.id"))
    createdAt: Mapped[datetime] = mapped_column(DateTime, default=now_ist)
    updatedAt: Mapped[datetime] = mapped_column(DateTime, default=now_ist, onupdate=now_ist)

    hospitalChain = relationship("HospitalChain", back_populates="branches")
    users = relationship("User", back_populates="branch")
    visits = relationship("Visit", back_populates="branch")
    departments = relationship("Department", back_populates="branch")


class Department(Base):
    __tablename__ = "Department"
    __table_args__ = (UniqueConstraint("branchId", "code", name="Department_branchId_code_key"),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    name: Mapped[str] = mapped_column(String(191))
    code: Mapped[str] = mapped_column(String(50))
    description: Mapped[str | None] = mapped_column(String(500), nullable=True)
    branchId: Mapped[str] = mapped_column(String(36), ForeignKey("Branch.id"))
    hospitalChainId: Mapped[str] = mapped_column(String(36), ForeignKey("HospitalChain.id"))
    isActive: Mapped[bool] = mapped_column(Boolean, default=True)
    createdAt: Mapped[datetime] = mapped_column(DateTime, default=now_ist)
    updatedAt: Mapped[datetime] = mapped_column(DateTime, default=now_ist, onupdate=now_ist)

    branch = relationship("Branch", back_populates="departments")
    subDepartments = relationship("SubDepartment", back_populates="department")
    users = relationship("User", back_populates="dept", foreign_keys="User.departmentId")


class SubDepartment(Base):
    __tablename__ = "SubDepartment"
    __table_args__ = (UniqueConstraint("departmentId", "code", name="SubDepartment_departmentId_code_key"),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    name: Mapped[str] = mapped_column(String(191))
    code: Mapped[str] = mapped_column(String(50))
    description: Mapped[str | None] = mapped_column(String(500), nullable=True)
    departmentId: Mapped[str] = mapped_column(String(36), ForeignKey("Department.id"))
    branchId: Mapped[str] = mapped_column(String(36), ForeignKey("Branch.id"))
    hospitalChainId: Mapped[str] = mapped_column(String(36), ForeignKey("HospitalChain.id"))
    isActive: Mapped[bool] = mapped_column(Boolean, default=True)
    createdAt: Mapped[datetime] = mapped_column(DateTime, default=now_ist)
    updatedAt: Mapped[datetime] = mapped_column(DateTime, default=now_ist, onupdate=now_ist)

    department = relationship("Department", back_populates="subDepartments")
    users = relationship("User", back_populates="subDept", foreign_keys="User.subDepartmentId")


class DoctorAvailabilitySlot(Base):
    __tablename__ = "DoctorAvailabilitySlot"
    __table_args__ = (
        UniqueConstraint("doctorId", "slotStart", name="DoctorAvailabilitySlot_doctor_slot_key"),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    doctorId: Mapped[str] = mapped_column(String(36), ForeignKey("User.id"), index=True)
    slotStart: Mapped[datetime] = mapped_column(DateTime, index=True)
    slotEnd: Mapped[datetime] = mapped_column(DateTime)
    isBooked: Mapped[bool] = mapped_column(Boolean, default=False)
    visitId: Mapped[str | None] = mapped_column(String(36), ForeignKey("Visit.id"), nullable=True)
    createdAt: Mapped[datetime] = mapped_column(DateTime, default=now_ist)
    updatedAt: Mapped[datetime] = mapped_column(DateTime, default=now_ist, onupdate=now_ist)

    doctor = relationship("User", back_populates="availabilitySlots")
    visit = relationship("Visit", back_populates="bookedSlot")


class Visitor(Base):
    __tablename__ = "Visitor"
    __table_args__ = (UniqueConstraint("phone", "branchId", name="Visitor_phone_branchId_key"),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    firstName: Mapped[str] = mapped_column(String(191))
    middleName: Mapped[str | None] = mapped_column(String(191), nullable=True)
    lastName: Mapped[str] = mapped_column(String(191))
    phone: Mapped[str] = mapped_column(String(191))
    alternatePhone: Mapped[str | None] = mapped_column(String(191), nullable=True)
    email: Mapped[str | None] = mapped_column(String(191), nullable=True)
    alternateEmail: Mapped[str | None] = mapped_column(String(191), nullable=True)
    address: Mapped[str | None] = mapped_column(String(191), nullable=True)
    company: Mapped[str | None] = mapped_column(String(191), nullable=True)
    companyWebsite: Mapped[str | None] = mapped_column(String(191), nullable=True)
    designation: Mapped[str | None] = mapped_column(String(191), nullable=True)
    reportingManagerName: Mapped[str | None] = mapped_column(String(191), nullable=True)
    reportingManagerPhone: Mapped[str | None] = mapped_column(String(191), nullable=True)
    photo: Mapped[str | None] = mapped_column(Text, nullable=True)
    governmentIdDocument: Mapped[str | None] = mapped_column(Text, nullable=True)
    officeIdDocument: Mapped[str | None] = mapped_column(Text, nullable=True)
    phoneVerificationOtp: Mapped[str | None] = mapped_column(String(191), nullable=True)
    phoneVerificationExpiry: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    phoneVerified: Mapped[bool] = mapped_column(Boolean, default=False)
    phoneVerificationAttempts: Mapped[int] = mapped_column(Integer, default=0)
    branchId: Mapped[str] = mapped_column(String(36))
    visitorAccountId: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("VisitorAccount.id"), nullable=True
    )
    createdAt: Mapped[datetime] = mapped_column(DateTime, default=now_ist)
    updatedAt: Mapped[datetime] = mapped_column(DateTime, default=now_ist, onupdate=now_ist)

    visits = relationship("Visit", back_populates="visitor")
    visitor_account = relationship("VisitorAccount", back_populates="branch_visitors")


class Visit(Base):
    __tablename__ = "Visit"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    visitCategory: Mapped[str | None] = mapped_column(String(50), nullable=True)
    visitSubType: Mapped[str | None] = mapped_column(String(191), nullable=True)
    purpose: Mapped[str | None] = mapped_column(String(191), nullable=True)
    department: Mapped[str | None] = mapped_column(String(50), nullable=True)
    deliveryPlatform: Mapped[str | None] = mapped_column(String(191), nullable=True)
    deliveryRecipient: Mapped[str | None] = mapped_column(String(191), nullable=True)
    orderReference: Mapped[str | None] = mapped_column(String(191), nullable=True)
    checkInTime: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    checkOutTime: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    checkedInById: Mapped[str | None] = mapped_column(String(36), ForeignKey("User.id"), nullable=True)
    checkedOutById: Mapped[str | None] = mapped_column(String(36), ForeignKey("User.id"), nullable=True)
    checkedInLocation: Mapped[str | None] = mapped_column(String(191), nullable=True)
    checkedOutLocation: Mapped[str | None] = mapped_column(String(191), nullable=True)
    durationMinutes: Mapped[int | None] = mapped_column(Integer, nullable=True)
    visitCode: Mapped[str | None] = mapped_column(String(191), unique=True, nullable=True)
    visitQRCode: Mapped[str | None] = mapped_column(Text, nullable=True)
    entryQrPayload: Mapped[str | None] = mapped_column(Text, nullable=True)
    exitQrPayload: Mapped[str | None] = mapped_column(Text, nullable=True)
    isCodeUsed: Mapped[bool] = mapped_column(Boolean, default=True)
    status: Mapped[str] = mapped_column(String(50))
    rejectionReason: Mapped[str | None] = mapped_column(String(191), nullable=True)
    doctorFeedback: Mapped[str | None] = mapped_column(Text, nullable=True)
    doctorFeedbackAt: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    checkInOtp: Mapped[str | None] = mapped_column(String(191), nullable=True)
    checkInOtpExpiry: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    gatePassGeneratedAt: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    gatePassSentViaWhatsApp: Mapped[bool] = mapped_column(Boolean, default=False)
    gatePassUrlExpiry: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    visitorId: Mapped[str] = mapped_column(String(36), ForeignKey("Visitor.id"))
    staffId: Mapped[str | None] = mapped_column(String(36), ForeignKey("User.id"), nullable=True)
    staffName: Mapped[str | None] = mapped_column(String(191), nullable=True)
    staffPhone: Mapped[str | None] = mapped_column(String(191), nullable=True)
    visitingCardPhoto: Mapped[str | None] = mapped_column(Text, nullable=True)
    branchId: Mapped[str] = mapped_column(String(36), ForeignKey("Branch.id"))
    departmentId: Mapped[str | None] = mapped_column(String(36), ForeignKey("Department.id"), nullable=True)
    subDepartmentId: Mapped[str | None] = mapped_column(String(36), ForeignKey("SubDepartment.id"), nullable=True)
    appointmentDate: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    appointmentMode: Mapped[str] = mapped_column(String(20), default="IN_PERSON")
    zoomMeetingId: Mapped[str | None] = mapped_column(String(64), nullable=True)
    zoomJoinUrl: Mapped[str | None] = mapped_column(Text, nullable=True)
    zoomStartUrl: Mapped[str | None] = mapped_column(Text, nullable=True)
    zoomPassword: Mapped[str | None] = mapped_column(String(64), nullable=True)
    meetingProvider: Mapped[str | None] = mapped_column(String(20), nullable=True)
    meetingRoomName: Mapped[str | None] = mapped_column(String(128), nullable=True, index=True)
    meetingJoinUrl: Mapped[str | None] = mapped_column(Text, nullable=True)
    meetingHostUrl: Mapped[str | None] = mapped_column(Text, nullable=True)
    smsApprovalCode: Mapped[str | None] = mapped_column(String(6), nullable=True, index=True)
    approvalLinkTokenHash: Mapped[str | None] = mapped_column(String(191), nullable=True, index=True)
    approvalLinkExpiresAt: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    approvalLinkUsedAt: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    idProofVerified: Mapped[bool] = mapped_column(Boolean, default=False)
    idProofType: Mapped[str | None] = mapped_column(String(50), nullable=True)
    idProofNumber: Mapped[str | None] = mapped_column(String(191), nullable=True)
    verifiedBySecurityId: Mapped[str | None] = mapped_column(String(36), ForeignKey("User.id"), nullable=True)
    totalDurationMinutes: Mapped[int | None] = mapped_column(Integer, nullable=True)
    doctorNotifiedAt: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    visitorPassId: Mapped[str | None] = mapped_column(String(191), nullable=True, index=True)
    allottedMinutes: Mapped[int | None] = mapped_column(Integer, nullable=True)
    expectedEndTime: Mapped[datetime | None] = mapped_column(DateTime, nullable=True, index=True)
    extensionTokenHash: Mapped[str | None] = mapped_column(String(191), unique=True, nullable=True, index=True)
    extensionTokenExpiresAt: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    extensionTokenUsedAt: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    extensionWarningDueAt: Mapped[datetime | None] = mapped_column(DateTime, nullable=True, index=True)
    extensionWarningSentAt: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    visitorType: Mapped[str | None] = mapped_column(String(32), nullable=True, index=True)
    companyName: Mapped[str | None] = mapped_column(String(191), nullable=True)
    companyEmail: Mapped[str | None] = mapped_column(String(191), nullable=True)
    meetingStatus: Mapped[str | None] = mapped_column(String(32), nullable=True, index=True)
    meetingConfirmedAt: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    confirmationTokenHash: Mapped[str | None] = mapped_column(String(191), unique=True, nullable=True, index=True)
    confirmationTokenExpiresAt: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    confirmationTokenUsedAt: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    createdAt: Mapped[datetime] = mapped_column(DateTime, default=now_ist)
    updatedAt: Mapped[datetime] = mapped_column(DateTime, default=now_ist, onupdate=now_ist)

    visitor = relationship("Visitor", back_populates="visits")
    branch = relationship("Branch", back_populates="visits")
    staff = relationship("User", foreign_keys=[staffId])
    notifications = relationship("Notification", back_populates="visit")
    bookedSlot = relationship("DoctorAvailabilitySlot", back_populates="visit", uselist=False)
    issuedPass = relationship(
        "VisitorPass",
        back_populates="visit",
        uselist=False,
        foreign_keys="VisitorPass.visitId",
    )
    meetingStatusAudits = relationship("MeetingStatusAudit", back_populates="visit")


class BranchVisitorPassPolicy(Base):
    __tablename__ = "BranchVisitorPassPolicy"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    branchId: Mapped[str] = mapped_column(String(36), ForeignKey("Branch.id"), unique=True, index=True)
    dailyQuota: Mapped[int] = mapped_column(Integer, default=50)
    createdAt: Mapped[datetime] = mapped_column(DateTime, default=now_ist)
    updatedAt: Mapped[datetime] = mapped_column(DateTime, default=now_ist, onupdate=now_ist)

    branch = relationship("Branch")


class VisitorPass(Base):
    __tablename__ = "VisitorPass"
    __table_args__ = (
        UniqueConstraint("branchId", "passDate", "sequence", name="VisitorPass_branch_date_seq_key"),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    passId: Mapped[str] = mapped_column(String(191), unique=True, index=True)
    branchId: Mapped[str] = mapped_column(String(36), ForeignKey("Branch.id"), index=True)
    passDate: Mapped[date] = mapped_column(Date, index=True)
    sequence: Mapped[int] = mapped_column(Integer)
    status: Mapped[str] = mapped_column(String(20), default="UNASSIGNED", index=True)
    source: Mapped[str] = mapped_column(String(30), default="HOSPITAL_POOL")
    visitId: Mapped[str | None] = mapped_column(String(36), ForeignKey("Visit.id"), nullable=True)
    createdById: Mapped[str | None] = mapped_column(String(36), ForeignKey("User.id"), nullable=True)
    assignedById: Mapped[str | None] = mapped_column(String(36), ForeignKey("User.id"), nullable=True)
    assignedAt: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    createdAt: Mapped[datetime] = mapped_column(DateTime, default=now_ist)
    updatedAt: Mapped[datetime] = mapped_column(DateTime, default=now_ist, onupdate=now_ist)

    visit = relationship("Visit", back_populates="issuedPass", foreign_keys=[visitId])
    branch = relationship("Branch")


class DoctorUrgentPasscode(Base):
    __tablename__ = "DoctorUrgentPasscode"
    __table_args__ = (
        UniqueConstraint("branchId", "code", name="DoctorUrgentPasscode_branchId_code_key"),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    code: Mapped[str] = mapped_column(String(6), index=True)
    branchId: Mapped[str] = mapped_column(String(36), ForeignKey("Branch.id"), index=True)
    staffId: Mapped[str] = mapped_column(String(36), ForeignKey("User.id"), index=True)
    departmentId: Mapped[str | None] = mapped_column(String(36), ForeignKey("Department.id"), nullable=True)
    subDepartmentId: Mapped[str | None] = mapped_column(String(36), ForeignKey("SubDepartment.id"), nullable=True)
    note: Mapped[str | None] = mapped_column(String(500), nullable=True)
    purpose: Mapped[str | None] = mapped_column(String(500), nullable=True)
    theme: Mapped[str | None] = mapped_column(String(100), nullable=True)
    visitTime: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    recipientName: Mapped[str | None] = mapped_column(String(200), nullable=True)
    recipientPhone: Mapped[str | None] = mapped_column(String(20), nullable=True)
    recipientEmail: Mapped[str | None] = mapped_column(String(255), nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="ACTIVE", index=True)
    expiresAt: Mapped[datetime] = mapped_column(DateTime)
    createdById: Mapped[str] = mapped_column(String(36), ForeignKey("User.id"))
    verifiedAt: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    verifiedById: Mapped[str | None] = mapped_column(String(36), ForeignKey("User.id"), nullable=True)
    redeemedAt: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    redeemedById: Mapped[str | None] = mapped_column(String(36), ForeignKey("User.id"), nullable=True)
    visitId: Mapped[str | None] = mapped_column(String(36), ForeignKey("Visit.id"), nullable=True)
    createdAt: Mapped[datetime] = mapped_column(DateTime, default=now_ist)
    updatedAt: Mapped[datetime] = mapped_column(DateTime, default=now_ist, onupdate=now_ist)

    staff = relationship("User", foreign_keys=[staffId])
    branch = relationship("Branch")


class MeetingStatusAudit(Base):
    __tablename__ = "MeetingStatusAudit"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    visitId: Mapped[str] = mapped_column(String(36), ForeignKey("Visit.id"), index=True)
    oldStatus: Mapped[str | None] = mapped_column(String(32), nullable=True)
    newStatus: Mapped[str] = mapped_column(String(32))
    actorType: Mapped[str] = mapped_column(String(32))
    actor: Mapped[str | None] = mapped_column(String(191), nullable=True)
    tokenHash: Mapped[str | None] = mapped_column(String(191), nullable=True)
    createdAt: Mapped[datetime] = mapped_column(DateTime, default=now_ist, index=True)

    visit = relationship("Visit", back_populates="meetingStatusAudits")


class Notification(Base):
    __tablename__ = "Notification"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    message: Mapped[str] = mapped_column(Text)
    read: Mapped[bool] = mapped_column(Boolean, default=False)
    createdAt: Mapped[datetime] = mapped_column(DateTime, default=now_ist)
    updatedAt: Mapped[datetime] = mapped_column(DateTime, default=now_ist, onupdate=now_ist)
    recipientId: Mapped[str] = mapped_column(String(36), ForeignKey("User.id"))
    visitId: Mapped[str | None] = mapped_column(String(36), ForeignKey("Visit.id"), nullable=True)

    visit = relationship("Visit", back_populates="notifications")


class BranchVisitSlotPolicy(Base):
    __tablename__ = "BranchVisitSlotPolicy"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    branchId: Mapped[str] = mapped_column(String(36), ForeignKey("Branch.id"), unique=True, index=True)
    dailyQuota: Mapped[int] = mapped_column(Integer, default=50)
    createdAt: Mapped[datetime] = mapped_column(DateTime, default=now_ist)
    updatedAt: Mapped[datetime] = mapped_column(DateTime, default=now_ist, onupdate=now_ist)

    branch = relationship("Branch")


class VisitSlotRoutine(Base):
    __tablename__ = "VisitSlotRoutine"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    branchId: Mapped[str] = mapped_column(String(36), ForeignKey("Branch.id"), index=True)
    staffId: Mapped[str] = mapped_column(String(36), ForeignKey("User.id"), index=True)
    weekdays: Mapped[str] = mapped_column(Text, default="[0,1,2,3,4,5,6]")
    windowStart: Mapped[str] = mapped_column(String(5))
    windowEnd: Mapped[str] = mapped_column(String(5))
    slotCount: Mapped[int] = mapped_column(Integer)
    isActive: Mapped[bool] = mapped_column(Boolean, default=True)
    createdAt: Mapped[datetime] = mapped_column(DateTime, default=now_ist)
    updatedAt: Mapped[datetime] = mapped_column(DateTime, default=now_ist, onupdate=now_ist)

    branch = relationship("Branch")
    staff = relationship("User", foreign_keys=[staffId])


class VisitSlotAllotment(Base):
    __tablename__ = "VisitSlotAllotment"
    __table_args__ = (
        UniqueConstraint(
            "staffId",
            "allotmentDate",
            "windowStart",
            name="VisitSlotAllotment_staff_date_window_key",
        ),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    branchId: Mapped[str] = mapped_column(String(36), ForeignKey("Branch.id"), index=True)
    staffId: Mapped[str] = mapped_column(String(36), ForeignKey("User.id"), index=True)
    allotmentDate: Mapped[date] = mapped_column(Date, index=True)
    windowStart: Mapped[str] = mapped_column(String(5))
    windowEnd: Mapped[str] = mapped_column(String(5))
    slotCount: Mapped[int] = mapped_column(Integer)
    source: Mapped[str] = mapped_column(String(20), default="MANUAL")
    createdAt: Mapped[datetime] = mapped_column(DateTime, default=now_ist)
    updatedAt: Mapped[datetime] = mapped_column(DateTime, default=now_ist, onupdate=now_ist)

    branch = relationship("Branch")
    staff = relationship("User", foreign_keys=[staffId])
