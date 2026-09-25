from typing import Annotated

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies.auth import get_current_user, require_roles
from app.models.enums import Role
from app.services.security_service import SecurityService

router = APIRouter(
    dependencies=[Depends(get_current_user), Depends(require_roles(Role.SECURITY.value, Role.SECURITY_SUPERVISOR.value))]
)


class RejectBody(BaseModel):
    rejectionReason: str


class IdProofBody(BaseModel):
    idProofType: str
    idProofNumber: str


@router.patch("/visits/{visit_id}/approve")
def approve_visit(visit_id: str, user: Annotated[dict, Depends(get_current_user)], db: Annotated[Session, Depends(get_db)]):
    return SecurityService(db).approve_visit(visit_id, user)


@router.patch("/visits/{visit_id}/reject")
def reject_visit(
    visit_id: str, body: RejectBody, user: Annotated[dict, Depends(get_current_user)], db: Annotated[Session, Depends(get_db)]
):
    return SecurityService(db).reject_visit(visit_id, user, body.rejectionReason)


@router.get("/visitors/counts")
def visitor_counts(
    branchId: str = Query(...),
    user: Annotated[dict, Depends(get_current_user)] = ...,
    db: Session = Depends(get_db),
):
    return SecurityService(db).get_visitor_counts(branchId, user)


@router.get("/visitors")
def visitors_by_status(
    branchId: str = Query(...),
    status: list[str] = Query(default=[]),
    user: Annotated[dict, Depends(get_current_user)] = ...,
    db: Session = Depends(get_db),
):
    return SecurityService(db).get_visitors_by_status(branchId, status, user)


@router.get("/visits/{visit_id}/details")
def visit_details(visit_id: str, user: Annotated[dict, Depends(get_current_user)], db: Annotated[Session, Depends(get_db)]):
    return SecurityService(db).get_visitor_details(visit_id, user)


@router.post("/visits/{visit_id}/verify-id-proof")
def verify_id_proof(
    visit_id: str,
    body: IdProofBody,
    user: Annotated[dict, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    return SecurityService(db).verify_id_proof(
        visit_id, user, body.idProofType, body.idProofNumber
    )


@router.get("/appointments/today")
def today_appointments(
    user: Annotated[dict, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    return SecurityService(db).get_today_appointments(user)


@router.get("/appointments/pending")
def pending_appointments(
    user: Annotated[dict, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    return SecurityService(db).get_pending_appointments(user)


@router.get("/appointments/confirmed")
def confirmed_appointments(
    user: Annotated[dict, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    return SecurityService(db).get_upcoming_confirmed_appointments(user)


@router.get("/visitor-passes")
def list_visitor_passes(
    user: Annotated[dict, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
    date: str | None = Query(default=None),
    q: str | None = Query(default=None),
    branchId: str | None = Query(default=None),
):
    from app.services.visitor_pass_service import VisitorPassService

    branch_id = branchId or user.get("branchId")
    if not branch_id:
        from fastapi import HTTPException

        raise HTTPException(status_code=400, detail="branchId is required.")
    return VisitorPassService(db).list_passes(user, branch_id, pass_date=date, query=q)


@router.get("/deliveries/today")
def today_deliveries(
    user: Annotated[dict, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
    branchId: str | None = Query(None),
):
    from app.config import get_settings
    from app.delivery.inbound_delivery_service import InboundDeliveryService

    if not get_settings().delivery_module_enabled:
        return {"deliveries": [], "total": 0}
    return InboundDeliveryService(db).list_today_deliveries(user, branchId)


@router.get("/queue")
def unified_security_queue(
    user: Annotated[dict, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
    branchId: str = Query(...),
):
    from app.config import get_settings
    from app.delivery.gate_service import DeliveryGateService

    if not get_settings().delivery_module_enabled:
        return {"walkInVisits": [], "vendorDeliveries": []}
    return DeliveryGateService(db).unified_queue(user, branchId)
