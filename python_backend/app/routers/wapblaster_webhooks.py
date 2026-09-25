import json
import logging
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from sqlalchemy.orm import Session

from app.config import get_settings
from app.database import get_db
from app.services.wapblaster_webhook_service import WapBlasterWebhookService

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/wapblaster/inbound")
async def wapblaster_inbound(
    request: Request,
    db: Annotated[Session, Depends(get_db)],
) -> Response:
    """
    Inbound WhatsApp events from WapBlaster (button taps, text replies).

    Configure in WapBlaster dashboard:
      POST {PUBLIC_API_BASE_URL}/api/webhooks/wapblaster/inbound
    Header: X-WapBlaster-Webhook-Secret must match WAPBLASTER_WEBHOOK_SECRET when set.
    """
    settings = get_settings()
    secret = (settings.wapblaster_webhook_secret or "").strip()
    if secret:
        header = request.headers.get("X-WapBlaster-Webhook-Secret") or request.headers.get(
            "X-Webhook-Secret"
        )
        if header != secret:
            raise HTTPException(status_code=403, detail="Invalid webhook secret")

    try:
        payload = await request.json()
    except json.JSONDecodeError as exc:
        raise HTTPException(status_code=400, detail="Invalid JSON") from exc

    if not isinstance(payload, dict):
        raise HTTPException(status_code=400, detail="JSON object required")

    service = WapBlasterWebhookService(db)
    result = service.handle_payload(payload)
    return Response(content=json.dumps(result), media_type="application/json")
