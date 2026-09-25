"""
Add smsApprovalCode column to Visit for Twilio SMS doctor approval. Idempotent.

Usage:
  python scripts/migrate_sms_approval_code.py --dry-run
  python scripts/migrate_sms_approval_code.py --yes
"""
from __future__ import annotations

import argparse

from sqlalchemy import text

from app.database import engine
from app.utils.timezone import now_ist

MIGRATION_ID = "2026-06-06_sms_approval_code"

COLUMNS = (
    ("smsApprovalCode", "VARCHAR(6) NULL"),
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


def index_exists(conn, index_name: str) -> bool:
    row = conn.execute(
        text(
            """
            SELECT 1 FROM INFORMATION_SCHEMA.STATISTICS
            WHERE TABLE_SCHEMA = DATABASE()
              AND TABLE_NAME = 'Visit'
              AND INDEX_NAME = :index_name
            """
        ),
        {"index_name": index_name},
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

        index_name = "Visit_smsApprovalCode_idx"
        if not index_exists(conn, index_name):
            sql = f"CREATE INDEX {index_name} ON Visit (smsApprovalCode)"
            print(sql)
            if not dry_run:
                conn.execute(text(sql))
        else:
            print(f"Skip index {index_name} (already exists)")

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
                    "notes": "SMS approval code for Twilio doctor reply workflow",
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
