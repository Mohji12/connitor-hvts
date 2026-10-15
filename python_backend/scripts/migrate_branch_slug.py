"""
Add Branch.slug (public link name, e.g. /attendant-pass/ovum-kalyan-nagar) and fill it for every branch.

Additive and safe to run before deploying the code that reads it.

Usage:
  python scripts/migrate_branch_slug.py --dry-run
  python scripts/migrate_branch_slug.py --yes
"""
from __future__ import annotations

import argparse

from sqlalchemy import inspect, text
from sqlalchemy.orm import Session

from app.database import engine
from app.utils.timezone import now_ist

MIGRATION_ID = "2026-10-15_branch_slug"


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


def column_exists(table: str, column: str) -> bool:
    return column in [c["name"] for c in inspect(engine).get_columns(table)]


def index_exists(table: str, name: str) -> bool:
    indexes = inspect(engine).get_indexes(table) + inspect(engine).get_unique_constraints(table)
    return any(i.get("name") == name for i in indexes)


def backfill() -> list[tuple[str, str]]:
    from app.models import Branch
    from app.services.branches_service import auto_branch_slug

    filled: list[tuple[str, str]] = []
    with Session(engine) as db:
        for branch in db.query(Branch).order_by(Branch.createdAt).all():
            if branch.slug:
                continue
            branch.slug = auto_branch_slug(db, branch)
            db.flush()
            filled.append((branch.name, branch.slug))
        db.commit()
    return filled


def run(dry_run: bool = False) -> None:
    with engine.begin() as conn:
        ensure_migration_table(conn)
        if migration_applied(conn):
            print("Migration already applied.")
            return
        if dry_run:
            print("Would add Branch.slug (unique) and fill it for every branch")
            return
        if not column_exists("Branch", "slug"):
            conn.execute(text("ALTER TABLE Branch ADD COLUMN slug VARCHAR(60) NULL"))
            print("Added Branch.slug")
        if not index_exists("Branch", "Branch_slug_key"):
            conn.execute(text("CREATE UNIQUE INDEX Branch_slug_key ON Branch (slug)"))
            print("Added unique index Branch_slug_key")

    for name, slug in backfill():
        print(f"  {slug:<32} {name}")

    from app.cache import bump_namespace
    from app.cache_invalidation import REFERENCE_NAMESPACE

    bump_namespace(REFERENCE_NAMESPACE)

    with engine.begin() as conn:
        conn.execute(
            text("INSERT INTO SchemaMigration (id, appliedAt, notes) VALUES (:id, :at, :notes)"),
            {"id": MIGRATION_ID, "at": now_ist(), "notes": "Public link name for each branch"},
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
