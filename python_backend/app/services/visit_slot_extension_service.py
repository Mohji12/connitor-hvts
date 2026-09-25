"""Visit slot clock: expected end from booked slot, doctor extend link, next-visitor hold."""

from __future__ import annotations

import logging
import secrets
from datetime import datetime, timedelta

from fastapi import HTTPException
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, joinedload

from app.config import get_public_frontend_url, get_settings
from app.models import DoctorAvailabilitySlot, Visit
from app.models.enums import AppointmentMode, VisitStatus
from app.schemas.visitor_account import hash_token
from app.utils.timezone import format_ist_clock, format_ist_datetime, now_ist

logger = logging.getLogger(__name__)

DEFAULT_SLOT_MINUTES = 30
MIN_EXTEND = 1
MAX_EXTEND = 60
TOKEN_GRACE = timedelta(hours=2)


def warn_minutes() -> int:
    value = get_settings().visit_extend_warn_minutes
    return value if value > 0 else 1


class VisitSlotExtensionService:
    def __init__(self, db: Session) -> None:
        self.db = db

    def slot_minutes(self, visit: Visit) -> int:
        slot = getattr(visit, "bookedSlot", None)
        if slot and slot.slotStart and slot.slotEnd:
            minutes = int((slot.slotEnd - slot.slotStart).total_seconds() / 60)
            if minutes > 0:
                return minutes
        return DEFAULT_SLOT_MINUTES

    def start_clock(self, visit: Visit) -> None:
        if visit.appointmentMode == AppointmentMode.ONLINE.value:
            return
        now = now_ist()
        minutes = self.slot_minutes(visit)
        visit.allottedMinutes = minutes
        visit.expectedEndTime = now + timedelta(minutes=minutes)
        due = visit.expectedEndTime - timedelta(minutes=warn_minutes())
        visit.extensionWarningDueAt = due if due > now else now
        visit.extensionWarningSentAt = None
        visit.extensionTokenHash = None
        visit.extensionTokenExpiresAt = visit.expectedEndTime + TOKEN_GRACE
        visit.extensionTokenUsedAt = None

    def cancel_tokens(self, visit: Visit) -> None:
        visit.extensionTokenHash = None
        visit.extensionTokenExpiresAt = None
        visit.extensionWarningDueAt = None

    def holding_visit_for(self, *, staff_id: str | None, branch_id: str, exclude_visit_id: str | None) -> Visit | None:
        if not staff_id:
            return None
        now = now_ist()
        q = (
            self.db.query(Visit)
            .options(joinedload(Visit.staff))
            .filter(
                Visit.staffId == staff_id,
                Visit.branchId == branch_id,
                Visit.status == VisitStatus.CHECKED_IN.value,
                Visit.checkOutTime.is_(None),
                Visit.appointmentMode != AppointmentMode.ONLINE.value,
                Visit.expectedEndTime.isnot(None),
                Visit.expectedEndTime > now,
            )
        )
        if exclude_visit_id:
            q = q.filter(Visit.id != exclude_visit_id)
        return q.order_by(Visit.expectedEndTime.desc()).first()

    def assert_not_held(self, visit: Visit) -> None:
        other = self.holding_visit_for(
            staff_id=visit.staffId,
            branch_id=visit.branchId,
            exclude_visit_id=visit.id,
        )
        if not other or other.id == visit.id:
            return
        end = getattr(other, "expectedEndTime", None)
        if not isinstance(end, datetime):
            return
        doctor = other.staff.name if other.staff else other.staffName or "the doctor"
        until = format_ist_datetime(end)
        raise HTTPException(
            status_code=409,
            detail=(
                f"HOLD_CURRENT_VISIT: Current appointment with {doctor} is in progress until {until}. "
                "Do not check in the next visitor yet."
            ),
        )

    def assert_slot_started(self, visit: Visit) -> None:
        """Block QR/check-in until this visit's scheduled start (not only while the previous visit is live)."""
        if visit.appointmentMode == AppointmentMode.ONLINE.value:
            return
        if getattr(visit, "visitSubType", None) == "URGENT_PASSCODE":
            return
        if self._is_open_custom_slot(visit):
            return
        start = self._scheduled_start(visit)
        if not start:
            return
        now = now_ist()
        if start <= now:
            return
        when = format_ist_clock(start)
        raise HTTPException(
            status_code=409,
            detail=(
                f"SLOT_NOT_STARTED: Meeting will start at {when}. "
                "Do not check in this visitor yet."
            ),
        )

    def assert_ready_for_check_in(self, visit: Visit) -> None:
        self.assert_not_held(visit)
        self.assert_slot_started(visit)

    def _scheduled_start(self, visit: Visit) -> datetime | None:
        starts: list[datetime] = []
        slot = getattr(visit, "bookedSlot", None)
        slot_start = getattr(slot, "slotStart", None) if slot is not None else None
        if isinstance(slot_start, datetime):
            starts.append(slot_start)
        appt = getattr(visit, "appointmentDate", None)
        if isinstance(appt, datetime):
            starts.append(appt)
        if not starts:
            return None
        return max(starts)

    def _is_open_custom_slot(self, visit: Visit) -> bool:
        purpose = getattr(visit, "purpose", None)
        if not isinstance(purpose, str) or not purpose.upper().startswith("[CUSTOM SLOT]"):
            return False
        appt = getattr(visit, "appointmentDate", None)
        if not isinstance(appt, datetime):
            return False
        return appt.hour == 0 and appt.minute == 0

    def live_end_for_doctor(self, doctor_id: str | None) -> datetime | None:
        if not doctor_id:
            return None
        now = now_ist()
        row = (
            self.db.query(Visit)
            .filter(
                Visit.staffId == doctor_id,
                Visit.status == VisitStatus.CHECKED_IN.value,
                Visit.checkOutTime.is_(None),
                Visit.appointmentMode != AppointmentMode.ONLINE.value,
                Visit.expectedEndTime.isnot(None),
                Visit.expectedEndTime > now,
            )
            .order_by(Visit.expectedEndTime.desc())
            .first()
        )
        end = getattr(row, "expectedEndTime", None) if row else None
        return end if isinstance(end, datetime) else None

    def live_end_by_staff(self, branch_id: str) -> dict[str, object]:
        now = now_ist()
        rows = (
            self.db.query(Visit)
            .filter(
                Visit.branchId == branch_id,
                Visit.status == VisitStatus.CHECKED_IN.value,
                Visit.checkOutTime.is_(None),
                Visit.staffId.isnot(None),
                Visit.expectedEndTime.isnot(None),
                Visit.expectedEndTime > now,
            )
            .all()
        )
        return {row.staffId: row.expectedEndTime for row in rows if row.staffId}

    def _visitor_name(self, visit: Visit) -> str:
        visitor = visit.visitor
        if not visitor:
            return "Visitor"
        middle = f" {visitor.middleName}" if visitor.middleName else ""
        return f"{visitor.firstName}{middle} {visitor.lastName}".strip()

    def _doctor_name(self, visit: Visit) -> str:
        if visit.staff and visit.staff.name:
            return visit.staff.name
        return visit.staffName or "Doctor"

    def build_extend_url(self, visit_id: str, token: str) -> str:
        base = get_public_frontend_url().rstrip("/")
        return f"{base}/extend-visit?visitId={visit_id}&token={token}"

    def _mint_token(self, visit: Visit) -> str:
        token = secrets.token_urlsafe(32)
        visit.extensionTokenHash = hash_token(token)
        visit.extensionTokenUsedAt = None
        end = visit.expectedEndTime or now_ist()
        visit.extensionTokenExpiresAt = end + TOKEN_GRACE
        return token

    def send_due_warnings(self) -> dict:
        now = now_ist()
        rows = (
            self.db.query(Visit)
            .options(joinedload(Visit.visitor), joinedload(Visit.staff))
            .filter(
                Visit.status == VisitStatus.CHECKED_IN.value,
                Visit.checkOutTime.is_(None),
                Visit.appointmentMode != AppointmentMode.ONLINE.value,
                Visit.extensionWarningDueAt.isnot(None),
                Visit.extensionWarningDueAt <= now,
                Visit.extensionWarningSentAt.is_(None),
            )
            .all()
        )
        sent = 0
        from app.services.notifications_service import NotificationsService

        notifications = NotificationsService(self.db)
        for visit in rows:
            token = self._mint_token(visit)
            visit.extensionWarningSentAt = now
            notifications.notify_doctor_visit_extension(visit, token)
            sent += 1
        self.db.commit()
        return {"sent": sent}

    def _get_visit_for_token(self, visit_id: str, token: str) -> Visit:
        visit = (
            self.db.query(Visit)
            .options(
                joinedload(Visit.visitor),
                joinedload(Visit.staff),
                joinedload(Visit.bookedSlot),
            )
            .filter(Visit.id == visit_id)
            .first()
        )
        if not visit or not visit.extensionTokenHash:
            raise HTTPException(status_code=404, detail="This extension link is invalid.")
        if hash_token(token) != visit.extensionTokenHash:
            raise HTTPException(status_code=404, detail="This extension link is invalid.")
        if visit.extensionTokenUsedAt is not None:
            raise HTTPException(status_code=410, detail="This extension link has already been used.")
        if visit.extensionTokenExpiresAt and visit.extensionTokenExpiresAt < now_ist():
            raise HTTPException(status_code=410, detail="This extension link has expired.")
        if visit.status != VisitStatus.CHECKED_IN.value:
            raise HTTPException(status_code=409, detail="This visit is no longer checked in.")
        return visit

    def preview(self, visit_id: str, token: str) -> dict:
        visit = (
            self.db.query(Visit)
            .options(joinedload(Visit.visitor), joinedload(Visit.staff))
            .filter(Visit.id == visit_id)
            .first()
        )
        if not visit or not visit.extensionTokenHash or hash_token(token) != visit.extensionTokenHash:
            raise HTTPException(status_code=404, detail="This extension link is invalid.")
        used = visit.extensionTokenUsedAt is not None
        expired = bool(visit.extensionTokenExpiresAt and visit.extensionTokenExpiresAt < now_ist())
        can_act = not used and not expired and visit.status == VisitStatus.CHECKED_IN.value
        return {
            "visitId": visit.id,
            "visitorName": self._visitor_name(visit),
            "doctorName": self._doctor_name(visit),
            "expectedEndTime": visit.expectedEndTime.isoformat() if visit.expectedEndTime else None,
            "allottedMinutes": visit.allottedMinutes,
            "canAct": can_act,
            "used": used,
            "expired": expired,
        }

    def _upcoming_visitors(self, current: Visit) -> list[Visit]:
        if not current.staffId:
            return []
        after = current.checkInTime or current.appointmentDate or now_ist()
        return (
            self.db.query(Visit)
            .options(
                joinedload(Visit.visitor),
                joinedload(Visit.staff),
                joinedload(Visit.bookedSlot),
            )
            .filter(
                Visit.staffId == current.staffId,
                Visit.branchId == current.branchId,
                Visit.id != current.id,
                Visit.appointmentMode != AppointmentMode.ONLINE.value,
                Visit.status.in_([VisitStatus.APPROVED.value, VisitStatus.REQUEST_SENT.value]),
                Visit.appointmentDate.isnot(None),
                Visit.appointmentDate >= after,
            )
            .order_by(Visit.appointmentDate.asc())
            .all()
        )

    def _next_visitor(self, current: Visit) -> Visit | None:
        rows = self._upcoming_visitors(current)
        return rows[0] if rows else None

    def _slot_window_label(self, visit: Visit) -> str:
        start = visit.appointmentDate
        if not start:
            return "the updated time"
        minutes = self.slot_minutes(visit)
        end = start + timedelta(minutes=minutes)
        slot = getattr(visit, "bookedSlot", None)
        slot_end = getattr(slot, "slotEnd", None) if slot is not None else None
        if isinstance(slot_end, datetime):
            end = slot_end
        return f"{format_ist_clock(start)} to {format_ist_clock(end)}"

    def _move_visit_to(self, nxt: Visit, proposed: datetime) -> bool:
        if not nxt.appointmentDate:
            return False
        if proposed == nxt.appointmentDate:
            return True
        delta = proposed - nxt.appointmentDate
        original_appt = nxt.appointmentDate
        slot: DoctorAvailabilitySlot | None = getattr(nxt, "bookedSlot", None)
        original_slot = (slot.slotStart, slot.slotEnd) if slot else None
        try:
            with self.db.begin_nested():
                nxt.appointmentDate = proposed
                if slot:
                    slot.slotStart = slot.slotStart + delta
                    slot.slotEnd = slot.slotEnd + delta
                self.db.flush()
            return True
        except IntegrityError:
            nxt.appointmentDate = original_appt
            if slot and original_slot:
                slot.slotStart, slot.slotEnd = original_slot
            existing = (
                self.db.query(DoctorAvailabilitySlot)
                .filter(
                    DoctorAvailabilitySlot.doctorId == nxt.staffId,
                    DoctorAvailabilitySlot.slotStart == proposed,
                )
                .first()
            )
            if existing and (not existing.isBooked or existing.visitId in (None, nxt.id)):
                if slot and slot.id != existing.id:
                    slot.isBooked = False
                    slot.visitId = None
                existing.isBooked = True
                existing.visitId = nxt.id
                nxt.appointmentDate = proposed
                self.db.flush()
                return True
            try:
                with self.db.begin_nested():
                    nxt.appointmentDate = proposed
                    self.db.flush()
                return True
            except IntegrityError:
                nxt.appointmentDate = original_appt
                return False

    def _shift_next_visit(self, nxt: Visit, minutes: int, *, not_before=None) -> bool:
        if not nxt.appointmentDate:
            return False
        proposed = nxt.appointmentDate + timedelta(minutes=minutes)
        if not_before is not None and proposed < not_before:
            proposed = not_before
        return self._move_visit_to(nxt, proposed)

    def _reschedule_upcoming(self, current: Visit, minutes: int) -> list[tuple[Visit, bool]]:
        upcoming = self._upcoming_visitors(current)
        if not upcoming:
            return []
        cursor = current.expectedEndTime or now_ist()
        plan: list[tuple[Visit, datetime]] = []
        for nxt in upcoming:
            duration = max(self.slot_minutes(nxt), 1)
            proposed = nxt.appointmentDate + timedelta(minutes=minutes)
            if proposed < cursor:
                proposed = cursor
            plan.append((nxt, proposed))
            cursor = proposed + timedelta(minutes=duration)

        moved: dict[str, bool] = {}
        for nxt, proposed in reversed(plan):
            moved[nxt.id] = self._move_visit_to(nxt, proposed)
        return [(nxt, moved.get(nxt.id, False)) for nxt, _proposed in plan]

    def confirm(self, visit_id: str, token: str, minutes: int) -> dict:
        if minutes < MIN_EXTEND or minutes > MAX_EXTEND:
            raise HTTPException(
                status_code=400,
                detail=f"Extension must be between {MIN_EXTEND} and {MAX_EXTEND} minutes.",
            )
        visit = self._get_visit_for_token(visit_id, token)
        now = now_ist()
        visit.extensionTokenUsedAt = now
        visit.allottedMinutes = (visit.allottedMinutes or DEFAULT_SLOT_MINUTES) + minutes
        if visit.expectedEndTime:
            visit.expectedEndTime = visit.expectedEndTime + timedelta(minutes=minutes)
        else:
            visit.expectedEndTime = now + timedelta(minutes=minutes)
        due = visit.expectedEndTime - timedelta(minutes=warn_minutes())
        visit.extensionWarningDueAt = due if due > now else now
        visit.extensionWarningSentAt = None
        visit.extensionTokenExpiresAt = visit.expectedEndTime + TOKEN_GRACE

        delayed = self._reschedule_upcoming(visit, minutes)

        from app.services.notifications_service import NotificationsService

        notifications = NotificationsService(self.db)
        notifications.notify_security_visit_extended(visit, minutes)
        for nxt, shifted in delayed:
            window = self._slot_window_label(nxt) if shifted else None
            notifications.notify_next_visitor_delayed(
                nxt, visit, minutes, calendar_shifted=shifted, new_window=window
            )

        self.db.commit()
        self.db.refresh(visit)
        return {
            "message": "Visit extended.",
            "visitId": visit.id,
            "allottedMinutes": visit.allottedMinutes,
            "expectedEndTime": visit.expectedEndTime.isoformat() if visit.expectedEndTime else None,
            "extendedByMinutes": minutes,
            "nextVisitorNotified": bool(delayed),
            "nextVisitorRescheduled": any(shifted for _nxt, shifted in delayed),
            "upcomingDelayed": len(delayed),
        }
