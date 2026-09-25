import enum


class Role(str, enum.Enum):
    SUPER_ADMIN = "SUPER_ADMIN"
    CHAIN_ADMIN = "CHAIN_ADMIN"
    BRANCH_ADMIN = "BRANCH_ADMIN"
    HOSPITAL_ADMIN = "HOSPITAL_ADMIN"
    DEPARTMENT_ADMIN = "DEPARTMENT_ADMIN"
    SUB_DEPARTMENT_ADMIN = "SUB_DEPARTMENT_ADMIN"
    SECURITY_SUPERVISOR = "SECURITY_SUPERVISOR"
    SECURITY = "SECURITY"
    STAFF = "STAFF"
    RECEIVING = "RECEIVING"
    PURCHASE = "PURCHASE"
    DISTRIBUTOR = "DISTRIBUTOR"
    DELIVERY_AGENT = "DELIVERY_AGENT"
    WARD_ADMIN = "WARD_ADMIN"


class DeliveryStatus(str, enum.Enum):
    DRAFT = "DRAFT"
    SCHEDULED = "SCHEDULED"
    ON_HOLD = "ON_HOLD"
    APPROVED = "APPROVED"
    ARRIVED_AT_GATE = "ARRIVED_AT_GATE"
    GATE_VERIFIED = "GATE_VERIFIED"
    IN_PROGRESS = "IN_PROGRESS"
    RECEIVED = "RECEIVED"
    COMPLETED = "COMPLETED"
    EXITED = "EXITED"
    CLOSED = "CLOSED"
    REJECTED = "REJECTED"


class DeliveryType(str, enum.Enum):
    STANDARD = "STANDARD"
    URGENT = "URGENT"
    MULTI_STOP = "MULTI_STOP"


class VisitStatus(str, enum.Enum):
    PENDING = "PENDING"
    REQUEST_SENT = "REQUEST_SENT"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"
    CHECKED_IN = "CHECKED_IN"
    CHECKED_OUT = "CHECKED_OUT"


class VisitCategory(str, enum.Enum):
    MEETING = "MEETING"
    DELIVERY = "DELIVERY"


class VisitorType(str, enum.Enum):
    GENERAL = "GENERAL"
    SALES_REPRESENTATIVE = "SALES_REPRESENTATIVE"
    VENDOR = "VENDOR"


class MeetingStatus(str, enum.Enum):
    NOT_STARTED = "not_started"
    STARTED = "started"
    NOT_ATTENDED = "not_attended"
    AUTO_EXPIRED = "auto_expired"


class AppointmentMode(str, enum.Enum):
    IN_PERSON = "IN_PERSON"
    ONLINE = "ONLINE"


class VisitorPassStatus(str, enum.Enum):
    UNASSIGNED = "UNASSIGNED"
    ASSIGNED = "ASSIGNED"
    VOID = "VOID"


class VisitorPassSource(str, enum.Enum):
    HOSPITAL_POOL = "HOSPITAL_POOL"


class VisitSlotAllotmentSource(str, enum.Enum):
    ROUTINE = "ROUTINE"
    MANUAL = "MANUAL"
    OVERRIDE = "OVERRIDE"


class ProfileStatus(str, enum.Enum):
    DRAFT = "DRAFT"
    PENDING_VERIFICATION = "PENDING_VERIFICATION"
    ACTIVE = "ACTIVE"
    SUSPENDED = "SUSPENDED"


class EmailType(str, enum.Enum):
    WORK = "WORK"
    PERSONAL = "PERSONAL"


class GovtIdType(str, enum.Enum):
    AADHAAR = "AADHAAR"
    PAN = "PAN"
    PASSPORT = "PASSPORT"
    DRIVING_LICENSE = "DRIVING_LICENSE"
    VOTER_ID = "VOTER_ID"
    OTHER = "OTHER"


class VisitorAuthProvider(str, enum.Enum):
    PASSWORD = "PASSWORD"
    GOOGLE = "GOOGLE"
    LINKEDIN = "LINKEDIN"


class VisitorDocumentType(str, enum.Enum):
    LIVE_PHOTO = "LIVE_PHOTO"
    GOVT_ID = "GOVT_ID"
