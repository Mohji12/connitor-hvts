"""Add BranchVisitSlotPolicy.gapMinutes (default 5 minutes between visits).

Usage:
  python scripts/migrate_visit_slot_gap.py --yes
"""
from __future__ import annotations

import argparse
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from sqlalchemy import text

from app.database import engine

MIGRATION_ID = "2026-10-01_visit_slot_gap_minutes"


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


def run(dry_run: bool) -> None:
    with engine.begin() as conn:
        if column_exists(conn, "BranchVisitSlotPolicy", "gapMinutes"):
            print("gapMinutes already exists.")
            return
        sql = (
            "ALTER TABLE BranchVisitSlotPolicy "
            "ADD COLUMN gapMinutes INT NOT NULL DEFAULT 5"
        )
        if dry_run:
            print(sql)
            return
        conn.execute(text(sql))
        print("Added BranchVisitSlotPolicy.gapMinutes (default 5).")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--yes", action="store_true")
    args = parser.parse_args()
    run(dry_run=not args.yes)


if __name__ == "__main__":
    main()
