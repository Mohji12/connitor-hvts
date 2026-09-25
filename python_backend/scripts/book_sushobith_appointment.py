"""Book appointment with Dr. Sushobith and send WhatsApp approval to doctor."""
from __future__ import annotations

from datetime import timedelta

from sqlalchemy import text

from app.database import SessionLocal
from app.services.appointments_service import AppointmentsService
from app.utils.timezone import now_ist

DOCTOR_PHONE = "8884558669"
VISITOR_PHONE = "8625877312"


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
                text("SELECT firstName, lastName, email FROM Visitor WHERE phone = :phone"),
                {"phone": VISITOR_PHONE},
            )
            .mappings()
            .first()
        )

        appt_date = (now_ist() + timedelta(days=1)).replace(
            hour=11, minute=0, second=0, microsecond=0
        )

        payload = {
            "branchId": doctor["branchId"],
            "departmentId": doctor["departmentId"],
            "subDepartmentId": doctor["subDepartmentId"],
            "doctorId": doctor["id"],
            "firstName": visitor["firstName"] if visitor else "Test",
            "lastName": visitor["lastName"] if visitor else "Visitor",
            "phone": VISITOR_PHONE,
            "email": visitor["email"] if visitor and visitor["email"] else "test.visitor@example.com",
            "appointmentDate": appt_date.isoformat(),
            "purpose": "Consultation with Dr. Sushobith",
            "appointmentMode": "IN_PERSON",
        }

        print("Doctor:", doctor["name"], doctor["phone"])
        print("Visitor phone:", VISITOR_PHONE)
        print("Appointment:", appt_date.isoformat())
        print("Sending WhatsApp via PyWhatKit (allow ~40s per message)...")

        result = AppointmentsService(db).book_appointment(payload)

        visit = (
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

        print("\n=== Booking successful ===")
        print("bookingId:", result["bookingId"])
        print("status:", visit["status"] if visit else result["status"])
        print("smsApprovalCode:", visit["smsApprovalCode"] if visit else None)
        print("staffPhone:", visit["staffPhone"] if visit else None)
        print(f"\nDoctor WhatsApp approval sent to {DOCTOR_PHONE}")
        if visit and visit["smsApprovalCode"]:
            code = visit["smsApprovalCode"]
            print(f"Doctor can reply: YES {code} or NO {code}")
        print(
            f"\nDemo UI: /book-appointment/whatsapp-demo"
            f"?bookingId={result['bookingId']}&phone={VISITOR_PHONE}"
        )
    finally:
        db.close()


if __name__ == "__main__":
    main()
