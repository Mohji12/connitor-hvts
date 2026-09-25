"""
Add InboundDelivery hold fields for security internal-bypass hold.

Usage:
  python scripts/migrate_delivery_hold.py --dry-run
  python scripts/migrate_delivery_hold.py --yes
"""
from __future__ import annotations

import argparse

from sqlalchemy import inspect, text

from app.database import engine
from app.utils.timezone import now_ist

MIGRATION_ID = "2026-08-06_delivery_security_hold"


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
    cols = [c["name"] for c in inspect(engine).get_columns(table)]
    return column in cols


def table_exists(conn, name: str) -> bool:
    return name in inspect(engine).get_table_names()


def run(dry_run: bool = False) -> None:
    with engine.begin() as conn:
        ensure_migration_table(conn)
        if migration_applied(conn):
            print("Migration already applied.")
            return

        if dry_run:
            print("Would add InboundDelivery holdReason, holdUntil, heldAt, heldById")
            return

        if not table_exists(conn, "InboundDelivery"):
            print("InboundDelivery missing — run migrate_delivery_module.py first")
            return

        alters = [
            ("holdReason", "ALTER TABLE InboundDelivery ADD COLUMN holdReason TEXT NULL"),
            ("holdUntil", "ALTER TABLE InboundDelivery ADD COLUMN holdUntil DATETIME NULL"),
            ("heldAt", "ALTER TABLE InboundDelivery ADD COLUMN heldAt DATETIME NULL"),
            (
                "heldById",
                "ALTER TABLE InboundDelivery ADD COLUMN heldById VARCHAR(36) NULL",
            ),
        ]
        for col, sql in alters:
            if not column_exists(conn, "InboundDelivery", col):
                conn.execute(text(sql))
                print(f"Added InboundDelivery.{col}")

        conn.execute(
            text(
                "INSERT INTO SchemaMigration (id, appliedAt, notes) VALUES (:id, :at, :notes)"
            ),
            {
                "id": MIGRATION_ID,
                "at": now_ist(),
                "notes": "Security delivery hold fields for internal bypass",
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
