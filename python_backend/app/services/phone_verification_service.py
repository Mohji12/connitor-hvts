from datetime import datetime, timedelta
from app.utils.timezone import ist_day_bounds, now_ist, parse_to_ist_naive, today_end_ist, today_start_ist

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.config import get_settings, is_demo_mode_enabled, is_test_mode_enabled
from app.models import Visitor
from app.services.messaging_service import SmsService
from app.utils.test_mode import generate_otp


class PhoneVerificationService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.sms = SmsService()

    def generate_otp(self, phone: str, branch_id: str) -> dict:
        if not phone or not branch_id:
            raise HTTPException(status_code=400, detail="Phone and branchId are required")

        visitor = self.db.query(Visitor).filter(Visitor.phone == phone, Visitor.branchId == branch_id).first()
        is_new = False
        if not visitor:
            visitor = Visitor(phone=phone, branchId=branch_id, firstName="Guest", lastName="Visitor")
            self.db.add(visitor)
            self.db.commit()
            self.db.refresh(visitor)
            is_new = True

        settings = get_settings()
        if is_demo_mode_enabled(settings):
            return {
                "success": True,
                "message": "Demo mode: OTP skipped",
                "isNewVisitor": is_new,
                "testOtp": "000000",
            }

        now = now_ist()
        if (
            visitor.phoneVerificationAttempts >= 3
            and visitor.phoneVerificationExpiry
            and visitor.phoneVerificationExpiry > now
        ):
            raise HTTPException(status_code=400, detail="OTP_LOCKED")

        otp = generate_otp(6)
        expiry = now + timedelta(minutes=5)
        visitor.phoneVerificationOtp = otp
        visitor.phoneVerificationExpiry = expiry
        visitor.phoneVerificationAttempts = 0
        self.db.commit()

        try:
            self.sms.send_otp(phone, otp)
        except Exception as exc:
            raise HTTPException(status_code=400, detail="SMS_SEND_FAILED") from exc

        response = {"success": True, "message": "OTP sent", "isNewVisitor": is_new}
        if is_test_mode_enabled(settings):
            response["testOtp"] = otp
        return response

    def verify_otp(self, phone: str, branch_id: str, otp: str) -> dict:
        visitor = self.db.query(Visitor).filter(Visitor.phone == phone, Visitor.branchId == branch_id).first()
        if not visitor:
            raise HTTPException(status_code=404, detail="VISITOR_NOT_FOUND")

        settings = get_settings()
        if is_demo_mode_enabled(settings):
            visitor.phoneVerified = True
            visitor.phoneVerificationOtp = None
            visitor.phoneVerificationExpiry = None
            visitor.phoneVerificationAttempts = 0
            self.db.commit()
            is_new = visitor.firstName == "Guest" and visitor.lastName == "Visitor"
            return {"success": True, "visitorId": visitor.id, "isNewVisitor": is_new}

        now = now_ist()
        if visitor.phoneVerificationAttempts >= 3:
            if visitor.phoneVerificationExpiry and visitor.phoneVerificationExpiry > now:
                raise HTTPException(status_code=400, detail="OTP_LOCKED")
            raise HTTPException(status_code=400, detail="OTP_EXPIRED")

        if not visitor.phoneVerificationExpiry or visitor.phoneVerificationExpiry < now:
            raise HTTPException(status_code=400, detail="OTP_EXPIRED")

        if otp != visitor.phoneVerificationOtp:
            visitor.phoneVerificationAttempts += 1
            if visitor.phoneVerificationAttempts >= 3:
                visitor.phoneVerificationExpiry = now + timedelta(minutes=10)
            self.db.commit()
            if visitor.phoneVerificationAttempts >= 3:
                raise HTTPException(status_code=400, detail="OTP_LOCKED")
            raise HTTPException(status_code=400, detail="INVALID_OTP")

        visitor.phoneVerified = True
        visitor.phoneVerificationOtp = None
        visitor.phoneVerificationExpiry = None
        visitor.phoneVerificationAttempts = 0
        self.db.commit()
        is_new = visitor.firstName == "Guest" and visitor.lastName == "Visitor"
        return {"success": True, "visitorId": visitor.id, "isNewVisitor": is_new}
