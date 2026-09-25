"""Process doctor WhatsApp YES/NO reply (PyWhatKit cannot receive inbound automatically)."""
from __future__ import annotations

import argparse
import sys

from sqlalchemy import text

from app.database import SessionLocal
from app.services.messaging_service import SmsService
from app.services.visit_approval_reply_service import VisitApprovalReplyService

DOCTOR_PHONE = "6379983352"


def latest_pending_code(db, doctor_phone: str) -> str | None:
    row = (
        db.execute(
            text(
                """
                SELECT v.smsApprovalCode
                FROM Visit v
                JOIN User u ON v.staffId = u.id
                WHERE u.phone = :phone
                  AND v.status = 'REQUEST_SENT'
                  AND v.smsApprovalCode IS NOT NULL
                ORDER BY v.createdAt DESC
                LIMIT 1
                """
            ),
            {"phone": doctor_phone},
        )
        .mappings()
        .first()
    )
    return row["smsApprovalCode"] if row else None


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Approve/reject when doctor replies YES {code} or NO {code} on WhatsApp"
    )
    parser.add_argument(
        "reply",
        nargs="?",
        help='Doctor reply text, e.g. "YES 482901" or "NO 482901"',
    )
    parser.add_argument(
        "--doctor",
        default=DOCTOR_PHONE,
        help="Doctor phone (default: Mohan Gola Agra)",
    )
    parser.add_argument(
        "--latest",
        action="store_true",
        help="Use latest pending code and approve with YES {code}",
    )
    args = parser.parse_args()

    db = SessionLocal()
    try:
        body = args.reply
        if args.latest:
            code = latest_pending_code(db, args.doctor)
            if not code:
                raise SystemExit("No pending appointment for this doctor.")
            body = f"YES {code}"
            print(f"Latest pending code: {code}")

        if not body:
            print("Paste doctor WhatsApp reply (e.g. YES 482901):")
            body = sys.stdin.readline().strip()
        if not body:
            raise SystemExit("Reply text required.")

        print(f"Processing reply from +91{args.doctor}: {body}")
        result = VisitApprovalReplyService(db).handle_reply(
            from_phone=args.doctor,
            body=body,
        )
        print(f"Result: {result}")

        if "Approved" in result:
            try:
                SmsService().send_message(
                    args.doctor,
                    f"Connitor: {result}",
                )
            except Exception as exc:
                print(f"(Could not send WhatsApp confirmation to doctor: {exc})")
    finally:
        db.close()


if __name__ == "__main__":
    main()
