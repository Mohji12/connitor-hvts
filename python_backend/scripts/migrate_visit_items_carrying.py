"""Add Visit.itemsCarrying. Idempotent.

Usage:
  python scripts/migrate_visit_items_carrying.py --dry-run
  python scripts/migrate_visit_items_carrying.py --yes
"""
from __future__ import annotations

import argparse

from sqlalchemy import text

from app.database import engine
from app.utils.timezone import now_ist

MIGRATION_ID = "2026-10-04_visit_items_carrying"


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


def column_exists(conn) -> bool:
    rows = conn.execute(text("SHOW COLUMNS FROM `Visit` LIKE 'itemsCarrying'")).fetchall()
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
        if column_exists(conn):
            print("Visit.itemsCarrying already exists.")
            return
        print("ADD Visit.itemsCarrying")
        if args.dry_run:
            return
        conn.execute(text("ALTER TABLE `Visit` ADD COLUMN `itemsCarrying` VARCHAR(500) NULL"))
        conn.execute(
            text(
                "INSERT INTO SchemaMigration (id, appliedAt, notes) VALUES (:id, :at, :notes)"
            ),
            {
                "id": MIGRATION_ID,
                "at": now_ist(),
                "notes": "Visitor booking records what they are carrying",
            },
        )
        print("Applied.")


if __name__ == "__main__":
    main()
