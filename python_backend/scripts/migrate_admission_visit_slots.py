"""
Create AdmissionVisitSlot + PassPolicy default visiting hours columns.

Usage:
  python scripts/migrate_admission_visit_slots.py --dry-run
  python scripts/migrate_admission_visit_slots.py --yes
"""
from __future__ import annotations

import argparse

from sqlalchemy import text

from app.database import engine
from app.utils.timezone import now_ist

MIGRATION_ID = "2026-07-22_admission_visit_slots"

CREATE_TABLE = """
CREATE TABLE IF NOT EXISTS AdmissionVisitSlot (
  id VARCHAR(36) NOT NULL PRIMARY KEY,
  admissionId VARCHAR(36) NOT NULL,
  branchId VARCHAR(36) NOT NULL,
  visitDate DATE NULL,
  startTime VARCHAR(5) NOT NULL,
  endTime VARCHAR(5) NOT NULL,
  label VARCHAR(100) NULL,
  createdById VARCHAR(36) NULL,
  isActive TINYINT(1) NOT NULL DEFAULT 1,
  createdAt DATETIME(3) NOT NULL,
  INDEX AdmissionVisitSlot_admissionId_idx (admissionId),
  INDEX AdmissionVisitSlot_branchId_idx (branchId),
  INDEX AdmissionVisitSlot_visitDate_idx (visitDate),
  CONSTRAINT AdmissionVisitSlot_admission_fkey
    FOREIGN KEY (admissionId) REFERENCES Admission(id)
)
"""

POLICY_COLUMNS = [
    ("defaultVisitStart", "VARCHAR(5) NOT NULL DEFAULT '11:00'"),
    ("defaultVisitEnd", "VARCHAR(5) NOT NULL DEFAULT '16:00'"),
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


def table_exists(conn, table: str) -> bool:
    row = conn.execute(
        text(
            """
            SELECT 1 FROM INFORMATION_SCHEMA.TABLES
            WHERE TABLE_SCHEMA = DATABASE()
              AND TABLE_NAME = :table
            """
        ),
        {"table": table},
    ).first()
    return row is not None


def run(dry_run: bool) -> None:
    with engine.begin() as conn:
        ensure_migration_table(conn)
        if migration_applied(conn):
            print(f"Migration {MIGRATION_ID} already recorded; ensuring schema exists.")

        if table_exists(conn, "AdmissionVisitSlot"):
            print("Skip AdmissionVisitSlot (exists)")
        else:
            print(CREATE_TABLE.strip())
            if not dry_run:
                conn.execute(text(CREATE_TABLE))

        if table_exists(conn, "PassPolicy"):
            for column, definition in POLICY_COLUMNS:
                if column_exists(conn, "PassPolicy", column):
                    print(f"Skip PassPolicy.{column} (exists)")
                    continue
                sql = f"ALTER TABLE PassPolicy ADD COLUMN {column} {definition}"
                print(sql)
                if not dry_run:
                    conn.execute(text(sql))
        else:
            print("PassPolicy table missing — skipped default hour columns")

        if not dry_run and not migration_applied(conn):
            conn.execute(
                text(
                    "INSERT INTO SchemaMigration (id, appliedAt, notes) VALUES (:id, :at, :notes)"
                ),
                {
                    "id": MIGRATION_ID,
                    "at": now_ist(),
                    "notes": "AdmissionVisitSlot + PassPolicy default visiting hours",
                },
            )
            print(f"Recorded migration {MIGRATION_ID}")
        elif dry_run:
            print("Dry run — no changes applied")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--yes", action="store_true")
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()
    if not args.yes and not args.dry_run:
        print("Pass --yes or --dry-run")
    else:
        run(dry_run=args.dry_run)
