"""
Delete all visitor-related rows: branch visitors, visits, and pre-registration accounts.

Order: notifications → visit links → slot bookings → visits → delivery visitor logs
→ branch visitors → visitor account children → visitor accounts.

Usage:
  python scripts/clear_all_visitors.py --yes
"""
from __future__ import annotations

import argparse

from sqlalchemy import text

from app.database import SessionLocal


def clear_all(dry_run: bool) -> None:
    db = SessionLocal()
    try:
        visitor_count = db.execute(text("SELECT COUNT(*) FROM Visitor")).scalar() or 0
        visit_count = db.execute(text("SELECT COUNT(*) FROM Visit")).scalar() or 0
        account_count = db.execute(text("SELECT COUNT(*) FROM VisitorAccount")).scalar() or 0
        print(
            f"Before: Visitor={visitor_count}, Visit={visit_count}, "
            f"VisitorAccount={account_count}"
        )

        if dry_run:
            print("Dry run — no changes made.")
            return

        notif_deleted = db.execute(
            text("DELETE FROM Notification WHERE visitId IS NOT NULL")
        ).rowcount
        visit_links_deleted = db.execute(text("DELETE FROM VisitDeliveryLink")).rowcount
        slots_reset = db.execute(
            text(
                """
                UPDATE DoctorAvailabilitySlot
                SET isBooked = 0, visitId = NULL
                WHERE visitId IS NOT NULL OR isBooked = 1
                """
            )
        ).rowcount
        visits_deleted = db.execute(text("DELETE FROM Visit")).rowcount
        delivery_logs_deleted = db.execute(text("DELETE FROM DeliveryVisitorLog")).rowcount
        visitors_deleted = db.execute(text("DELETE FROM Visitor")).rowcount

        email_tokens_deleted = db.execute(text("DELETE FROM EmailVerificationToken")).rowcount
        audit_deleted = db.execute(text("DELETE FROM VisitorAccountAuditLog")).rowcount
        docs_deleted = db.execute(text("DELETE FROM VisitorAccountDocument")).rowcount
        auth_deleted = db.execute(text("DELETE FROM VisitorAccountAuth")).rowcount
        accounts_deleted = db.execute(text("DELETE FROM VisitorAccount")).rowcount

        db.commit()

        remaining_visitors = db.execute(text("SELECT COUNT(*) FROM Visitor")).scalar() or 0
        remaining_accounts = db.execute(text("SELECT COUNT(*) FROM VisitorAccount")).scalar() or 0
        print(
            f"Deleted: {notif_deleted} notification(s), "
            f"{visit_links_deleted} visit link(s), "
            f"reset {slots_reset} slot(s), "
            f"{visits_deleted} visit(s), "
            f"{delivery_logs_deleted} delivery log(s), "
            f"{visitors_deleted} branch visitor(s), "
            f"{accounts_deleted} visitor account(s) "
            f"(auth={auth_deleted}, docs={docs_deleted}, audit={audit_deleted}, "
            f"email_tokens={email_tokens_deleted})."
        )
        print(f"After: Visitor={remaining_visitors}, VisitorAccount={remaining_accounts}")
        if remaining_visitors != 0 or remaining_accounts != 0:
            raise RuntimeError("Visitor data is not empty after cleanup.")
        print("All visitor data cleared successfully.")
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--yes", action="store_true")
    args = parser.parse_args()
    if not args.dry_run and not args.yes:
        parser.error("Pass --dry-run or --yes to confirm")
    clear_all(args.dry_run)


if __name__ == "__main__":
    main()
