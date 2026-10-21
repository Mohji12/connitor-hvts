from typing import Annotated, Literal

from fastapi import APIRouter, BackgroundTasks, Depends, File, HTTPException, Query, UploadFile
from fastapi.security import HTTPAuthorizationCredentials
from pydantic import BaseModel, EmailStr, Field, field_validator, model_validator
from sqlalchemy.orm import Session

from app.cache import remember_in_namespace
from app.cache_invalidation import DOCTOR_CACHE_TTL_SECONDS, REFERENCE_CACHE_TTL_SECONDS, REFERENCE_NAMESPACE
from app.database import get_db
from app.dependencies.auth import public_route
from app.dependencies.visitor_auth import _decode_visitor_token, visitor_security
from app.models import VisitorAccount
from app.models.enums import ProfileStatus
from app.services.appointments_service import AppointmentsService
from app.services.slot_request_service import SlotRequestService, dispatch_slot_request_to_doctor
from app.services.slot_waitlist_service import SlotWaitlistService
from app.services.visit_notification_dispatch import dispatch_new_visit_request_notifications

router = APIRouter()


class BookAppointmentBody(BaseModel):
    branchId: str
    departmentId: str
    subDepartmentId: str
    doctorId: str
    firstName: str = Field(min_length=1)
    lastName: str = Field(min_length=1)
    phone: str = Field(min_length=10, max_length=10)
    email: EmailStr
    appointmentDate: str | None = None
    slotId: str | None = None
    """When true, visitor proposes a custom date/time and meeting mode for the doctor to approve."""
    requestCustomSlot: bool = False
    purpose: str = Field(min_length=3, max_length=191)
    itemsCarrying: str = Field(min_length=2, max_length=500)
    appointmentMode: Literal["IN_PERSON", "ONLINE"] = "IN_PERSON"
    visitorType: Literal["GENERAL", "SALES_REPRESENTATIVE", "VENDOR"] = "GENERAL"
    companyName: str | None = None
    companyEmail: EmailStr | None = None
    paymentMethod: Literal["WALLET", "RAZORPAY", "DUMMY"] | None = None
    razorpayOrderId: str | None = None
    razorpayPaymentId: str | None = None
    razorpaySignature: str | None = None

    @field_validator("phone")
    @classmethod
    def phone_digits(cls, value: str) -> str:
        if not value.isdigit():
            raise ValueError("Phone must contain only digits.")
        return value

    @field_validator("companyName", "companyEmail", mode="before")
    @classmethod
    def empty_optional(cls, value: object) -> object:
        if value is None:
            return None
        if isinstance(value, str) and not value.strip():
            return None
        return value

    @model_validator(mode="after")
    def sales_rep_company_fields(self) -> "BookAppointmentBody":
        if self.visitorType == "SALES_REPRESENTATIVE":
            if not self.companyName:
                raise ValueError("companyName is required for Sales Representative bookings.")
            if not self.companyEmail:
                raise ValueError("companyEmail is required for Sales Representative bookings.")
        else:
            object.__setattr__(self, "companyName", None)
            object.__setattr__(self, "companyEmail", None)
        return self


@router.get("/hospitals")
@public_route
def list_hospitals(
    db: Annotated[Session, Depends(get_db)],
    hospitalChainId: str | None = Query(default=None),
):
    return remember_in_namespace(
        REFERENCE_NAMESPACE,
        ("public-hospitals", hospitalChainId or "all"),
        REFERENCE_CACHE_TTL_SECONDS,
        lambda: AppointmentsService(db).list_public_hospitals(hospital_chain_id=hospitalChainId),
    )


@router.get("/departments")
@public_route
def list_departments(branchId: str = Query(...), db: Session = Depends(get_db)):
    return remember_in_namespace(
        REFERENCE_NAMESPACE,
        ("public-departments", branchId),
        REFERENCE_CACHE_TTL_SECONDS,
        lambda: AppointmentsService(db).list_public_departments(branchId),
    )


@router.get("/sub-departments")
@public_route
def list_sub_departments(departmentId: str = Query(...), db: Session = Depends(get_db)):
    return remember_in_namespace(
        REFERENCE_NAMESPACE,
        ("public-sub-departments", departmentId),
        REFERENCE_CACHE_TTL_SECONDS,
        lambda: AppointmentsService(db).list_public_sub_departments(departmentId),
    )


@router.get("/doctors")
@public_route
def list_doctors(subDepartmentId: str = Query(...), db: Session = Depends(get_db)):
    return remember_in_namespace(
        REFERENCE_NAMESPACE,
        ("public-doctors", subDepartmentId),
        DOCTOR_CACHE_TTL_SECONDS,
        lambda: AppointmentsService(db).list_public_doctors(subDepartmentId),
    )


@router.get("/doctors/{doctor_id}")
@public_route
def get_doctor(doctor_id: str, db: Session = Depends(get_db)):
    return remember_in_namespace(
        REFERENCE_NAMESPACE,
        ("public-doctor", doctor_id),
        DOCTOR_CACHE_TTL_SECONDS,
        lambda: AppointmentsService(db).get_public_doctor(doctor_id),
    )


def _visitor_account_id(credentials: HTTPAuthorizationCredentials | None) -> str | None:
    if not credentials:
        return None
    try:
        token_payload = _decode_visitor_token(credentials.credentials)
    except Exception:
        return None
    if token_payload.get("role") != "VISITOR":
        return None
    return token_payload.get("sub")


@router.get("/doctors/{doctor_id}/slots")
@public_route
def list_doctor_slots(
    doctor_id: str,
    date: str = Query(..., description="YYYY-MM-DD"),
    db: Session = Depends(get_db),
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(visitor_security)] = None,
):
    return AppointmentsService(db).list_doctor_slots(
        doctor_id, date, viewer_account_id=_visitor_account_id(credentials)
    )


