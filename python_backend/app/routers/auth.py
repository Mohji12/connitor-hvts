from typing import Annotated

from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies.auth import get_current_user
from app.services.auth_service import AuthService
from app.services.rate_limit_service import RateLimitService

router = APIRouter()
rate_limits = RateLimitService()


class LoginBody(BaseModel):
    email: EmailStr


class LoginPasswordBody(BaseModel):
    email: EmailStr
    password: str


class VerifyOtpBody(BaseModel):
    email: EmailStr
    otp: str


class ForgotPasswordBody(BaseModel):
    phone: str = Field(min_length=10, max_length=20)


class ResetPasswordBody(BaseModel):
    phone: str = Field(min_length=10, max_length=20)
    otp: str = Field(min_length=6, max_length=6)
    password: str


@router.post("/login")
def login(body: LoginBody, db: Annotated[Session, Depends(get_db)]):
    return AuthService(db).login(str(body.email))


@router.post("/login-password")
def login_password(body: LoginPasswordBody, db: Annotated[Session, Depends(get_db)]):
    return AuthService(db).login_with_password(str(body.email), body.password)


@router.post("/verify-otp")
def verify_otp(body: VerifyOtpBody, db: Annotated[Session, Depends(get_db)]):
    return AuthService(db).verify_otp(str(body.email), body.otp)


@router.post("/forgot-password")
def forgot_password(body: ForgotPasswordBody, request: Request, db: Annotated[Session, Depends(get_db)]):
    rate_limits.check_action_rate_limit(request, "staff_forgot_password", limit=5, window_seconds=3600)
    return AuthService(db).request_password_reset(body.phone)


@router.post("/reset-password")
def reset_password(body: ResetPasswordBody, request: Request, db: Annotated[Session, Depends(get_db)]):
    rate_limits.check_action_rate_limit(request, "staff_reset_password", limit=10, window_seconds=3600)
    return AuthService(db).reset_password_with_otp(body.phone, body.otp, body.password)


@router.get("/me")
def get_me(user: Annotated[dict, Depends(get_current_user)], db: Annotated[Session, Depends(get_db)]):
    return AuthService(db).get_profile(user["id"])
