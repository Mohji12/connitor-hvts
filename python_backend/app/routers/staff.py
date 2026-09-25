from typing import Annotated

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies.auth import get_current_user, require_roles
from app.models.enums import Role
from app.services.staff_service import StaffService

router = APIRouter(
    dependencies=[
        Depends(get_current_user),
        Depends(require_roles(Role.STAFF.value, Role.SECURITY.value, Role.SECURITY_SUPERVISOR.value)),
    ]
)


class RejectBody(BaseModel):
    rejectionReason: str


class ApproveBody(BaseModel):
    doctorFeedback: str | None = None


@router.get("/pending-visits")
def pending_visits(user: Annotated[dict, Depends(get_current_user)], db: Annotated[Session, Depends(get_db)]):
    return StaffService(db).get_pending_visits(user["id"])


@router.get("/history")
def history(user: Annotated[dict, Depends(get_current_user)], db: Annotated[Session, Depends(get_db)]):
    return StaffService(db).get_visitor_history(user["id"])


@router.patch("/visits/{visit_id}/approve")
def approve_visit(
    visit_id: str,
    body: ApproveBody = ApproveBody(),
    user: Annotated[dict, Depends(get_current_user)] = ...,
    db: Annotated[Session, Depends(get_db)] = ...,
):
    return StaffService(db).approve_visit(visit_id, user["id"], body.doctorFeedback)


@router.patch("/visits/{visit_id}/reject")
def reject_visit(
    visit_id: str,
    body: RejectBody,
    user: Annotated[dict, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    return StaffService(db).reject_visit(visit_id, user["id"], body.rejectionReason)
