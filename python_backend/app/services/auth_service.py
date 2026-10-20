from datetime import datetime, timedelta
from app.utils.timezone import ist_day_bounds, now_ist, parse_to_ist_naive, today_end_ist, today_start_ist

import random
import re

import bcrypt
import uuid
from fastapi import HTTPException
from jose import jwt
from sqlalchemy.orm import Session, joinedload

from app.config import get_fixed_otp, get_settings, is_test_mode_enabled
from app.models import User
from app.services.messaging_service import EmailService, SmsService
from app.utils.passwords import hash_password, verify_password
from app.utils.serializers import model_to_dict


class AuthService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.email = EmailService()

    @staticmethod
    def normalize_email(email: str) -> str:
        return email.strip().lower()

    def _load_user_by_email(self, email: str) -> User:
        normalized = self.normalize_email(email)
        user = (
            self.db.query(User)
            .options(joinedload(User.hospitalChain), joinedload(User.branch))
            .filter(User.email == normalized)
            .first()
        )
        if not user:
            raise HTTPException(
                status_code=401,
                detail="Invalid login ID or password.",
            )
        if not user.isActive:
            raise HTTPException(
                status_code=403,
                detail="Account is not active. Contact your administrator.",
            )
        return user

    @staticmethod
    def _jwt_expiry(settings) -> datetime:
        raw = (settings.jwt_expires_in or "1d").strip().lower()
        if raw.endswith("d"):
            return now_ist() + timedelta(days=int(raw[:-1] or 1))
        if raw.endswith("h"):
            return now_ist() + timedelta(hours=int(raw[:-1] or 24))
        if raw.endswith("m"):
            return now_ist() + timedelta(minutes=int(raw[:-1] or 60))
        return now_ist() + timedelta(seconds=int(raw))

    def _issue_access_token(self, user: User) -> dict:
        settings = get_settings()
        issued_at = now_ist()
        expires_at = self._jwt_expiry(settings)
        payload = {
            "sub": user.id,
            "id": user.id,
            "name": user.name,
            "phone": user.phone,
            "email": user.email,
            "role": user.role,
            "userType": user.userType,
            "isActive": user.isActive,
            "department": user.department,
            "location": user.location,
            "hospitalChainId": user.hospitalChainId,
            "branchId": user.branchId,
            "departmentId": user.departmentId,
            "subDepartmentId": user.subDepartmentId,
            "iat": int(issued_at.timestamp()),
            "exp": int(expires_at.timestamp()),
            "jti": str(uuid.uuid4()),
        }
        if user.hospitalChain:
            payload["hospitalChainName"] = user.hospitalChain.name
            payload["hospitalChain"] = {"name": user.hospitalChain.name}
        if user.branch:
            payload["branchName"] = user.branch.name
            payload["branch"] = {"name": user.branch.name}
        if user.distributorId:
            payload["distributorId"] = user.distributorId
        if user.deliveryAgentId:
            payload["deliveryAgentId"] = user.deliveryAgentId

        token = jwt.encode(payload, settings.jwt_secret, algorithm="HS256")
        return {"access_token": token}

    def login_with_password(self, email: str, password: str) -> dict:
        user = self._load_user_by_email(email)
        if not user.passwordHash or not verify_password(password, user.passwordHash):
            raise HTTPException(
                status_code=401,
                detail="Invalid login ID or password.",
            )
        if user.role == "DISTRIBUTOR" and user.phoneVerified is False:
            raise HTTPException(
                status_code=403,
                detail="Verify the WhatsApp code sent to your mobile before you sign in.",
            )
        return self._issue_access_token(user)

    def login(self, email: str) -> dict:
        normalized = self.normalize_email(email)
        user = self.db.query(User).filter(User.email == normalized).first()
        if not user:
            raise HTTPException(
                status_code=404,
                detail="User not found. Register first or contact your administrator.",
            )
        if not user.isActive:
            raise HTTPException(
                status_code=403,
                detail="Account is not active. Complete email verification or contact your administrator.",
            )
        if user.role == "DISTRIBUTOR" and user.phoneVerified is False:
            raise HTTPException(
                status_code=403,
                detail="Verify the WhatsApp code sent to your mobile before you sign in.",
            )

        settings = get_settings()
        fixed = get_fixed_otp(settings)
        otp = fixed or f"{__import__('random').randint(100000, 999999)}"
        otp_expires = now_ist() + timedelta(minutes=3)
        hashed = bcrypt.hashpw(otp.encode(), bcrypt.gensalt()).decode()

        user.otp = hashed
        user.otpExpires = otp_expires
        self.db.commit()

        response: dict = {"message": "OTP sent successfully. Check your email inbox."}

        if is_test_mode_enabled(settings):
            response["testOtp"] = otp
        else:
            try:
                self.email.send_otp(normalized, otp)
            except Exception as exc:
                raise HTTPException(
                    status_code=503,
                    detail="Failed to send OTP email. Please try again later.",
                ) from exc

        return response

    def verify_otp(self, email: str, otp: str) -> dict:
        user = self._load_user_by_email(email)
        if user.role == "DISTRIBUTOR" and user.phoneVerified is False:
            raise HTTPException(
                status_code=403,
                detail="Verify the WhatsApp code sent to your mobile before you sign in.",
            )

        settings = get_settings()
        if not is_test_mode_enabled(settings):
            if not user.otpExpires or user.otpExpires < now_ist():
                user.otp = None
                user.otpExpires = None
                self.db.commit()
                raise HTTPException(
                    status_code=401,
                    detail="OTP has expired. Please request a new OTP.",
                )
            if not user.otp or not bcrypt.checkpw(otp.encode(), user.otp.encode()):
                raise HTTPException(status_code=401, detail="Invalid OTP")

        user.otp = None
        user.otpExpires = None
        self.db.commit()

        return self._issue_access_token(user)

    @staticmethod
    def normalize_phone(phone: str) -> str:
        return re.sub(r"\D", "", phone or "")[-10:]

    def _active_user_by_phone(self, phone: str) -> User | None:
        normalized = self.normalize_phone(phone)
        if len(normalized) != 10:
            raise HTTPException(status_code=400, detail="Enter your 10-digit registered mobile number.")
        candidates = (
            self.db.query(User)
            .filter(User.isActive.is_(True), User.phone.like(f"%{normalized}"))
            .all()
        )
        matches = [u for u in candidates if self.normalize_phone(u.phone) == normalized]
        if len(matches) > 1:
            raise HTTPException(
                status_code=409,
                detail="This mobile number is linked to more than one account. Ask your administrator to reset the password.",
            )
        return matches[0] if matches else None

    def request_password_reset(self, phone: str) -> dict:
        """Send a one-time code on WhatsApp (SMS fallback) to the registered mobile."""
        user = self._active_user_by_phone(phone)
        if not user:
            raise HTTPException(status_code=404, detail="No account found with this mobile number.")

        settings = get_settings()
        fixed = get_fixed_otp(settings)
        otp = fixed or f"{random.randint(100000, 999999)}"
        user.otp = bcrypt.hashpw(otp.encode(), bcrypt.gensalt()).decode()
        user.otpExpires = now_ist() + timedelta(minutes=10)
        self.db.commit()

        response: dict = {"message": "A 6-digit code has been sent to your WhatsApp."}
        if is_test_mode_enabled(settings):
            response["testOtp"] = otp
            return response
        try:
            SmsService().send_profile_phone_otp(user.phone, otp, valid_minutes=10)
        except Exception as exc:
            raise HTTPException(
                status_code=503,
                detail="Failed to send the reset code. Please try again later.",
            ) from exc
        return response

    def reset_password_with_otp(self, phone: str, otp: str, new_password: str) -> dict:
        user = self._active_user_by_phone(phone)
        invalid = HTTPException(status_code=401, detail="Invalid or expired code.")
        if not user:
            raise invalid

        settings = get_settings()
        if not is_test_mode_enabled(settings):
            if not user.otpExpires or user.otpExpires < now_ist():
                user.otp = None
                user.otpExpires = None
                self.db.commit()
                raise invalid
            if not user.otp or not bcrypt.checkpw(otp.encode(), user.otp.encode()):
                raise invalid

        self.validate_password_strength(new_password)
        user.passwordHash = hash_password(new_password)
        user.otp = None
        user.otpExpires = None
        user.updatedAt = now_ist()
        self.db.commit()
        return {"message": "Password updated. Sign in with your new password."}

    def get_profile(self, user_id: str) -> dict:
        user = (
            self.db.query(User)
            .options(
                joinedload(User.hospitalChain),
                joinedload(User.branch),
                joinedload(User.dept),
                joinedload(User.subDept),
            )
            .filter(User.id == user_id)
            .first()
        )
        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        data = model_to_dict(user)
        data["hospitalChain"] = model_to_dict(user.hospitalChain) if user.hospitalChain else None
        data["branch"] = model_to_dict(user.branch) if user.branch else None
        data["hospitalChainName"] = user.hospitalChain.name if user.hospitalChain else None
        data["branchName"] = user.branch.name if user.branch else None
        data["departmentName"] = user.dept.name if user.dept else None
        data["subDepartmentName"] = user.subDept.name if user.subDept else None
        return data

    def update_own_profile(self, user_id: str, data: dict) -> dict:
        user = self.db.get(User, user_id)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        name = (data.get("name") or "").strip()
        if not name:
            raise HTTPException(status_code=400, detail="Name is required")

        email = self.normalize_email(data.get("email") or "")
        if not email or "@" not in email:
            raise HTTPException(status_code=400, detail="Enter a valid email")

        phone = re.sub(r"\D", "", str(data.get("phone") or ""))
        if len(phone) > 10:
            phone = phone[-10:]
        if len(phone) != 10:
            raise HTTPException(status_code=400, detail="Enter a valid 10-digit mobile number")

        email_clash = (
            self.db.query(User).filter(User.email == email, User.id != user.id).first()
        )
        if email_clash:
            raise HTTPException(status_code=409, detail="Another account already uses this email")
        phone_clash = (
            self.db.query(User).filter(User.phone == phone, User.id != user.id).first()
        )
        if phone_clash:
            raise HTTPException(status_code=409, detail="Another account already uses this mobile number")

        new_password = (data.get("newPassword") or "").strip()
        if new_password:
            current = data.get("currentPassword") or ""
            if not user.passwordHash or not verify_password(current, user.passwordHash):
                raise HTTPException(status_code=400, detail="Current password is incorrect")
            self.validate_password_strength(new_password)
            user.passwordHash = hash_password(new_password)

        user.name = name
        user.email = email
        user.phone = phone
        user.updatedAt = now_ist()

        if user.distributorId and user.role == "DISTRIBUTOR":
            from app.models.delivery_entities import Distributor

            dist = self.db.get(Distributor, user.distributorId)
            if dist:
                dist.contactPerson = name
                dist.email = email
                dist.phone = phone

        self.db.commit()
        profile = self.get_profile(user_id)
        fresh = (
            self.db.query(User)
            .options(joinedload(User.hospitalChain), joinedload(User.branch))
            .filter(User.id == user_id)
            .first()
        )
        token = self._issue_access_token(fresh) if fresh else {}
        return {**profile, "access_token": token.get("access_token")}

    @staticmethod
    def validate_password_strength(password: str) -> None:
        if not password or len(password) < 8:
            raise HTTPException(
                status_code=400,
                detail="Password must be at least 8 characters.",
            )

    @staticmethod
    def hash_for_storage(password: str) -> str:
        AuthService.validate_password_strength(password)
        return hash_password(password)
