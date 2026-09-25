"""Hospital and security APIs for the daily visitor-pass pool."""

from typing import Annotated

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies.auth import get_current_user, require_roles
from app.models.enums import Role
from app.services.visitor_pass_service import VisitorPassService

router = APIRouter()

ADMIN_ROLES = (
    Role.SUPER_ADMIN.value,
    Role.HOSPITAL_ADMIN.value,
    Role.BRANCH_ADMIN.value,
)
VIEW_ROLES = ADMIN_ROLES + (
    Role.SECURITY.value,
    Role.SECURITY_SUPERVISOR.value,
)


class PolicyBody(BaseModel):
    dailyQuota: int = Field(ge=1, le=5000)


class IssueBody(BaseModel):
    date: str | None = None
    count: int | None = Field(default=None, ge=1, le=5000)


class AssignBody(BaseModel):
    firstName: str = Field(min_length=1)
    lastName: str = Field(min_length=1)
    phone: str = Field(min_length=10, max_length=10)
    purpose: str = Field(min_length=3)
    doctorId: str | None = None
    appointmentDate: str | None = None


@router.get(
    "/branches/{branch_id}/visitor-pass-policy",
    dependencies=[Depends(require_roles(*VIEW_ROLES))],
)
def get_policy(
    branch_id: str,
    user: Annotated[dict, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    return VisitorPassService(db).get_policy(user, branch_id)


@router.put(
    "/branches/{branch_id}/visitor-pass-policy",
    dependencies=[Depends(require_roles(*ADMIN_ROLES))],
)
def update_policy(
    branch_id: str,
    body: PolicyBody,
    user: Annotated[dict, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    return VisitorPassService(db).update_policy(user, branch_id, body.dailyQuota)


@router.post(
    "/branches/{branch_id}/visitor-passes/issue",
    status_code=201,
    dependencies=[Depends(require_roles(*ADMIN_ROLES))],
)
def issue_passes(
    branch_id: str,
    body: IssueBody,
    user: Annotated[dict, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    return VisitorPassService(db).issue_pool(user, branch_id, pass_date=body.date, count=body.count)


@router.get(
    "/branches/{branch_id}/visitor-passes",
    dependencies=[Depends(require_roles(*VIEW_ROLES))],
)
def list_passes(
    branch_id: str,
    user: Annotated[dict, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
    date: str | None = Query(default=None),
    q: str | None = Query(default=None),
):
    return VisitorPassService(db).list_passes(user, branch_id, pass_date=date, query=q)


@router.post(
    "/visitor-passes/{pass_id}/assign",
    dependencies=[Depends(require_roles(*VIEW_ROLES))],
)
def assign_pass(
    pass_id: str,
    body: AssignBody,
    user: Annotated[dict, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    return VisitorPassService(db).assign_specific(
        user,
        pass_id,
        first_name=body.firstName,
        last_name=body.lastName,
        phone=body.phone,
        purpose=body.purpose,
        doctor_id=body.doctorId,
        appointment_date=body.appointmentDate,
    )
