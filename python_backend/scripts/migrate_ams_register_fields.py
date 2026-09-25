"""
Add AMS registration / policy columns. Idempotent.

Usage:
  python scripts/migrate_ams_register_fields.py --dry-run
  python scripts/migrate_ams_register_fields.py --yes
"""
from __future__ import annotations

import argparse

from sqlalchemy import text

from app.database import engine
from app.utils.timezone import now_ist

MIGRATION_ID = "2026-08-05_ams_register_fields"

ATTENDANT_COLUMNS = [
    ("photoUrl", "TEXT NULL"),
    ("idProofType", "VARCHAR(50) NULL"),
    ("idProofUrl", "TEXT NULL"),
    ("remarks", "TEXT NULL"),
    ("specialPermissions", "TEXT NULL"),
    ("maxEntries", "INT NULL"),
    ("isEmergency", "TINYINT(1) NOT NULL DEFAULT 0"),
]

ADMISSION_COLUMNS = [
    ("department", "VARCHAR(100) NULL"),
]

PASS_COLUMNS = [
    ("maxEntries", "INT NULL"),
    ("entriesUsed", "INT NOT NULL DEFAULT 0"),
]

POLICY_COLUMNS = [
    ("maxIcuAttendants", "INT NOT NULL DEFAULT 1"),
    ("allowNightStay", "TINYINT(1) NOT NULL DEFAULT 0"),
    ("qrValidityHours", "INT NOT NULL DEFAULT 24"),
    ("smsEnabled", "TINYINT(1) NOT NULL DEFAULT 1"),
    ("whatsappEnabled", "TINYINT(1) NOT NULL DEFAULT 1"),
    ("approvalRequired", "TINYINT(1) NOT NULL DEFAULT 1"),
    ("idProofMandatory", "TINYINT(1) NOT NULL DEFAULT 1"),
    ("photoMandatory", "TINYINT(1) NOT NULL DEFAULT 0"),
    ("emergencySkipId", "TINYINT(1) NOT NULL DEFAULT 1"),
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


def add_columns(conn, table: str, columns: list[tuple[str, str]], actions: list[str], *, dry_run: bool) -> None:
    for col, ddl in columns:
        if column_exists(conn, table, col):
            continue
        actions.append(f"ADD {table}.{col}")
        if not dry_run:
            conn.execute(text(f"ALTER TABLE `{table}` ADD COLUMN `{col}` {ddl}"))


def apply(conn, *, dry_run: bool) -> None:
    actions: list[str] = []
    add_columns(conn, "Attendant", ATTENDANT_COLUMNS, actions, dry_run=dry_run)
    add_columns(conn, "Admission", ADMISSION_COLUMNS, actions, dry_run=dry_run)
    add_columns(conn, "AttendantPass", PASS_COLUMNS, actions, dry_run=dry_run)
    add_columns(conn, "PassPolicy", POLICY_COLUMNS, actions, dry_run=dry_run)

    if not dry_run and not migration_applied(conn):
        conn.execute(
            text(
                "INSERT INTO SchemaMigration (id, appliedAt, notes) VALUES (:id, :at, :notes)"
            ),
            {
                "id": MIGRATION_ID,
                "at": now_ist(),
                "notes": "AMS register fields, entries, and PassPolicy settings",
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
