"""Book appointment + doctor WhatsApp approval flow (PyWhatKit outbound)."""
from __future__ import annotations

import argparse
import sys
from datetime import timedelta

from sqlalchemy import text

from app.database import SessionLocal
from app.services.appointments_service import AppointmentsService
from app.services.visit_approval_reply_service import VisitApprovalReplyService
from app.utils.timezone import now_ist

VISITOR_PHONE = "8625877312"
DOCTOR_PHONE = "6379983352"


def book(db) -> dict:
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
        raise SystemExit(f"Doctor {DOCTOR_PHONE} not found")

    visitor = (
        db.execute(
            text("SELECT firstName, lastName, email FROM Visitor WHERE phone = :phone"),
            {"phone": VISITOR_PHONE},
        )
        .mappings()
        .first()
    )

    appt_date = (now_ist() + timedelta(days=1)).replace(hour=14, minute=0, second=0, microsecond=0)
    payload = {
        "branchId": doctor["branchId"],
        "departmentId": doctor["departmentId"],
        "subDepartmentId": doctor["subDepartmentId"],
        "doctorId": doctor["id"],
        "firstName": visitor["firstName"] if visitor else "Mohan",
        "lastName": visitor["lastName"] if visitor else "Gola",
        "phone": VISITOR_PHONE,
        "email": (visitor["email"] if visitor and visitor["email"] else "mohan.gola.test@example.com"),
        "appointmentDate": appt_date.isoformat(),
        "purpose": "In-person consultation",
        "appointmentMode": "IN_PERSON",
    }

    print("=== Booking appointment ===")
    print(f"Visitor: +91{VISITOR_PHONE}")
    print(f"Doctor:  {doctor['name']} (+91{DOCTOR_PHONE})")
    print(f"Time:    {appt_date.isoformat()}")
    print("Sending WhatsApp to doctor via PyWhatKit (8625877312 session)...")
    sys.stdout.flush()

    result = AppointmentsService(db).book_appointment(payload)
    visit = (
        db.execute(
            text("SELECT smsApprovalCode, status FROM Visit WHERE id = :id"),
            {"id": result["bookingId"]},
        )
        .mappings()
        .first()
    )
    code = visit["smsApprovalCode"] if visit else None
    print("\n=== Booked ===")
    print(f"bookingId: {result['bookingId']}")
    print(f"status:    {result['status']}")
    print(f"code:      {code}")
    print(f"\nDoctor: reply on WhatsApp to +918625877312 with: YES {code}")
    return {"booking_id": result["bookingId"], "code": code, "doctor_phone": DOCTOR_PHONE}


def approve(db, *, code: str) -> None:
    print("\n=== Simulating doctor WhatsApp reply ===")
    print(f"Processing YES {code} from +91{DOCTOR_PHONE}...")
    reply = VisitApprovalReplyService(db).handle_reply(
        from_phone=DOCTOR_PHONE,
        body=f"YES {code}",
    )
    print(f"Result: {reply}")

    visit = (
        db.execute(
            text(
                """
                SELECT v.status, v.visitCode, vis.phone
                FROM Visit v
                JOIN Visitor vis ON v.visitorId = vis.id
                WHERE v.smsApprovalCode = :code OR v.status = 'APPROVED'
                ORDER BY v.createdAt DESC LIMIT 1
                """
            ),
            {"code": code},
        )
        .mappings()
        .first()
    )
    if visit:
        print(f"Visit status: {visit['status']}")
        if visit.get("visitCode"):
            print(f"Visitor check-in OTP sent via WhatsApp to +91{visit['phone']}")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--approve-only", action="store_true", help="Skip booking; approve with --code")
    parser.add_argument("--code", help="Approval code for --approve-only")
    args = parser.parse_args()

    db = SessionLocal()
    try:
        if args.approve_only:
            if not args.code:
                raise SystemExit("--code required with --approve-only")
            approve(db, code=args.code)
            return

        info = book(db)
        print(
            "\nWhen doctor replies YES {code} on WhatsApp, run:\n"
            f"  python scripts/approve_from_whatsapp.py \"YES {info.get('code')}\""
            "\n  — or —\n"
            "  python scripts/approve_from_whatsapp.py --latest"
        )
    finally:
        db.close()


if __name__ == "__main__":
    main()
