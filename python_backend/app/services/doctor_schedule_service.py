"""Doctor self-serve availability schedule (publish / list / delete slots)."""

from __future__ import annotations

from datetime import datetime, timedelta

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.models import DoctorAvailabilitySlot, User
from app.utils.timezone import now_ist

# Python weekday: Mon=0 … Sun=6. Default publish every day, including Sunday.
DEFAULT_WEEKDAYS = {0, 1, 2, 3, 4, 5, 6}


class DoctorScheduleService:
    def __init__(self, db: Session) -> None:
        self.db = db

    def _doctor(self, user: dict) -> User:
        doctor = self.db.get(User, user["id"])
        if not doctor:
            raise HTTPException(status_code=404, detail="User not found")
        role = user.get("role") or doctor.role
        if role not in (
            "STAFF",
            "HOSPITAL_ADMIN",
            "DEPARTMENT_ADMIN",
            "SUB_DEPARTMENT_ADMIN",
            "BRANCH_ADMIN",
            "SUPER_ADMIN",
        ):
            raise HTTPException(status_code=403, detail="Only clinical staff can manage schedule slots")
        return doctor

    def _parse_date(self, value: str) -> datetime:
        try:
            return datetime.strptime(value.strip()[:10], "%Y-%m-%d")
        except ValueError as exc:
            raise HTTPException(status_code=400, detail="Invalid date. Use YYYY-MM-DD.") from exc

    def _parse_time(self, value: str) -> tuple[int, int]:
        raw = (value or "").strip()
        try:
            parts = raw.split(":")
            hour = int(parts[0])
            minute = int(parts[1]) if len(parts) > 1 else 0
            if hour < 0 or hour > 23 or minute < 0 or minute > 59:
                raise ValueError("out of range")
            return hour, minute
        except (ValueError, IndexError) as exc:
            raise HTTPException(status_code=400, detail="Invalid time. Use HH:MM.") from exc

    def _serialize(self, slot: DoctorAvailabilitySlot) -> dict:
        return {
            "id": slot.id,
            "slotStart": slot.slotStart.isoformat(),
            "slotEnd": slot.slotEnd.isoformat(),
            "isBooked": bool(slot.isBooked),
            "visitId": slot.visitId,
            "label": slot.slotStart.strftime("%I:%M %p").lstrip("0"),
        }

    def list_slots(self, user: dict, from_date: str, to_date: str) -> dict:
        doctor = self._doctor(user)
        start = self._parse_date(from_date).replace(hour=0, minute=0, second=0, microsecond=0)
        end_day = self._parse_date(to_date).replace(hour=0, minute=0, second=0, microsecond=0)
        if end_day < start:
            raise HTTPException(status_code=400, detail="to date must be on or after from date")
        end = end_day + timedelta(days=1)
        rows = (
            self.db.query(DoctorAvailabilitySlot)
            .filter(
                DoctorAvailabilitySlot.doctorId == doctor.id,
                DoctorAvailabilitySlot.slotStart >= start,
                DoctorAvailabilitySlot.slotStart < end,
            )
            .order_by(DoctorAvailabilitySlot.slotStart)
            .all()
        )
        return {"items": [self._serialize(s) for s in rows]}

    def create_slots(
        self,
        user: dict,
        *,
        from_date: str | None = None,
        to_date: str | None = None,
        date: str | None = None,
        start_time: str,
        end_time: str,
        slot_minutes: int = 30,
        weekdays: list[int] | None = None,
    ) -> dict:
        doctor = self._doctor(user)
        if slot_minutes < 5 or slot_minutes > 240:
            raise HTTPException(status_code=400, detail="slotMinutes must be between 5 and 240")

        if date:
            start_day = self._parse_date(date)
            end_day = start_day
        else:
            if not from_date or not to_date:
                raise HTTPException(status_code=400, detail="fromDate and toDate (or date) are required")
            start_day = self._parse_date(from_date)
            end_day = self._parse_date(to_date)
        if end_day < start_day:
            raise HTTPException(status_code=400, detail="toDate must be on or after fromDate")

        sh, sm = self._parse_time(start_time)
        eh, em = self._parse_time(end_time)
        day_start_offset = timedelta(hours=sh, minutes=sm)
        day_end_offset = timedelta(hours=eh, minutes=em)
        if day_end_offset <= day_start_offset:
            raise HTTPException(status_code=400, detail="endTime must be after startTime")

        allowed = set(weekdays) if weekdays is not None else DEFAULT_WEEKDAYS
        for d in allowed:
            if d < 0 or d > 6:
                raise HTTPException(status_code=400, detail="weekdays must be 0 (Mon) through 6 (Sun)")

        created: list[DoctorAvailabilitySlot] = []
        skipped = 0
        cursor_day = start_day.replace(hour=0, minute=0, second=0, microsecond=0)
        last_day = end_day.replace(hour=0, minute=0, second=0, microsecond=0)
        now = now_ist()

        while cursor_day <= last_day:
            if cursor_day.weekday() in allowed:
                slot_start = cursor_day + day_start_offset
                window_end = cursor_day + day_end_offset
                while slot_start + timedelta(minutes=slot_minutes) <= window_end:
                    slot_end = slot_start + timedelta(minutes=slot_minutes)
                    if slot_start <= now:
                        skipped += 1
                        slot_start = slot_end
                        continue
                    exists = (
                        self.db.query(DoctorAvailabilitySlot)
                        .filter(
                            DoctorAvailabilitySlot.doctorId == doctor.id,
                            DoctorAvailabilitySlot.slotStart == slot_start,
                        )
                        .first()
                    )
                    if exists:
                        skipped += 1
                    else:
                        row = DoctorAvailabilitySlot(
                            doctorId=doctor.id,
                            slotStart=slot_start,
                            slotEnd=slot_end,
                            isBooked=False,
                        )
                        self.db.add(row)
                        created.append(row)
                    slot_start = slot_end
            cursor_day += timedelta(days=1)

        self.db.commit()
        for row in created:
            self.db.refresh(row)
        return {
            "created": len(created),
            "skipped": skipped,
            "items": [self._serialize(s) for s in created],
        }

    def delete_slot(self, user: dict, slot_id: str) -> dict:
        doctor = self._doctor(user)
        slot = self.db.get(DoctorAvailabilitySlot, slot_id)
        if not slot or slot.doctorId != doctor.id:
            raise HTTPException(status_code=404, detail="Slot not found")
        if slot.isBooked:
            raise HTTPException(
                status_code=400,
                detail="Cannot delete a booked slot. Reject the visit first to free it.",
            )
        self.db.delete(slot)
        self.db.commit()
        return {"id": slot_id, "deleted": True}
