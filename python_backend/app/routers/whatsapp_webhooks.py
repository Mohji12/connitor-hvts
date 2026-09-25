import json
import logging
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, Request, Response
from sqlalchemy.orm import Session

from pydantic import BaseModel, Field

from app.config import get_settings, is_demo_mode_enabled
from app.database import get_db
from app.services.visit_approval_reply_service import VisitApprovalReplyService
from app.services.whatsapp_webhook_service import WhatsAppWebhookService

logger = logging.getLogger(__name__)

router = APIRouter()


class WhatsAppReplyBody(BaseModel):
    from_phone: str = Field(min_length=10)
    body: str | None = Field(default=None, min_length=1)
    button_id: str | None = Field(default=None, min_length=1)


def _process_doctor_reply(
    db: Session,
    *,
    from_phone: str,
    body: str | None = None,
    button_id: str | None = None,
) -> str:
    service = VisitApprovalReplyService(db)
    if button_id:
        return service.handle_button_reply(from_phone=from_phone, button_id=button_id.strip())
    if body:
        return service.handle_reply(from_phone=from_phone, body=body.strip())
    raise HTTPException(status_code=400, detail="body or button_id required")


@router.post("/whatsapp/reply")
async def doctor_whatsapp_reply(
    payload: WhatsAppReplyBody,
    request: Request,
    db: Annotated[Session, Depends(get_db)],
) -> dict[str, str]:
    """
    Process doctor YES/NO reply (same as replying on WhatsApp to the central number).

    PyWhatKit cannot receive inbound WhatsApp — call this when the doctor replies on WhatsApp,
    or configure Meta Cloud API POST /webhooks/whatsapp for automatic delivery.

    Auth: header X-WhatsApp-Reply-Key must match WHATSAPP_REPLY_API_KEY (or demo mode).
    """
    settings = get_settings()
    api_key = settings.whatsapp_reply_api_key
    header_key = request.headers.get("X-WhatsApp-Reply-Key")
    if not is_demo_mode_enabled(settings):
        if not api_key or header_key != api_key:
            raise HTTPException(status_code=403, detail="Invalid or missing reply API key")

    message = _process_doctor_reply(
        db,
        from_phone=payload.from_phone,
        body=payload.body,
        button_id=payload.button_id,
    )
    logger.info("WhatsApp doctor reply from %s: %s", payload.from_phone, message)
    return {"message": message}


@router.get("/whatsapp")
async def whatsapp_webhook_verify(
    hub_mode: str | None = Query(None, alias="hub.mode"),
    hub_verify_token: str | None = Query(None, alias="hub.verify_token"),
    hub_challenge: str | None = Query(None, alias="hub.challenge"),
    db: Annotated[Session, Depends(get_db)] = ...,
) -> Response:
    service = WhatsAppWebhookService(db)
    challenge = service.verify_subscription(
        mode=hub_mode, token=hub_verify_token, challenge=hub_challenge
    )
    if challenge is None:
        raise HTTPException(status_code=403, detail="Invalid verify token")
    return Response(content=challenge, media_type="text/plain")


@router.post("/whatsapp")
async def whatsapp_webhook_inbound(
    request: Request,
    db: Annotated[Session, Depends(get_db)],
) -> Response:
    try:
        payload = await request.json()
    except json.JSONDecodeError as exc:
        raise HTTPException(status_code=400, detail="Invalid JSON") from exc

    service = WhatsAppWebhookService(db)
    result = service.handle_webhook_payload(payload)
    return Response(content=json.dumps(result), media_type="application/json")


@router.post("/whatsapp/simulate-reply")
async def simulate_whatsapp_doctor_reply(
    request: Request,
    db: Annotated[Session, Depends(get_db)],
) -> dict[str, str]:
    """Dev/demo: process doctor YES/NO as if Meta webhook received it (PyWhatKit has no inbound API)."""
    settings = get_settings()
    if settings.node_env == "production" and not is_demo_mode_enabled(settings):
        raise HTTPException(status_code=404, detail="Not available")

    body = await request.json()
    from_phone = str(body.get("from_phone", "")).strip()
    text = str(body.get("body", "")).strip()
    button_id = str(body.get("button_id", "")).strip()
    if not from_phone or (not text and not button_id):
        raise HTTPException(status_code=400, detail="from_phone and body or button_id required")

    reply = _process_doctor_reply(
        db,
        from_phone=from_phone,
        body=text or None,
        button_id=button_id or None,
    )
    logger.info(
        "Simulated WhatsApp reply from %s: %s -> %s",
        from_phone,
        button_id or text,
        reply,
    )
    return {"message": reply}
