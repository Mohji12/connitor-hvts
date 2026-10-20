"""Gate offline tables: devices, manifests, scan events, redemptions.

Usage:
  python scripts/migrate_gate_offline.py --dry-run
  python scripts/migrate_gate_offline.py --yes
"""
from __future__ import annotations

import argparse

from sqlalchemy import text

from app.database import engine
from app.utils.timezone import now_ist

MIGRATION_ID = "2026-10-21_gate_offline"


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


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--yes", action="store_true")
    args = parser.parse_args()
    if not args.dry_run and not args.yes:
        print("Pass --yes to apply, or --dry-run to preview.")
        return
    statements = {
        "GateDevice": """
            CREATE TABLE GateDevice (
                id VARCHAR(36) PRIMARY KEY,
                devicePublicId VARCHAR(40) NOT NULL,
                secretHash VARCHAR(64) NOT NULL,
                label VARCHAR(191) NOT NULL,
                gateId VARCHAR(80) NOT NULL,
                branchId VARCHAR(36) NOT NULL,
                status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
                offlineEnabled TINYINT(1) NOT NULL DEFAULT 0,
                registeredById VARCHAR(36) NULL,
                registeredAt DATETIME NOT NULL,
                lastSyncAt DATETIME NULL,
                revokedAt DATETIME NULL,
                UNIQUE KEY GateDevice_public (devicePublicId),
                KEY GateDevice_branch (branchId),
                KEY GateDevice_gate (gateId),
                CONSTRAINT GateDevice_branch_fk FOREIGN KEY (branchId) REFERENCES Branch(id)
            )
        """,
        "GateManifestVersion": """
            CREATE TABLE GateManifestVersion (
                id VARCHAR(36) PRIMARY KEY,
                gateId VARCHAR(80) NOT NULL,
                branchId VARCHAR(36) NOT NULL,
                version INT NOT NULL,
                keyId VARCHAR(40) NOT NULL,
                issuedAt DATETIME NOT NULL,
                expiresAt DATETIME NOT NULL,
                signature VARCHAR(64) NOT NULL,
                payloadJson MEDIUMTEXT NOT NULL,
                UNIQUE KEY GateManifestVersion_gate_version (gateId, version),
                KEY GateManifestVersion_branch (branchId)
            )
        """,
        "GateScanEvent": """
            CREATE TABLE GateScanEvent (
                id VARCHAR(36) PRIMARY KEY,
                eventId VARCHAR(64) NOT NULL,
                deviceId VARCHAR(36) NOT NULL,
                passId VARCHAR(80) NOT NULL,
                passType VARCHAR(20) NOT NULL,
                eventType VARCHAR(20) NOT NULL,
                reasonCode VARCHAR(40) NOT NULL,
                decisionMode VARCHAR(20) NOT NULL,
                occurredAt DATETIME NOT NULL,
                receivedAt DATETIME NOT NULL,
                syncStatus VARCHAR(20) NOT NULL DEFAULT 'ACCEPTED',
                UNIQUE KEY GateScanEvent_eventId (eventId),
                KEY GateScanEvent_device (deviceId),
                KEY GateScanEvent_pass (passId),
                CONSTRAINT GateScanEvent_device_fk FOREIGN KEY (deviceId) REFERENCES GateDevice(id)
            )
        """,
        "GatePassRedemption": """
            CREATE TABLE GatePassRedemption (
                id VARCHAR(36) PRIMARY KEY,
                passId VARCHAR(80) NOT NULL,
                passType VARCHAR(20) NOT NULL,
                gateId VARCHAR(80) NOT NULL,
                deviceId VARCHAR(36) NOT NULL,
                eventId VARCHAR(64) NOT NULL,
                eventType VARCHAR(20) NOT NULL,
                redeemedAt DATETIME NOT NULL,
                UNIQUE KEY GatePassRedemption_pass_event (passId, eventType),
                KEY GatePassRedemption_gate (gateId)
            )
        """,
    }
    with engine.begin() as conn:
        ensure_migration_table(conn)
        applied = False
        for name, statement in statements.items():
            if table_exists(conn, name):
                print(f"{name} already exists.")
                continue
            print(f"CREATE TABLE {name}")
            if args.dry_run:
                continue
            conn.execute(text(statement))
            applied = True
        if applied and not args.dry_run:
            conn.execute(
                text("INSERT INTO SchemaMigration (id, appliedAt, notes) VALUES (:id, :at, :notes)"),
                {
                    "id": MIGRATION_ID,
                    "at": now_ist(),
                    "notes": "Offline gate devices, signed manifests, scan events, redemptions",
                },
            )
            print("Applied.")


if __name__ == "__main__":
    main()
