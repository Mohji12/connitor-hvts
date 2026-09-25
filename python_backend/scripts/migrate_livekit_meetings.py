"""
Add LiveKit meeting columns to Visit (Zoom columns are kept for historic visits).
Idempotent via SchemaMigration ledger.

Usage:
  python scripts/migrate_livekit_meetings.py --dry-run
  python scripts/migrate_livekit_meetings.py --yes
"""
from __future__ import annotations

import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from sqlalchemy import text  # noqa: E402

from app.database import engine  # noqa: E402
from app.utils.timezone import now_ist  # noqa: E402

MIGRATION_ID = "2026-09-25_livekit_meetings"

COLUMNS = (
    ("meetingProvider", "VARCHAR(20) NULL"),
    ("meetingRoomName", "VARCHAR(128) NULL"),
    ("meetingJoinUrl", "TEXT NULL"),
    ("meetingHostUrl", "TEXT NULL"),
)
INDEXES = (("ix_Visit_meetingRoomName", "meetingRoomName"),)


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


def column_exists(conn, column: str) -> bool:
    row = conn.execute(
        text(
            """
            SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Visit' AND COLUMN_NAME = :column
            """
        ),
        {"column": column},
    ).first()
    return row is not None


def index_exists(conn, name: str) -> bool:
    row = conn.execute(
        text(
            """
            SELECT 1 FROM INFORMATION_SCHEMA.STATISTICS
            WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Visit' AND INDEX_NAME = :name
            """
        ),
        {"name": name},
    ).first()
    return row is not None


def run(dry_run: bool) -> None:
    with engine.begin() as conn:
        ensure_migration_table(conn)
        if migration_applied(conn):
            print(f"Migration {MIGRATION_ID} already applied.")
            return

        for name, ddl in COLUMNS:
            if column_exists(conn, name):
                print(f"Skip {name} (already exists)")
                continue
            sql = f"ALTER TABLE Visit ADD COLUMN {name} {ddl}"
            print(sql)
            if not dry_run:
                conn.execute(text(sql))

        for index_name, column in INDEXES:
            if not dry_run and index_exists(conn, index_name):
                print(f"Skip index {index_name} (already exists)")
                continue
            sql = f"CREATE INDEX {index_name} ON Visit ({column})"
            print(sql)
            if not dry_run:
                conn.execute(text(sql))

        if dry_run:
            print("Dry run complete — no changes written.")
            return

        conn.execute(
            text("INSERT INTO SchemaMigration (id, appliedAt, notes) VALUES (:id, :appliedAt, :notes)"),
            {
                "id": MIGRATION_ID,
                "appliedAt": now_ist(),
                "notes": "LiveKit meeting fields on Visit (replaces Zoom for new online visits)",
            },
        )
        print(f"Migration {MIGRATION_ID} applied.")


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
