"""
Seed availability slots for Dr. Mohan Gola Agra (and optionally other doctors).

Usage:
  python scripts/seed_doctor_slots.py --yes
  python scripts/seed_doctor_slots.py --yes --doctor-name "Mohan Gola Agra"
"""
from __future__ import annotations

import argparse
import uuid
from datetime import datetime, timedelta

from app.database import SessionLocal
from app.models import DoctorAvailabilitySlot, User
from app.utils.timezone import now_ist

MOHAN_GOLA_AGRA_ID = "a7176820-28aa-4e17-90f9-f8e5d979c710"

# Morning 09:00–12:00 and afternoon 14:00–17:00 IST, 30-minute slots
SLOT_WINDOWS = [
    (9, 0, 12, 0),
    (14, 0, 17, 0),
]
SLOT_MINUTES = 30
DAYS_AHEAD = 14


def _slot_times_for_day(day: datetime) -> list[tuple[datetime, datetime]]:
    slots: list[tuple[datetime, datetime]] = []
    for start_h, start_m, end_h, end_m in SLOT_WINDOWS:
        cursor = day.replace(hour=start_h, minute=start_m, second=0, microsecond=0)
        window_end = day.replace(hour=end_h, minute=end_m, second=0, microsecond=0)
        while cursor + timedelta(minutes=SLOT_MINUTES) <= window_end:
            slot_end = cursor + timedelta(minutes=SLOT_MINUTES)
            slots.append((cursor, slot_end))
            cursor = slot_end
    return slots


def seed_for_doctor(db, doctor: User, *, days_ahead: int = DAYS_AHEAD) -> int:
    today = now_ist().replace(hour=0, minute=0, second=0, microsecond=0)
    created = 0
    for offset in range(days_ahead):
        day = today + timedelta(days=offset)
        for slot_start, slot_end in _slot_times_for_day(day):
            if slot_start <= now_ist():
                continue
            exists = (
                db.query(DoctorAvailabilitySlot)
                .filter(
                    DoctorAvailabilitySlot.doctorId == doctor.id,
                    DoctorAvailabilitySlot.slotStart == slot_start,
                )
                .first()
            )
            if exists:
                continue
            db.add(
                DoctorAvailabilitySlot(
                    id=str(uuid.uuid4()),
                    doctorId=doctor.id,
                    slotStart=slot_start,
                    slotEnd=slot_end,
                    isBooked=False,
                )
            )
            created += 1
    return created


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--yes", action="store_true")
    parser.add_argument("--doctor-name", default="Mohan Gola Agra")
    parser.add_argument("--doctor-id", default=MOHAN_GOLA_AGRA_ID)
    parser.add_argument("--days", type=int, default=DAYS_AHEAD)
    args = parser.parse_args()
    if not args.yes:
        parser.error("Pass --yes to seed slots")

    db = SessionLocal()
    try:
        doctor = db.get(User, args.doctor_id)
        if not doctor:
            doctor = (
                db.query(User)
                .filter(User.name.ilike(f"%{args.doctor_name}%"), User.userType == "DOCTOR")
                .first()
            )
        if not doctor:
            print(f"Doctor not found: {args.doctor_name}")
            return

        count = seed_for_doctor(db, doctor, days_ahead=args.days)
        db.commit()
        print(f"Seeded {count} new slots for {doctor.name} ({doctor.id}) over next {args.days} days.")
    finally:
        db.close()


if __name__ == "__main__":
    main()
