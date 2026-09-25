"""
Add BranchDeliverySlot.bookedMinutes for shared minute-capacity windows.

Usage:
  python scripts/migrate_delivery_slot_minutes.py --dry-run
  python scripts/migrate_delivery_slot_minutes.py --yes
"""
from __future__ import annotations

import argparse

from sqlalchemy import inspect, text

from app.database import engine
from app.utils.timezone import now_ist

MIGRATION_ID = "2026-08-05_delivery_slot_booked_minutes"


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
            print("Would add BranchDeliverySlot.bookedMinutes and backfill from bookedCount×10")
            return

        if not table_exists(conn, "BranchDeliverySlot"):
            print("BranchDeliverySlot missing — run migrate_delivery_slots.py first")
            return

        if not column_exists(conn, "BranchDeliverySlot", "bookedMinutes"):
            conn.execute(
                text(
                    "ALTER TABLE BranchDeliverySlot ADD COLUMN bookedMinutes INT NOT NULL DEFAULT 0"
                )
            )
            print("Added BranchDeliverySlot.bookedMinutes")

        # Estimate minutes already used from prior count-based bookings (default unload = 10)
        conn.execute(
            text(
                """
                UPDATE BranchDeliverySlot
                SET bookedMinutes = LEAST(
                    GREATEST(TIMESTAMPDIFF(MINUTE, slotStart, slotEnd), 0),
                    GREATEST(bookedCount, 0) * 10
                )
                WHERE bookedMinutes = 0 AND bookedCount > 0
                """
            )
        )
        print("Backfilled bookedMinutes from bookedCount where needed")

        conn.execute(
            text("INSERT INTO SchemaMigration (id, appliedAt, notes) VALUES (:id, :at, :notes)"),
            {
                "id": MIGRATION_ID,
                "at": now_ist(),
                "notes": "Delivery slot shared minute capacity (hospital windows)",
            },
        )
        print("Migration applied:", MIGRATION_ID)


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--yes", action="store_true")
    args = parser.parse_args()
    if not args.dry_run and not args.yes:
        print("Pass --yes to apply or --dry-run to preview")
    else:
        run(dry_run=args.dry_run)
