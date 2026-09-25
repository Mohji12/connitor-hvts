"""
Add online appointment + Zoom columns to Visit. Idempotent via SchemaMigration ledger.

Usage:
  python scripts/migrate_online_appointments.py --dry-run
  python scripts/migrate_online_appointments.py --yes
"""
from __future__ import annotations

import argparse

from sqlalchemy import text

from app.database import engine
from app.utils.timezone import now_ist

MIGRATION_ID = "2026-06-06_online_appointments"

COLUMNS = (
    ("appointmentMode", "VARCHAR(20) NOT NULL DEFAULT 'IN_PERSON'"),
    ("zoomMeetingId", "VARCHAR(64) NULL"),
    ("zoomJoinUrl", "TEXT NULL"),
    ("zoomStartUrl", "TEXT NULL"),
    ("zoomPassword", "VARCHAR(64) NULL"),
)


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


def migration_applied(conn) -> bool:
    row = conn.execute(
        text("SELECT id FROM SchemaMigration WHERE id = :id"),
        {"id": MIGRATION_ID},
    ).first()
    return row is not None


def column_exists(conn, column: str) -> bool:
    row = conn.execute(
        text(
            """
            SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE()
              AND TABLE_NAME = 'Visit'
              AND COLUMN_NAME = :column
            """
        ),
        {"column": column},
    ).first()
    return row is not None


def run(dry_run: bool) -> None:
    with engine.begin() as conn:
        ensure_migration_table(conn)
        if migration_applied(conn):
            print(f"Migration {MIGRATION_ID} already applied.")
            return

        for name, ddl in COLUMNS:
            if column_exists(conn, name):
                print(f"Skip {name} (already exists)")
                continue
            sql = f"ALTER TABLE Visit ADD COLUMN {name} {ddl}"
            print(sql)
            if not dry_run:
                conn.execute(text(sql))

        if not dry_run:
            conn.execute(
                text(
                    """
                    INSERT INTO SchemaMigration (id, appliedAt, notes)
                    VALUES (:id, :appliedAt, :notes)
                    """
                ),
                {
                    "id": MIGRATION_ID,
                    "appliedAt": now_ist(),
                    "notes": "Online appointments + Zoom meeting fields on Visit",
                },
            )
            print(f"Migration {MIGRATION_ID} applied.")
        else:
            print("Dry run complete — no changes written.")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--yes", action="store_true")
    args = parser.parse_args()
    if not args.dry_run and not args.yes:
        parser.error("Pass --dry-run or --yes")
    run(args.dry_run)


if __name__ == "__main__":
    main()
