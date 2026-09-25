"""
Delivery slots + driver linkage schema migration. Idempotent.

Usage:
  python scripts/migrate_delivery_slots.py --dry-run
  python scripts/migrate_delivery_slots.py --yes
"""
from __future__ import annotations

import argparse

from sqlalchemy import inspect, text

from app.database import Base, engine
import app.models  # noqa: F401
import app.models.delivery_entities  # noqa: F401
from app.utils.timezone import now_ist

MIGRATION_ID = "2026-07-07_delivery_slots_driver"


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


def table_exists(conn, name: str) -> bool:
    return name in inspect(engine).get_table_names()


def column_exists(conn, table: str, column: str) -> bool:
    cols = [c["name"] for c in inspect(engine).get_columns(table)]
    return column in cols


def run(dry_run: bool = False) -> None:
    with engine.begin() as conn:
        ensure_migration_table(conn)
        if migration_applied(conn) and table_exists(conn, "BranchDeliverySlot"):
            print("Migration already applied.")
            return

        if dry_run:
            print("Would apply delivery slots migration:", MIGRATION_ID)
            return

        if not table_exists(conn, "BranchDeliverySlot"):
            conn.execute(
                text(
                    """
                    CREATE TABLE IF NOT EXISTS BranchDeliverySlot (
                        id VARCHAR(36) NOT NULL PRIMARY KEY,
                        branchId VARCHAR(36) NOT NULL,
                        slotStart DATETIME NOT NULL,
                        slotEnd DATETIME NOT NULL,
                        maxDeliveries INT NOT NULL DEFAULT 1,
                        bookedCount INT NOT NULL DEFAULT 0,
                        isActive TINYINT(1) NOT NULL DEFAULT 1,
                        createdAt DATETIME NOT NULL,
                        updatedAt DATETIME NOT NULL,
                        UNIQUE KEY BranchDeliverySlot_branch_slot_key (branchId, slotStart),
                        KEY ix_BranchDeliverySlot_branchId (branchId),
                        KEY ix_BranchDeliverySlot_slotStart (slotStart),
                        CONSTRAINT fk_bds_branch FOREIGN KEY (branchId) REFERENCES Branch(id)
                    )
                    """
                )
            )
            print("Created BranchDeliverySlot table")

        if table_exists(conn, "InboundDelivery"):
            if not column_exists(conn, "InboundDelivery", "slotId"):
                conn.execute(text("ALTER TABLE InboundDelivery ADD COLUMN slotId VARCHAR(36) NULL"))
                print("Added InboundDelivery.slotId")
            if not column_exists(conn, "InboundDelivery", "goodsType"):
                conn.execute(text("ALTER TABLE InboundDelivery ADD COLUMN goodsType VARCHAR(255) NULL"))
                print("Added InboundDelivery.goodsType")

        if table_exists(conn, "DeliveryAgent"):
            if not column_exists(conn, "DeliveryAgent", "email"):
                conn.execute(text("ALTER TABLE DeliveryAgent ADD COLUMN email VARCHAR(255) NULL UNIQUE"))
                print("Added DeliveryAgent.email")
            if not column_exists(conn, "DeliveryAgent", "userId"):
                conn.execute(text("ALTER TABLE DeliveryAgent ADD COLUMN userId VARCHAR(36) NULL"))
                print("Added DeliveryAgent.userId")

        if table_exists(conn, "User"):
            if not column_exists(conn, "User", "deliveryAgentId"):
                conn.execute(text("ALTER TABLE User ADD COLUMN deliveryAgentId VARCHAR(36) NULL"))
                print("Added User.deliveryAgentId")

        conn.execute(
            text("INSERT INTO SchemaMigration (id, appliedAt, notes) VALUES (:id, :at, :notes)"),
            {"id": MIGRATION_ID, "at": now_ist(), "notes": "Delivery slots and driver linkage"},
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
