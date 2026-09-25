"""One-time doctor approval links (no login required)."""

from __future__ import annotations

import logging
import secrets
from datetime import timedelta
from typing import Any

from fastapi import HTTPException
from sqlalchemy.orm import Session, joinedload

from app.config import get_doctor_approval_link_url, get_settings, is_test_mode_enabled
from app.models import DoctorAvailabilitySlot, Visit, Visitor
from app.models.enums import VisitStatus
from app.schemas.visitor_account import hash_token
from app.utils.timezone import format_ist_datetime, now_ist, parse_to_ist_naive

logger = logging.getLogger(__name__)

TOKEN_TTL_HOURS = 24


def build_approval_urls(base: str, token: str) -> tuple[str, str]:
    root = base.rstrip("/")
    return (
        f"{root}/approve-visit?token={token}",
        f"{root}/approve-visit/reschedule?token={token}",
    )


class VisitApprovalLinkService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self._staff = None

    @property
    def staff(self):
        if self._staff is None:
            from app.services.staff_service import StaffService

            self._staff = StaffService(self.db)
        return self._staff

    def _visitor_name(self, visitor: Visitor) -> str:
        middle = f" {visitor.middleName}" if visitor.middleName else ""
        return f"{visitor.firstName}{middle} {visitor.lastName}".strip()

    def create_link(self, visit: Visit) -> tuple[str, str, str]:
        """Return (raw_token, approve_url, reschedule_url). Issues a fresh token each call."""
        settings = get_settings()
        now = now_ist()
        if (
            visit.approvalLinkTokenHash
            and visit.approvalLinkExpiresAt
            and visit.approvalLinkExpiresAt > now
            and not visit.approvalLinkUsedAt
            and visit.status == VisitStatus.REQUEST_SENT.value
        ):
            # Cannot recover raw token from hash — issue a fresh token when resending.
            pass

        token = secrets.token_urlsafe(32)
        visit.approvalLinkTokenHash = hash_token(token)
        visit.approvalLinkExpiresAt = now + timedelta(hours=TOKEN_TTL_HOURS)
        visit.approvalLinkUsedAt = None
        self.db.commit()

        base = get_doctor_approval_link_url(settings)
        approve_url, reschedule_url = build_approval_urls(base, token)
        if is_test_mode_enabled(settings):
            logger.info(
                "[HVTS_TEST_MODE] Doctor approval link for visit %s: %s",
                visit.id,
                approve_url,
            )
        return token, approve_url, reschedule_url

    def get_preview(self, token: str) -> dict[str, Any]:
        visit = self._get_visit_for_token(token)
        visitor = visit.visitor
        doctor = visit.staff
        linked_slot = (
            self.db.query(DoctorAvailabilitySlot)
            .filter(DoctorAvailabilitySlot.visitId == visit.id)
            .first()
        )
        purpose = visit.purpose or ""
        is_custom = linked_slot is None and bool(visit.appointmentDate)
        if purpose.upper().startswith("[CUSTOM SLOT]"):
            is_custom = True
            purpose = purpose[len("[CUSTOM SLOT]") :].strip()
        is_open = is_custom and bool(
            visit.appointmentDate
            and visit.appointmentDate.hour == 0
            and visit.appointmentDate.minute == 0
        )
        if is_open:
            appt_label = None
        elif visit.appointmentDate:
            appt_label = format_ist_datetime(visit.appointmentDate)
        else:
            appt_label = None
        return {
            "visitId": visit.id,
            "status": visit.status,
            "visitorName": self._visitor_name(visitor) if visitor else "Visitor",
            "doctorName": doctor.name if doctor else visit.staffName,
            "appointmentDate": appt_label,
            "purpose": purpose,
            "appointmentMode": visit.appointmentMode or "IN_PERSON",
            "isCustomSlotRequest": is_custom,
            "isOpenSlotRequest": is_open,
            "canAct": visit.status == VisitStatus.REQUEST_SENT.value,
            "expired": self._is_expired(visit),
            "used": visit.approvalLinkUsedAt is not None,
        }

    def get_reschedule_preview(self, token: str) -> dict[str, Any]:
        preview = self.get_preview(token)
        visit = self._get_visit_for_token(token)
        preview["doctorId"] = visit.staffId
        if visit.appointmentDate:
            preview["appointmentDateIso"] = visit.appointmentDate.isoformat()
        else:
            preview["appointmentDateIso"] = None
        return preview

    def _release_slots_for_visit(self, visit_id: str) -> None:
        slots = (
            self.db.query(DoctorAvailabilitySlot)
            .filter(DoctorAvailabilitySlot.visitId == visit_id)
            .all()
        )
        for slot in slots:
            slot.isBooked = False
            slot.visitId = None

    def reschedule_and_approve(self, token: str, appointment_date: str) -> dict[str, Any]:
        visit = self._get_visit_for_token(token, require_pending=True)
        doctor_id = visit.staffId
        if not doctor_id:
            raise HTTPException(status_code=400, detail="No doctor assigned to this visit.")

        new_date = parse_to_ist_naive(appointment_date)
        self._release_slots_for_visit(visit.id)
        visit.appointmentDate = new_date
        self.db.commit()

        result = self.staff.approve_visit(visit.id, doctor_id)
        refreshed = (
            self.db.query(Visit)
            .filter(Visit.id == visit.id)
            .first()
        )
        if refreshed:
            self._mark_used(refreshed)
        return {
            "message": "Appointment rescheduled and confirmed.",
            "visitId": visit.id,
            "status": VisitStatus.APPROVED.value,
            "appointmentDate": format_ist_datetime(new_date),
            **result,
        }

    def approve(self, token: str) -> dict[str, Any]:
        visit = self._get_visit_for_token(token, require_pending=True)
        doctor_id = visit.staffId
        if not doctor_id:
            raise HTTPException(status_code=400, detail="No doctor assigned to this visit.")
        result = self.staff.approve_visit(visit.id, doctor_id)
        self._mark_used(visit)
        return {
            "message": "Appointment approved successfully.",
            "visitId": visit.id,
            "status": VisitStatus.APPROVED.value,
            **result,
        }

    def reject(self, token: str, reason: str = "Declined via approval link") -> dict[str, Any]:
        visit = self._get_visit_for_token(token, require_pending=True)
        doctor_id = visit.staffId
        if not doctor_id:
            raise HTTPException(status_code=400, detail="No doctor assigned to this visit.")
        result = self.staff.reject_visit(visit.id, doctor_id, reason)
        self._mark_used(visit)
        return {
            "message": "Appointment declined.",
            "visitId": visit.id,
            "status": VisitStatus.REJECTED.value,
            **result,
        }

    def _get_visit_for_token(self, token: str, *, require_pending: bool = False) -> Visit:
        token_hash = hash_token(token.strip())
        visit = (
            self.db.query(Visit)
            .options(joinedload(Visit.visitor), joinedload(Visit.staff))
            .filter(Visit.approvalLinkTokenHash == token_hash)
            .first()
        )
        if not visit:
            raise HTTPException(status_code=404, detail="Invalid or expired approval link.")
        if visit.approvalLinkUsedAt:
            raise HTTPException(status_code=410, detail="This approval link has already been used.")
        if self._is_expired(visit):
            raise HTTPException(status_code=410, detail="This approval link has expired.")
        if require_pending and visit.status != VisitStatus.REQUEST_SENT.value:
            raise HTTPException(
                status_code=409,
                detail=f"This appointment is already {visit.status.lower().replace('_', ' ')}.",
            )
        return visit

    def _is_expired(self, visit: Visit) -> bool:
        if not visit.approvalLinkExpiresAt:
            return True
        return visit.approvalLinkExpiresAt < now_ist()

    def _mark_used(self, visit: Visit) -> None:
        visit.approvalLinkUsedAt = now_ist()
        visit.approvalLinkTokenHash = None
        self.db.commit()
