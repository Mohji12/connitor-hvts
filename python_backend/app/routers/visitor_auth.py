from typing import Annotated

from fastapi import APIRouter, Depends, Query, Request
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session

from app.config import get_settings
from app.database import get_db
from app.dependencies.auth import public_route
from app.schemas.visitor_account import (
    ForgotPasswordBody,
    PhoneOtpLoginBody,
    PhoneOtpRequestBody,
    ResetPasswordBody,
    VisitorLoginBody,
)
from app.services.rate_limit_service import RateLimitService
from app.services.visitor_auth_service import VisitorAuthService

router = APIRouter()
rate_limits = RateLimitService()


@router.post("/login")
@public_route
def login(body: VisitorLoginBody, request: Request, db: Annotated[Session, Depends(get_db)]):
    rate_limits.check_action_rate_limit(request, "visitor_login", limit=20, window_seconds=3600)
    return VisitorAuthService(db).login_with_password(body.identifier, body.password)


@router.post("/login-otp/request")
@public_route
def request_login_otp(body: PhoneOtpRequestBody, request: Request, db: Annotated[Session, Depends(get_db)]):
    rate_limits.check_action_rate_limit(request, "visitor_login_otp_request", limit=5, window_seconds=3600)
    return VisitorAuthService(db).request_login_otp(body.phone)


@router.post("/login-otp/verify")
@public_route
def verify_login_otp(body: PhoneOtpLoginBody, request: Request, db: Annotated[Session, Depends(get_db)]):
    rate_limits.check_action_rate_limit(request, "visitor_login_otp_verify", limit=20, window_seconds=3600)
    return VisitorAuthService(db).login_with_otp(body.phone, body.otp)


@router.post("/forgot-password")
@public_route
def forgot_password(body: ForgotPasswordBody, request: Request, db: Annotated[Session, Depends(get_db)]):
    rate_limits.check_action_rate_limit(request, "visitor_forgot_password", limit=5, window_seconds=3600)
    return VisitorAuthService(db).forgot_password(body.phone)


@router.post("/reset-password")
@public_route
def reset_password(body: ResetPasswordBody, request: Request, db: Annotated[Session, Depends(get_db)]):
    rate_limits.check_action_rate_limit(request, "visitor_reset_password", limit=10, window_seconds=3600)
    return VisitorAuthService(db).reset_password(body.phone, body.otp, body.password)


@router.get("/google")
@public_route
def google_start(db: Annotated[Session, Depends(get_db)]):
    result = VisitorAuthService(db).oauth_authorize_url("google")
    return RedirectResponse(result["authorizationUrl"])


@router.get("/google/callback")
@public_route
def google_callback(
    code: str = Query(...),
    state: str = Query(...),
    db: Session = Depends(get_db),
):
    result = VisitorAuthService(db).oauth_callback("google", code, state)
    settings = get_settings()
    return RedirectResponse(
        f"{settings.frontend_url.rstrip('/')}/visitor/oauth-callback"
        f"?token={result['access_token']}&accountId={result['accountId']}"
    )


@router.get("/linkedin")
@public_route
def linkedin_start(db: Annotated[Session, Depends(get_db)]):
    result = VisitorAuthService(db).oauth_authorize_url("linkedin")
    return RedirectResponse(result["authorizationUrl"])


@router.get("/linkedin/callback")
@public_route
def linkedin_callback(
    code: str = Query(...),
    state: str = Query(...),
    db: Session = Depends(get_db),
):
    result = VisitorAuthService(db).oauth_callback("linkedin", code, state)
    settings = get_settings()
    return RedirectResponse(
        f"{settings.frontend_url.rstrip('/')}/visitor/oauth-callback"
        f"?token={result['access_token']}&accountId={result['accountId']}"
    )
