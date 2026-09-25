"""
Create DoctorAvailabilitySlot table. Idempotent.

Usage:
  python scripts/migrate_doctor_slots.py --yes
"""
from __future__ import annotations

import argparse

from sqlalchemy import text

from app.database import engine
from app.utils.timezone import now_ist

MIGRATION_ID = "2026-06-07_doctor_availability_slots"


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
        already_applied = migration_applied(conn)
        if already_applied and table_exists(conn, "DoctorAvailabilitySlot"):
            print(f"Migration {MIGRATION_ID} already applied.")
            return

        sql = """
            CREATE TABLE IF NOT EXISTS DoctorAvailabilitySlot (
                id VARCHAR(36) NOT NULL PRIMARY KEY,
                doctorId VARCHAR(36) NOT NULL,
                slotStart DATETIME NOT NULL,
                slotEnd DATETIME NOT NULL,
                isBooked TINYINT(1) NOT NULL DEFAULT 0,
                visitId VARCHAR(36) NULL,
                createdAt DATETIME NOT NULL,
                updatedAt DATETIME NOT NULL,
                UNIQUE KEY DoctorAvailabilitySlot_doctor_slot_key (doctorId, slotStart),
                KEY ix_DoctorAvailabilitySlot_doctorId (doctorId),
                KEY ix_DoctorAvailabilitySlot_slotStart (slotStart),
                CONSTRAINT fk_doctor_slot_doctor FOREIGN KEY (doctorId) REFERENCES User(id),
                CONSTRAINT fk_doctor_slot_visit FOREIGN KEY (visitId) REFERENCES Visit(id)
            )
        """
        print(sql.strip())
        if not dry_run:
            conn.execute(text(sql))
            if not already_applied:
                conn.execute(
                    text(
                        """
                        INSERT INTO SchemaMigration (id, appliedAt, notes)
                        VALUES (:id, :appliedAt, :notes)
                        """
                    ),
                    {
                        "id": MIGRATION_ID,
                        "appliedAt": now_ist(),
                        "notes": "Doctor availability slots for appointment booking",
                    },
                )
            print(f"Migration {MIGRATION_ID} applied.")
        else:
            print("Dry run complete.")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--yes", action="store_true")
    args = parser.parse_args()
    if not args.dry_run and not args.yes:
        parser.error("Pass --dry-run or --yes")
    run(args.dry_run)


if __name__ == "__main__":
    main()
