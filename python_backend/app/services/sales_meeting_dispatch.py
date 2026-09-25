"""Background email dispatch for sales-rep meeting confirmation."""

from __future__ import annotations

import logging

from sqlalchemy.orm import Session, joinedload

from app.database import SessionLocal
from app.models import Visit
from app.models.enums import MeetingStatus
from app.services.messaging_service import EmailService
from app.services.sales_meeting_service import SalesMeetingService

logger = logging.getLogger(__name__)

OUTCOME_LABELS = {
    MeetingStatus.STARTED.value: "Meeting started",
    MeetingStatus.NOT_ATTENDED.value: "Meeting not attended",
    MeetingStatus.AUTO_EXPIRED.value: "Meeting auto-expired (no confirmation within the window)",
}


def dispatch_sales_meeting_confirm_email(visit_id: str, token: str) -> None:
    db: Session = SessionLocal()
    try:
        visit = (
            db.query(Visit)
            .options(joinedload(Visit.visitor), joinedload(Visit.staff))
            .filter(Visit.id == visit_id)
            .first()
        )
        if not visit or not visit.visitor or not visit.visitor.email:
            logger.warning("Sales meeting confirm email skipped for visit %s (no visitor email)", visit_id)
            return
        service = SalesMeetingService(db)
        ctx = service.meeting_context(visit)
        started_url, not_attended_url = service.build_confirm_urls(visit.id, token)
        EmailService().send_sales_meeting_confirm_email(
            visit.visitor.email,
            pass_id=ctx["passId"],
            visitor_name=ctx["visitorName"],
            doctor_name=ctx["doctorName"],
            slot_time=ctx["slotTime"],
            started_url=started_url,
            not_attended_url=not_attended_url,
        )
    except Exception:
        logger.exception("Failed to send sales meeting confirm email for visit %s", visit_id)
    finally:
        db.close()


def dispatch_sales_meeting_outcome_email(visit_id: str) -> None:
    db: Session = SessionLocal()
    try:
        visit = (
            db.query(Visit)
            .options(joinedload(Visit.visitor), joinedload(Visit.staff))
            .filter(Visit.id == visit_id)
            .first()
        )
        if not visit or not visit.companyEmail:
            logger.warning("Sales meeting outcome email skipped for visit %s (no company email)", visit_id)
            return
        service = SalesMeetingService(db)
        ctx = service.meeting_context(visit)
        outcome = visit.meetingStatus or MeetingStatus.AUTO_EXPIRED.value
        EmailService().send_sales_meeting_outcome_email(
            visit.companyEmail,
            pass_id=ctx["passId"],
            visitor_name=ctx["visitorName"],
            doctor_name=ctx["doctorName"],
            slot_time=ctx["slotTime"],
            outcome=OUTCOME_LABELS.get(outcome, outcome),
            company_name=ctx["companyName"],
        )
    except Exception:
        logger.exception("Failed to send sales meeting outcome email for visit %s", visit_id)
    finally:
        db.close()


def dispatch_auto_expire_and_notify() -> dict:
    db: Session = SessionLocal()
    try:
        result = SalesMeetingService(db).auto_expire_unconfirmed()
        for visit_id in result.get("visitIds") or []:
            dispatch_sales_meeting_outcome_email(visit_id)
        return result
    except Exception:
        logger.exception("Sales meeting auto-expire job failed")
        return {"expired": 0, "visitIds": []}
    finally:
        db.close()
