"""SlotWaitlist table for "notify me when slots open". Idempotent.

Usage:
  python scripts/migrate_slot_waitlist.py --dry-run
  python scripts/migrate_slot_waitlist.py --yes
"""
from __future__ import annotations

import argparse

from sqlalchemy import text

from app.database import engine
from app.utils.timezone import now_ist

MIGRATION_ID = "2026-10-15_slot_waitlist"


def ensure_migration_table(conn) -> None:
    conn.execute(
        text(
            """
            CREATE TABLE IF NOT EXISTS SchemaMigration (
                id VARCHAR(64) PRIMARY KEY,
                appliedAt DATETIME(3) NOT NULL,
                notes TEXT NULL
            )
            """
        )
    )


def table_exists(conn, name: str) -> bool:
    rows = conn.execute(text("SHOW TABLES LIKE :name"), {"name": name}).fetchall()
    return len(rows) > 0


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--yes", action="store_true")
    args = parser.parse_args()
    if not args.dry_run and not args.yes:
        print("Pass --yes to apply, or --dry-run to preview.")
        return
    with engine.begin() as conn:
        ensure_migration_table(conn)
        if table_exists(conn, "SlotWaitlist"):
            print("SlotWaitlist table already exists.")
            return
        statement = """
            CREATE TABLE SlotWaitlist (
                id VARCHAR(36) PRIMARY KEY,
                visitorAccountId VARCHAR(36) NOT NULL,
                doctorId VARCHAR(36) NOT NULL,
                date DATE NOT NULL,
                createdAt DATETIME NOT NULL,
                notifiedAt DATETIME NULL,
                UNIQUE KEY SlotWaitlist_visitor_doctor_date (visitorAccountId, doctorId, date),
                KEY SlotWaitlist_doctor_date (doctorId, date),
                CONSTRAINT SlotWaitlist_account_fk FOREIGN KEY (visitorAccountId)
                    REFERENCES VisitorAccount(id),
                CONSTRAINT SlotWaitlist_doctor_fk FOREIGN KEY (doctorId) REFERENCES User(id)
            )
        """
        print("CREATE TABLE SlotWaitlist")
        if args.dry_run:
            return
        conn.execute(text(statement))
        conn.execute(
            text("INSERT INTO SchemaMigration (id, appliedAt, notes) VALUES (:id, :at, :notes)"),
            {
                "id": MIGRATION_ID,
                "at": now_ist(),
                "notes": "Visitors waiting for doctor slots on a date, notified on WhatsApp",
            },
        )
        print("Applied.")


if __name__ == "__main__":
    main()
