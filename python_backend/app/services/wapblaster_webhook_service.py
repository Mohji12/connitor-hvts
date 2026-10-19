"""WapBlaster inbound — doctor Confirm / Reschedule and primary attendant Confirm / Reject."""

from __future__ import annotations

import logging
from typing import Any

from sqlalchemy.orm import Session

from app.config import get_settings, is_wapblaster_configured
from app.services.attendant_approval_reply_service import AttendantApprovalReplyService
from app.services.visit_approval_reply_service import VisitApprovalReplyService
from app.services.wapblaster_client import send_wapblaster_text
from app.services.wapblaster_inbound import parse_wapblaster_inbound
from app.utils.phone import normalize_phone

logger = logging.getLogger(__name__)


class WapBlasterWebhookService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.settings = get_settings()
        self.approval = VisitApprovalReplyService(db)
        self.attendant_approval = AttendantApprovalReplyService(db)

    def _reply_sender(self, to_phone: str, message: str) -> None:
        if not is_wapblaster_configured(self.settings):
            logger.warning("WapBlaster not configured; inbound reply not sent: %s", message[:200])
            return
        try:
            send_wapblaster_text(to_phone, message)
        except Exception as exc:
            logger.error("WapBlaster inbound reply failed to %s: %s", to_phone, exc)

    def handle_payload(self, payload: dict[str, Any]) -> dict[str, Any]:
        phone, body, button_id = parse_wapblaster_inbound(payload)
        if not phone:
            logger.info("WapBlaster inbound ignored (no phone): %s", str(payload)[:500])
            return {"received": True, "handled": 0}

        reply_to = normalize_phone(phone)

        # Primary attendant Confirm/Reject (attok_/attno_ or CONFIRM code for visitor request).
        attendant_reply = self.attendant_approval.try_handle(
            from_phone=reply_to, button_id=button_id, body=body
        )
        if attendant_reply is not None:
            self._reply_sender(reply_to, attendant_reply)
            logger.info("WapBlaster attendant approval from %s handled", reply_to)
            return {"received": True, "handled": 1, "message": attendant_reply}

        if button_id:
            reply = self.approval.handle_button_reply(from_phone=reply_to, button_id=button_id)
        elif body:
            reply = self.approval.handle_reply(from_phone=reply_to, body=body)
        else:
            return {"received": True, "handled": 0}

        self._reply_sender(reply_to, reply)
        logger.info("WapBlaster inbound from %s handled", reply_to)
        return {"received": True, "handled": 1, "message": reply}
