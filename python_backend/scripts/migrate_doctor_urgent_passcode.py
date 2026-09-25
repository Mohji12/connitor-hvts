"""
Create DoctorUrgentPasscode table. Idempotent.

Usage:
  python scripts/migrate_doctor_urgent_passcode.py --dry-run
  python scripts/migrate_doctor_urgent_passcode.py --yes
"""
from __future__ import annotations

import argparse

from sqlalchemy import text

from app.database import engine
from app.utils.timezone import now_ist

MIGRATION_ID = "2026-07-28_doctor_urgent_passcode"


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
            SELECT TABLE_NAME FROM information_schema.TABLES
            WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = :t
            """
        ),
        {"t": table},
    ).first()
    return row is not None


def apply(conn, *, dry_run: bool) -> None:
    actions: list[str] = []

    if not table_exists(conn, "DoctorUrgentPasscode"):
        actions.append("CREATE DoctorUrgentPasscode")
        if not dry_run:
            conn.execute(
                text(
                    """
                    CREATE TABLE `DoctorUrgentPasscode` (
                        `id` VARCHAR(36) NOT NULL,
                        `code` VARCHAR(6) NOT NULL,
                        `branchId` VARCHAR(36) NOT NULL,
                        `staffId` VARCHAR(36) NOT NULL,
                        `departmentId` VARCHAR(36) NULL,
                        `subDepartmentId` VARCHAR(36) NULL,
                        `note` VARCHAR(500) NULL,
                        `status` VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
                        `expiresAt` DATETIME NOT NULL,
                        `createdById` VARCHAR(36) NOT NULL,
                        `redeemedAt` DATETIME NULL,
                        `redeemedById` VARCHAR(36) NULL,
                        `visitId` VARCHAR(36) NULL,
                        `createdAt` DATETIME NOT NULL,
                        `updatedAt` DATETIME NOT NULL,
                        PRIMARY KEY (`id`),
                        UNIQUE KEY `DoctorUrgentPasscode_branchId_code_key` (`branchId`, `code`),
                        KEY `DoctorUrgentPasscode_code_idx` (`code`),
                        KEY `DoctorUrgentPasscode_branchId_idx` (`branchId`),
                        KEY `DoctorUrgentPasscode_staffId_idx` (`staffId`),
                        KEY `DoctorUrgentPasscode_status_idx` (`status`),
                        CONSTRAINT `DoctorUrgentPasscode_branchId_fkey`
                            FOREIGN KEY (`branchId`) REFERENCES `Branch` (`id`),
                        CONSTRAINT `DoctorUrgentPasscode_staffId_fkey`
                            FOREIGN KEY (`staffId`) REFERENCES `User` (`id`),
                        CONSTRAINT `DoctorUrgentPasscode_createdById_fkey`
                            FOREIGN KEY (`createdById`) REFERENCES `User` (`id`),
                        CONSTRAINT `DoctorUrgentPasscode_visitId_fkey`
                            FOREIGN KEY (`visitId`) REFERENCES `Visit` (`id`)
                    )
                    """
                )
            )

    if not dry_run and not migration_applied(conn):
        conn.execute(
            text(
                "INSERT INTO SchemaMigration (id, appliedAt, notes) VALUES (:id, :at, :notes)"
            ),
            {
                "id": MIGRATION_ID,
                "at": now_ist(),
                "notes": "Doctor urgent entry passcodes for security gate",
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
