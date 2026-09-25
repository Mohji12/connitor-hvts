"""Sales Representative meeting attendance confirmation (token + cron)."""

from __future__ import annotations

import logging
import re
import secrets
from datetime import timedelta
from typing import Any

from fastapi import HTTPException
from sqlalchemy.orm import Session, joinedload

from app.config import get_public_frontend_url, get_settings, is_test_mode_enabled
from app.models import MeetingStatusAudit, Visit, Visitor
from app.models.enums import MeetingStatus, VisitorType
from app.schemas.visitor_account import hash_token
from app.utils.timezone import format_ist_datetime, now_ist

logger = logging.getLogger(__name__)

VALID_CONFIRM_STATUSES = {MeetingStatus.STARTED.value, MeetingStatus.NOT_ATTENDED.value}
_EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
_ALIASES = {
    "SALES": VisitorType.SALES_REPRESENTATIVE.value,
    "SALES_REP": VisitorType.SALES_REPRESENTATIVE.value,
    "SALES REP": VisitorType.SALES_REPRESENTATIVE.value,
}


def confirm_window_hours() -> int:
    hours = get_settings().sales_meeting_confirm_window_hours
    return hours if hours > 0 else 4


def parse_visitor_kind(data: dict) -> tuple[str, str | None, str | None]:
    """Return (visitorType, companyName, companyEmail). Extra fields only for Sales Rep."""
    raw = str(data.get("visitorType") or data.get("visitor_type") or VisitorType.GENERAL.value)
    kind = raw.strip().upper().replace("-", "_")
    kind = _ALIASES.get(kind, kind)
    allowed = {item.value for item in VisitorType}
    if kind not in allowed:
        raise HTTPException(status_code=400, detail="Invalid visitorType.")

    if kind != VisitorType.SALES_REPRESENTATIVE.value:
        return kind, None, None

    name = str(data.get("companyName") or data.get("company_name") or "").strip()
    email = str(data.get("companyEmail") or data.get("company_email") or "").strip().lower()
    if not name:
        raise HTTPException(
            status_code=400,
            detail="companyName is required for Sales Representative bookings.",
        )
    if not email or not _EMAIL_RE.match(email):
        raise HTTPException(
            status_code=400,
            detail="companyEmail must be a valid email for Sales Representative bookings.",
        )
    return kind, name, email


def apply_visitor_kind(visit: Visit, data: dict) -> None:
    kind, company_name, company_email = parse_visitor_kind(data)
    visit.visitorType = kind
    visit.companyName = company_name
    visit.companyEmail = company_email
    if kind == VisitorType.SALES_REPRESENTATIVE.value:
        visit.meetingStatus = visit.meetingStatus or MeetingStatus.NOT_STARTED.value
    else:
        visit.meetingStatus = None
        visit.meetingConfirmedAt = None


