"""
Create DistributorVisit and DistributorAvailabilitySlot tables.

Usage:
  python scripts/migrate_distributor_visits.py --dry-run
  python scripts/migrate_distributor_visits.py --yes
"""
from __future__ import annotations

import argparse

from sqlalchemy import inspect, text

from app.database import engine
from app.utils.timezone import now_ist

MIGRATION_ID = "2026-10-22_distributor_visits"


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


def table_exists(conn, name: str) -> bool:
    return name in inspect(engine).get_table_names()


def run(dry_run: bool = False) -> None:
    with engine.begin() as conn:
        ensure_migration_table(conn)
        if migration_applied(conn):
            print("Migration already applied.")
            return

        if dry_run:
            print("Would create DistributorVisit and DistributorAvailabilitySlot")
            return

        if not table_exists(conn, "Distributor") or not table_exists(conn, "VisitorAccount"):
            print("Distributor or VisitorAccount missing — run prior migrations first")
            return

        created_visit = False
        created_slot = False
        if not table_exists(conn, "DistributorVisit"):
            created_visit = True
            conn.execute(
                text(
                    """
                    CREATE TABLE DistributorVisit (
                        id VARCHAR(36) NOT NULL PRIMARY KEY,
                        visitorAccountId VARCHAR(36) NOT NULL,
                        distributorId VARCHAR(36) NOT NULL,
                        slotId VARCHAR(36) NULL,
                        appointmentDate DATETIME NULL,
                        purpose TEXT NULL,
                        status VARCHAR(30) NOT NULL DEFAULT 'REQUEST_SENT',
                        visitCode VARCHAR(10) NULL,
                        visitQRCode TEXT NULL,
                        rejectionReason TEXT NULL,
                        approvedAt DATETIME NULL,
                        createdAt DATETIME NOT NULL,
                        updatedAt DATETIME NOT NULL,
                        KEY ix_DistributorVisit_visitorAccountId (visitorAccountId),
                        KEY ix_DistributorVisit_distributorId (distributorId),
                        KEY ix_DistributorVisit_appointmentDate (appointmentDate),
                        KEY ix_DistributorVisit_status (status),
                        CONSTRAINT fk_dist_visit_account FOREIGN KEY (visitorAccountId) REFERENCES VisitorAccount (id),
                        CONSTRAINT fk_dist_visit_vendor FOREIGN KEY (distributorId) REFERENCES Distributor (id)
                    )
                    """
                )
            )
            print("Created DistributorVisit")

        if not table_exists(conn, "DistributorAvailabilitySlot"):
            created_slot = True
            conn.execute(
                text(
                    """
                    CREATE TABLE DistributorAvailabilitySlot (
                        id VARCHAR(36) NOT NULL PRIMARY KEY,
                        distributorId VARCHAR(36) NOT NULL,
                        slotStart DATETIME NOT NULL,
                        slotEnd DATETIME NOT NULL,
                        isBooked TINYINT(1) NOT NULL DEFAULT 0,
                        visitId VARCHAR(36) NULL,
                        createdAt DATETIME NOT NULL,
                        updatedAt DATETIME NOT NULL,
                        KEY ix_DistributorAvailabilitySlot_distributorId (distributorId),
                        KEY ix_DistributorAvailabilitySlot_slotStart (slotStart),
                        UNIQUE KEY DistributorAvailabilitySlot_dist_slot_key (distributorId, slotStart),
                        CONSTRAINT fk_dist_slot_vendor FOREIGN KEY (distributorId) REFERENCES Distributor (id),
                        CONSTRAINT fk_dist_slot_visit FOREIGN KEY (visitId) REFERENCES DistributorVisit (id)
                    )
                    """
                )
            )
            print("Created DistributorAvailabilitySlot")

        if created_visit and created_slot:
            conn.execute(
                text(
                    """
                    ALTER TABLE DistributorVisit
                    ADD CONSTRAINT fk_dist_visit_slot
                    FOREIGN KEY (slotId) REFERENCES DistributorAvailabilitySlot (id)
                    """
                )
            )

        conn.execute(
            text(
                "INSERT INTO SchemaMigration (id, appliedAt, notes) VALUES (:id, :at, :notes)"
            ),
            {
                "id": MIGRATION_ID,
                "at": now_ist(),
                "notes": "Distributor office visit slots and bookings",
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