@router.get("/doctors/{doctor_id}/available-dates")
@public_route
def list_doctor_available_dates(
    doctor_id: str,
    from_date: str = Query(..., alias="from", description="YYYY-MM-DD"),
    to_date: str = Query(..., alias="to", description="YYYY-MM-DD"),
    db: Session = Depends(get_db),
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(visitor_security)] = None,
):
    return AppointmentsService(db).list_available_dates(
        doctor_id, from_date, to_date, viewer_account_id=_visitor_account_id(credentials)
    )


class SlotRequestBody(BaseModel):
    branchId: str
    departmentId: str
    subDepartmentId: str
    doctorId: str
    date: str = Field(min_length=10, max_length=10, description="YYYY-MM-DD")
    time: str = Field(min_length=4, max_length=5, description="HH:MM (24h)")
    purpose: str = Field(min_length=3, max_length=191)


def _require_active_visitor(
    db: Session, credentials: HTTPAuthorizationCredentials | None, message: str
) -> VisitorAccount:
    account_id = _visitor_account_id(credentials)
    account = db.get(VisitorAccount, account_id) if account_id else None
    if not account or account.profileStatus != ProfileStatus.ACTIVE.value:
        raise HTTPException(status_code=401, detail=message)
    return account


@router.post("/slot-requests")
@public_route
def create_slot_request(
    body: SlotRequestBody,
    db: Annotated[Session, Depends(get_db)],
    background_tasks: BackgroundTasks,
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(visitor_security)] = None,
):
    account = _require_active_visitor(db, credentials, "Sign in to request a visit slot.")
    service = SlotRequestService(db)
    request = service.create(
        account,
        branch_id=body.branchId,
        department_id=body.departmentId,
        sub_department_id=body.subDepartmentId,
        doctor_id=body.doctorId,
        date_str=body.date,
        time_str=body.time,
        purpose=body.purpose.strip(),
    )
    background_tasks.add_task(dispatch_slot_request_to_doctor, request.id)
    return service.serialize(request)


@router.get("/slot-requests")
@public_route
def list_slot_requests(
    db: Annotated[Session, Depends(get_db)],
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(visitor_security)] = None,
):
    account = _require_active_visitor(db, credentials, "Sign in to see your slot requests.")
    return SlotRequestService(db).list_for_account(account.id)


@router.get("/slot-requests/{request_id}")
@public_route
def get_slot_request(
    request_id: str,
    db: Annotated[Session, Depends(get_db)],
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(visitor_security)] = None,
):
    account = _require_active_visitor(db, credentials, "Sign in to see this slot request.")
    service = SlotRequestService(db)
    return service.serialize(service.get_for_account(request_id, account.id))


class SlotWaitlistBody(BaseModel):
    date: str = Field(min_length=10, max_length=10, description="YYYY-MM-DD")


@router.post("/doctors/{doctor_id}/waitlist")
@public_route
def join_slot_waitlist(
    doctor_id: str,
    body: SlotWaitlistBody,
    db: Annotated[Session, Depends(get_db)],
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(visitor_security)] = None,
):
    account_id: str | None = None
    if credentials:
        try:
            token_payload = _decode_visitor_token(credentials.credentials)
            if token_payload.get("role") == "VISITOR":
                account_id = token_payload.get("sub")
        except Exception:
            account_id = None
    account = db.get(VisitorAccount, account_id) if account_id else None
    if not account:
        raise HTTPException(status_code=401, detail="Sign in to get notified when slots open.")
    return SlotWaitlistService(db).join(account.id, doctor_id, body.date)


@router.post("")
@public_route
def book_appointment(
    body: BookAppointmentBody,
    db: Annotated[Session, Depends(get_db)],
    background_tasks: BackgroundTasks,
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(visitor_security)] = None,
):
    payload = body.model_dump()
    if credentials:
        try:
            token_payload = _decode_visitor_token(credentials.credentials)
            if token_payload.get("role") == "VISITOR" and token_payload.get("sub"):
                account = db.get(VisitorAccount, token_payload["sub"])
                if account and account.profileStatus == ProfileStatus.ACTIVE.value:
                    payload["visitorAccountId"] = account.id
                    parts = f"{account.firstName} {account.lastName}".strip().split(" ", 1)
                    payload["firstName"] = account.firstName
                    payload["lastName"] = account.lastName if len(parts) > 1 else body.lastName
                    payload["phone"] = account.phone
                    payload["email"] = account.email
        except Exception:
            pass
    if not payload.get("visitorAccountId"):
        raise HTTPException(status_code=401, detail="Sign in to book and pay for this visit.")
    if payload.get("paymentMethod") not in ("WALLET", "RAZORPAY", "DUMMY"):
        raise HTTPException(status_code=400, detail="Choose wallet or online payment.")
    if payload.get("paymentMethod") == "RAZORPAY" and not (
        payload.get("razorpayOrderId")
        and payload.get("razorpayPaymentId")
        and payload.get("razorpaySignature")
    ):
        raise HTTPException(status_code=400, detail="Online payment was not completed.")
    result = AppointmentsService(db).book_appointment(payload, defer_notifications=True)
    background_tasks.add_task(dispatch_new_visit_request_notifications, result["bookingId"])
    return result


@router.get("/{booking_id}/status")
@public_route
def booking_status(booking_id: str, phone: str = Query(...), db: Session = Depends(get_db)):
    return AppointmentsService(db).get_booking_status(booking_id, phone)


@router.get("/{booking_id}/whatsapp-simulation")
@public_route
def whatsapp_simulation(booking_id: str, phone: str = Query(...), db: Session = Depends(get_db)):
    return AppointmentsService(db).get_whatsapp_simulation(booking_id, phone)
