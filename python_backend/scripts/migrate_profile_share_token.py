"""
Add profileShareToken on User and VisitorAccount.

Usage:
  python scripts/migrate_profile_share_token.py --dry-run
  python scripts/migrate_profile_share_token.py --yes
"""
from __future__ import annotations

import argparse

from sqlalchemy import inspect, text

from app.database import engine
from app.utils.timezone import now_ist

MIGRATION_ID = "2026-10-22_profile_share_token"


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


def column_exists(table: str, column: str) -> bool:
    return column in {c["name"] for c in inspect(engine).get_columns(table)}


def table_exists(name: str) -> bool:
    return name in inspect(engine).get_table_names()


def add_token_column(conn, table: str) -> None:
    if not table_exists(table):
        print(f"{table} missing — skip")
        return
    if column_exists(table, "profileShareToken"):
        print(f"{table}.profileShareToken already exists")
        return
    conn.execute(text(f"ALTER TABLE `{table}` ADD COLUMN profileShareToken VARCHAR(36) NULL"))
    conn.execute(
        text(
            f"CREATE UNIQUE INDEX `{table}_profileShareToken_key` ON `{table}` (profileShareToken)"
        )
    )
    print(f"Added {table}.profileShareToken")


def run(dry_run: bool = False) -> None:
    with engine.begin() as conn:
        ensure_migration_table(conn)
        if migration_applied(conn):
            print("Migration already applied.")
            return
        if dry_run:
            print("Would add profileShareToken on User and VisitorAccount")
            return
        add_token_column(conn, "User")
        add_token_column(conn, "VisitorAccount")
        conn.execute(
            text(
                "INSERT INTO SchemaMigration (id, appliedAt, notes) VALUES (:id, :at, :notes)"
            ),
            {
                "id": MIGRATION_ID,
                "at": now_ist(),
                "notes": "Public profile card share tokens",
            },
        )
        print("Migration recorded.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--yes", action="store_true")
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()
    if not args.yes and not args.dry_run:
        print("Pass --yes or --dry-run")
        raise SystemExit(1)
    run(dry_run=args.dry_run)
