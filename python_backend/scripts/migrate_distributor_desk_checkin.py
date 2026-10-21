"""
Add check-in columns on DistributorVisit for office-desk scan.

Usage:
  python scripts/migrate_distributor_desk_checkin.py --dry-run
  python scripts/migrate_distributor_desk_checkin.py --yes
"""
from __future__ import annotations

import argparse

from sqlalchemy import inspect, text

from app.database import engine
from app.utils.timezone import now_ist

MIGRATION_ID = "2026-10-22_distributor_desk_checkin"


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
    return column in {c["name"] for c in inspect(engine).get_columns(table)}


def table_exists(name: str) -> bool:
    return name in inspect(engine).get_table_names()


def run(dry_run: bool = False) -> None:
    with engine.begin() as conn:
        ensure_migration_table(conn)
        if migration_applied(conn):
            print("Migration already applied.")
            return

        if dry_run:
            print("Would add DistributorVisit checkInTime, checkOutTime, checkedInByUserId")
            return

        if not table_exists("DistributorVisit"):
            print("DistributorVisit missing — run migrate_distributor_visits.py first")
            return

        alters = [
            ("checkInTime", "ALTER TABLE DistributorVisit ADD COLUMN checkInTime DATETIME NULL"),
            ("checkOutTime", "ALTER TABLE DistributorVisit ADD COLUMN checkOutTime DATETIME NULL"),
            ("checkedInByUserId", "ALTER TABLE DistributorVisit ADD COLUMN checkedInByUserId VARCHAR(36) NULL"),
        ]
        for col, sql in alters:
            if column_exists("DistributorVisit", col):
                print(f"Column {col} already exists")
                continue
            conn.execute(text(sql))
            print(f"Added {col}")

        conn.execute(
            text(
                "INSERT INTO SchemaMigration (id, appliedAt, notes) VALUES (:id, :at, :notes)"
            ),
            {
                "id": MIGRATION_ID,
                "at": now_ist(),
                "notes": "Distributor desk check-in timestamps",
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
