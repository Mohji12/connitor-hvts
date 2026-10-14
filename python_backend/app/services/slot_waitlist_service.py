"""Waitlist for dates with no doctor slots, and WhatsApp alerts once slots are published."""

from __future__ import annotations

import logging
from datetime import date, datetime
from typing import Iterable

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.config import get_settings
from app.models import User, VisitorAccount
from app.models.enums import Role
from app.models.slot_waitlist_entities import SlotWaitlist
from app.services.messaging_service import SmsService
from app.utils.timezone import now_ist

logger = logging.getLogger(__name__)


class SlotWaitlistService:
    def __init__(self, db: Session) -> None:
        self.db = db

    def join(self, visitor_account_id: str, doctor_id: str, date_str: str) -> dict:
        doctor = self.db.get(User, doctor_id)
        if not doctor or not doctor.isActive or doctor.role != Role.STAFF.value:
            raise HTTPException(status_code=404, detail="Staff not found.")
        try:
            day = datetime.strptime(date_str.strip()[:10], "%Y-%m-%d").date()
        except ValueError as exc:
            raise HTTPException(status_code=400, detail="Invalid date. Use YYYY-MM-DD.") from exc
        if day < now_ist().date():
            raise HTTPException(status_code=400, detail="Choose today or a future date.")

        existing = (
            self.db.query(SlotWaitlist)
            .filter(
                SlotWaitlist.visitorAccountId == visitor_account_id,
                SlotWaitlist.doctorId == doctor_id,
                SlotWaitlist.date == day,
            )
            .first()
        )
        if existing:
            if existing.notifiedAt is not None:
                existing.notifiedAt = None
                self.db.commit()
            return {"id": existing.id, "date": day.isoformat(), "created": False}

        row = SlotWaitlist(visitorAccountId=visitor_account_id, doctorId=doctor_id, date=day)
        self.db.add(row)
        self.db.commit()
        return {"id": row.id, "date": day.isoformat(), "created": True}

    def notify_new_slots(self, doctor: User, dates: Iterable[date]) -> int:
        """WhatsApp every visitor still waiting on one of ``dates``. Returns how many were notified."""
        wanted = sorted(set(dates))
        if not wanted:
            return 0
        rows = (
            self.db.query(SlotWaitlist)
            .filter(
                SlotWaitlist.doctorId == doctor.id,
                SlotWaitlist.date.in_(wanted),
                SlotWaitlist.notifiedAt.is_(None),
            )
            .all()
        )
        if not rows:
            return 0

        settings = get_settings()
        base = settings.frontend_url.rstrip("/")
        branch_id = getattr(doctor, "branchId", None)
        link = f"{base}/book-appointment/" + (f"?branchId={branch_id}" if branch_id else "")
        doctor_name = doctor.name or "Your doctor"
        sms = SmsService()
        notified = 0
        for row in rows:
            account = self.db.get(VisitorAccount, row.visitorAccountId)
            if not account or not account.phone:
                continue
            try:
                sent = sms.send_slot_available_whatsapp(
                    account.phone, doctor_name, row.date.strftime("%d %b %Y"), link
                )
            except Exception:
                logger.warning("Slot waitlist WhatsApp failed for %s", row.id, exc_info=True)
                continue
            if sent:
                row.notifiedAt = now_ist()
                notified += 1
        self.db.commit()
        return notified
