"""
Add Sales Representative attendance columns on Visit and MeetingStatusAudit.

Usage:
  python scripts/migrate_sales_rep_attendance.py --dry-run
  python scripts/migrate_sales_rep_attendance.py --yes
"""
from __future__ import annotations

import argparse

from sqlalchemy import text

from app.database import engine
from app.utils.timezone import now_ist

MIGRATION_ID = "2026-08-16_sales_rep_attendance"

COLUMNS = [
    ("visitorType", "VARCHAR(32) NULL"),
    ("companyName", "VARCHAR(191) NULL"),
    ("companyEmail", "VARCHAR(191) NULL"),
    ("meetingStatus", "VARCHAR(32) NULL"),
    ("meetingConfirmedAt", "DATETIME NULL"),
    ("confirmationTokenHash", "VARCHAR(191) NULL"),
    ("confirmationTokenExpiresAt", "DATETIME NULL"),
    ("confirmationTokenUsedAt", "DATETIME NULL"),
]

INDEXES = [
    ("Visit_visitorType_idx", "ALTER TABLE Visit ADD INDEX Visit_visitorType_idx (visitorType)"),
    ("Visit_meetingStatus_idx", "ALTER TABLE Visit ADD INDEX Visit_meetingStatus_idx (meetingStatus)"),
    (
        "Visit_confirmationTokenHash_key",
        "ALTER TABLE Visit ADD UNIQUE INDEX Visit_confirmationTokenHash_key (confirmationTokenHash)",
    ),
]

AUDIT_TABLE_SQL = """
CREATE TABLE IF NOT EXISTS MeetingStatusAudit (
    id VARCHAR(36) PRIMARY KEY,
    visitId VARCHAR(36) NOT NULL,
    oldStatus VARCHAR(32) NULL,
    newStatus VARCHAR(32) NOT NULL,
    actorType VARCHAR(32) NOT NULL,
    actor VARCHAR(191) NULL,
    tokenHash VARCHAR(191) NULL,
    createdAt DATETIME NOT NULL,
    INDEX MeetingStatusAudit_visitId_idx (visitId),
    INDEX MeetingStatusAudit_createdAt_idx (createdAt),
    CONSTRAINT fk_msa_visit FOREIGN KEY (visitId) REFERENCES Visit(id)
)
"""


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


def index_exists(conn, table: str, index: str) -> bool:
    row = conn.execute(
        text(
            """
            SELECT 1 FROM INFORMATION_SCHEMA.STATISTICS
            WHERE TABLE_SCHEMA = DATABASE()
              AND TABLE_NAME = :table
              AND INDEX_NAME = :index
            """
        ),
        {"table": table, "index": index},
    ).first()
    return row is not None


def run(dry_run: bool) -> None:
    with engine.begin() as conn:
        ensure_migration_table(conn)
        already_applied = migration_applied(conn)
        if already_applied:
            print(f"Migration {MIGRATION_ID} already recorded; ensuring schema exists.")

        added_any = False
        for column, definition in COLUMNS:
            if column_exists(conn, "Visit", column):
                print(f"Skip Visit.{column} (exists)")
                continue
            sql = f"ALTER TABLE Visit ADD COLUMN {column} {definition}"
            print(sql)
            if not dry_run:
                conn.execute(text(sql))
            added_any = True

        for index_name, sql in INDEXES:
            if index_exists(conn, "Visit", index_name):
                print(f"Skip index {index_name} (exists)")
                continue
            print(sql)
            if not dry_run:
                conn.execute(text(sql))
            added_any = True

        if table_exists(conn, "MeetingStatusAudit"):
            print("Skip MeetingStatusAudit (exists)")
        else:
            print("CREATE TABLE MeetingStatusAudit")
            if not dry_run:
                conn.execute(text(AUDIT_TABLE_SQL))
            added_any = True

        if not dry_run and not already_applied:
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
                    "notes": "Sales Representative attendance confirmation on Visit",
                },
            )
            print(f"Migration {MIGRATION_ID} applied.")
        elif not dry_run and added_any:
            print(f"Migration {MIGRATION_ID} columns repaired.")
        elif dry_run:
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
