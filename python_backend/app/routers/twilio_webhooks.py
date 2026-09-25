import logging
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from sqlalchemy.orm import Session

from app.database import get_db
from app.services.twilio_webhook_service import TwilioWebhookService

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/twilio/sms")
async def twilio_inbound_sms(
    request: Request,
    db: Annotated[Session, Depends(get_db)],
) -> Response:
    form = await request.form()
    params = {key: str(value) for key, value in form.items()}

    body = params.get("Body", "").strip()
    from_phone = params.get("From", "").strip()
    if not body or not from_phone:
        raise HTTPException(status_code=400, detail="Missing Body or From in Twilio payload")

    service = TwilioWebhookService(db)
    webhook_url = service.resolve_webhook_url(str(request.url))
    signature = request.headers.get("X-Twilio-Signature")
    service.validate_request(url=webhook_url, params=params, signature=signature)

    twiml = service.handle_inbound_sms(body=body, from_phone=from_phone)
    logger.info("Processed Twilio inbound SMS from %s", from_phone)
    return Response(content=twiml, media_type="application/xml")
