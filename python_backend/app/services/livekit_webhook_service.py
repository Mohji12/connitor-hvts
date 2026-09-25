"""LiveKit webhook verification and online visit lifecycle (check-in / check-out)."""

from __future__ import annotations

import logging
from datetime import datetime
from typing import Any

from livekit import api
from livekit.protocol import webhook as lk_webhook
from sqlalchemy.orm import Session, joinedload

from app.config import get_settings, is_livekit_configured
from app.database import SessionLocal
from app.models import Visit
from app.models.enums import AppointmentMode, VisitStatus
from app.services.livekit_service import visit_id_from_room_name
from app.services.notifications_service import NotificationsService
from app.utils.timezone import IST, now_ist

logger = logging.getLogger(__name__)

ONLINE_LOCATION = "LIVEKIT_ONLINE"


class WebhookNotConfiguredError(RuntimeError):
    pass


class InvalidWebhookError(ValueError):
    pass


def verify_livekit_webhook(body: str, auth_header: str | None) -> lk_webhook.WebhookEvent:
    settings = get_settings()
    if not is_livekit_configured(settings):
        raise WebhookNotConfiguredError("LiveKit is not configured.")
    if auth_header and auth_header.lower().startswith("bearer "):
        auth_header = auth_header[7:]
    if not auth_header:
        raise InvalidWebhookError("Missing Authorization header.")
    receiver = api.WebhookReceiver(
        api.TokenVerifier(settings.livekit_api_key, settings.livekit_api_secret)
    )
    try:
        return receiver.receive(body, auth_header)
    except Exception as exc:  # livekit raises generic exceptions for bad JWT / hash mismatch
        raise InvalidWebhookError(str(exc)) from exc


def epoch_to_ist(seconds: int | None) -> datetime | None:
    if not seconds:
        return None
    return datetime.fromtimestamp(int(seconds), IST).replace(tzinfo=None)


def dispatch_online_meeting_notifications(visit_id: str, action: str) -> None:
    """Send started/completed notifications after the webhook has been acknowledged.

    Email/SMS/WhatsApp delivery can take longer than LiveKit's webhook timeout, so it
    must not run inside the request.
    """
    db: Session = SessionLocal()
    try:
        visit = (
            db.query(Visit)
            .options(joinedload(Visit.visitor), joinedload(Visit.staff))
            .filter(Visit.id == visit_id)
            .first()
        )
        if not visit or not visit.visitor:
            return
        notifications = NotificationsService(db)
        if action == "checked_in" and visit.staff:
            notifications.notify_online_meeting_started(visit, visit.visitor, visit.staff)
        elif action == "checked_out":
            notifications.notify_online_meeting_completed(
                visit, visit.visitor, visit.staff, visit.totalDurationMinutes or 1
            )
    except Exception:
        logger.exception("Failed to send online meeting notifications for visit %s", visit_id)
    finally:
        db.close()


class LiveKitWebhookService:
    def __init__(self, db: Session) -> None:
        self.db = db

    def handle_event(self, event: lk_webhook.WebhookEvent) -> dict[str, Any]:
        if event.event == "participant_joined":
            return self._handle_participant_joined(event)
        if event.event == "room_finished":
            return self._handle_room_finished(event)
        return {"handled": False, "event": event.event}

    def _find_online_visit(self, room_name: str) -> Visit | None:
        visit_id = visit_id_from_room_name(room_name)
        if not visit_id:
            return None
        return (
            self.db.query(Visit)
            .options(joinedload(Visit.visitor), joinedload(Visit.staff))
            .filter(Visit.id == visit_id, Visit.appointmentMode == AppointmentMode.ONLINE.value)
            .first()
        )

    def _handle_participant_joined(self, event: lk_webhook.WebhookEvent) -> dict[str, Any]:
        room_name = event.room.name
        visit = self._find_online_visit(room_name)
        if not visit:
            return {"handled": False, "reason": "visit_not_found", "room": room_name}

        if visit.status in (VisitStatus.CHECKED_IN.value, VisitStatus.CHECKED_OUT.value):
            return {"handled": True, "visitId": visit.id, "action": "already_checked_in"}
        if visit.status != VisitStatus.APPROVED.value:
            return {"handled": False, "reason": "invalid_status", "visitId": visit.id, "status": visit.status}

        visit.status = VisitStatus.CHECKED_IN.value
        visit.checkInTime = epoch_to_ist(event.created_at) or now_ist()
        visit.checkedInLocation = ONLINE_LOCATION
        self.db.commit()

        logger.info("Online visit %s CHECKED_IN (LiveKit participant %s)", visit.id, event.participant.identity)
        return {"handled": True, "visitId": visit.id, "action": "checked_in"}

    def _handle_room_finished(self, event: lk_webhook.WebhookEvent) -> dict[str, Any]:
        room_name = event.room.name
        visit = self._find_online_visit(room_name)
        if not visit:
            return {"handled": False, "reason": "visit_not_found", "room": room_name}
        if visit.status == VisitStatus.CHECKED_OUT.value:
            return {"handled": True, "visitId": visit.id, "action": "already_checked_out"}
        if visit.status not in (VisitStatus.APPROVED.value, VisitStatus.CHECKED_IN.value):
            return {"handled": False, "reason": "invalid_status", "visitId": visit.id, "status": visit.status}

        check_out_time = epoch_to_ist(event.created_at) or now_ist()
        if not visit.checkInTime:
            visit.checkInTime = epoch_to_ist(event.room.creation_time) or check_out_time
            visit.checkedInLocation = ONLINE_LOCATION

        duration = max(1, int((check_out_time - visit.checkInTime).total_seconds() / 60))
        visit.status = VisitStatus.CHECKED_OUT.value
        visit.checkOutTime = check_out_time
        visit.checkedOutLocation = ONLINE_LOCATION
        visit.durationMinutes = duration
        visit.totalDurationMinutes = duration
        self.db.commit()

        logger.info("Online visit %s CHECKED_OUT (LiveKit room finished, %s min)", visit.id, duration)
        return {"handled": True, "visitId": visit.id, "action": "checked_out", "durationMinutes": duration}
