"""Add doctor + delivery slots for today from now until 11:59 PM IST."""
from __future__ import annotations

import argparse
import uuid
from datetime import timedelta

from app.constants.electronic_city_entities import DOCTOR_ID, ELECTRONIC_CITY_BRANCH_ID
from app.database import SessionLocal
from app.models import DoctorAvailabilitySlot, User
from app.models.delivery_entities import BranchDeliverySlot
from app.utils.timezone import now_ist

DOCTOR_SLOT_MIN = 30
DELIVERY_SLOT_MIN = 60


def round_up_to_minutes(dt, minutes: int):
    from datetime import datetime

    base = dt.replace(second=0, microsecond=0)
    remainder = base.minute % minutes
    if remainder == 0 and dt.second == 0 and dt.microsecond == 0 and dt == base:
        return base
    add = (minutes - remainder) % minutes
    if add == 0:
        add = minutes
    return base + timedelta(minutes=add)


def run(*, doctor_id: str, branch_id: str) -> None:
    db = SessionLocal()
    try:
        now = now_ist()
        today = now.replace(hour=0, minute=0, second=0, microsecond=0)
        day_end = today.replace(hour=23, minute=59, second=0, microsecond=0)

        doctor = db.get(User, doctor_id)
        if not doctor:
            doctor = (
                db.query(User)
                .filter(User.name.ilike("%Mohan Gola%"), User.userType == "DOCTOR")
                .first()
            )
        if not doctor:
            raise SystemExit(f"Doctor not found: {doctor_id}")

        cursor = round_up_to_minutes(now, DOCTOR_SLOT_MIN)
        if cursor <= now:
            cursor += timedelta(minutes=DOCTOR_SLOT_MIN)

        doc_created = 0
        while cursor + timedelta(minutes=DOCTOR_SLOT_MIN) <= day_end + timedelta(minutes=1):
            slot_end = cursor + timedelta(minutes=DOCTOR_SLOT_MIN)
            exists = (
                db.query(DoctorAvailabilitySlot)
                .filter(
                    DoctorAvailabilitySlot.doctorId == doctor.id,
                    DoctorAvailabilitySlot.slotStart == cursor,
                )
                .first()
            )
            if not exists and cursor > now:
                db.add(
                    DoctorAvailabilitySlot(
                        id=str(uuid.uuid4()),
                        doctorId=doctor.id,
                        slotStart=cursor,
                        slotEnd=slot_end,
                        isBooked=False,
                    )
                )
                doc_created += 1
                print(
                    f"Doctor slot: {cursor.strftime('%I:%M %p')} - "
                    f"{slot_end.strftime('%I:%M %p')} IST"
                )
            cursor = slot_end

        d_cursor = round_up_to_minutes(now, DELIVERY_SLOT_MIN)
        if d_cursor <= now:
            d_cursor += timedelta(minutes=DELIVERY_SLOT_MIN)

        del_created = 0
        while d_cursor + timedelta(minutes=DELIVERY_SLOT_MIN) <= day_end + timedelta(minutes=1):
            slot_end = d_cursor + timedelta(minutes=DELIVERY_SLOT_MIN)
            exists = (
                db.query(BranchDeliverySlot)
                .filter(
                    BranchDeliverySlot.branchId == branch_id,
                    BranchDeliverySlot.slotStart == d_cursor,
                )
                .first()
            )
            if not exists and d_cursor > now:
                db.add(
                    BranchDeliverySlot(
                        branchId=branch_id,
                        slotStart=d_cursor,
                        slotEnd=slot_end,
                        maxDeliveries=2,
                        bookedCount=0,
                        isActive=True,
                    )
                )
                del_created += 1
                print(
                    f"Delivery slot: {d_cursor.strftime('%I:%M %p')} - "
                    f"{slot_end.strftime('%I:%M %p')} IST"
                )
            d_cursor = slot_end

        db.commit()
        print(f"\nAdded {doc_created} doctor slot(s) for {doctor.name}")
        print(f"Added {del_created} delivery slot(s) for branch {branch_id}")
    finally:
        db.close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--doctor-id", default=DOCTOR_ID)
    parser.add_argument("--branch-id", default=ELECTRONIC_CITY_BRANCH_ID)
    args = parser.parse_args()
    run(doctor_id=args.doctor_id, branch_id=args.branch_id)
