"""
Add Attendant.smsApprovalCode for primary WhatsApp Confirm/Reject of secondary passes.

Usage:
  python scripts/migrate_attendant_primary_approval.py --dry-run
  python scripts/migrate_attendant_primary_approval.py --yes
"""
from __future__ import annotations

import argparse

from sqlalchemy import text

from app.database import engine
from app.utils.timezone import now_ist

MIGRATION_ID = "2026-10-18_attendant_primary_approval"


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


def column_exists(conn, table: str, column: str) -> bool:
    rows = conn.execute(
        text(f"SHOW COLUMNS FROM `{table}` LIKE :col"),
        {"col": column},
    ).fetchall()
    return len(rows) > 0


def apply(conn, *, dry_run: bool) -> None:
    actions: list[str] = []
    if not column_exists(conn, "Attendant", "smsApprovalCode"):
        actions.append("ADD Attendant.smsApprovalCode")
        if not dry_run:
            conn.execute(
                text(
                    "ALTER TABLE `Attendant` ADD COLUMN `smsApprovalCode` VARCHAR(6) NULL"
                )
            )
            conn.execute(
                text(
                    "CREATE INDEX `Attendant_smsApprovalCode_idx` ON `Attendant` (`smsApprovalCode`)"
                )
            )
    if not dry_run:
        conn.execute(
            text(
                """
                INSERT INTO SchemaMigration (id, appliedAt, notes)
                SELECT :id, :at, :notes
                WHERE NOT EXISTS (SELECT 1 FROM SchemaMigration WHERE id = :id)
                """
            ),
            {
                "id": MIGRATION_ID,
                "at": now_ist(),
                "notes": "Primary attendant WhatsApp approval code for secondary visitor passes",
            },
        )
    if not actions:
        print("Nothing to apply (already up to date).")
    else:
        prefix = "Would apply" if dry_run else "Applied"
        for action in actions:
            print(f"  {prefix}: {action}")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--yes", action="store_true")
    args = parser.parse_args()
    if not args.dry_run and not args.yes:
        parser.error("Pass --yes to apply, or --dry-run to preview.")
    with engine.begin() as conn:
        ensure_migration_table(conn)
        apply(conn, dry_run=args.dry_run)


if __name__ == "__main__":
    main()
