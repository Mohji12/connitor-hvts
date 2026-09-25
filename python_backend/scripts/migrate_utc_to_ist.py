"""
One-time migration: shift UTC-stored datetimes to IST (+05:30).

Run once after deploying IST timezone code. Idempotent via SchemaMigration ledger.

Usage:
  python scripts/migrate_utc_to_ist.py --dry-run
  python scripts/migrate_utc_to_ist.py --yes
  python scripts/migrate_utc_to_ist.py --yes --before "2026-06-10 20:00:00"
"""
from __future__ import annotations

import argparse
from datetime import datetime

from sqlalchemy import text

from app.database import engine
from app.utils.timezone import now_ist

MIGRATION_ID = "2026-06-10_utc_to_ist"
IST_OFFSET_MINUTES = 330

TARGET_TABLES = (
    "Visit",
    "Visitor",
    "User",
    "Notification",
    "HospitalChain",
    "Branch",
    "Department",
    "SubDepartment",
)


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


def list_datetime_columns(conn, tables: tuple[str, ...]) -> list[tuple[str, str]]:
    placeholders = ", ".join(f"'{t}'" for t in tables)
    rows = conn.execute(
        text(
            f"""
            SELECT TABLE_NAME AS table_name, COLUMN_NAME AS column_name
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE()
              AND TABLE_NAME IN ({placeholders})
              AND DATA_TYPE IN ('datetime', 'timestamp')
            ORDER BY TABLE_NAME, COLUMN_NAME
            """
        )
    ).mappings().all()
    return [(r["table_name"], r["column_name"]) for r in rows]


def table_has_created_at(conn, table: str) -> bool:
    row = conn.execute(
        text(
            """
            SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE()
              AND TABLE_NAME = :table
              AND COLUMN_NAME = 'createdAt'
            LIMIT 1
            """
        ),
        {"table": table},
    ).first()
    return row is not None


def shift_column(
    conn,
    table: str,
    column: str,
    before: datetime | None,
    dry_run: bool,
) -> int:
    where_parts = [f"`{column}` IS NOT NULL"]
    params: dict = {"minutes": IST_OFFSET_MINUTES}

    if before is not None:
        if not table_has_created_at(conn, table):
            return 0
        where_parts.append("`createdAt` <= :before")
        params["before"] = before

    where_sql = " AND ".join(where_parts)
    count = conn.execute(
        text(f"SELECT COUNT(*) FROM `{table}` WHERE {where_sql}"),
        params,
    ).scalar() or 0

    if dry_run or count == 0:
        return count

    conn.execute(
        text(
            f"""
            UPDATE `{table}`
            SET `{column}` = DATE_ADD(`{column}`, INTERVAL :minutes MINUTE)
            WHERE {where_sql}
            """
        ),
        params,
    )
    return count


def run(dry_run: bool = False, before: datetime | None = None, yes: bool = False) -> None:
    with engine.connect() as conn:
        ensure_migration_table(conn)
        conn.commit()

        if migration_applied(conn) and not dry_run:
            print(f"Migration '{MIGRATION_ID}' already applied. Skipping.")
            return

        columns = list_datetime_columns(conn, TARGET_TABLES)
        if not columns:
            print("No datetime columns found.")
            return

    mode = "DRY RUN" if dry_run else "APPLY"
    scope = f"createdAt <= {before}" if before else "all rows"
    print(f"{mode}: UTC to IST (+05:30) [{scope}]")
    print("-" * 60)

    total = 0
    for table, column in columns:
        with engine.connect() as conn:
            affected = shift_column(conn, table, column, before, dry_run=True)
            if not dry_run:
                conn.commit()
        if affected:
            print(f"  {table}.{column}: {affected}")
            total += affected

    print("-" * 60)
    print(f"Total datetime values: {total}")

    if dry_run:
        print("Dry run complete. Re-run with --yes to apply.")
        return

    if not yes:
        print("Aborted. Pass --yes to apply this migration.")
        return

    if total == 0:
        with engine.begin() as conn:
            ensure_migration_table(conn)
            conn.execute(
                text(
                    "INSERT INTO SchemaMigration (id, appliedAt, notes) VALUES (:id, :at, :notes)"
                ),
                {"id": MIGRATION_ID, "at": now_ist(), "notes": "No rows to update"},
            )
        print("Nothing to migrate. Ledger recorded.")
        return

    with engine.begin() as conn:
        ensure_migration_table(conn)
        if migration_applied(conn):
            print(f"Migration '{MIGRATION_ID}' already applied. Skipping.")
            return

        applied = 0
        for table, column in columns:
            count = shift_column(conn, table, column, before, dry_run=False)
            applied += count

        conn.execute(
            text(
                "INSERT INTO SchemaMigration (id, appliedAt, notes) VALUES (:id, :at, :notes)"
            ),
            {
                "id": MIGRATION_ID,
                "at": now_ist(),
                "notes": f"Shifted {applied} datetime values by +05:30",
            },
        )

    print(f"Migration '{MIGRATION_ID}' applied successfully ({applied} values updated).")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Migrate UTC datetimes to IST (+05:30)")
    parser.add_argument("--dry-run", action="store_true", help="Preview counts only")
    parser.add_argument("--yes", action="store_true", help="Apply migration without interactive prompt")
    parser.add_argument(
        "--before",
        type=str,
        default=None,
        help="Only rows with createdAt <= this datetime (naive IST/UTC wall clock)",
    )
    return parser.parse_args()


if __name__ == "__main__":
    args = parse_args()
    cutoff = datetime.fromisoformat(args.before) if args.before else None
    run(dry_run=args.dry_run, before=cutoff, yes=args.yes)
