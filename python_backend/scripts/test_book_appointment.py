"""Book a test appointment: visitor 8625877312 -> doctor 6379983352."""
from __future__ import annotations

from datetime import timedelta

from sqlalchemy import text

from app.database import SessionLocal
from app.services.appointments_service import AppointmentsService
from app.utils.timezone import now_ist

VISITOR_PHONE = "8625877312"
DOCTOR_PHONE = "6379983352"


def main() -> None:
    db = SessionLocal()
    try:
        doctor = (
            db.execute(
                text(
                    """
                    SELECT id, name, phone, branchId, departmentId, subDepartmentId
                    FROM User
                    WHERE phone = :phone AND role = 'STAFF' AND userType = 'DOCTOR'
                    """
                ),
                {"phone": DOCTOR_PHONE},
            )
            .mappings()
            .first()
        )
        if not doctor:
            raise SystemExit(f"Doctor with phone {DOCTOR_PHONE} not found")

        visitor = (
            db.execute(
                text(
                    "SELECT id, firstName, lastName, email, branchId FROM Visitor WHERE phone = :phone"
                ),
                {"phone": VISITOR_PHONE},
            )
            .mappings()
            .first()
        )

        first_name = visitor["firstName"] if visitor else "Mohan"
        last_name = visitor["lastName"] if visitor else "Gola"
        email = visitor["email"] if visitor and visitor["email"] else "mohangola2202@gmail.com"

        appt_date = (now_ist() + timedelta(days=1)).replace(hour=11, minute=0, second=0, microsecond=0)

        payload = {
            "branchId": doctor["branchId"],
            "departmentId": doctor["departmentId"],
            "subDepartmentId": doctor["subDepartmentId"],
            "doctorId": doctor["id"],
            "firstName": first_name,
            "lastName": last_name,
            "phone": VISITOR_PHONE,
            "email": email,
            "appointmentDate": appt_date.isoformat(),
            "purpose": "Test appointment booking",
            "appointmentMode": "IN_PERSON",
        }

        print("Doctor:", doctor["name"], doctor["phone"])
        print("Visitor phone:", VISITOR_PHONE)
        print("Booking payload branch/dept/sub:", payload["branchId"], payload["departmentId"], payload["subDepartmentId"])
        print("Appointment:", appt_date.isoformat())

        result = AppointmentsService(db).book_appointment(payload)

        visit = (
            db.execute(
                text(
                    """
                    SELECT id, status, smsApprovalCode, staffPhone, appointmentDate
                    FROM Visit WHERE id = :id
                    """
                ),
                {"id": result["bookingId"]},
            )
            .mappings()
            .first()
        )

        print("\n=== Booking successful ===")
        print("bookingId:", result["bookingId"])
        print("status:", result["status"])
        print("doctorName:", result["doctorName"])
        print("smsApprovalCode:", visit["smsApprovalCode"] if visit else None)
        print("staffPhone:", visit["staffPhone"] if visit else None)
        print("\nDoctor should receive SMS with YES/NO code on:", DOCTOR_PHONE)
        print("Visitor should receive SMS on:", VISITOR_PHONE)
    finally:
        db.close()


if __name__ == "__main__":
    main()
