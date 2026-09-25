"""
Add attendant pass gate timing columns. Idempotent.

Usage:
  python scripts/migrate_attendant_pass_gate_times.py --dry-run
  python scripts/migrate_attendant_pass_gate_times.py --yes
"""
from __future__ import annotations

import argparse

from sqlalchemy import text

from app.database import engine
from app.utils.timezone import now_ist

MIGRATION_ID = "2026-07-20_attendant_pass_gate_times"

COLUMNS = [
    ("enteredAt", "DATETIME NULL"),
    ("exitedAt", "DATETIME NULL"),
    ("durationMinutes", "INT NULL"),
]


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


def column_exists(conn, table: str, column: str) -> bool:
    row = conn.execute(
        text(
            """
            SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE()
              AND TABLE_NAME = :table
              AND COLUMN_NAME = :column
            """
        ),
        {"table": table, "column": column},
    ).first()
    return row is not None


def run(dry_run: bool) -> None:
    with engine.begin() as conn:
        ensure_migration_table(conn)
        already_applied = migration_applied(conn)
        if already_applied:
            print(f"Migration {MIGRATION_ID} already recorded; ensuring columns exist.")

        added_any = False
        for column, definition in COLUMNS:
            if column_exists(conn, "AttendantPass", column):
                print(f"Skip AttendantPass.{column} (exists)")
                continue
            sql = f"ALTER TABLE AttendantPass ADD COLUMN {column} {definition}"
            print(sql)
            if not dry_run:
                conn.execute(text(sql))
            added_any = True

        if not dry_run and not already_applied:
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
                    "notes": "AttendantPass entry/exit timing for gate scans",
                },
            )
            print(f"Migration {MIGRATION_ID} applied.")
        elif not dry_run and added_any:
            print(f"Migration {MIGRATION_ID} columns repaired.")
        elif dry_run:
            print("Dry run complete.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--yes", action="store_true")
    args = parser.parse_args()
    if not args.dry_run and not args.yes:
        parser.error("Pass --dry-run or --yes")
    run(args.dry_run)
