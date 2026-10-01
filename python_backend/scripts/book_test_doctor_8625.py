"""Book visit: notifications to doctor on 8625877312 (WapBlaster/WhatsApp/email)."""
from __future__ import annotations

import random
from datetime import timedelta

from sqlalchemy import text

from app.config import get_doctor_approval_link_url, get_settings
from app.database import SessionLocal
from app.services.appointments_service import AppointmentsService
from app.utils.timezone import now_ist

DOCTOR_PHONE = "8625877312"


def main() -> None:
    db = SessionLocal()
    try:
        doctor = (
            db.execute(
                text(
                    """
                    SELECT id, name, phone, email, branchId, departmentId, subDepartmentId
                    FROM User
                    WHERE role = 'STAFF'
                      AND userType = 'DOCTOR'
                      AND (
                        phone = :phone
                        OR phone = :phone91
                        OR REPLACE(REPLACE(phone, '+', ''), ' ', '') LIKE :digits
                      )
                    LIMIT 1
                    """
                ),
                {
                    "phone": DOCTOR_PHONE,
                    "phone91": f"91{DOCTOR_PHONE}",
                    "digits": f"%{DOCTOR_PHONE}",
                },
            )
            .mappings()
            .first()
        )
        if not doctor:
            raise SystemExit(
                f"No STAFF doctor found with phone {DOCTOR_PHONE}. "
                "Update User.phone for a doctor in the DB first."
            )

        visitor_phone = f"9{random.randint(100000000, 999999999)}"
        appt_date = (now_ist() + timedelta(days=1)).replace(
            hour=16, minute=30, second=0, microsecond=0
        )

        payload = {
            "branchId": doctor["branchId"],
            "departmentId": doctor["departmentId"],
            "subDepartmentId": doctor["subDepartmentId"],
            "doctorId": doctor["id"],
            "firstName": "Test",
            "lastName": "Visitor",
            "phone": visitor_phone,
            "email": f"test.visitor.{visitor_phone}@example.com",
            "appointmentDate": appt_date.isoformat(),
            "purpose": "WhatsApp approval flow test",
            "appointmentMode": "IN_PERSON",
        }

        print("=== Booking visit ===")
        print("Doctor:", doctor["name"], "| phone:", doctor["phone"])
        print("Visitor:", payload["firstName"], payload["lastName"], "|", visitor_phone)
        print("Appointment:", appt_date.isoformat())
        print("Approval base URL:", get_doctor_approval_link_url(get_settings()))

        result = AppointmentsService(db).book_appointment(payload)

        visit_row = (
            db.execute(
                text(
                    """
                    SELECT id, status, smsApprovalCode, staffPhone
                    FROM Visit WHERE id = :id
                    """
                ),
                {"id": result["bookingId"]},
            )
            .mappings()
            .first()
        )

        print("\n=== Success ===")
        print("bookingId:", result["bookingId"])
        print("status:", result["status"])
        print("doctorName:", result.get("doctorName"))
        print("smsApprovalCode:", visit_row["smsApprovalCode"] if visit_row else None)
        print("Doctor notify phone:", visit_row["staffPhone"] if visit_row else doctor["phone"])
        code = visit_row["smsApprovalCode"] if visit_row else ""
        print(f"\nDoctor (+91{DOCTOR_PHONE}): check WhatsApp/email for approval_doctor template.")
        print(f"To approve via API test: POST /api/webhooks/whatsapp/reply with CONFIRM {code}")
    finally:
        db.close()


if __name__ == "__main__":
    main()
