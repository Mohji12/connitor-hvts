"""Doctor-issued urgent entry passcodes — gate verify → visitor register/book → QR."""

from __future__ import annotations

import logging
import random
import re
import uuid
from datetime import datetime, timedelta
from typing import Any

from fastapi import HTTPException
from jose import JWTError, jwt
from sqlalchemy.orm import Session, joinedload

from app.config import get_public_frontend_url, get_settings
from app.models import DoctorUrgentPasscode, User, Visit, Visitor
from app.models.enums import VisitCategory, VisitStatus
from app.services.messaging_service import EmailService, SmsService
from app.services.notifications_service import NotificationsService
from app.utils.timezone import now_ist, parse_to_ist_naive

logger = logging.getLogger(__name__)

PHONE_RE = re.compile(r"^[6-9]\d{9}$")
PASSCODE_TTL_HOURS = 24
GATE_TOKEN_TTL_MINUTES = 60

HOST_ROLES = {
    "STAFF",
    "DOCTOR",
    "NURSE",
    "DEPARTMENT_ADMIN",
    "SUB_DEPARTMENT_ADMIN",
    "HOSPITAL_ADMIN",
    "BRANCH_ADMIN",
}


class DoctorUrgentPasscodeService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.notifications = NotificationsService(db)
        self.sms = SmsService()
        self.email = EmailService()

    def _normalize_phone(self, phone: str) -> str:
        digits = re.sub(r"\D", "", phone or "")
        if len(digits) > 10:
            digits = digits[-10:]
        return digits

    def _ensure_host_user(self, user: dict) -> User:
        role = user.get("role") or ""
        if role not in HOST_ROLES and role != "SUPER_ADMIN":
            raise HTTPException(status_code=403, detail="Only clinical staff can issue urgent passcodes")
        host = self.db.get(User, user["id"])
        if not host:
            raise HTTPException(status_code=404, detail="User not found")
        if not host.branchId:
            raise HTTPException(status_code=400, detail="Your account has no branch assigned")
        return host

    def _generate_code(self, branch_id: str) -> str:
        for _ in range(30):
            code = f"{random.randint(0, 999999):06d}"
            exists = (
                self.db.query(DoctorUrgentPasscode)
                .filter(
                    DoctorUrgentPasscode.branchId == branch_id,
                    DoctorUrgentPasscode.code == code,
                    DoctorUrgentPasscode.status == "ACTIVE",
                )
                .first()
            )
            if not exists:
                return code
        raise HTTPException(status_code=500, detail="Could not generate unique passcode")

    def _expire_if_needed(self, row: DoctorUrgentPasscode) -> None:
        if row.status not in ("ACTIVE", "VERIFIED"):
            return
        if row.expiresAt < now_ist():
            row.status = "EXPIRED"
            self.db.commit()

    def _issue_gate_token(self, row: DoctorUrgentPasscode) -> str:
        settings = get_settings()
        now = now_ist()
        payload = {
            "typ": "urgent_gate",
            "passcodeId": row.id,
            "branchId": row.branchId,
            "staffId": row.staffId,
            "departmentId": row.departmentId,
            "subDepartmentId": row.subDepartmentId,
            "iat": int(now.timestamp()),
            "exp": int((now + timedelta(minutes=GATE_TOKEN_TTL_MINUTES)).timestamp()),
            "jti": str(uuid.uuid4()),
        }
        return jwt.encode(payload, settings.jwt_secret, algorithm="HS256")

    def decode_gate_token(self, token: str) -> dict:
        settings = get_settings()
        try:
            payload = jwt.decode(token, settings.jwt_secret, algorithms=["HS256"])
        except JWTError as exc:
            raise HTTPException(status_code=400, detail="GATE_TOKEN_INVALID") from exc
        if payload.get("typ") != "urgent_gate":
            raise HTTPException(status_code=400, detail="GATE_TOKEN_INVALID")
        return payload

    def confirm_verify(self, user: dict, code: str) -> dict:
        """Security confirms passcode at gate → VERIFIED + visitor register/book URL."""
        branch_id = user.get("branchId")
        if not branch_id:
            raise HTTPException(status_code=400, detail="Security user has no branch")
        row = self._get_active_by_code(branch_id, code)
        now = now_ist()
        row.status = "VERIFIED"
        row.verifiedAt = now
        row.verifiedById = user["id"]
        self.db.commit()
        self.db.refresh(row)

        gate_token = self._issue_gate_token(row)
        base = get_public_frontend_url()
        register_url = f"{base}/visitor/urgent/?token={gate_token}"
        staff = row.staff
        return {
            "passcodeId": row.id,
            "code": row.code,
            "status": row.status,
            "expiresAt": row.expiresAt.isoformat(),
            "gateTokenExpiresInMinutes": GATE_TOKEN_TTL_MINUTES,
            "gateToken": gate_token,
            "registerUrl": register_url,
            "note": row.note,
            "purpose": row.purpose,
            "theme": row.theme,
            "visitTime": row.visitTime.isoformat() if row.visitTime else None,
            "host": {
                "id": staff.id if staff else row.staffId,
                "name": staff.name if staff else None,
                "phone": staff.phone if staff else None,
                "email": staff.email if staff else None,
            },
            "departmentId": row.departmentId,
            "subDepartmentId": row.subDepartmentId,
            "branchId": row.branchId,
        }

    def get_gate_session(self, token: str) -> dict:
        payload = self.decode_gate_token(token)
        row = self.db.get(DoctorUrgentPasscode, payload["passcodeId"])
        if not row:
            raise HTTPException(status_code=404, detail="PASSCODE_NOT_FOUND")
        self._expire_if_needed(row)
        if row.status == "REDEEMED":
            raise HTTPException(status_code=400, detail="PASSCODE_ALREADY_USED")
        if row.status == "REVOKED":
            raise HTTPException(status_code=400, detail="PASSCODE_REVOKED")
        if row.status == "EXPIRED" or row.expiresAt < now_ist():
            raise HTTPException(status_code=400, detail="PASSCODE_EXPIRED")
        if row.status != "VERIFIED":
            raise HTTPException(
                status_code=400,
                detail="Passcode must be verified by security before registration.",
            )
        staff = row.staff or self.db.get(User, row.staffId)
        branch = row.branch
        return {
            "passcodeId": row.id,
            "status": row.status,
            "branchId": row.branchId,
            "branchName": branch.name if branch else None,
            "departmentId": row.departmentId,
            "subDepartmentId": row.subDepartmentId,
            "theme": row.theme,
            "purpose": row.purpose,
            "visitTime": row.visitTime.isoformat() if row.visitTime else None,
            "note": row.note,
            "host": {
                "id": staff.id if staff else row.staffId,
                "name": staff.name if staff else None,
                "phone": staff.phone if staff else None,
                "email": staff.email if staff else None,
            },
            "gateTokenExpiresAt": datetime.utcfromtimestamp(payload["exp"]).isoformat() + "Z",
        }

    def book_with_gate_token(
        self,
        visitor_account: dict,
        *,
        token: str,
        slot_id: str | None = None,
        appointment_date: str | None = None,
        purpose: str | None = None,
    ) -> dict:
        """Visitor books after register; auto-APPROVED because passcode was shared."""
        from app.services.appointments_service import AppointmentsService
        from app.services.gate_pass_service import GatePassService
        from app.services.visitor_account_link_service import VisitorAccountLinkService

        payload = self.decode_gate_token(token)
        row = (
            self.db.query(DoctorUrgentPasscode)
            .options(joinedload(DoctorUrgentPasscode.staff))
            .filter(DoctorUrgentPasscode.id == payload["passcodeId"])
            .with_for_update()
            .first()
        )
        if not row:
            raise HTTPException(status_code=404, detail="PASSCODE_NOT_FOUND")
        self._expire_if_needed(row)
        if row.status != "VERIFIED":
            raise HTTPException(
                status_code=400,
                detail="Passcode is not ready for booking (must be verified by security).",
            )

        staff = row.staff or self.db.get(User, row.staffId)
        if not staff:
            raise HTTPException(status_code=400, detail="Host doctor not found")

        department_id = row.departmentId or staff.departmentId
        sub_department_id = row.subDepartmentId or staff.subDepartmentId
        if not department_id or not sub_department_id:
            raise HTTPException(
                status_code=400,
                detail="Host doctor has no department assigned — cannot book.",
            )

        appt = AppointmentsService(self.db)
        branch, dept, sub, doctor = appt._validate_booking_chain(
            row.branchId,
            department_id,
            sub_department_id,
            row.staffId,
        )

        if slot_id:
            appt_date, slot = appt._reserve_slot(row.staffId, slot_id, None)
        elif appointment_date:
            try:
                appt_date = parse_to_ist_naive(appointment_date)
            except ValueError as exc:
                raise HTTPException(status_code=400, detail="Invalid appointmentDate") from exc
            if appt_date <= now_ist():
                raise HTTPException(status_code=400, detail="Appointment must be in the future.")
            slot = None
        elif row.visitTime and row.visitTime > now_ist():
            appt_date = row.visitTime
            slot = None
        else:
            # Walk-in: book for ~15 minutes from now (same-day urgent)
            appt_date = now_ist() + timedelta(minutes=15)
            slot = None

        visitor = VisitorAccountLinkService(self.db).ensure_branch_visitor(
            visitor_account["accountId"], row.branchId
        )

        purpose_parts = []
        if row.theme:
            purpose_parts.append(f"[{row.theme}]")
        if purpose:
            purpose_parts.append(purpose.strip())
        elif row.purpose:
            purpose_parts.append(row.purpose)
        else:
            purpose_parts.append("Urgent visit (passcode)")
        visit_purpose = " ".join(purpose_parts)

        visit = Visit(
            visitorId=visitor.id,
            staffId=doctor.id,
            staffName=doctor.name,
            staffPhone=doctor.phone,
            branchId=branch.id,
            departmentId=dept.id,
            subDepartmentId=sub.id,
            department=appt._legacy_visit_department(dept, doctor),
            purpose=visit_purpose,
            appointmentDate=appt_date,
            appointmentMode="IN_PERSON",
            visitCategory=VisitCategory.MEETING.value,
            visitSubType="URGENT_PASSCODE",
            status=VisitStatus.APPROVED.value,
            idProofVerified=True,  # security already verified passcode at gate
            isCodeUsed=True,
        )
        self.db.add(visit)
        self.db.flush()

        from app.services.visitor_pass_service import VisitorPassService

        issued = VisitorPassService(self.db).allocate_for_visit(
            visit, assigned_by_id=None
        )

        if slot:
            self.db.refresh(slot)
            if slot.isBooked:
                self.db.rollback()
                raise HTTPException(status_code=409, detail="This time slot is no longer available.")
            slot.isBooked = True
            slot.visitId = visit.id

        qr = GatePassService(self.db).issue_entry_exit_qrs(visit.id)

        row.status = "REDEEMED"
        row.redeemedAt = now_ist()
        row.visitId = visit.id

        self.db.commit()
        self.db.refresh(visit)

        try:
            self.notifications.notify_visitor_booking_received(
                visit, doctor, visitor, branch=branch, department=dept, sub_department=sub
            )
        except Exception:
            logger.exception("Urgent booking visitor notify failed")

        return {
            "success": True,
            "bookingId": visit.id,
            "visitId": visit.id,
            "status": visit.status,
            "appointmentDate": visit.appointmentDate.isoformat() if visit.appointmentDate else None,
            "host": {"id": doctor.id, "name": doctor.name},
            "entryQrPayload": qr["entryQrPayload"],
            "exitQrPayload": qr["exitQrPayload"],
            "checkInOtp": qr.get("checkInOtp"),
            "visitorPassId": issued.passId if issued else visit.visitorPassId,
            "message": "Visit approved. Show the Entry QR to security for check-in.",
        }

    def redeem(
        self,
        user: dict,
        *,
        code: str,
        first_name: str,
        last_name: str | None,
        email: str,
        phone: str,
        reason: str,
    ) -> dict:
        """Deprecated: use confirm_verify + visitor book. Kept for API compatibility."""
        raise HTTPException(
            status_code=400,
            detail=(
                "Direct redeem is disabled. Verify the passcode, then ask the visitor "
                "to register and book at the link shown."
            ),
        )

    def _parse_visit_time(self, visit_time: datetime | str | None) -> datetime | None:
        if visit_time is None or visit_time == "":
            return None
        if isinstance(visit_time, datetime):
            return visit_time
        raw = str(visit_time).strip()
        if not raw:
            return None
        try:
            return datetime.fromisoformat(raw.replace("Z", "+00:00")).replace(tzinfo=None)
        except ValueError as exc:
            raise HTTPException(status_code=400, detail="Invalid visit time") from exc

    def _apply_metadata(
        self,
        row: DoctorUrgentPasscode,
        *,
        note: str | None = None,
        purpose: str | None = None,
        theme: str | None = None,
        visit_time: datetime | str | None = None,
        recipient_name: str | None = None,
        recipient_phone: str | None = None,
        recipient_email: str | None = None,
        clear_unset: bool = False,
    ) -> None:
        if note is not None or clear_unset:
            row.note = (note or "").strip() or None
        if purpose is not None or clear_unset:
            row.purpose = (purpose or "").strip() or None
        if theme is not None or clear_unset:
            row.theme = (theme or "").strip() or None
        if visit_time is not None or clear_unset:
            row.visitTime = self._parse_visit_time(visit_time)
        if recipient_name is not None or clear_unset:
            row.recipientName = (recipient_name or "").strip() or None
        if recipient_phone is not None or clear_unset:
            phone = self._normalize_phone(recipient_phone or "")
            row.recipientPhone = phone or None
        if recipient_email is not None or clear_unset:
            email = (recipient_email or "").strip().lower() or None
            row.recipientEmail = email

    def issue(
        self,
        user: dict,
        note: str | None = None,
        *,
        purpose: str | None = None,
        theme: str | None = None,
        visit_time: datetime | str | None = None,
        recipient_name: str | None = None,
        recipient_phone: str | None = None,
        recipient_email: str | None = None,
    ) -> dict:
        host = self._ensure_host_user(user)
        now = now_ist()
        code = self._generate_code(host.branchId)
        row = DoctorUrgentPasscode(
            code=code,
            branchId=host.branchId,
            staffId=host.id,
            departmentId=host.departmentId,
            subDepartmentId=getattr(host, "subDepartmentId", None),
            status="ACTIVE",
            expiresAt=now + timedelta(hours=PASSCODE_TTL_HOURS),
            createdById=host.id,
        )
        self._apply_metadata(
            row,
            note=note,
            purpose=purpose,
            theme=theme,
            visit_time=visit_time,
            recipient_name=recipient_name,
            recipient_phone=recipient_phone,
            recipient_email=recipient_email,
            clear_unset=True,
        )
        self.db.add(row)
        self.db.commit()
        self.db.refresh(row)
        return self._serialize_staff(row, host)

    def update(
        self,
        user: dict,
        passcode_id: str,
        *,
        note: str | None = None,
        purpose: str | None = None,
        theme: str | None = None,
        visit_time: datetime | str | None = None,
        recipient_name: str | None = None,
        recipient_phone: str | None = None,
        recipient_email: str | None = None,
    ) -> dict:
        host = self._ensure_host_user(user)
        row = self._get_owned_active(host, user, passcode_id)
        self._apply_metadata(
            row,
            note=note,
            purpose=purpose,
            theme=theme,
            visit_time=visit_time,
            recipient_name=recipient_name,
            recipient_phone=recipient_phone,
            recipient_email=recipient_email,
            clear_unset=True,
        )
        self.db.commit()
        self.db.refresh(row)
        return self._serialize_staff(row, host)

    def share(
        self,
        user: dict,
        passcode_id: str,
        *,
        channels: list[str],
        recipient_name: str | None = None,
        phone: str | None = None,
        email: str | None = None,
    ) -> dict[str, Any]:
        host = self._ensure_host_user(user)
        row = self._get_owned_active(host, user, passcode_id)

        name = (recipient_name or row.recipientName or "Visitor").strip()
        send_phone = self._normalize_phone(phone or row.recipientPhone or "")
        send_email = (email or row.recipientEmail or "").strip().lower()

        if recipient_name is not None:
            row.recipientName = name or None
        if phone is not None:
            row.recipientPhone = send_phone or None
        if email is not None:
            row.recipientEmail = send_email or None
        self.db.commit()

        normalized_channels = [c.strip().lower() for c in channels if c and c.strip()]
        if not normalized_channels:
            raise HTTPException(status_code=400, detail="Select SMS and/or email to send")
        for ch in normalized_channels:
            if ch not in ("sms", "email"):
                raise HTTPException(status_code=400, detail="Channel must be sms or email")

        message = self._build_share_message(row, host, name)
        sent: list[str] = []
        errors: list[str] = []

        if "sms" in normalized_channels:
            if not PHONE_RE.match(send_phone):
                raise HTTPException(status_code=400, detail="Valid 10-digit mobile is required for SMS")
            try:
                self.sms.send_sms_only(send_phone, message)
                sent.append("sms")
            except Exception as exc:
                logger.exception("Urgent passcode SMS failed: %s", exc)
                errors.append("sms")

        if "email" in normalized_channels:
            if not send_email or "@" not in send_email:
                raise HTTPException(status_code=400, detail="Valid email is required for email share")
            try:
                self.email.send_notification(
                    send_email,
                    f"Urgent entry passcode from {host.name or 'your doctor'}",
                    message,
                )
                sent.append("email")
            except Exception as exc:
                logger.exception("Urgent passcode email failed: %s", exc)
                errors.append("email")

        if not sent:
            raise HTTPException(status_code=502, detail="Could not send passcode. Try again.")

        return {
            "id": row.id,
            "code": row.code,
            "sent": sent,
            "failed": errors,
            "recipientName": row.recipientName,
            "recipientPhone": row.recipientPhone,
            "recipientEmail": row.recipientEmail,
        }

    def _build_share_message(self, row: DoctorUrgentPasscode, host: User, visitor_name: str) -> str:
        lines = [
            f"Hello {visitor_name},",
            f"{host.name or 'Your doctor'} has issued an urgent hospital entry passcode for you.",
            f"Passcode: {row.code}",
            f"Valid until: {row.expiresAt.strftime('%d %b %Y, %I:%M %p')}",
            "Show this code to security at the gate. After verification you will register, "
            "book the visit (no further doctor approval), and receive Entry/Exit QR codes.",
        ]
        if row.theme:
            lines.append(f"Visit theme: {row.theme}")
        if row.purpose:
            lines.append(f"Purpose: {row.purpose}")
        if row.visitTime:
            lines.append(f"Expected time: {row.visitTime.strftime('%d %b %Y, %I:%M %p')}")
        return "\n".join(lines)

    def _get_owned_active(self, host: User, user: dict, passcode_id: str) -> DoctorUrgentPasscode:
        row = self.db.get(DoctorUrgentPasscode, passcode_id)
        if not row:
            raise HTTPException(status_code=404, detail="Passcode not found")
        if row.createdById != host.id and user.get("role") not in (
            "HOSPITAL_ADMIN",
            "BRANCH_ADMIN",
            "SUPER_ADMIN",
        ):
            raise HTTPException(status_code=403, detail="Cannot use this passcode")
        self._expire_if_needed(row)
        if row.status != "ACTIVE":
            raise HTTPException(status_code=400, detail="Passcode is not active")
        return row

    def list_for_staff(self, user: dict, limit: int = 20) -> dict:
        host = self._ensure_host_user(user)
        rows = (
            self.db.query(DoctorUrgentPasscode)
            .options(joinedload(DoctorUrgentPasscode.staff))
            .filter(DoctorUrgentPasscode.createdById == host.id)
            .order_by(DoctorUrgentPasscode.createdAt.desc())
            .limit(limit)
            .all()
        )
        for row in rows:
            self._expire_if_needed(row)
        return {"items": [self._serialize_staff(r, r.staff) for r in rows]}

    def revoke(self, user: dict, passcode_id: str) -> dict:
        host = self._ensure_host_user(user)
        row = self.db.get(DoctorUrgentPasscode, passcode_id)
        if not row:
            raise HTTPException(status_code=404, detail="Passcode not found")
        if row.createdById != host.id and user.get("role") not in ("HOSPITAL_ADMIN", "BRANCH_ADMIN", "SUPER_ADMIN"):
            raise HTTPException(status_code=403, detail="Cannot revoke this passcode")
        if row.status != "ACTIVE":
            raise HTTPException(status_code=400, detail="Passcode is not active")
        row.status = "REVOKED"
        self.db.commit()
        return {"id": row.id, "status": row.status}

    def _get_active_by_code(self, branch_id: str, code: str) -> DoctorUrgentPasscode:
        code = (code or "").strip()
        if not re.match(r"^\d{6}$", code):
            raise HTTPException(status_code=400, detail="Passcode must be 6 digits")
        row = (
            self.db.query(DoctorUrgentPasscode)
            .options(joinedload(DoctorUrgentPasscode.staff))
            .filter(
                DoctorUrgentPasscode.branchId == branch_id,
                DoctorUrgentPasscode.code == code,
            )
            .first()
        )
        if not row:
            raise HTTPException(status_code=404, detail="PASSCODE_NOT_FOUND")
        self._expire_if_needed(row)
        if row.status == "REDEEMED":
            raise HTTPException(status_code=400, detail="PASSCODE_ALREADY_USED")
        if row.status == "REVOKED":
            raise HTTPException(status_code=400, detail="PASSCODE_REVOKED")
        if row.status == "EXPIRED" or row.expiresAt < now_ist():
            raise HTTPException(status_code=400, detail="PASSCODE_EXPIRED")
        if row.status != "ACTIVE":
            raise HTTPException(status_code=400, detail="PASSCODE_INVALID")
        return row

    def verify(self, user: dict, code: str) -> dict:
        branch_id = user.get("branchId")
        if not branch_id:
            raise HTTPException(status_code=400, detail="Security user has no branch")
        row = self._get_active_by_code(branch_id, code)
        staff = row.staff
        return {
            "passcodeId": row.id,
            "code": row.code,
            "expiresAt": row.expiresAt.isoformat(),
            "note": row.note,
            "purpose": row.purpose,
            "theme": row.theme,
            "visitTime": row.visitTime.isoformat() if row.visitTime else None,
            "host": {
                "id": staff.id if staff else row.staffId,
                "name": staff.name if staff else None,
                "phone": staff.phone if staff else None,
                "email": staff.email if staff else None,
            },
            "departmentId": row.departmentId,
            "subDepartmentId": row.subDepartmentId,
        }

    def _serialize_staff(self, row: DoctorUrgentPasscode, staff: User | None) -> dict:
        return {
            "id": row.id,
            "code": row.code,
            "status": row.status,
            "note": row.note,
            "purpose": row.purpose,
            "theme": row.theme,
            "visitTime": row.visitTime.isoformat() if row.visitTime else None,
            "recipientName": row.recipientName,
            "recipientPhone": row.recipientPhone,
            "recipientEmail": row.recipientEmail,
            "expiresAt": row.expiresAt.isoformat(),
            "createdAt": row.createdAt.isoformat(),
            "redeemedAt": row.redeemedAt.isoformat() if row.redeemedAt else None,
            "visitId": row.visitId,
            "hostName": staff.name if staff else None,
            "validForHours": PASSCODE_TTL_HOURS,
        }
