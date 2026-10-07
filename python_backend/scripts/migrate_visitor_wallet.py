"""Visitor wallet tables and Visit payment columns. Idempotent.

Usage:
  python scripts/migrate_visitor_wallet.py --dry-run
  python scripts/migrate_visitor_wallet.py --yes
"""
from __future__ import annotations

import argparse

from sqlalchemy import text

from app.database import engine
from app.utils.timezone import now_ist

MIGRATION_ID = "2026-10-05_visitor_wallet"


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


def table_exists(conn, name: str) -> bool:
    rows = conn.execute(text("SHOW TABLES LIKE :name"), {"name": name}).fetchall()
    return len(rows) > 0


def column_exists(conn, table: str, column: str) -> bool:
    rows = conn.execute(text(f"SHOW COLUMNS FROM `{table}` LIKE :column"), {"column": column}).fetchall()
    return len(rows) > 0


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--yes", action="store_true")
    args = parser.parse_args()
    if not args.dry_run and not args.yes:
        print("Pass --yes to apply, or --dry-run to preview.")
        return
    statements: list[str] = []
    with engine.begin() as conn:
        ensure_migration_table(conn)
        if not table_exists(conn, "VisitorWallet"):
            statements.append(
                """
                CREATE TABLE VisitorWallet (
                    id VARCHAR(36) PRIMARY KEY,
                    visitorAccountId VARCHAR(36) NOT NULL,
                    balance DECIMAL(14,2) NOT NULL DEFAULT 0,
                    updatedAt DATETIME NOT NULL,
                    UNIQUE KEY VisitorWallet_account (visitorAccountId),
                    CONSTRAINT VisitorWallet_account_fk FOREIGN KEY (visitorAccountId)
                        REFERENCES VisitorAccount(id)
                )
                """
            )
        if not table_exists(conn, "VisitorWalletTransaction"):
            statements.append(
                """
                CREATE TABLE VisitorWalletTransaction (
                    id VARCHAR(36) PRIMARY KEY,
                    walletId VARCHAR(36) NOT NULL,
                    amount DECIMAL(14,2) NOT NULL,
                    transactionType VARCHAR(20) NOT NULL,
                    status VARCHAR(20) NOT NULL,
                    referenceType VARCHAR(50) NULL,
                    referenceId VARCHAR(64) NULL,
                    razorpayOrderId VARCHAR(64) NULL,
                    razorpayPaymentId VARCHAR(64) NULL,
                    createdAt DATETIME NOT NULL,
                    UNIQUE KEY VisitorWalletTx_payment (razorpayPaymentId),
                    KEY VisitorWalletTx_wallet (walletId),
                    KEY VisitorWalletTx_reference (referenceId),
                    CONSTRAINT VisitorWalletTx_wallet_fk FOREIGN KEY (walletId)
                        REFERENCES VisitorWallet(id)
                )
                """
            )
        for column, ddl in (
            ("paymentMethod", "VARCHAR(20) NULL"),
            ("paymentStatus", "VARCHAR(20) NULL"),
            ("feeAmount", "DECIMAL(14,2) NULL"),
            ("razorpayOrderId", "VARCHAR(64) NULL"),
            ("razorpayPaymentId", "VARCHAR(64) NULL"),
        ):
            if not column_exists(conn, "Visit", column):
                statements.append(f"ALTER TABLE `Visit` ADD COLUMN `{column}` {ddl}")
        if not statements:
            print("Visitor wallet schema already exists.")
            return
        for statement in statements:
            print(statement.strip().split("\n", 1)[0])
        if args.dry_run:
            return
        for statement in statements:
            conn.execute(text(statement))
        conn.execute(
            text("INSERT INTO SchemaMigration (id, appliedAt, notes) VALUES (:id, :at, :notes)"),
            {
                "id": MIGRATION_ID,
                "at": now_ist(),
                "notes": "Visitor wallet, Razorpay recharge, visit fee hold until doctor confirms",
            },
        )
        print("Applied.")


if __name__ == "__main__":
    main()
