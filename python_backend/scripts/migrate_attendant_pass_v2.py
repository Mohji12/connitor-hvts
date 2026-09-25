"""
Attendant visit-pass schema upgrade. Idempotent.

Adds Attendant.email, AttendantPass.qrSignature/expiresAt,
AttendantPassScan.govtIdImageUrl/govtIdType.

Usage:
  python scripts/migrate_attendant_pass_v2.py --dry-run
  python scripts/migrate_attendant_pass_v2.py --yes
"""
from __future__ import annotations

import argparse

from sqlalchemy import inspect, text

from app.database import engine
import app.models  # noqa: F401
import app.models.attendant_entities  # noqa: F401
from app.utils.timezone import now_ist

MIGRATION_ID = "2026-07-16_attendant_visit_pass_v2"


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
    insp = inspect(conn)
    if table not in insp.get_table_names():
        return False
    return column in {c["name"] for c in insp.get_columns(table)}


def add_column_if_missing(conn, table: str, column: str, ddl: str) -> None:
    if column_exists(conn, table, column):
        print(f"Skip {table}.{column} (exists)")
        return
    conn.execute(text(f"ALTER TABLE `{table}` ADD COLUMN {ddl}"))
    print(f"Added {table}.{column}")


def run(*, dry_run: bool) -> None:
    with engine.begin() as conn:
        ensure_migration_table(conn)
        already = migration_applied(conn)

        changes = [
            ("Attendant", "email", "email VARCHAR(255) NULL"),
            ("AttendantPass", "qrSignature", "qrSignature VARCHAR(128) NULL"),
            ("AttendantPass", "expiresAt", "expiresAt DATETIME NULL"),
            ("AttendantPassScan", "govtIdImageUrl", "govtIdImageUrl TEXT NULL"),
            ("AttendantPassScan", "govtIdType", "govtIdType VARCHAR(50) NULL"),
        ]

        if dry_run:
            for table, column, ddl in changes:
                exists = column_exists(conn, table, column)
                print(f"[dry-run] {table}.{column}: {'exists' if exists else f'ADD {ddl}'}")
            if already:
                print(f"[dry-run] SchemaMigration already has {MIGRATION_ID}")
            return

        # Always add any missing columns (safe if migration row was recorded early)
        for table, column, ddl in changes:
            add_column_if_missing(conn, table, column, ddl)

        # Backfill empty emails so column can be treated as required going forward
        if column_exists(conn, "Attendant", "email"):
            conn.execute(
                text(
                    "UPDATE Attendant SET email = CONCAT('attendant+', id, '@placeholder.local') "
                    "WHERE email IS NULL OR email = ''"
                )
            )

        if not already:
            conn.execute(
                text(
                    "INSERT INTO SchemaMigration (id, appliedAt, notes) VALUES (:id, :at, :notes)"
                ),
                {
                    "id": MIGRATION_ID,
                    "at": now_ist(),
                    "notes": "Attendant email + signed QR + gov ID scan fields",
                },
            )
            print(f"Applied {MIGRATION_ID}")
        else:
            print(f"Migration {MIGRATION_ID} already recorded; missing columns (if any) repaired")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--yes", action="store_true")
    args = parser.parse_args()
    if not args.dry_run and not args.yes:
        print("Pass --yes to apply or --dry-run to preview")
    else:
        run(dry_run=args.dry_run)
