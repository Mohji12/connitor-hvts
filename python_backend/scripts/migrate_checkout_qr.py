"""
Add attendant exit QR columns and delivery QR kind support. Idempotent.

Usage:
  python scripts/migrate_checkout_qr.py --dry-run
  python scripts/migrate_checkout_qr.py --yes
"""
from __future__ import annotations

import argparse

from sqlalchemy import text

from app.database import engine
from app.utils.timezone import now_ist

MIGRATION_ID = "2026-07-22_checkout_qr"


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
    rows = conn.execute(text(f"SHOW COLUMNS FROM `{table}` LIKE :col"), {"col": column}).fetchall()
    return len(rows) > 0


def index_exists(conn, table: str, index_name: str) -> bool:
    rows = conn.execute(
        text(f"SHOW INDEX FROM `{table}` WHERE Key_name = :name"),
        {"name": index_name},
    ).fetchall()
    return len(rows) > 0


def apply(conn, *, dry_run: bool) -> None:
    actions: list[str] = []

    if not column_exists(conn, "AttendantPass", "exitQrPayload"):
        actions.append("ADD AttendantPass.exitQrPayload")
        if not dry_run:
            conn.execute(text("ALTER TABLE `AttendantPass` ADD COLUMN `exitQrPayload` TEXT NULL"))
    if not column_exists(conn, "AttendantPass", "exitQrSignature"):
        actions.append("ADD AttendantPass.exitQrSignature")
        if not dry_run:
            conn.execute(
                text("ALTER TABLE `AttendantPass` ADD COLUMN `exitQrSignature` VARCHAR(128) NULL")
            )

    if not column_exists(conn, "DeliveryQrCode", "qrKind"):
        actions.append("ADD DeliveryQrCode.qrKind")
        if not dry_run:
            conn.execute(
                text(
                    "ALTER TABLE `DeliveryQrCode` ADD COLUMN `qrKind` VARCHAR(20) NOT NULL DEFAULT 'ENTRY'"
                )
            )
            conn.execute(
                text("UPDATE `DeliveryQrCode` SET `qrKind` = 'ENTRY' WHERE `qrKind` IS NULL OR `qrKind` = ''")
            )

    # Replace unique(deliveryId) with unique(deliveryId, qrKind). MySQL may use the
    # unique index for the FK — drop FK, replace index, re-add FK.
    needs_index_fix = not index_exists(conn, "DeliveryQrCode", "DeliveryQrCode_delivery_kind_key")
    if needs_index_fix:
        fk_rows = conn.execute(
            text(
                """
                SELECT CONSTRAINT_NAME
                FROM information_schema.KEY_COLUMN_USAGE
                WHERE TABLE_SCHEMA = DATABASE()
                  AND TABLE_NAME = 'DeliveryQrCode'
                  AND COLUMN_NAME = 'deliveryId'
                  AND REFERENCED_TABLE_NAME IS NOT NULL
                """
            )
        ).fetchall()
        fk_names = [r[0] for r in fk_rows]

        # Detect single-column unique on deliveryId
        unique_single = None
        for idx_name in ("deliveryId", "DeliveryQrCode_deliveryId_key", "uq_DeliveryQrCode_deliveryId"):
            rows = conn.execute(
                text(
                    "SHOW INDEX FROM `DeliveryQrCode` WHERE Key_name = :name AND Non_unique = 0"
                ),
                {"name": idx_name},
            ).fetchall()
            cols = {r[4] for r in rows}
            if cols == {"deliveryId"}:
                unique_single = idx_name
                break

        if unique_single or fk_names:
            actions.append(
                f"Replace unique deliveryId ({unique_single}) with (deliveryId, qrKind)"
            )
            if not dry_run:
                for fk in fk_names:
                    conn.execute(
                        text(f"ALTER TABLE `DeliveryQrCode` DROP FOREIGN KEY `{fk}`")
                    )
                if unique_single:
                    conn.execute(
                        text(f"ALTER TABLE `DeliveryQrCode` DROP INDEX `{unique_single}`")
                    )
                if not index_exists(conn, "DeliveryQrCode", "DeliveryQrCode_deliveryId_idx"):
                    conn.execute(
                        text(
                            "ALTER TABLE `DeliveryQrCode` ADD INDEX `DeliveryQrCode_deliveryId_idx` (`deliveryId`)"
                        )
                    )
                conn.execute(
                    text(
                        "ALTER TABLE `DeliveryQrCode` "
                        "ADD CONSTRAINT `DeliveryQrCode_deliveryId_fkey` "
                        "FOREIGN KEY (`deliveryId`) REFERENCES `InboundDelivery` (`id`)"
                    )
                )
                conn.execute(
                    text(
                        "ALTER TABLE `DeliveryQrCode` "
                        "ADD UNIQUE KEY `DeliveryQrCode_delivery_kind_key` (`deliveryId`, `qrKind`)"
                    )
                )
        elif not index_exists(conn, "DeliveryQrCode", "DeliveryQrCode_delivery_kind_key"):
            actions.append("ADD unique (deliveryId, qrKind)")
            if not dry_run:
                conn.execute(
                    text(
                        "ALTER TABLE `DeliveryQrCode` "
                        "ADD UNIQUE KEY `DeliveryQrCode_delivery_kind_key` (`deliveryId`, `qrKind`)"
                    )
                )

    if not dry_run and not migration_applied(conn):
        conn.execute(
            text(
                "INSERT INTO SchemaMigration (id, appliedAt, notes) VALUES (:id, :at, :notes)"
            ),
            {
                "id": MIGRATION_ID,
                "at": now_ist(),
                "notes": "Attendant exit QR + delivery qrKind ENTRY/EXIT",
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
            # Still run column checks in case partial apply
            print(f"Migration {MIGRATION_ID} already recorded; ensuring columns/indexes…")
        apply(conn, dry_run=args.dry_run)
    print("Done.")


if __name__ == "__main__":
    main()
