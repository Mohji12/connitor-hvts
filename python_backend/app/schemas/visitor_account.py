from __future__ import annotations

import hashlib
import re
import secrets
from datetime import timedelta
from typing import Any

from pydantic import BaseModel, EmailStr, Field, field_validator

from app.models.enums import EmailType, GovtIdType, ProfileStatus


class CreateVisitorAccountBody(BaseModel):
    firstName: str = Field(min_length=1, max_length=100)
    lastName: str = Field(min_length=1, max_length=100)
    phone: str = Field(min_length=10, max_length=15)
    email: EmailStr
    emailType: EmailType = EmailType.PERSONAL

    @field_validator("phone")
    @classmethod
    def normalize_phone(cls, v: str) -> str:
        digits = re.sub(r"\D", "", v)
        if len(digits) == 10:
            return digits
        if len(digits) == 12 and digits.startswith("91"):
            return digits[2:]
        raise ValueError("Phone must be 10 digits")


class UpdateProfessionalBody(BaseModel):
    companyName: str = Field(min_length=1, max_length=191)
    jobTitle: str = Field(min_length=1, max_length=191)
    linkedinUrl: str | None = Field(default=None, max_length=500)


class SetPasswordBody(BaseModel):
    password: str = Field(min_length=8, max_length=128)
    acceptTerms: bool
    privacyPolicyVersion: str = Field(default="2026-06-01", max_length=32)

    @field_validator("password")
    @classmethod
    def password_strength(cls, v: str) -> str:
        if not re.search(r"[A-Z]", v):
            raise ValueError("Password must contain an uppercase letter")
        if not re.search(r"[a-z]", v):
            raise ValueError("Password must contain a lowercase letter")
        if not re.search(r"\d", v):
            raise ValueError("Password must contain a digit")
        return v


class VerifyPhoneBody(BaseModel):
    otp: str = Field(min_length=4, max_length=8)


class GovernmentIdBody(BaseModel):
    govtIdType: GovtIdType
    govtIdTypeOther: str | None = Field(default=None, max_length=100)


class VisitorLoginBody(BaseModel):
    identifier: str = Field(min_length=3, max_length=191)
    password: str = Field(min_length=8, max_length=128)


class ForgotPasswordBody(BaseModel):
    phone: str = Field(min_length=10, max_length=20)


class PhoneOtpRequestBody(BaseModel):
    phone: str = Field(min_length=10, max_length=20)


class PhoneOtpLoginBody(BaseModel):
    phone: str = Field(min_length=10, max_length=20)
    otp: str = Field(min_length=6, max_length=6)


class ResetPasswordBody(BaseModel):
    phone: str = Field(min_length=10, max_length=20)
    otp: str = Field(min_length=6, max_length=6)
    password: str = Field(min_length=8, max_length=128)


class UpdateProfileBody(BaseModel):
    firstName: str | None = Field(default=None, max_length=100)
    lastName: str | None = Field(default=None, max_length=100)
    phone: str | None = Field(default=None, max_length=15)
    email: EmailStr | None = None
    companyName: str | None = None
    jobTitle: str | None = None
    linkedinUrl: str | None = None

    @field_validator("phone")
    @classmethod
    def normalize_optional_phone(cls, v: str | None) -> str | None:
        if v is None or not str(v).strip():
            return None
        digits = re.sub(r"\D", "", v)
        if len(digits) == 12 and digits.startswith("91"):
            digits = digits[2:]
        if len(digits) != 10:
            raise ValueError("Phone must be 10 digits")
        return digits


def hash_token(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


def generate_verification_token() -> str:
    return secrets.token_urlsafe(32)
