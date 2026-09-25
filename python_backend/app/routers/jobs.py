from typing import Annotated

from fastapi import APIRouter, Depends, Header, HTTPException
from sqlalchemy.orm import Session

from app.config import get_settings
from app.database import get_db
from app.dependencies.auth import public_route
from app.services.sales_meeting_dispatch import dispatch_auto_expire_and_notify
from app.services.visit_slot_extension_service import VisitSlotExtensionService

router = APIRouter()


def _assert_cron(x_cron_token: str | None) -> None:
    settings = get_settings()
    expected = (settings.cron_job_token or "").strip()
    if expected and x_cron_token != expected:
        raise HTTPException(status_code=401, detail="Invalid cron token.")
    if settings.node_env == "production" and not expected:
        raise HTTPException(status_code=401, detail="CRON_JOB_TOKEN is required in production.")


@router.post("/sales-meeting-auto-expire")
@public_route
def expire_sales_meetings(
    db: Annotated[Session, Depends(get_db)],
    x_cron_token: Annotated[str | None, Header()] = None,
):
    _assert_cron(x_cron_token)
    _ = db
    return dispatch_auto_expire_and_notify()


@router.post("/visit-extension-warnings")
@public_route
def send_visit_extension_warnings(
    db: Annotated[Session, Depends(get_db)],
    x_cron_token: Annotated[str | None, Header()] = None,
):
    _assert_cron(x_cron_token)
    return VisitSlotExtensionService(db).send_due_warnings()

