"""
Delivery + attendant module schema migration. Idempotent.

Usage:
  python scripts/migrate_delivery_module.py --dry-run
  python scripts/migrate_delivery_module.py --yes
"""
from __future__ import annotations

import argparse
import uuid

from sqlalchemy import inspect, text

from app.database import Base, engine
import app.models  # noqa: F401 — register all models
import app.models.delivery_entities  # noqa: F401
import app.models.attendant_entities  # noqa: F401
import app.models.permission_entities  # noqa: F401
from app.dependencies.permissions import ROLE_PERMISSION_DEFAULTS
from app.models.permission_entities import Permission, RolePermission
from app.utils.timezone import now_ist

MIGRATION_ID = "2026-07-06_delivery_attendant_module"

PERMISSION_CODES = [
    ("VIEW_DELIVERY", "delivery", "View deliveries"),
    ("CREATE_DELIVERY", "delivery", "Create deliveries"),
    ("UPDATE_DELIVERY", "delivery", "Update deliveries"),
    ("DELETE_DELIVERY", "delivery", "Delete deliveries"),
    ("VIEW_VENDOR", "vendor", "View vendors"),
    ("CREATE_VENDOR", "vendor", "Create vendors"),
    ("APPROVE_VENDOR", "vendor", "Approve vendors"),
    ("SCAN_QR", "security", "Scan delivery QR"),
    ("ALLOW_ENTRY", "security", "Allow gate entry"),
    ("REJECT_ENTRY", "security", "Reject gate entry"),
    ("MARK_EXIT", "security", "Mark gate exit"),
    ("VIEW_SECURITY_DASHBOARD", "security", "View security dashboard"),
    ("VIEW_VIOLATIONS", "security", "View violations"),
    ("VIEW_RECEIVING", "receiving", "View receiving"),
    ("ASSIGN_DOCK", "receiving", "Assign dock"),
    ("START_RECEIVING", "receiving", "Start receiving"),
    ("VERIFY_ITEMS", "receiving", "Verify items"),
    ("GENERATE_GRN", "receiving", "Generate GRN"),
    ("COMPLETE_RECEIVING", "receiving", "Complete receiving"),
    ("VIEW_WALLET", "billing", "View wallet"),
    ("CREATE_PAYMENT", "billing", "Create payment"),
    ("VIEW_ATTENDANT_PASS", "attendant", "View attendant passes"),
    ("MANAGE_ATTENDANT_PASS", "attendant", "Manage attendant passes"),
    ("APPROVE_ATTENDANT_PASS", "attendant", "Approve attendant passes"),
    ("SCAN_ATTENDANT_PASS", "attendant", "Scan attendant pass"),
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


def ensure_user_distributor_column() -> None:
    insp = inspect(engine)
    if "User" not in insp.get_table_names():
        return
    cols = {c["name"] for c in insp.get_columns("User")}
    if "distributorId" not in cols:
        with engine.begin() as conn:
            conn.execute(text("ALTER TABLE `User` ADD COLUMN distributorId VARCHAR(36) NULL"))
        print("Added User.distributorId column")


def seed_permissions() -> None:
    from app.database import SessionLocal

    db = SessionLocal()
    try:
        perm_ids: dict[str, str] = {}
        for code, module, desc in PERMISSION_CODES:
            row = db.query(Permission).filter(Permission.code == code).first()
            if not row:
                row = Permission(id=str(uuid.uuid4()), code=code, module=module, description=desc)
                db.add(row)
                db.flush()
            perm_ids[code] = row.id

        for role, codes in ROLE_PERMISSION_DEFAULTS.items():
            if "*" in codes:
                codes = set(perm_ids.keys())
            for code in codes:
                if code not in perm_ids:
                    continue
                exists = (
                    db.query(RolePermission)
                    .filter(RolePermission.role == role, RolePermission.permissionCode == code)
                    .first()
                )
                if not exists:
                    db.add(
                        RolePermission(
                            id=str(uuid.uuid4()),
                            role=role,
                            permissionCode=code,
                        )
                    )
        db.commit()
        print("Seeded delivery permissions.")
    finally:
        db.close()


def run(dry_run: bool) -> None:
    with engine.connect() as conn:
        ensure_migration_table(conn)
        if migration_applied(conn) and not dry_run:
            print(f"Migration {MIGRATION_ID} already applied; ensuring schema.")
        conn.commit()

    if dry_run:
        print("Dry run — would create delivery/attendant tables and seed permissions.")
        return

    Base.metadata.create_all(bind=engine)
    print("Created/verified delivery and attendant tables.")
    ensure_user_distributor_column()
    seed_permissions()

    with engine.begin() as conn:
        ensure_migration_table(conn)
        if not migration_applied(conn):
            conn.execute(
                text(
                    "INSERT INTO SchemaMigration (id, appliedAt, notes) VALUES (:id, :at, :notes)"
                ),
                {
                    "id": MIGRATION_ID,
                    "at": now_ist(),
                    "notes": "Delivery + attendant module integrated",
                },
            )
    print(f"Migration {MIGRATION_ID} complete.")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--yes", action="store_true")
    args = parser.parse_args()
    if not args.dry_run and not args.yes:
        parser.error("Pass --dry-run or --yes")
    run(args.dry_run)


if __name__ == "__main__":
    main()
