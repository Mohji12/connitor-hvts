"""
Create BranchVisitorPassPolicy + VisitorPass and add Visit.visitorPassId.

Usage:
  python scripts/migrate_visitor_pass_quota.py --yes
"""
from __future__ import annotations

import argparse

from sqlalchemy import text

from app.database import engine
from app.utils.timezone import now_ist

MIGRATION_ID = "2026-08-16_visitor_pass_quota"


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
            WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = :table AND COLUMN_NAME = :column
            """
        ),
        {"table": table, "column": column},
    ).first()
    return row is not None


def run(dry_run: bool) -> None:
    with engine.begin() as conn:
        ensure_migration_table(conn)
        already_applied = migration_applied(conn)
        if already_applied and table_exists(conn, "VisitorPass"):
            print(f"Migration {MIGRATION_ID} already applied.")
            return

        statements = [
            """
            CREATE TABLE IF NOT EXISTS BranchVisitorPassPolicy (
                id VARCHAR(36) NOT NULL PRIMARY KEY,
                branchId VARCHAR(36) NOT NULL,
                dailyQuota INT NOT NULL DEFAULT 50,
                createdAt DATETIME NOT NULL,
                updatedAt DATETIME NOT NULL,
                UNIQUE KEY BranchVisitorPassPolicy_branchId_key (branchId),
                CONSTRAINT fk_visitor_pass_policy_branch FOREIGN KEY (branchId) REFERENCES Branch(id)
            )
            """,
            """
            CREATE TABLE IF NOT EXISTS VisitorPass (
                id VARCHAR(36) NOT NULL PRIMARY KEY,
                passId VARCHAR(191) NOT NULL,
                branchId VARCHAR(36) NOT NULL,
                passDate DATE NOT NULL,
                sequence INT NOT NULL,
                status VARCHAR(20) NOT NULL DEFAULT 'UNASSIGNED',
                source VARCHAR(30) NOT NULL DEFAULT 'HOSPITAL_POOL',
                visitId VARCHAR(36) NULL,
                createdById VARCHAR(36) NULL,
                assignedById VARCHAR(36) NULL,
                assignedAt DATETIME NULL,
                createdAt DATETIME NOT NULL,
                updatedAt DATETIME NOT NULL,
                UNIQUE KEY VisitorPass_passId_key (passId),
                UNIQUE KEY VisitorPass_branch_date_seq_key (branchId, passDate, sequence),
                KEY ix_VisitorPass_branchId (branchId),
                KEY ix_VisitorPass_passDate (passDate),
                KEY ix_VisitorPass_status (status),
                CONSTRAINT fk_visitor_pass_branch FOREIGN KEY (branchId) REFERENCES Branch(id),
                CONSTRAINT fk_visitor_pass_visit FOREIGN KEY (visitId) REFERENCES Visit(id),
                CONSTRAINT fk_visitor_pass_created_by FOREIGN KEY (createdById) REFERENCES User(id),
                CONSTRAINT fk_visitor_pass_assigned_by FOREIGN KEY (assignedById) REFERENCES User(id)
            )
            """,
        ]
        if not column_exists(conn, "Visit", "visitorPassId"):
            statements.append(
                "ALTER TABLE Visit ADD COLUMN visitorPassId VARCHAR(191) NULL, "
                "ADD KEY ix_Visit_visitorPassId (visitorPassId)"
            )

        for sql in statements:
            print(sql.strip())
            if not dry_run:
                conn.execute(text(sql))

        if not dry_run:
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
                        "notes": "Daily visitor pass quota per branch",
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
