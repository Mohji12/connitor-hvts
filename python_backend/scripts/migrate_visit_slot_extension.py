"""
Add visit slot-clock and doctor-extension token columns on Visit.

Usage:
  python scripts/migrate_visit_slot_extension.py --yes
"""
from __future__ import annotations

import argparse

from sqlalchemy import text

from app.database import engine
from app.utils.timezone import now_ist

MIGRATION_ID = "2026-08-16_visit_slot_extension"

COLUMNS = [
    ("allottedMinutes", "INT NULL"),
    ("expectedEndTime", "DATETIME NULL"),
    ("extensionTokenHash", "VARCHAR(191) NULL"),
    ("extensionTokenExpiresAt", "DATETIME NULL"),
    ("extensionTokenUsedAt", "DATETIME NULL"),
    ("extensionWarningDueAt", "DATETIME NULL"),
    ("extensionWarningSentAt", "DATETIME NULL"),
]

INDEXES = [
    ("ix_Visit_expectedEndTime", "ALTER TABLE Visit ADD INDEX ix_Visit_expectedEndTime (expectedEndTime)"),
    (
        "Visit_extensionTokenHash_key",
        "ALTER TABLE Visit ADD UNIQUE INDEX Visit_extensionTokenHash_key (extensionTokenHash)",
    ),
    (
        "ix_Visit_extensionWarningDueAt",
        "ALTER TABLE Visit ADD INDEX ix_Visit_extensionWarningDueAt (extensionWarningDueAt)",
    ),
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

        for column, definition in COLUMNS:
            if column_exists(conn, "Visit", column):
                print(f"Skip Visit.{column} (exists)")
                continue
            sql = f"ALTER TABLE Visit ADD COLUMN {column} {definition}"
            print(sql)
            if not dry_run:
                conn.execute(text(sql))

        for index_name, sql in INDEXES:
            if index_exists(conn, "Visit", index_name):
                print(f"Skip index {index_name} (exists)")
                continue
            print(sql)
            if not dry_run:
                conn.execute(text(sql))

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
                    "notes": "Visit slot clock + doctor extension tokens",
                },
            )
            print(f"Migration {MIGRATION_ID} applied.")
        elif dry_run:
            print("Dry run — no changes written.")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--yes", action="store_true", help="Apply the migration")
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()
    if not args.yes and not args.dry_run:
        parser.error("Pass --yes or --dry-run")
    run(dry_run=args.dry_run)


if __name__ == "__main__":
    main()
