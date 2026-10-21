"""
Add distributor onboarding fee columns (dummy ₹150 payment).

Usage:
  python scripts/migrate_distributor_onboarding_fee.py --dry-run
  python scripts/migrate_distributor_onboarding_fee.py --yes
"""
from __future__ import annotations

import argparse

from sqlalchemy import inspect, text

from app.database import engine
from app.utils.timezone import now_ist

MIGRATION_ID = "2026-10-22_distributor_onboarding_fee"


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

        if dry_run:
            print("Would add Distributor onboardingFeeAmount, onboardingPaymentMethod, onboardingPaidAt")
            return

        if not table_exists(conn, "Distributor"):
            print("Distributor missing — run migrate_delivery_module.py first")
            return

        alters = [
            (
                "onboardingFeeAmount",
                "ALTER TABLE Distributor ADD COLUMN onboardingFeeAmount DECIMAL(14,2) NULL",
            ),
            (
                "onboardingPaymentMethod",
                "ALTER TABLE Distributor ADD COLUMN onboardingPaymentMethod VARCHAR(20) NULL",
            ),
            (
                "onboardingPaidAt",
                "ALTER TABLE Distributor ADD COLUMN onboardingPaidAt DATETIME NULL",
            ),
        ]
        for col, sql in alters:
            if not column_exists(conn, "Distributor", col):
                conn.execute(text(sql))
                print(f"Added Distributor.{col}")

        conn.execute(
            text(
                "INSERT INTO SchemaMigration (id, appliedAt, notes) VALUES (:id, :at, :notes)"
            ),
            {
                "id": MIGRATION_ID,
                "at": now_ist(),
                "notes": "Dummy ₹150 distributor onboarding fee columns",
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
