"""
Promote Kauvery network admin to CHAIN_ADMIN (Hospital Super Admin).

The original Kauvery seed stored admin@kauvery.conninter.com as HOSPITAL_ADMIN
with a null branchId, which breaks hospital-admin analytics. CHAIN_ADMIN is the
correct role for all Bengaluru branches of that chain (same as Ovum).

Usage:
  cd python_backend
  python scripts/fix_kauvery_network_admin_role.py --dry-run
  python scripts/fix_kauvery_network_admin_role.py --yes
"""
from __future__ import annotations

import argparse
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from app.constants.kauvery_entities import (  # noqa: E402
    KAUVERY_CHAIN_ADMIN_ID,
    KAUVERY_CHAIN_ID,
)
from app.database import SessionLocal  # noqa: E402
from app.models import User  # noqa: E402

NETWORK_EMAIL = "admin@kauvery.conninter.com"
TARGET_ROLE = "CHAIN_ADMIN"
TARGET_NAME = "Kauvery Hospital Super Admin"


def find_user(db) -> User | None:
    by_id = db.get(User, KAUVERY_CHAIN_ADMIN_ID)
    if by_id is not None:
        return by_id
    return (
        db.query(User)
        .filter(User.email == NETWORK_EMAIL)
        .order_by(User.createdAt.asc())
        .first()
    )


def apply(*, dry_run: bool) -> None:
    db = SessionLocal()
    try:
        user = find_user(db)
        if user is None:
            print(
                f"No Kauvery network admin found "
                f"(id={KAUVERY_CHAIN_ADMIN_ID} or email={NETWORK_EMAIL})."
            )
            print("Run: python scripts/seed_kauvery_hospital.py --yes")
            return

        before = {
            "id": user.id,
            "email": user.email,
            "name": user.name,
            "role": user.role,
            "hospitalChainId": user.hospitalChainId,
            "branchId": user.branchId,
        }
        already_ok = (
            user.role == TARGET_ROLE
            and user.hospitalChainId == KAUVERY_CHAIN_ID
            and user.branchId is None
            and user.name == TARGET_NAME
        )
        print("Current:")
        for key, value in before.items():
            print(f"  {key}: {value}")

        if already_ok:
            print("Already CHAIN_ADMIN (Hospital Super Admin) with chain scope. Nothing to do.")
            return

        print("Target:")
        print(f"  role: {TARGET_ROLE}")
        print(f"  name: {TARGET_NAME}")
        print(f"  hospitalChainId: {KAUVERY_CHAIN_ID}")
        print("  branchId: None")

        if dry_run:
            print("Dry run — no changes written.")
            return

        user.role = TARGET_ROLE
        user.name = TARGET_NAME
        user.hospitalChainId = KAUVERY_CHAIN_ID
        user.branchId = None
        user.isActive = True
        db.commit()
        print("Updated Kauvery network admin to CHAIN_ADMIN (Hospital Super Admin).")
        print(f"Login: {NETWORK_EMAIL}")
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Promote Kauvery network admin to CHAIN_ADMIN"
    )
    parser.add_argument("--yes", action="store_true", help="Apply changes")
    parser.add_argument("--dry-run", action="store_true", help="Preview only")
    args = parser.parse_args()
    if not args.yes and not args.dry_run:
        parser.error("Pass --yes to apply, or --dry-run to preview.")
    apply(dry_run=args.dry_run)


if __name__ == "__main__":
    main()
