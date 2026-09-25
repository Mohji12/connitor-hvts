"""
Create BranchVisitSlotPolicy, VisitSlotRoutine, VisitSlotAllotment.

Usage:
  python scripts/migrate_visit_slot_allotment.py --yes
"""
from __future__ import annotations

import argparse
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from sqlalchemy import text

from app.database import engine
from app.utils.timezone import now_ist

MIGRATION_ID = "2026-08-21_visit_slot_allotment"


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


def table_exists(conn, table: str) -> bool:
    row = conn.execute(
        text(
            """
            SELECT 1 FROM INFORMATION_SCHEMA.TABLES
            WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = :table
            """
        ),
        {"table": table},
    ).first()
    return row is not None


def run(dry_run: bool) -> None:
    with engine.begin() as conn:
        ensure_migration_table(conn)
        if migration_applied(conn) and table_exists(conn, "VisitSlotAllotment"):
            print(f"Migration {MIGRATION_ID} already applied.")
            return

        statements = [
            """
            CREATE TABLE IF NOT EXISTS BranchVisitSlotPolicy (
                id VARCHAR(36) NOT NULL PRIMARY KEY,
                branchId VARCHAR(36) NOT NULL,
                dailyQuota INT NOT NULL DEFAULT 50,
                createdAt DATETIME NOT NULL,
                updatedAt DATETIME NOT NULL,
                UNIQUE KEY BranchVisitSlotPolicy_branchId_key (branchId),
                CONSTRAINT fk_visit_slot_policy_branch FOREIGN KEY (branchId) REFERENCES Branch(id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
            """,
            """
            CREATE TABLE IF NOT EXISTS VisitSlotRoutine (
                id VARCHAR(36) NOT NULL PRIMARY KEY,
                branchId VARCHAR(36) NOT NULL,
                staffId VARCHAR(36) NOT NULL,
                weekdays TEXT NOT NULL,
                windowStart VARCHAR(5) NOT NULL,
                windowEnd VARCHAR(5) NOT NULL,
                slotCount INT NOT NULL,
                isActive TINYINT(1) NOT NULL DEFAULT 1,
                createdAt DATETIME NOT NULL,
                updatedAt DATETIME NOT NULL,
                KEY ix_VisitSlotRoutine_branchId (branchId),
                KEY ix_VisitSlotRoutine_staffId (staffId),
                CONSTRAINT fk_visit_slot_routine_branch FOREIGN KEY (branchId) REFERENCES Branch(id),
                CONSTRAINT fk_visit_slot_routine_staff FOREIGN KEY (staffId) REFERENCES User(id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
            """,
            """
            CREATE TABLE IF NOT EXISTS VisitSlotAllotment (
                id VARCHAR(36) NOT NULL PRIMARY KEY,
                branchId VARCHAR(36) NOT NULL,
                staffId VARCHAR(36) NOT NULL,
                allotmentDate DATE NOT NULL,
                windowStart VARCHAR(5) NOT NULL,
                windowEnd VARCHAR(5) NOT NULL,
                slotCount INT NOT NULL,
                source VARCHAR(20) NOT NULL DEFAULT 'MANUAL',
                createdAt DATETIME NOT NULL,
                updatedAt DATETIME NOT NULL,
                UNIQUE KEY VisitSlotAllotment_staff_date_window_key (staffId, allotmentDate, windowStart),
                KEY ix_VisitSlotAllotment_branchId (branchId),
                KEY ix_VisitSlotAllotment_staffId (staffId),
                KEY ix_VisitSlotAllotment_allotmentDate (allotmentDate),
                CONSTRAINT fk_visit_slot_allot_branch FOREIGN KEY (branchId) REFERENCES Branch(id),
                CONSTRAINT fk_visit_slot_allot_staff FOREIGN KEY (staffId) REFERENCES User(id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
            """,
        ]

        for sql in statements:
            print(sql.strip().split("\n")[0][:80], "...")
            if not dry_run:
                conn.execute(text(sql))

        if not dry_run:
            conn.execute(
                text(
                    "INSERT INTO SchemaMigration (id, appliedAt, notes) VALUES (:id, :at, :notes)"
                ),
                {
                    "id": MIGRATION_ID,
                    "at": now_ist(),
                    "notes": "Branch visit-slot policy, routines, allotments",
                },
            )
        print(f"Migration {MIGRATION_ID} applied.")


def main() -> None:
    parser = argparse.ArgumentParser(description="Migrate visit slot allotment tables")
    parser.add_argument("--yes", action="store_true", help="Apply migration")
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()
    if not args.yes and not args.dry_run:
        print("Pass --yes to apply or --dry-run to preview.")
        return
    run(dry_run=args.dry_run)


if __name__ == "__main__":
    main()
