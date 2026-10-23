"""Add Visit.relatedDocumentUrl and Visit.relatedDocumentType. Idempotent.

Usage:
  python scripts/migrate_visit_related_document.py --dry-run
  python scripts/migrate_visit_related_document.py --yes
"""
from __future__ import annotations

import argparse

from sqlalchemy import text

from app.database import engine
from app.utils.timezone import now_ist

MIGRATION_ID = "2026-10-23_visit_related_document"

COLUMNS = [
    ("relatedDocumentUrl", "TEXT NULL"),
    ("relatedDocumentType", "VARCHAR(50) NULL"),
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


def column_exists(conn, name: str) -> bool:
    rows = conn.execute(text(f"SHOW COLUMNS FROM `Visit` LIKE '{name}'")).fetchall()
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
        applied = False
        for name, sql_type in COLUMNS:
            if column_exists(conn, name):
                print(f"Visit.{name} already exists.")
                continue
            print(f"ADD Visit.{name} {sql_type}")
            if args.dry_run:
                continue
            conn.execute(text(f"ALTER TABLE `Visit` ADD COLUMN `{name}` {sql_type}"))
            applied = True
        if applied:
            conn.execute(
                text(
                    "INSERT INTO SchemaMigration (id, appliedAt, notes) VALUES (:id, :at, :notes)"
                ),
                {
                    "id": MIGRATION_ID,
                    "at": now_ist(),
                    "notes": "Visit related document (purpose of visit supporting doc)",
                },
            )
            print("Applied.")


if __name__ == "__main__":
    main()
