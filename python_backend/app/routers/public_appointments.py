from typing import Annotated, Literal

from fastapi import APIRouter, BackgroundTasks, Depends, Query
from fastapi.security import HTTPAuthorizationCredentials
from pydantic import BaseModel, EmailStr, Field, field_validator, model_validator
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies.auth import public_route
from app.dependencies.visitor_auth import _decode_visitor_token, visitor_security
from app.models import VisitorAccount
from app.models.enums import ProfileStatus
from app.services.appointments_service import AppointmentsService
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
    purpose: str = Field(min_length=3)
    appointmentMode: Literal["IN_PERSON", "ONLINE"] = "IN_PERSON"
    visitorType: Literal["GENERAL", "SALES_REPRESENTATIVE", "VENDOR"] = "GENERAL"
    companyName: str | None = None
    companyEmail: EmailStr | None = None

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
def list_hospitals(db: Annotated[Session, Depends(get_db)]):
    return AppointmentsService(db).list_public_hospitals()


@router.get("/departments")
@public_route
def list_departments(branchId: str = Query(...), db: Session = Depends(get_db)):
    return AppointmentsService(db).list_public_departments(branchId)


@router.get("/sub-departments")
@public_route
def list_sub_departments(departmentId: str = Query(...), db: Session = Depends(get_db)):
    return AppointmentsService(db).list_public_sub_departments(departmentId)


@router.get("/doctors")
@public_route
def list_doctors(subDepartmentId: str = Query(...), db: Session = Depends(get_db)):
    return AppointmentsService(db).list_public_doctors(subDepartmentId)


@router.get("/doctors/{doctor_id}")
@public_route
def get_doctor(doctor_id: str, db: Session = Depends(get_db)):
    return AppointmentsService(db).get_public_doctor(doctor_id)


@router.get("/doctors/{doctor_id}/slots")
@public_route
def list_doctor_slots(
    doctor_id: str,
    date: str = Query(..., description="YYYY-MM-DD"),
    db: Session = Depends(get_db),
):
    return AppointmentsService(db).list_doctor_slots(doctor_id, date)


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
