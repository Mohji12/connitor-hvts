"""Staff and security endpoints for doctor urgent entry passcodes."""

from datetime import datetime
from typing import Annotated, Literal

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies.auth import get_current_user, require_roles
from app.models.enums import Role
from app.services.doctor_urgent_passcode_service import DoctorUrgentPasscodeService

staff_router = APIRouter(
    dependencies=[
        Depends(get_current_user),
        Depends(
            require_roles(
                Role.STAFF.value,
                Role.HOSPITAL_ADMIN.value,
                Role.DEPARTMENT_ADMIN.value,
                Role.SUB_DEPARTMENT_ADMIN.value,
                Role.BRANCH_ADMIN.value,
            )
        ),
    ]
)


class IssuePasscodeBody(BaseModel):
    note: str | None = Field(None, max_length=500)
    purpose: str | None = Field(None, max_length=500)
    theme: str | None = Field(None, max_length=100)
    visitTime: datetime | None = None
    recipientName: str | None = Field(None, max_length=200)
    recipientPhone: str | None = Field(None, max_length=20)
    recipientEmail: str | None = Field(None, max_length=255)


class UpdatePasscodeBody(BaseModel):
    note: str | None = Field(None, max_length=500)
    purpose: str | None = Field(None, max_length=500)
    theme: str | None = Field(None, max_length=100)
    visitTime: datetime | None = None
    recipientName: str | None = Field(None, max_length=200)
    recipientPhone: str | None = Field(None, max_length=20)
    recipientEmail: str | None = Field(None, max_length=255)


class SharePasscodeBody(BaseModel):
    channels: list[Literal["sms", "email"]] = Field(..., min_length=1)
    recipientName: str | None = Field(None, max_length=200)
    phone: str | None = Field(None, max_length=20)
    email: str | None = Field(None, max_length=255)


@staff_router.post("", status_code=201)
def issue_urgent_passcode(
    body: IssuePasscodeBody,
    user: Annotated[dict, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    return DoctorUrgentPasscodeService(db).issue(
        user,
        body.note,
        purpose=body.purpose,
        theme=body.theme,
        visit_time=body.visitTime,
        recipient_name=body.recipientName,
        recipient_phone=body.recipientPhone,
        recipient_email=body.recipientEmail,
    )


@staff_router.get("")
def list_urgent_passcodes(
    user: Annotated[dict, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    return DoctorUrgentPasscodeService(db).list_for_staff(user)


@staff_router.patch("/{passcode_id}")
def update_urgent_passcode(
    passcode_id: str,
    body: UpdatePasscodeBody,
    user: Annotated[dict, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    return DoctorUrgentPasscodeService(db).update(
        user,
        passcode_id,
        note=body.note,
        purpose=body.purpose,
        theme=body.theme,
        visit_time=body.visitTime,
        recipient_name=body.recipientName,
        recipient_phone=body.recipientPhone,
        recipient_email=body.recipientEmail,
    )


@staff_router.post("/{passcode_id}/share")
def share_urgent_passcode(
    passcode_id: str,
    body: SharePasscodeBody,
    user: Annotated[dict, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    return DoctorUrgentPasscodeService(db).share(
        user,
        passcode_id,
        channels=list(body.channels),
        recipient_name=body.recipientName,
        phone=body.phone,
        email=body.email,
    )


@staff_router.post("/{passcode_id}/revoke")
def revoke_urgent_passcode(
    passcode_id: str,
    user: Annotated[dict, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    return DoctorUrgentPasscodeService(db).revoke(user, passcode_id)


security_router = APIRouter(
    dependencies=[
        Depends(get_current_user),
        Depends(require_roles(Role.SECURITY.value, Role.SECURITY_SUPERVISOR.value)),
    ]
)


class VerifyPasscodeBody(BaseModel):
    code: str = Field(..., min_length=6, max_length=6)


class ConfirmVerifyBody(BaseModel):
    code: str = Field(..., min_length=6, max_length=6)


class RedeemPasscodeBody(BaseModel):
    code: str = Field(..., min_length=6, max_length=6)
    firstName: str = Field(..., min_length=2)
    lastName: str | None = None
    email: str
    phone: str
    reason: str = Field(..., min_length=5)


@security_router.post("/verify")
def verify_urgent_passcode(
    body: VerifyPasscodeBody,
    user: Annotated[dict, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    return DoctorUrgentPasscodeService(db).verify(user, body.code)


@security_router.post("/confirm-verify")
def confirm_verify_urgent_passcode(
    body: ConfirmVerifyBody,
    user: Annotated[dict, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    """Mark passcode VERIFIED and return visitor register/book URL."""
    return DoctorUrgentPasscodeService(db).confirm_verify(user, body.code)


@security_router.post("/redeem")
def redeem_urgent_passcode(
    body: RedeemPasscodeBody,
    user: Annotated[dict, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    return DoctorUrgentPasscodeService(db).redeem(
        user,
        code=body.code,
        first_name=body.firstName,
        last_name=body.lastName,
        email=body.email,
        phone=body.phone,
        reason=body.reason,
    )
