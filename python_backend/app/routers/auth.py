from typing import Annotated

from fastapi import APIRouter, Depends
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies.auth import get_current_user
from app.services.auth_service import AuthService

router = APIRouter()


class LoginBody(BaseModel):
    email: EmailStr


class LoginPasswordBody(BaseModel):
    email: EmailStr
    password: str


class VerifyOtpBody(BaseModel):
    email: EmailStr
    otp: str


class ForgotPasswordBody(BaseModel):
    email: EmailStr


class ResetPasswordBody(BaseModel):
    email: EmailStr
    otp: str
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
def forgot_password(body: ForgotPasswordBody, db: Annotated[Session, Depends(get_db)]):
    return AuthService(db).request_password_reset(str(body.email))


@router.post("/reset-password")
def reset_password(body: ResetPasswordBody, db: Annotated[Session, Depends(get_db)]):
    return AuthService(db).reset_password_with_otp(str(body.email), body.otp, body.password)


@router.get("/me")
def get_me(user: Annotated[dict, Depends(get_current_user)], db: Annotated[Session, Depends(get_db)]):
    return AuthService(db).get_profile(user["id"])
