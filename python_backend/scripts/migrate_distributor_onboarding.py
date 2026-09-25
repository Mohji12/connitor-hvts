"""
Add distributor onboarding profile columns + DistributorDocument. Idempotent.

Usage:
  python scripts/migrate_distributor_onboarding.py --dry-run
  python scripts/migrate_distributor_onboarding.py --yes
"""
from __future__ import annotations

import argparse

from sqlalchemy import text

from app.database import engine
from app.utils.timezone import now_ist

MIGRATION_ID = "2026-07-28_distributor_onboarding"

DISTRIBUTOR_COLUMNS = [
    ("legalEntityType", "VARCHAR(50) NULL"),
    ("tradeName", "VARCHAR(255) NULL"),
    ("cin", "VARCHAR(50) NULL"),
    ("udyamNumber", "VARCHAR(50) NULL"),
    ("website", "VARCHAR(255) NULL"),
    ("yearEstablished", "INT NULL"),
    ("gstRegistrationType", "VARCHAR(30) NULL"),
    ("registeredAddressJson", "TEXT NULL"),
    ("operatingAddressJson", "TEXT NULL"),
    ("serviceableStatesJson", "TEXT NULL"),
    ("supplyCategoriesJson", "TEXT NULL"),
    ("deliveryMode", "VARCHAR(40) NULL"),
    ("goodsDescription", "TEXT NULL"),
    ("accountsEmail", "VARCHAR(255) NULL"),
    ("dispatchPhone", "VARCHAR(20) NULL"),
    ("alternatePhone", "VARCHAR(20) NULL"),
    ("designation", "VARCHAR(100) NULL"),
    ("preferredLanguage", "VARCHAR(20) NULL"),
    ("onboardingStatus", "VARCHAR(30) NOT NULL DEFAULT 'APPROVED'"),
    ("rejectionReason", "TEXT NULL"),
    ("submittedAt", "DATETIME NULL"),
    ("reviewedAt", "DATETIME NULL"),
    ("reviewedById", "VARCHAR(36) NULL"),
    ("termsAcceptedAt", "DATETIME NULL"),
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

    for col, ddl in DISTRIBUTOR_COLUMNS:
        if not column_exists(conn, "Distributor", col):
            actions.append(f"ADD Distributor.{col}")
            if not dry_run:
                conn.execute(text(f"ALTER TABLE `Distributor` ADD COLUMN `{col}` {ddl}"))

    if not table_exists(conn, "DistributorDocument"):
        actions.append("CREATE DistributorDocument")
        if not dry_run:
            conn.execute(
                text(
                    """
                    CREATE TABLE `DistributorDocument` (
                        `id` VARCHAR(36) NOT NULL,
                        `distributorId` VARCHAR(36) NOT NULL,
                        `documentType` VARCHAR(50) NOT NULL,
                        `documentNumber` VARCHAR(100) NULL,
                        `expiresAt` DATETIME NULL,
                        `fileUrl` TEXT NULL,
                        `verificationStatus` VARCHAR(20) NOT NULL DEFAULT 'PENDING',
                        `createdAt` DATETIME NOT NULL,
                        PRIMARY KEY (`id`),
                        KEY `DistributorDocument_distributorId_idx` (`distributorId`),
                        KEY `DistributorDocument_documentType_idx` (`documentType`),
                        CONSTRAINT `DistributorDocument_distributorId_fkey`
                            FOREIGN KEY (`distributorId`) REFERENCES `Distributor` (`id`)
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
                "notes": "Distributor onboarding profile + DistributorDocument",
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
