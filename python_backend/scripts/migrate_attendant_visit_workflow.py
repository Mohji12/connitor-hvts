"""
Add fixed/visitor attendant kind and optional companion columns. Idempotent.

Usage:
  python scripts/migrate_attendant_visit_workflow.py --dry-run
  python scripts/migrate_attendant_visit_workflow.py --yes
"""
from __future__ import annotations

import argparse

from sqlalchemy import text

from app.database import engine
from app.utils.timezone import now_ist

MIGRATION_ID = "2026-10-06_attendant_visit_workflow"

ATTENDANT_COLUMNS = [
    ("attendantKind", "VARCHAR(20) NOT NULL DEFAULT 'VISITOR'"),
    ("companionName", "VARCHAR(255) NULL"),
    ("companionPhone", "VARCHAR(20) NULL"),
    ("companionRelationship", "VARCHAR(50) NULL"),
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


def column_exists(conn, table: str, column: str) -> bool:
    rows = conn.execute(
        text(f"SHOW COLUMNS FROM `{table}` LIKE :col"),
        {"col": column},
    ).fetchall()
    return len(rows) > 0


def apply(conn, *, dry_run: bool) -> None:
    actions: list[str] = []
    for col, ddl in ATTENDANT_COLUMNS:
        if column_exists(conn, "Attendant", col):
            continue
        actions.append(f"ADD Attendant.{col}")
        if not dry_run:
            conn.execute(text(f"ALTER TABLE `Attendant` ADD COLUMN `{col}` {ddl}"))
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
                "notes": "Attendant kind and companion fields",
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
        print("Pass --yes to apply, or --dry-run to preview.")
        return
    with engine.begin() as conn:
        ensure_migration_table(conn)
        apply(conn, dry_run=args.dry_run)
    print("Done.")


if __name__ == "__main__":
    main()
