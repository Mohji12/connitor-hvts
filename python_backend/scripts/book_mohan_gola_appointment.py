"""Book appointment: visitor 8625877312 -> Dr. Mohan Gola Agra (SMS approval link to doctor)."""
from __future__ import annotations

from datetime import timedelta

from sqlalchemy import text

from app.config import get_doctor_approval_link_url, get_settings
from app.database import SessionLocal
from app.services.appointments_service import AppointmentsService
from app.utils.timezone import now_ist

VISITOR_PHONE = "8625877312"
VISITOR_EMAIL = "mohangola2202@gmail.com"
VISITOR_FIRST = "Mohan"
VISITOR_LAST = "Gola"
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
                    WHERE (phone = :phone OR name = 'Mohan Gola Agra')
                      AND role = 'STAFF' AND userType = 'DOCTOR'
                    LIMIT 1
                    """
                ),
                {"phone": DOCTOR_PHONE},
            )
            .mappings()
            .first()
        )
        if not doctor:
            raise SystemExit("Doctor Mohan Gola Agra not found")

        appt_date = (now_ist() + timedelta(days=1)).replace(hour=15, minute=0, second=0, microsecond=0)

        payload = {
            "branchId": doctor["branchId"],
            "departmentId": doctor["departmentId"],
            "subDepartmentId": doctor["subDepartmentId"],
            "doctorId": doctor["id"],
            "firstName": VISITOR_FIRST,
            "lastName": VISITOR_LAST,
            "phone": VISITOR_PHONE,
            "email": VISITOR_EMAIL,
            "appointmentDate": appt_date.isoformat(),
            "purpose": "General consultation",
            "appointmentMode": "IN_PERSON",
        }

        print("Doctor:", doctor["name"], "| SMS to:", doctor["phone"])
        print("Visitor:", VISITOR_FIRST, VISITOR_LAST, "|", VISITOR_PHONE, "|", VISITOR_EMAIL)
        print("Appointment:", appt_date.isoformat())
        print("Approval link base:", get_doctor_approval_link_url(get_settings()))

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
        print("\nDoctor should receive SMS with approval link on +91", DOCTOR_PHONE)
    finally:
        db.close()


if __name__ == "__main__":
    main()
