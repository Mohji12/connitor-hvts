"""SlotRequest table: visitor asks a doctor for a slot, doctor confirms on WhatsApp. Idempotent.

Usage:
  python scripts/migrate_slot_request.py --dry-run
  python scripts/migrate_slot_request.py --yes
"""
from __future__ import annotations

import argparse

from sqlalchemy import text

from app.database import engine
from app.utils.timezone import now_ist

MIGRATION_ID = "2026-10-15_slot_request"


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


def table_exists(conn, name: str) -> bool:
    rows = conn.execute(text("SHOW TABLES LIKE :name"), {"name": name}).fetchall()
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
        if table_exists(conn, "SlotRequest"):
            print("SlotRequest table already exists.")
            return
        statement = """
            CREATE TABLE SlotRequest (
                id VARCHAR(36) PRIMARY KEY,
                visitorAccountId VARCHAR(36) NOT NULL,
                doctorId VARCHAR(36) NOT NULL,
                branchId VARCHAR(36) NOT NULL,
                departmentId VARCHAR(36) NOT NULL,
                subDepartmentId VARCHAR(36) NOT NULL,
                requestedStart DATETIME NOT NULL,
                purpose VARCHAR(191) NOT NULL,
                status VARCHAR(20) NOT NULL,
                approvalCode VARCHAR(6) NOT NULL,
                slotId VARCHAR(36) NULL,
                createdAt DATETIME NOT NULL,
                decidedAt DATETIME NULL,
                KEY SlotRequest_account (visitorAccountId),
                KEY SlotRequest_doctor_status (doctorId, status),
                KEY SlotRequest_code (approvalCode),
                KEY SlotRequest_slot (slotId),
                CONSTRAINT SlotRequest_account_fk FOREIGN KEY (visitorAccountId)
                    REFERENCES VisitorAccount(id),
                CONSTRAINT SlotRequest_doctor_fk FOREIGN KEY (doctorId) REFERENCES User(id),
                CONSTRAINT SlotRequest_branch_fk FOREIGN KEY (branchId) REFERENCES Branch(id),
                CONSTRAINT SlotRequest_department_fk FOREIGN KEY (departmentId)
                    REFERENCES Department(id),
                CONSTRAINT SlotRequest_sub_department_fk FOREIGN KEY (subDepartmentId)
                    REFERENCES SubDepartment(id),
                CONSTRAINT SlotRequest_slot_fk FOREIGN KEY (slotId)
                    REFERENCES DoctorAvailabilitySlot(id)
            )
        """
        print("CREATE TABLE SlotRequest")
        if args.dry_run:
            return
        conn.execute(text(statement))
        conn.execute(
            text("INSERT INTO SchemaMigration (id, appliedAt, notes) VALUES (:id, :at, :notes)"),
            {
                "id": MIGRATION_ID,
                "at": now_ist(),
                "notes": "Visitor slot requests confirmed by doctors on WhatsApp",
            },
        )
        print("Applied.")


if __name__ == "__main__":
    main()
