import logging
import threading
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.concurrency import run_in_threadpool
from sqlalchemy.orm import Session

from app.database import get_db
from app.services.livekit_webhook_service import (
    InvalidWebhookError,
    LiveKitWebhookService,
    WebhookNotConfiguredError,
    dispatch_online_meeting_notifications,
    verify_livekit_webhook,
)

logger = logging.getLogger(__name__)

router = APIRouter()

NOTIFY_ACTIONS = {"checked_in", "checked_out"}


@router.post("/livekit")
async def livekit_webhook(
    request: Request,
    db: Annotated[Session, Depends(get_db)],
) -> dict:
    body = (await request.body()).decode("utf-8")
    auth_header = request.headers.get("authorization")
    try:
        event = verify_livekit_webhook(body, auth_header)
    except WebhookNotConfiguredError as exc:
        raise HTTPException(status_code=503, detail="LiveKit webhook not configured") from exc
    except InvalidWebhookError as exc:
        logger.warning("Invalid LiveKit webhook: %s", exc)
        raise HTTPException(status_code=401, detail="Invalid webhook signature") from exc

    try:
        # Sync DB work may wait on row locks; keep it off the event loop so the worker stays alive.
        result = await run_in_threadpool(LiveKitWebhookService(db).handle_event, event)
    except Exception as exc:
        logger.exception("LiveKit webhook handler failed for %s: %s", event.event, exc)
        raise HTTPException(status_code=500, detail="Webhook processing failed") from exc

    if result.get("action") in NOTIFY_ACTIONS:
        threading.Thread(
            target=dispatch_online_meeting_notifications,
            args=(result["visitId"], result["action"]),
            daemon=True,
        ).start()

    logger.info("Processed LiveKit webhook %s: %s", event.event, result)
    return {"received": True, **result}
