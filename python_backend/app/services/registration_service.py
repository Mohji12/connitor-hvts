import random
from datetime import datetime, timedelta
from app.utils.timezone import ist_day_bounds, now_ist, parse_to_ist_naive, today_end_ist, today_start_ist

import bcrypt
from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.config import get_fixed_otp, get_settings, is_test_mode_enabled
from app.models import Branch, HospitalChain, User
from app.models.enums import Role
from app.services.messaging_service import EmailService

SELF_REGISTER_ROLES = {
    Role.CHAIN_ADMIN.value,
    Role.BRANCH_ADMIN.value,
    Role.STAFF.value,
    Role.SECURITY.value,
    Role.SECURITY_SUPERVISOR.value,
}

REGISTRATION_OTP_MINUTES = 10


class RegistrationService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.email = EmailService()

    @staticmethod
    def normalize_email(email: str) -> str:
        return email.strip().lower()

    def _validate_payload(self, data: dict) -> dict:
        role = data.get("role")
        if role not in SELF_REGISTER_ROLES:
            raise HTTPException(
                status_code=400,
                detail="Invalid role for self-registration. SUPER_ADMIN cannot self-register.",
            )

        name = (data.get("name") or "").strip()
        email = self.normalize_email(data.get("email") or "")
        phone = (data.get("phone") or "").strip()
        hospital_chain_id = data.get("hospitalChainId")
        branch_id = data.get("branchId") or None

        if not name:
            raise HTTPException(status_code=400, detail="Name is required.")
        if not email:
            raise HTTPException(status_code=400, detail="Email is required.")
        if not phone or len(phone) != 10 or not phone.isdigit():
            raise HTTPException(status_code=400, detail="Phone must be exactly 10 digits.")
        if not hospital_chain_id:
            raise HTTPException(status_code=400, detail="Hospital chain is required.")

        chain = self.db.get(HospitalChain, hospital_chain_id)
        if not chain:
            raise HTTPException(status_code=400, detail="Invalid hospital chain.")

        needs_branch = role in (
            Role.BRANCH_ADMIN.value,
            Role.STAFF.value,
            Role.SECURITY.value,
            Role.SECURITY_SUPERVISOR.value,
        )
        if needs_branch and not branch_id:
            raise HTTPException(status_code=400, detail="Branch is required for this role.")

        if branch_id:
            branch = self.db.get(Branch, branch_id)
            if not branch:
                raise HTTPException(status_code=400, detail="Invalid branch.")
            if branch.hospitalChainId != hospital_chain_id:
                raise HTTPException(status_code=400, detail="Branch does not belong to selected chain.")

        if role == Role.STAFF.value:
            if not data.get("userType"):
                raise HTTPException(status_code=400, detail="User type is required for staff.")
            if not data.get("department"):
                raise HTTPException(status_code=400, detail="Department is required for staff.")

        return {
            "name": name,
            "email": email,
            "phone": phone,
            "role": role,
            "hospitalChainId": hospital_chain_id,
            "branchId": branch_id if needs_branch else None,
            "userType": data.get("userType"),
            "department": data.get("department"),
            "location": data.get("location"),
        }

    def _generate_otp(self) -> str:
        settings = get_settings()
        fixed = get_fixed_otp(settings)
        return fixed or f"{random.randint(100000, 999999)}"

    def _store_otp(self, user: User, otp: str) -> None:
        user.otp = bcrypt.hashpw(otp.encode(), bcrypt.gensalt()).decode()
        user.otpExpires = now_ist() + timedelta(minutes=REGISTRATION_OTP_MINUTES)

    def _send_verification_email(self, email: str, otp: str) -> dict:
        settings = get_settings()
        response: dict = {
            "message": "Verification code sent to your email. Enter it to complete registration.",
        }
        if is_test_mode_enabled(settings):
            response["testOtp"] = otp
        else:
            try:
                self.email.send_registration_otp(email, otp)
            except Exception as exc:
                raise HTTPException(
                    status_code=503,
                    detail="Failed to send verification email. Please try again later.",
                ) from exc
        return response

    def register(self, data: dict) -> dict:
        payload = self._validate_payload(data)
        email = payload["email"]
        phone = payload["phone"]

        existing_email = self.db.query(User).filter(User.email == email).first()
        existing_phone = self.db.query(User).filter(User.phone == phone).first()

        if existing_email and existing_email.isActive:
            raise HTTPException(status_code=409, detail="An account with this email already exists.")
        if existing_phone:
            same_pending = existing_email and existing_phone.id == existing_email.id
            if not same_pending:
                raise HTTPException(status_code=409, detail="An account with this phone already exists.")

        otp = self._generate_otp()

        if existing_email and not existing_email.isActive:
            user = existing_email
            for key, value in payload.items():
                setattr(user, key, value)
        else:
            user = User(**payload, isActive=False)
            self.db.add(user)

        self._store_otp(user, otp)
        self.db.commit()

        result = self._send_verification_email(email, otp)
        result["email"] = email
        return result

    def resend_otp(self, email: str) -> dict:
        normalized = self.normalize_email(email)
        user = self.db.query(User).filter(User.email == normalized).first()
        if not user:
            raise HTTPException(status_code=404, detail="Registration not found for this email.")
        if user.isActive:
            raise HTTPException(status_code=400, detail="Account is already verified. Please sign in.")

        otp = self._generate_otp()
        self._store_otp(user, otp)
        self.db.commit()
        return self._send_verification_email(normalized, otp)

    def verify_email(self, email: str, otp: str) -> dict:
        normalized = self.normalize_email(email)
        user = self.db.query(User).filter(User.email == normalized).first()
        if not user:
            raise HTTPException(status_code=404, detail="Registration not found for this email.")
        if user.isActive:
            return {
                "message": "Account already verified. You can sign in now.",
                "verified": True,
            }

        settings = get_settings()
        if not is_test_mode_enabled(settings):
            if not user.otpExpires or user.otpExpires < now_ist():
                user.otp = None
                user.otpExpires = None
                self.db.commit()
                raise HTTPException(
                    status_code=401,
                    detail="Verification code expired. Request a new code.",
                )
            if not user.otp or not bcrypt.checkpw(otp.encode(), user.otp.encode()):
                raise HTTPException(status_code=401, detail="Invalid verification code.")

        user.isActive = True
        user.otp = None
        user.otpExpires = None
        self.db.commit()

        return {
            "message": "Email verified successfully. You can now sign in with your email.",
            "verified": True,
        }

    def list_hospital_chains(self) -> list[dict]:
        chains = self.db.query(HospitalChain).order_by(HospitalChain.name).all()
        return [{"id": c.id, "name": c.name} for c in chains]

    def list_branches(self, chain_id: str) -> list[dict]:
        if not self.db.get(HospitalChain, chain_id):
            raise HTTPException(status_code=404, detail="Hospital chain not found.")
        branches = (
            self.db.query(Branch)
            .filter(Branch.hospitalChainId == chain_id)
            .order_by(Branch.name)
            .all()
        )
        return [{"id": b.id, "name": b.name, "hospitalChainId": b.hospitalChainId} for b in branches]
