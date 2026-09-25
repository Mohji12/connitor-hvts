from typing import Annotated, Literal

from fastapi import APIRouter, Depends
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy.orm import Session

from app.database import get_db
from app.services.registration_service import RegistrationService

router = APIRouter()


class RegisterBody(BaseModel):
    name: str = Field(min_length=1)
    email: EmailStr
    phone: str = Field(min_length=10, max_length=10)
    role: Literal["CHAIN_ADMIN", "BRANCH_ADMIN", "STAFF", "SECURITY", "SECURITY_SUPERVISOR"]
    hospitalChainId: str
    branchId: str | None = None
    userType: str | None = None
    department: str | None = None
    location: str | None = None


class RegisterEmailBody(BaseModel):
    email: EmailStr


class RegisterVerifyBody(BaseModel):
    email: EmailStr
    otp: str = Field(min_length=6, max_length=6)


@router.get("/hospital-chains")
def list_chains(db: Annotated[Session, Depends(get_db)]):
    return RegistrationService(db).list_hospital_chains()


@router.get("/chains/{chain_id}/branches")
def list_branches(chain_id: str, db: Annotated[Session, Depends(get_db)]):
    return RegistrationService(db).list_branches(chain_id)


@router.post("/register")
def register(body: RegisterBody, db: Annotated[Session, Depends(get_db)]):
    return RegistrationService(db).register(body.model_dump())


@router.post("/register/resend-otp")
def resend_registration_otp(body: RegisterEmailBody, db: Annotated[Session, Depends(get_db)]):
    return RegistrationService(db).resend_otp(str(body.email))


@router.post("/register/verify-otp")
def verify_registration(body: RegisterVerifyBody, db: Annotated[Session, Depends(get_db)]):
    return RegistrationService(db).verify_email(str(body.email), body.otp)
