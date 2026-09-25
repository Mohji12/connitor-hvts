from typing import Annotated

from fastapi import APIRouter, Depends
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies.auth import public_route
from app.dependencies.visitor_auth import get_current_visitor
from app.services.visitor_portal_service import VisitorPortalService

router = APIRouter()


class VisitorOtpRequestBody(BaseModel):
    email: EmailStr


class VisitorOtpVerifyBody(BaseModel):
    email: EmailStr
    otp: str = Field(min_length=4, max_length=8)


@router.post("/request-otp")
@public_route
def request_otp(body: VisitorOtpRequestBody, db: Annotated[Session, Depends(get_db)]):
    return VisitorPortalService(db).request_otp(str(body.email))


@router.post("/verify-otp")
@public_route
def verify_otp(body: VisitorOtpVerifyBody, db: Annotated[Session, Depends(get_db)]):
    return VisitorPortalService(db).verify_otp(str(body.email), body.otp.strip())


@router.get("/appointments")
def list_appointments(
    visitor: Annotated[dict, Depends(get_current_visitor)],
    db: Annotated[Session, Depends(get_db)],
):
    service = VisitorPortalService(db)
    if visitor.get("accountId"):
        return service.list_appointments_for_account(visitor["accountId"])
    return service.list_appointments(visitor["email"])
