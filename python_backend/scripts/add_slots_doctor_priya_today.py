"""Create visit-slot allotment for AI Doctor Priya for today (IST)."""
from __future__ import annotations

from sqlalchemy import text

from app.constants.demo_entities import HOSPITAL_ADMIN_ID
from app.database import SessionLocal
from app.services.visit_slot_allotment_service import VisitSlotAllotmentService
from app.utils.timezone import now_ist


def main() -> None:
    db = SessionLocal()
    try:
        doctor = (
            db.execute(
                text(
                    """
                    SELECT id, name, branchId, departmentId, subDepartmentId
                    FROM User
                    WHERE role = 'STAFF' AND userType = 'DOCTOR'
                      AND (name LIKE '%Priya%' OR id = '11000000-0000-4000-8000-000000000014')
                    ORDER BY name
                    LIMIT 1
                    """
                )
            )
            .mappings()
            .first()
        )
        if not doctor:
            raise SystemExit("Doctor Priya not found in User table.")

        admin = db.execute(
            text("SELECT id, role, branchId FROM User WHERE id = :id"),
            {"id": HOSPITAL_ADMIN_ID},
        ).mappings().first()
        if not admin:
            admin = db.execute(
                text(
                    "SELECT id, role, branchId FROM User WHERE email = 'superadmin@hvts.com' LIMIT 1"
                )
            ).mappings().first()
        if not admin:
            raise SystemExit("No hospital admin user found for allotment.")

        branch_id = doctor["branchId"] or admin["branchId"]
        if not branch_id:
            raise SystemExit("Doctor has no branchId.")

        today = now_ist().strftime("%Y-%m-%d")
        user = {
            "id": admin["id"],
            "role": admin["role"],
            "branchId": branch_id,
        }

        svc = VisitSlotAllotmentService(db)
        try:
            result = svc.create_allotment(
                user,
                branch_id,
                staff_id=doctor["id"],
                allotment_date=today,
                window_start="09:00",
                window_end="17:00",
                slot_count=16,
            )
            print("Created allotment:", result)
        except Exception as exc:
            if "409" in str(exc) or "already exists" in str(exc).lower():
                print("Allotment exists for today 09:00 — listing slots instead.")
            else:
                raise

        slots = db.execute(
            text(
                """
                SELECT id, slotStart, slotEnd, isBooked
                FROM DoctorAvailabilitySlot
                WHERE doctorId = :doc
                  AND DATE(slotStart) = :day
                ORDER BY slotStart
                """
            ),
            {"doc": doctor["id"], "day": today},
        ).mappings().all()
        print(f"\nDoctor: {doctor['name']} ({doctor['id']})")
        print(f"Branch: {branch_id} | Date: {today}")
        print(f"Available slots today: {len([s for s in slots if not s['isBooked']])} / {len(slots)}")
        for s in slots[:8]:
            print(f"  - {s['slotStart']} - {s['slotEnd']} booked={s['isBooked']}")
        if len(slots) > 8:
            print(f"  ... and {len(slots) - 8} more")
    finally:
        db.close()


if __name__ == "__main__":
    main()
