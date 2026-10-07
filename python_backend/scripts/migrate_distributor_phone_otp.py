"""
Require distributors to verify a WhatsApp OTP before password login.

Existing users stay verified (column default true). New applications set it false.

Usage:
  python scripts/migrate_distributor_phone_otp.py --dry-run
  python scripts/migrate_distributor_phone_otp.py --yes
"""
from __future__ import annotations

import argparse

from sqlalchemy import inspect, text

from app.database import engine
from app.utils.timezone import now_ist

MIGRATION_ID = "2026-10-06_distributor_phone_otp"


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


def column_exists(table: str, column: str) -> bool:
    cols = [c["name"] for c in inspect(engine).get_columns(table)]
    return column in cols


def run(dry_run: bool = False) -> None:
    with engine.begin() as conn:
        ensure_migration_table(conn)
        if migration_applied(conn):
            print("Migration already applied.")
            return
        if dry_run:
            print("Would add User.phoneVerified")
            return
        if not column_exists("User", "phoneVerified"):
            conn.execute(
                text("ALTER TABLE User ADD COLUMN phoneVerified TINYINT(1) NOT NULL DEFAULT 1")
            )
            print("Added User.phoneVerified")
        conn.execute(
            text("INSERT INTO SchemaMigration (id, appliedAt, notes) VALUES (:id, :at, :notes)"),
            {
                "id": MIGRATION_ID,
                "at": now_ist(),
                "notes": "Distributor WhatsApp phone OTP before login",
            },
        )
        print("Migration recorded.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--yes", action="store_true")
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()
    if not args.yes and not args.dry_run:
        print("Pass --yes or --dry-run")
        raise SystemExit(1)
    run(dry_run=args.dry_run)
