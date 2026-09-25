import time
from datetime import datetime, timedelta
from app.utils.timezone import ist_day_bounds, now_ist, parse_to_ist_naive, today_end_ist, today_start_ist

import bcrypt
from fastapi import HTTPException
from jose import jwt
from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload

from app.cache import _store
from app.config import get_fixed_otp, get_settings, is_test_mode_enabled
from app.models import Department, SubDepartment, Visit, Visitor, VisitorAccount
from app.models.enums import VisitStatus
from app.services.messaging_service import EmailService
from app.services.visitor_account_service import VisitorAccountService


class VisitorPortalService:
    OTP_TTL_SECONDS = 180

    def __init__(self, db: Session) -> None:
        self.db = db
        self.email = EmailService()

    @staticmethod
    def _normalize_email(email: str) -> str:
        return email.strip().lower()

    def _visitors_for_email(self, email: str) -> list[Visitor]:
        normalized = self._normalize_email(email)
        return (
            self.db.query(Visitor)
            .filter(func.lower(Visitor.email) == normalized)
            .all()
        )

    def _has_appointment_bookings(self, email: str) -> bool:
        normalized = self._normalize_email(email)
        hit = (
            self.db.query(Visit.id)
            .join(Visitor, Visit.visitorId == Visitor.id)
            .filter(
                func.lower(Visitor.email) == normalized,
                Visit.appointmentDate.isnot(None),
            )
            .first()
        )
        return hit is not None

    def request_otp(self, email: str) -> dict:
        normalized = self._normalize_email(email)
        if not normalized or "@" not in normalized:
            raise HTTPException(status_code=400, detail="Enter a valid email address.")

        if not self._has_appointment_bookings(normalized):
            raise HTTPException(
                status_code=404,
                detail="No bookings found for this email. Book an appointment first.",
            )

        settings = get_settings()
        fixed = get_fixed_otp(settings)
        otp = fixed or f"{__import__('random').randint(100000, 999999)}"
        hashed = bcrypt.hashpw(otp.encode(), bcrypt.gensalt()).decode()
        expires = now_ist() + timedelta(seconds=self.OTP_TTL_SECONDS)
        _store[f"visitor_otp:{normalized}"] = (time.monotonic(), hashed, expires)

        response: dict = {"message": f"OTP sent to {self._mask_email(normalized)}."}

        if is_test_mode_enabled(settings):
            response["testOtp"] = otp
        else:
            try:
                self.email.send_otp(normalized, otp)
            except Exception as exc:
                raise HTTPException(
                    status_code=503,
                    detail="Failed to send OTP email. Try again later.",
                ) from exc

        return response

    @staticmethod
    def _mask_email(email: str) -> str:
        local, _, domain = email.partition("@")
        if len(local) <= 2:
            return f"{local[0]}***@{domain}"
        return f"{local[:2]}***@{domain}"

    def verify_otp(self, email: str, otp: str) -> dict:
        normalized = self._normalize_email(email)
        if not normalized or "@" not in normalized:
            raise HTTPException(status_code=400, detail="Enter a valid email address.")

        settings = get_settings()
        if not is_test_mode_enabled(settings):
            hit = _store.get(f"visitor_otp:{normalized}")
            if not hit:
                raise HTTPException(status_code=401, detail="OTP expired. Request a new one.")
            _, hashed, expires = hit
            if expires < now_ist():
                _store.pop(f"visitor_otp:{normalized}", None)
                raise HTTPException(status_code=401, detail="OTP expired. Request a new one.")
            if not bcrypt.checkpw(otp.encode(), hashed.encode()):
                raise HTTPException(status_code=401, detail="Invalid OTP.")

        _store.pop(f"visitor_otp:{normalized}", None)
        visitors = self._visitors_for_email(normalized)
        if not visitors or not self._has_appointment_bookings(normalized):
            raise HTTPException(status_code=404, detail="No bookings found for this email.")

        primary = visitors[0]
        payload = {
            "sub": normalized,
            "email": normalized,
            "role": "VISITOR",
            "name": f"{primary.firstName} {primary.lastName}".strip(),
        }
        token = jwt.encode(payload, settings.jwt_secret, algorithm="HS256")
        return {"access_token": token, "email": normalized, "name": payload["name"]}

    def list_appointments(self, email: str) -> dict:
        normalized = self._normalize_email(email)
        visits = (
            self.db.query(Visit)
            .join(Visitor, Visit.visitorId == Visitor.id)
            .options(
                joinedload(Visit.visitor),
                joinedload(Visit.branch),
                joinedload(Visit.staff),
            )
            .filter(
                func.lower(Visitor.email) == normalized,
                Visit.appointmentDate.isnot(None),
            )
            .order_by(Visit.appointmentDate.desc())
            .all()
        )

        dept_names = {}
        sub_names = {}
        for visit in visits:
            if visit.departmentId and visit.departmentId not in dept_names:
                dept = self.db.get(Department, visit.departmentId)
                dept_names[visit.departmentId] = dept.name if dept else None
            if visit.subDepartmentId and visit.subDepartmentId not in sub_names:
                sub = self.db.get(SubDepartment, visit.subDepartmentId)
                sub_names[visit.subDepartmentId] = sub.name if sub else None

        items = []
        for visit in visits:
            items.append(
                {
                    "bookingId": visit.id,
                    "status": visit.status,
                    "purpose": visit.purpose,
                    "appointmentDate": visit.appointmentDate.isoformat() if visit.appointmentDate else None,
                    "doctorName": visit.staffName,
                    "doctorFeedback": visit.doctorFeedback,
                    "doctorFeedbackAt": visit.doctorFeedbackAt.isoformat() if visit.doctorFeedbackAt else None,
                    "rejectionReason": visit.rejectionReason,
                    "checkInTime": visit.checkInTime.isoformat() if visit.checkInTime else None,
                    "checkOutTime": visit.checkOutTime.isoformat() if visit.checkOutTime else None,
                    "totalDurationMinutes": visit.totalDurationMinutes,
                    "branchName": visit.branch.name if visit.branch else None,
                    "departmentName": dept_names.get(visit.departmentId),
                    "subDepartmentName": sub_names.get(visit.subDepartmentId),
                    "createdAt": visit.createdAt.isoformat() if visit.createdAt else None,
                    "checkInQrCode": visit.visitQRCode
                    if visit.status == VisitStatus.APPROVED.value and visit.visitQRCode
                    else None,
                    "checkInOtp": visit.checkInOtp
                    if visit.status == VisitStatus.APPROVED.value
                    else None,
                    "checkInOtpExpiry": visit.checkInOtpExpiry.isoformat()
                    if visit.status == VisitStatus.APPROVED.value and visit.checkInOtpExpiry
                    else None,
                }
            )

        primary = visits[0].visitor if visits else self._visitors_for_email(normalized)[0]
        return {
            "phone": primary.phone,
            "visitorName": f"{primary.firstName} {primary.lastName}".strip(),
            "email": primary.email,
            "totalAppointments": len(items),
            "appointments": items,
        }

    def list_appointments_for_account(self, account_id: str) -> dict:
        account = self.db.get(VisitorAccount, account_id)
        if not account:
            raise HTTPException(status_code=404, detail="Visitor account not found")

        visits = (
            self.db.query(Visit)
            .join(Visitor, Visit.visitorId == Visitor.id)
            .options(
                joinedload(Visit.visitor),
                joinedload(Visit.branch),
                joinedload(Visit.staff),
            )
            .filter(
                Visitor.visitorAccountId == account_id,
                Visit.appointmentDate.isnot(None),
            )
            .order_by(Visit.appointmentDate.desc())
            .all()
        )

        dept_names: dict[str, str | None] = {}
        sub_names: dict[str, str | None] = {}
        for visit in visits:
            if visit.departmentId and visit.departmentId not in dept_names:
                dept = self.db.get(Department, visit.departmentId)
                dept_names[visit.departmentId] = dept.name if dept else None
            if visit.subDepartmentId and visit.subDepartmentId not in sub_names:
                sub = self.db.get(SubDepartment, visit.subDepartmentId)
                sub_names[visit.subDepartmentId] = sub.name if sub else None

        items = []
        for visit in visits:
            items.append(
                {
                    "bookingId": visit.id,
                    "status": visit.status,
                    "purpose": visit.purpose,
                    "appointmentDate": visit.appointmentDate.isoformat() if visit.appointmentDate else None,
                    "doctorName": visit.staffName,
                    "doctorFeedback": visit.doctorFeedback,
                    "doctorFeedbackAt": visit.doctorFeedbackAt.isoformat() if visit.doctorFeedbackAt else None,
                    "rejectionReason": visit.rejectionReason,
                    "checkInTime": visit.checkInTime.isoformat() if visit.checkInTime else None,
                    "checkOutTime": visit.checkOutTime.isoformat() if visit.checkOutTime else None,
                    "totalDurationMinutes": visit.totalDurationMinutes,
                    "branchName": visit.branch.name if visit.branch else None,
                    "departmentName": dept_names.get(visit.departmentId),
                    "subDepartmentName": sub_names.get(visit.subDepartmentId),
                    "createdAt": visit.createdAt.isoformat() if visit.createdAt else None,
                    "checkInQrCode": visit.visitQRCode
                    if visit.status == VisitStatus.APPROVED.value and visit.visitQRCode
                    else None,
                    "checkInOtp": visit.checkInOtp
                    if visit.status == VisitStatus.APPROVED.value
                    else None,
                    "checkInOtpExpiry": visit.checkInOtpExpiry.isoformat()
                    if visit.status == VisitStatus.APPROVED.value and visit.checkInOtpExpiry
                    else None,
                }
            )

        profile = VisitorAccountService(self.db).get_preview(account_id)
        return {
            "phone": account.phone,
            "visitorName": profile["fullName"],
            "email": account.email,
            "profile": profile,
            "totalAppointments": len(items),
            "appointments": items,
        }
