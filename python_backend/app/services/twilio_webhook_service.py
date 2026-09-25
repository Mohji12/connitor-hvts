"""Twilio inbound SMS/WhatsApp webhook: doctor approve/reject via YES/NO reply."""

from __future__ import annotations

import logging
from xml.sax.saxutils import escape

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.config import get_settings, is_test_mode_enabled, is_twilio_configured
from app.services.visit_approval_reply_service import VisitApprovalReplyService

logger = logging.getLogger(__name__)


def build_twiml(message: str) -> str:
    safe = escape(message.strip())
    return f'<?xml version="1.0" encoding="UTF-8"?><Response><Message>{safe}</Message></Response>'


def verify_twilio_signature(
    *,
    url: str,
    params: dict[str, str],
    signature: str | None,
    auth_token: str,
) -> bool:
    if not signature:
        return False
    from twilio.request_validator import RequestValidator

    return RequestValidator(auth_token).validate(url, params, signature)


class TwilioWebhookService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.settings = get_settings()
        self.approval = VisitApprovalReplyService(db)

    def handle_inbound_sms(self, *, body: str, from_phone: str) -> str:
        reply = self.approval.handle_reply(from_phone=from_phone, body=body)
        return build_twiml(reply)

    def resolve_webhook_url(self, request_url: str) -> str:
        if self.settings.twilio_webhook_url:
            return self.settings.twilio_webhook_url.rstrip("/")
        if self.settings.gcp_public_url:
            base = self.settings.gcp_public_url.rstrip("/")
            return f"{base}/api/webhooks/twilio/sms"
        return str(request_url).split("?")[0]

    def validate_request(
        self,
        *,
        url: str,
        params: dict[str, str],
        signature: str | None,
    ) -> None:
        if is_test_mode_enabled(self.settings):
            return
        if not is_twilio_configured(self.settings):
            raise HTTPException(status_code=503, detail="Twilio is not configured")
        auth_token = self.settings.twilio_auth_token
        if not auth_token:
            raise HTTPException(status_code=503, detail="Twilio auth token not configured")
        if not verify_twilio_signature(
            url=url,
            params=params,
            signature=signature,
            auth_token=auth_token,
        ):
            logger.warning("Invalid Twilio webhook signature for inbound SMS")
            raise HTTPException(status_code=403, detail="Invalid Twilio signature")
