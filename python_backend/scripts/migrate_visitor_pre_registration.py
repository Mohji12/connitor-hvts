"""
Visitor pre-registration tables and Visitor.visitorAccountId. Idempotent.

Usage:
  python scripts/migrate_visitor_pre_registration.py --dry-run
  python scripts/migrate_visitor_pre_registration.py --yes
"""
from __future__ import annotations

import argparse

from sqlalchemy import text

from app.database import engine
from app.utils.timezone import now_ist

MIGRATION_ID = "2026-06-21_visitor_pre_registration"


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


def column_exists(conn, table: str, column: str) -> bool:
    row = conn.execute(
        text(
            """
            SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE()
              AND TABLE_NAME = :table
              AND COLUMN_NAME = :column
            """
        ),
        {"table": table, "column": column},
    ).first()
    return row is not None


TABLES_SQL = [
    """
    CREATE TABLE IF NOT EXISTS VisitorAccount (
        id VARCHAR(36) PRIMARY KEY,
        firstName VARCHAR(191) NOT NULL,
        lastName VARCHAR(191) NOT NULL,
        phone VARCHAR(191) NOT NULL UNIQUE,
        email VARCHAR(191) NOT NULL UNIQUE,
        emailType VARCHAR(20) NOT NULL DEFAULT 'PERSONAL',
        companyName VARCHAR(191) NULL,
        jobTitle VARCHAR(191) NULL,
        linkedinUrl VARCHAR(500) NULL,
        photoStorageKey VARCHAR(500) NULL,
        profileStatus VARCHAR(30) NOT NULL DEFAULT 'DRAFT',
        emailVerified BOOLEAN NOT NULL DEFAULT FALSE,
        phoneVerified BOOLEAN NOT NULL DEFAULT FALSE,
        phoneVerificationOtpHash VARCHAR(191) NULL,
        phoneVerificationExpiry DATETIME NULL,
        phoneVerificationAttempts INT NOT NULL DEFAULT 0,
        emailVerificationOtpHash VARCHAR(191) NULL,
        emailVerificationExpiry DATETIME NULL,
        emailVerificationAttempts INT NOT NULL DEFAULT 0,
        termsAcceptedAt DATETIME NULL,
        privacyPolicyVersion VARCHAR(32) NULL,
        createdAt DATETIME NOT NULL,
        updatedAt DATETIME NOT NULL
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS VisitorAccountAuth (
        id VARCHAR(36) PRIMARY KEY,
        visitorAccountId VARCHAR(36) NOT NULL,
        provider VARCHAR(20) NOT NULL,
        passwordHash VARCHAR(191) NULL,
        providerSubject VARCHAR(191) NULL,
        createdAt DATETIME NOT NULL,
        updatedAt DATETIME NOT NULL,
        UNIQUE KEY VisitorAccountAuth_account_provider_key (visitorAccountId, provider),
        CONSTRAINT fk_vaa_account FOREIGN KEY (visitorAccountId) REFERENCES VisitorAccount(id)
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS VisitorAccountDocument (
        id VARCHAR(36) PRIMARY KEY,
        visitorAccountId VARCHAR(36) NOT NULL,
        docType VARCHAR(20) NOT NULL,
        govtIdType VARCHAR(30) NULL,
        storageKey VARCHAR(500) NOT NULL,
        mimeType VARCHAR(100) NOT NULL,
        capturedAt DATETIME NOT NULL,
        createdAt DATETIME NOT NULL,
        CONSTRAINT fk_vad_account FOREIGN KEY (visitorAccountId) REFERENCES VisitorAccount(id)
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS EmailVerificationToken (
        id VARCHAR(36) PRIMARY KEY,
        visitorAccountId VARCHAR(36) NOT NULL,
        tokenHash VARCHAR(191) NOT NULL UNIQUE,
        expiresAt DATETIME NOT NULL,
        usedAt DATETIME NULL,
        createdAt DATETIME NOT NULL,
        CONSTRAINT fk_evt_account FOREIGN KEY (visitorAccountId) REFERENCES VisitorAccount(id)
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS VisitorAccountAuditLog (
        id VARCHAR(36) PRIMARY KEY,
        visitorAccountId VARCHAR(36) NOT NULL,
        action VARCHAR(64) NOT NULL,
        actorType VARCHAR(32) NOT NULL,
        actorId VARCHAR(36) NULL,
        metadataJson TEXT NULL,
        createdAt DATETIME NOT NULL,
        CONSTRAINT fk_vaal_account FOREIGN KEY (visitorAccountId) REFERENCES VisitorAccount(id)
    )
    """,
]


def run(dry_run: bool) -> None:
    with engine.begin() as conn:
        ensure_migration_table(conn)
        if migration_applied(conn):
            print(f"Migration {MIGRATION_ID} already applied.")
            return

        for sql in TABLES_SQL:
            print(sql.strip()[:80], "...")
            if not dry_run:
                conn.execute(text(sql))

        if not column_exists(conn, "Visitor", "visitorAccountId"):
            sql = (
                "ALTER TABLE Visitor ADD COLUMN visitorAccountId VARCHAR(36) NULL, "
                "ADD CONSTRAINT fk_visitor_account FOREIGN KEY (visitorAccountId) "
                "REFERENCES VisitorAccount(id)"
            )
            print(sql)
            if not dry_run:
                conn.execute(text(sql))
        else:
            print("Skip Visitor.visitorAccountId (exists)")

        if not dry_run:
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
                    "notes": "Visitor pre-registration platform tables",
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
