"""Background dispatch for visit booking notifications (avoids blocking HTTP responses)."""

from __future__ import annotations

import logging

from sqlalchemy.orm import Session, joinedload

from app.database import SessionLocal
from app.models import Branch, Department, SubDepartment, Visit
from app.services.notifications_service import NotificationsService

logger = logging.getLogger(__name__)


def dispatch_new_visit_request_notifications(visit_id: str) -> None:
    """Send doctor, security, and visitor notifications for a new visit request."""
    db: Session = SessionLocal()
    try:
        visit = (
            db.query(Visit)
            .options(joinedload(Visit.visitor), joinedload(Visit.staff))
            .filter(Visit.id == visit_id)
            .first()
        )
        if not visit or not visit.visitor or not visit.staff:
            logger.warning("Visit %s missing for notification dispatch", visit_id)
            return

        doctor = visit.staff
        visitor = visit.visitor
        branch = db.get(Branch, visit.branchId)
        dept = db.get(Department, visit.departmentId) if visit.departmentId else None
        sub = db.get(SubDepartment, visit.subDepartmentId) if visit.subDepartmentId else None

        notifications = NotificationsService(db)
        notifications.notify_staff_on_visit_request(visit, doctor, visitor)
        notifications.notify_security_on_new_visit_request(visit, doctor, visitor)
        notifications.notify_visitor_booking_received(
            visit,
            doctor,
            visitor,
            branch=branch,
            department=dept,
            sub_department=sub,
        )
    except Exception:
        logger.exception("Failed to dispatch booking notifications for visit %s", visit_id)
    finally:
        db.close()
