"""Meta WhatsApp Cloud API — inbound doctor approval replies."""

from __future__ import annotations

import logging
from typing import Any

import httpx
from sqlalchemy.orm import Session

from app.config import get_settings, is_meta_whatsapp_configured
from app.services.visit_approval_reply_service import VisitApprovalReplyService

logger = logging.getLogger(__name__)


class WhatsAppWebhookService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.settings = get_settings()
        self.approval = VisitApprovalReplyService(db)

    def verify_subscription(self, *, mode: str | None, token: str | None, challenge: str | None) -> str | None:
        verify = self.settings.whatsapp_webhook_verify_token
        if mode == "subscribe" and token and verify and token == verify and challenge:
            return challenge
        return None

    def _send_text_reply(self, to_phone: str, message: str) -> None:
        if not is_meta_whatsapp_configured(self.settings):
            logger.warning("Meta WhatsApp not configured; cannot send reply: %s", message)
            return

        url = (
            f"{self.settings.whatsapp_api_url.rstrip('/')}/"
            f"{self.settings.whatsapp_phone_number_id}/messages"
        )
        to_digits = to_phone.lstrip("+")
        payload = {
            "messaging_product": "whatsapp",
            "to": to_digits,
            "type": "text",
            "text": {"body": message[:4096]},
        }
        headers = {"Authorization": f"Bearer {self.settings.whatsapp_access_token}"}
        response = httpx.post(url, json=payload, headers=headers, timeout=30)
        if response.status_code not in (200, 201):
            logger.error("Meta WhatsApp reply failed %s: %s", response.status_code, response.text)

    def _process_inbound_message(self, message: dict[str, Any]) -> bool:
        from_phone = str(message.get("from", ""))
        if not from_phone:
            return False

        phone = f"+{from_phone.lstrip('+')}"
        msg_type = message.get("type")

        if msg_type == "text":
            body = (message.get("text") or {}).get("body", "")
            if not body:
                return False
            reply = self.approval.handle_reply(from_phone=phone, body=body)
        elif msg_type == "interactive":
            interactive = message.get("interactive") or {}
            if interactive.get("type") != "button_reply":
                return False
            button_id = (interactive.get("button_reply") or {}).get("id", "")
            if not button_id:
                return False
            reply = self.approval.handle_button_reply(from_phone=phone, button_id=button_id)
        elif msg_type == "button":
            button_id = (message.get("button") or {}).get("payload", "")
            if not button_id:
                return False
            reply = self.approval.handle_button_reply(from_phone=phone, button_id=button_id)
        else:
            return False

        self._send_text_reply(from_phone, reply)
        logger.info("Processed WhatsApp approval reply from %s (type=%s)", from_phone, msg_type)
        return True

    def handle_webhook_payload(self, payload: dict[str, Any]) -> dict[str, Any]:
        handled = 0
        if payload.get("object") != "whatsapp_business_account":
            return {"received": True, "handled": 0}

        for entry in payload.get("entry") or []:
            for change in entry.get("changes") or []:
                value = change.get("value") or {}
                for message in value.get("messages") or []:
                    if self._process_inbound_message(message):
                        handled += 1

        return {"received": True, "handled": handled}
