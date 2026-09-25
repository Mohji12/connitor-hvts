"""
Urgent passcode gate flow columns. Idempotent.

Usage:
  python scripts/migrate_urgent_passcode_gate_flow.py --dry-run
  python scripts/migrate_urgent_passcode_gate_flow.py --yes
"""
from __future__ import annotations

import argparse

from sqlalchemy import inspect, text

from app.database import engine
from app.utils.timezone import now_ist

MIGRATION_ID = "2026-08-05_urgent_passcode_gate_flow"


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
    cols = [c["name"] for c in inspect(engine).get_columns(table)]
    return column in cols


def table_exists(conn, name: str) -> bool:
    return name in inspect(engine).get_table_names()


def run(dry_run: bool = False) -> None:
    with engine.begin() as conn:
        ensure_migration_table(conn)
        if migration_applied(conn):
            print("Migration already applied.")
            return

        actions: list[str] = []
        if table_exists(conn, "DoctorUrgentPasscode"):
            for col, ddl in (
                ("verifiedAt", "DATETIME NULL"),
                ("verifiedById", "VARCHAR(36) NULL"),
            ):
                if not column_exists(conn, "DoctorUrgentPasscode", col):
                    actions.append(f"ADD DoctorUrgentPasscode.{col}")
                    if not dry_run:
                        conn.execute(
                            text(f"ALTER TABLE `DoctorUrgentPasscode` ADD COLUMN `{col}` {ddl}")
                        )

        if table_exists(conn, "Visit"):
            for col, ddl in (
                ("entryQrPayload", "TEXT NULL"),
                ("exitQrPayload", "TEXT NULL"),
            ):
                if not column_exists(conn, "Visit", col):
                    actions.append(f"ADD Visit.{col}")
                    if not dry_run:
                        conn.execute(text(f"ALTER TABLE `Visit` ADD COLUMN `{col}` {ddl}"))

        if dry_run:
            print("Would apply:", actions or "(nothing)")
            return

        conn.execute(
            text("INSERT INTO SchemaMigration (id, appliedAt, notes) VALUES (:id, :at, :notes)"),
            {
                "id": MIGRATION_ID,
                "at": now_ist(),
                "notes": "Urgent passcode VERIFIED gate flow + dual visit QR payloads",
            },
        )
        print("Migration applied:", MIGRATION_ID, actions)


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--yes", action="store_true")
    args = parser.parse_args()
    if not args.dry_run and not args.yes:
        print("Pass --yes to apply or --dry-run to preview")
    else:
        run(dry_run=args.dry_run)
