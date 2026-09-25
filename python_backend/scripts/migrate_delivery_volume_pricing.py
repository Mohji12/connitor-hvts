"""
Add vehicle dims + delivery volume pricing columns. Idempotent.

Usage:
  python scripts/migrate_delivery_volume_pricing.py --yes
"""
from __future__ import annotations

import argparse

from sqlalchemy import text

from app.database import engine
from app.utils.timezone import now_ist

MIGRATION_ID = "2026-07-30_delivery_volume_pricing"

VEHICLE_COLUMNS = [
    ("lengthCm", "DECIMAL(12,2) NULL"),
    ("breadthCm", "DECIMAL(12,2) NULL"),
    ("heightCm", "DECIMAL(12,2) NULL"),
    ("volumeCm3", "DECIMAL(18,2) NULL"),
]

DELIVERY_COLUMNS = [
    ("boxLengthCm", "DECIMAL(12,2) NULL"),
    ("boxBreadthCm", "DECIMAL(12,2) NULL"),
    ("boxHeightCm", "DECIMAL(12,2) NULL"),
    ("cargoVolumeCm3", "DECIMAL(18,2) NULL"),
    ("vehicleVolumeCm3", "DECIMAL(18,2) NULL"),
    ("unloadMinutes", "DECIMAL(12,2) NULL"),
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
    rows = conn.execute(
        text(f"SHOW COLUMNS FROM `{table}` LIKE :col"),
        {"col": column},
    ).fetchall()
    return len(rows) > 0


def apply(conn, *, dry_run: bool) -> None:
    actions: list[str] = []
    for col, ddl in VEHICLE_COLUMNS:
        if not column_exists(conn, "DeliveryVehicle", col):
            actions.append(f"ADD DeliveryVehicle.{col}")
            if not dry_run:
                conn.execute(text(f"ALTER TABLE `DeliveryVehicle` ADD COLUMN `{col}` {ddl}"))
    for col, ddl in DELIVERY_COLUMNS:
        if not column_exists(conn, "InboundDelivery", col):
            actions.append(f"ADD InboundDelivery.{col}")
            if not dry_run:
                conn.execute(text(f"ALTER TABLE `InboundDelivery` ADD COLUMN `{col}` {ddl}"))

    if not dry_run and not migration_applied(conn):
        conn.execute(
            text(
                "INSERT INTO SchemaMigration (id, appliedAt, notes) VALUES (:id, :at, :notes)"
            ),
            {
                "id": MIGRATION_ID,
                "at": now_ist(),
                "notes": "Vehicle + delivery volume pricing columns",
            },
        )

    if not actions:
        print("Nothing to apply (already up to date).")
    else:
        prefix = "Would apply" if dry_run else "Applied"
        for a in actions:
            print(f"  {prefix}: {a}")


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
        if migration_applied(conn) and not args.dry_run:
            print(f"Migration {MIGRATION_ID} already recorded; ensuring schema…")
        apply(conn, dry_run=args.dry_run)
    print("Done.")


if __name__ == "__main__":
    main()
