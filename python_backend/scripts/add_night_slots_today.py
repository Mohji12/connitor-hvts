"""Add night availability slots for a doctor on today (IST)."""
from __future__ import annotations

import argparse
import uuid
from datetime import timedelta

from app.database import SessionLocal
from app.models import DoctorAvailabilitySlot, User
from app.utils.timezone import now_ist

MOHAN_GOLA_AGRA_ID = "a7176820-28aa-4e17-90f9-f8e5d979c710"
SLOT_MINUTES = 30


def add_night_slots(
    *,
    doctor_id: str,
    night_start_hour: int = 19,
    night_start_minute: int = 0,
    night_end_hour: int = 23,
    night_end_minute: int = 30,
    days_ahead: int = 1,
) -> list[tuple]:
    db = SessionLocal()
    try:
        doctor = db.get(User, doctor_id)
        if not doctor:
            doctor = (
                db.query(User)
                .filter(User.name.ilike("%Mohan Gola%"), User.userType == "DOCTOR")
                .first()
            )
        if not doctor:
            raise SystemExit(f"Doctor not found: {doctor_id}")

        now = now_ist()
        today = now.replace(hour=0, minute=0, second=0, microsecond=0)
        created: list[tuple] = []

        for offset in range(days_ahead):
            day = today + timedelta(days=offset)
            if day.weekday() == 6:
                continue
            cursor = day.replace(
                hour=night_start_hour, minute=night_start_minute, second=0, microsecond=0
            )
            window_end = day.replace(
                hour=night_end_hour, minute=night_end_minute, second=0, microsecond=0
            )

            while cursor + timedelta(minutes=SLOT_MINUTES) <= window_end:
                slot_end = cursor + timedelta(minutes=SLOT_MINUTES)
                if cursor <= now:
                    cursor = slot_end
                    continue
                exists = (
                    db.query(DoctorAvailabilitySlot)
                    .filter(
                        DoctorAvailabilitySlot.doctorId == doctor.id,
                        DoctorAvailabilitySlot.slotStart == cursor,
                    )
                    .first()
                )
                if not exists:
                    db.add(
                        DoctorAvailabilitySlot(
                            id=str(uuid.uuid4()),
                            doctorId=doctor.id,
                            slotStart=cursor,
                            slotEnd=slot_end,
                            isBooked=False,
                        )
                    )
                    created.append((cursor, slot_end))
                cursor = slot_end

        db.commit()
        print(f"Added {len(created)} night slot(s) for {doctor.name}:")
        for start, end in created:
            print(
                f"  {start.strftime('%d %b %Y %I:%M %p')} - {end.strftime('%I:%M %p')} IST"
            )
        return created
    finally:
        db.close()


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--doctor-id", default=MOHAN_GOLA_AGRA_ID)
    parser.add_argument("--night-start", type=int, default=19, help="Start hour (24h IST)")
    parser.add_argument("--night-end-hour", type=int, default=23, help="End hour (24h IST)")
    parser.add_argument(
        "--night-end-minute",
        type=int,
        default=30,
        help="End minute (24h IST); last slot ends at this time (default 11:30 PM)",
    )
    parser.add_argument("--days", type=int, default=14, help="Days ahead to seed (default 14)")
    args = parser.parse_args()
    add_night_slots(
        doctor_id=args.doctor_id,
        night_start_hour=args.night_start,
        night_end_hour=args.night_end_hour,
        night_end_minute=args.night_end_minute,
        days_ahead=args.days,
    )


if __name__ == "__main__":
    main()
