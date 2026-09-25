"""Public attendant pass apply + admission lookup + ward approval links (no auth)."""

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy.orm import Session

from app.attendant.approval_link_service import AttendantApprovalLinkService
from app.attendant.pass_service import AttendantPassService
from app.database import get_db
from app.dependencies.auth import public_route

router = APIRouter()


@router.get("/branches")
def list_branches(db: Annotated[Session, Depends(get_db)]):
    return AttendantPassService(db).list_public_branches()


class PublicApplyBody(BaseModel):
    admissionId: str
    name: str
    email: EmailStr
    phone: str
    relationship: str | None = None


class TokenBody(BaseModel):
    token: str = Field(min_length=16)


class RejectViaLinkBody(BaseModel):
    token: str = Field(min_length=16)
    reason: str = Field(default="Declined via approval link", max_length=500)


@router.get("/admissions/lookup")
def lookup_admission(
    db: Annotated[Session, Depends(get_db)],
    branchId: str = Query(...),
    mrn: str = Query(...),
):
    return AttendantPassService(db).lookup_admission_by_mrn(branchId, mrn)


@router.get("/admissions/search")
def search_admissions(
    db: Annotated[Session, Depends(get_db)],
    branchId: str = Query(...),
    q: str = Query(..., min_length=2),
):
    return AttendantPassService(db).search_admissions_by_name(branchId, q)


@router.post("/apply", status_code=201)
def public_apply(
    body: PublicApplyBody,
    db: Annotated[Session, Depends(get_db)],
):
    return AttendantPassService(db).public_apply(body.model_dump())


@router.get("/approval/preview")
@public_route
def preview_approval(token: str = Query(..., min_length=16), db: Session = Depends(get_db)):
    return AttendantApprovalLinkService(db).get_preview(token)


@router.post("/approval/approve")
@public_route
def approve_via_link(body: TokenBody, db: Annotated[Session, Depends(get_db)]):
    try:
        return AttendantApprovalLinkService(db).approve(body.token)
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail="Could not approve attendant request.") from exc


@router.post("/approval/reject")
@public_route
def reject_via_link(body: RejectViaLinkBody, db: Annotated[Session, Depends(get_db)]):
    return AttendantApprovalLinkService(db).reject(body.token, body.reason)