class SalesMeetingService:
    def __init__(self, db: Session) -> None:
        self.db = db

    def _visitor_name(self, visitor: Visitor | None) -> str:
        if not visitor:
            return "Visitor"
        middle = f" {visitor.middleName}" if visitor.middleName else ""
        return f"{visitor.firstName}{middle} {visitor.lastName}".strip()

    def _pass_id(self, visit: Visit) -> str:
        return visit.visitorPassId or visit.id

    def _audit(
        self,
        visit: Visit,
        *,
        old_status: str | None,
        new_status: str,
        actor_type: str,
        actor: str | None,
        token_hash: str | None = None,
    ) -> None:
        self.db.add(
            MeetingStatusAudit(
                visitId=visit.id,
                oldStatus=old_status,
                newStatus=new_status,
                actorType=actor_type,
                actor=actor,
                tokenHash=token_hash,
            )
        )

    def prepare_confirmation_after_check_in(self, visit: Visit) -> str | None:
        """Mint a single-use token after completed check-in. Idempotent. Returns raw token or None."""
        if visit.visitorType != VisitorType.SALES_REPRESENTATIVE.value:
            return None
        if visit.confirmationTokenHash and not visit.confirmationTokenUsedAt:
            return None
        if visit.meetingStatus in (
            MeetingStatus.STARTED.value,
            MeetingStatus.NOT_ATTENDED.value,
            MeetingStatus.AUTO_EXPIRED.value,
        ):
            return None

        token = secrets.token_urlsafe(32)
        token_hash = hash_token(token)
        now = now_ist()
        check_in = visit.checkInTime or now
        old_status = visit.meetingStatus
        visit.confirmationTokenHash = token_hash
        visit.confirmationTokenExpiresAt = check_in + timedelta(hours=confirm_window_hours())
        visit.confirmationTokenUsedAt = None
        visit.meetingStatus = MeetingStatus.NOT_STARTED.value
        self._audit(
            visit,
            old_status=old_status,
            new_status=MeetingStatus.NOT_STARTED.value,
            actor_type="token",
            actor="check_in",
            token_hash=token_hash,
        )
        self.db.commit()
        if is_test_mode_enabled(get_settings()):
            logger.info(
                "[HVTS_TEST_MODE] Sales meeting confirmation token for visit %s issued",
                visit.id,
            )
        return token

    def build_confirm_urls(self, visit_id: str, token: str) -> tuple[str, str]:
        base = get_public_frontend_url().rstrip("/")
        started = f"{base}/confirm-meeting?passId={visit_id}&token={token}&status=started"
        not_attended = f"{base}/confirm-meeting?passId={visit_id}&token={token}&status=not_attended"
        return started, not_attended

    def meeting_context(self, visit: Visit) -> dict[str, str]:
        doctor = visit.staffName or (visit.staff.name if visit.staff else "Doctor")
        slot = format_ist_datetime(visit.appointmentDate) if visit.appointmentDate else "scheduled time"
        return {
            "passId": self._pass_id(visit),
            "visitId": visit.id,
            "visitorName": self._visitor_name(visit.visitor),
            "doctorName": doctor,
            "slotTime": slot,
            "companyName": visit.companyName or "",
        }

    def confirm(self, pass_id: str, token: str, status: str) -> dict[str, Any]:
        desired = (status or "").strip().lower()
        if desired not in VALID_CONFIRM_STATUSES:
            raise HTTPException(
                status_code=400,
                detail="status must be started or not_attended.",
            )
        visit = self._get_visit_for_token(pass_id, token)
        old = visit.meetingStatus
        token_hash = visit.confirmationTokenHash
        visit.meetingStatus = desired
        visit.meetingConfirmedAt = now_ist()
        visit.confirmationTokenUsedAt = now_ist()
        visit.confirmationTokenHash = None
        actor_email = visit.visitor.email if visit.visitor else None
        self._audit(
            visit,
            old_status=old,
            new_status=desired,
            actor_type="sales_rep_email",
            actor=actor_email or "token",
            token_hash=token_hash,
        )
        self.db.commit()
        return {
            "message": "Meeting attendance recorded.",
            "visitId": visit.id,
            "passId": self._pass_id(visit),
            "meetingStatus": desired,
            "meetingConfirmedAt": visit.meetingConfirmedAt.isoformat() if visit.meetingConfirmedAt else None,
        }

    def preview(self, pass_id: str, token: str) -> dict[str, Any]:
        visit = self._get_visit_for_token(pass_id, token, allow_used=True)
        ctx = self.meeting_context(visit)
        used = visit.confirmationTokenUsedAt is not None or visit.confirmationTokenHash is None
        expired = self._is_expired(visit) and not used
        return {
            **ctx,
            "meetingStatus": visit.meetingStatus,
            "canAct": visit.meetingStatus == MeetingStatus.NOT_STARTED.value and not used and not expired,
            "used": used,
            "expired": expired,
        }

    def auto_expire_unconfirmed(self) -> dict[str, int]:
        cutoff = now_ist() - timedelta(hours=confirm_window_hours())
        visits = (
            self.db.query(Visit)
            .options(joinedload(Visit.visitor), joinedload(Visit.staff))
            .filter(
                Visit.visitorType == VisitorType.SALES_REPRESENTATIVE.value,
                Visit.meetingStatus == MeetingStatus.NOT_STARTED.value,
                Visit.checkInTime.isnot(None),
                Visit.checkInTime <= cutoff,
            )
            .all()
        )
        expired_ids: list[str] = []
        for visit in visits:
            old = visit.meetingStatus
            visit.meetingStatus = MeetingStatus.AUTO_EXPIRED.value
            visit.meetingConfirmedAt = now_ist()
            visit.confirmationTokenUsedAt = visit.confirmationTokenUsedAt or now_ist()
            visit.confirmationTokenHash = None
            self._audit(
                visit,
                old_status=old,
                new_status=MeetingStatus.AUTO_EXPIRED.value,
                actor_type="system_cron",
                actor="system_cron",
            )
            expired_ids.append(visit.id)
        if expired_ids:
            self.db.commit()
        return {"expired": len(expired_ids), "visitIds": expired_ids}

    def _get_visit_for_token(self, pass_id: str, token: str, *, allow_used: bool = False) -> Visit:
        token_hash = hash_token((token or "").strip())
        visit = (
            self.db.query(Visit)
            .options(joinedload(Visit.visitor), joinedload(Visit.staff))
            .filter(Visit.id == pass_id)
            .first()
        )
        if not visit:
            visit = (
                self.db.query(Visit)
                .options(joinedload(Visit.visitor), joinedload(Visit.staff))
                .filter(Visit.visitorPassId == pass_id)
                .first()
            )
        if not visit or visit.visitorType != VisitorType.SALES_REPRESENTATIVE.value:
            raise HTTPException(status_code=404, detail="Invalid or expired confirmation link.")

        stored = visit.confirmationTokenHash
        used = visit.confirmationTokenUsedAt is not None
        if allow_used:
            if stored and stored != token_hash:
                raise HTTPException(status_code=404, detail="Invalid or expired confirmation link.")
            if not stored and used:
                return visit
            if stored and stored == token_hash:
                if self._is_expired(visit):
                    raise HTTPException(status_code=410, detail="This confirmation link has expired.")
                return visit
            raise HTTPException(status_code=404, detail="Invalid or expired confirmation link.")

        if used or not stored:
            raise HTTPException(status_code=410, detail="This confirmation link has already been used.")
        if stored != token_hash:
            raise HTTPException(status_code=404, detail="Invalid or expired confirmation link.")
        if self._is_expired(visit):
            raise HTTPException(status_code=410, detail="This confirmation link has expired.")
        if visit.meetingStatus != MeetingStatus.NOT_STARTED.value:
            raise HTTPException(
                status_code=409,
                detail=f"This meeting is already {visit.meetingStatus}.",
            )
        return visit

    def _is_expired(self, visit: Visit) -> bool:
        if visit.confirmationTokenExpiresAt:
            return visit.confirmationTokenExpiresAt < now_ist()
        if visit.checkInTime:
            return visit.checkInTime + timedelta(hours=confirm_window_hours()) < now_ist()
        return True
