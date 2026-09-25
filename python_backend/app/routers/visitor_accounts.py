from typing import Annotated

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, Request, UploadFile
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session

from app.config import get_public_frontend_url, get_settings
from app.database import get_db
from app.dependencies.auth import public_route
from app.dependencies.visitor_auth import get_current_visitor_account
from app.models.enums import GovtIdType
from app.schemas.visitor_account import (
    CreateVisitorAccountBody,
    GovernmentIdBody,
    SetPasswordBody,
    UpdateProfessionalBody,
    UpdateProfileBody,
    VerifyPhoneBody,
)
from app.services.rate_limit_service import RateLimitService
from app.services.visitor_account_service import VisitorAccountService

router = APIRouter()
rate_limits = RateLimitService()


@router.post("")
@public_route
def create_account(body: CreateVisitorAccountBody, db: Annotated[Session, Depends(get_db)]):
    return VisitorAccountService(db).create_draft(body)


@router.patch("/{account_id}")
@public_route
def update_professional(
    account_id: str,
    body: UpdateProfessionalBody,
    db: Annotated[Session, Depends(get_db)],
):
    return VisitorAccountService(db).update_professional(account_id, body)


@router.post("/{account_id}/password")
@public_route
def set_password(
    account_id: str,
    body: SetPasswordBody,
    db: Annotated[Session, Depends(get_db)],
):
    return VisitorAccountService(db).set_password(account_id, body)


@router.post("/{account_id}/photo")
@public_route
async def upload_photo(
    account_id: str,
    db: Annotated[Session, Depends(get_db)],
    photo: UploadFile = File(...),
):
    return await VisitorAccountService(db).upload_live_photo(account_id, photo)


@router.post("/{account_id}/government-id")
@public_route
async def upload_government_id(
    account_id: str,
    db: Annotated[Session, Depends(get_db)],
    govtIdType: GovtIdType = Form(...),
    govtIdTypeOther: str | None = Form(None),
    document: UploadFile = File(...),
):
    meta = GovernmentIdBody(govtIdType=govtIdType, govtIdTypeOther=govtIdTypeOther)
    return await VisitorAccountService(db).upload_government_id(account_id, document, meta)


@router.post("/{account_id}/send-phone-otp")
@public_route
def send_phone_otp(
    account_id: str,
    request: Request,
    db: Annotated[Session, Depends(get_db)],
):
    rate_limits.check_action_rate_limit(request, "visitor_phone_otp", limit=5, window_seconds=3600)
    return VisitorAccountService(db).send_phone_otp(account_id)


@router.post("/{account_id}/send-email-verification")
@public_route
def send_email_verification(
    account_id: str,
    request: Request,
    db: Annotated[Session, Depends(get_db)],
):
    rate_limits.check_action_rate_limit(request, "visitor_email_verify", limit=5, window_seconds=3600)
    return VisitorAccountService(db).send_email_verification(account_id)


@router.post("/{account_id}/verify-phone")
@public_route
def verify_phone(
    account_id: str,
    body: VerifyPhoneBody,
    db: Annotated[Session, Depends(get_db)],
):
    return VisitorAccountService(db).verify_phone_otp(account_id, body.otp)


@router.post("/{account_id}/verify-email")
@public_route
def verify_email_otp(
    account_id: str,
    body: VerifyPhoneBody,
    db: Annotated[Session, Depends(get_db)],
):
    return VisitorAccountService(db).verify_email_otp(account_id, body.otp)


@router.get("/verify-email")
@public_route
def verify_email(
    request: Request,
    token: str = Query(...),
    format: str | None = Query(None),
    db: Session = Depends(get_db),
):
    service = VisitorAccountService(db)
    accept = request.headers.get("accept", "")
    wants_json = format == "json" or "application/json" in accept

    try:
        result = service.verify_email_token(token)
    except HTTPException:
        if wants_json:
            raise
        frontend = get_public_frontend_url(get_settings())
        return RedirectResponse(f"{frontend}/visitor/verify-email/?error=1")

    if wants_json:
        return result

    frontend = get_public_frontend_url(get_settings())
    activated = "1" if result.get("activated") else "0"
    return RedirectResponse(f"{frontend}/visitor/verify-email/?verified=1&activated={activated}")


@router.post("/{account_id}/activate")
@public_route
def activate_account(account_id: str, db: Annotated[Session, Depends(get_db)]):
    return VisitorAccountService(db).activate(account_id)


@router.get("/{account_id}/preview")
@public_route
def preview_account(account_id: str, db: Annotated[Session, Depends(get_db)]):
    return VisitorAccountService(db).get_preview(account_id)


@router.get("/me")
def my_profile(
    account: Annotated[dict, Depends(get_current_visitor_account)],
    db: Annotated[Session, Depends(get_db)],
):
    return VisitorAccountService(db).get_preview(account["accountId"])


@router.patch("/me")
def update_my_profile(
    body: UpdateProfileBody,
    account: Annotated[dict, Depends(get_current_visitor_account)],
    db: Annotated[Session, Depends(get_db)],
):
    return VisitorAccountService(db).update_profile(account["accountId"], body)
