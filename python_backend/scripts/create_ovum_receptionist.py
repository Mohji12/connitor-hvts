"""
Create (or refresh) the receptionist login for an Ovum branch.

The receptionist is the WARD_ADMIN role (shown as "Receptionist" in the UI). They sign in at
/staff/login and land on the attendant pass desk at /dashboard/ams.

Password: DEFAULT_USER_PASSWORD from .env, else the Ovum default used by seed_ovum_hospital.py.

Usage:
  cd python_backend
  python scripts/create_ovum_receptionist.py --branch "Kalyan Nagar" --yes
"""
from __future__ import annotations

import argparse
import sys
from pathlib import Path

from sqlalchemy import or_

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from app.config import get_settings  # noqa: E402
from app.constants.ovum_branches_data import (  # noqa: E402
    OVUM_BRANCHES,
    branch_receptionist_email,
    location_to_email_slug,
)
from app.constants.ovum_entities import OVUM_CHAIN_ID  # noqa: E402
from app.constants.ovum_entity_ids import (  # noqa: E402
    ovum_receptionist_id,
    ovum_receptionist_phone,
)
from app.database import SessionLocal  # noqa: E402
from app.models import Branch, User  # noqa: E402
from app.utils.passwords import hash_password  # noqa: E402


def _default_password() -> str:
    value = (get_settings().default_user_password or "").strip()
    return value or "Conninter123@"


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--branch", required=True, help='Branch location, e.g. "Kalyan Nagar"')
    parser.add_argument("--yes", action="store_true", help="Write to the database")
    args = parser.parse_args()

    wanted = location_to_email_slug(args.branch)
    match = next(
        (
            (index, seed)
            for index, seed in enumerate(OVUM_BRANCHES)
            if location_to_email_slug(seed["location"]) == wanted
        ),
        None,
    )
    if match is None:
        names = ", ".join(seed["location"] for seed in OVUM_BRANCHES)
        sys.exit(f"Unknown Ovum branch '{args.branch}'. Choose one of: {names}")
    branch_index, branch_seed = match

    email = branch_receptionist_email(wanted)
    password = _default_password()
    user_id = ovum_receptionist_id(branch_seed["id"])

    if not args.yes:
        print(f"Dry run. Would create WARD_ADMIN {email} for {branch_seed['name']}. Add --yes.")
        return

    db = SessionLocal()
    try:
        if db.get(Branch, branch_seed["id"]) is None:
            sys.exit(f"Branch {branch_seed['name']} is not in the database. Run seed_ovum_hospital.py first.")

        row = db.query(User).filter(User.email == email).first()
        if row is not None and (row.role != "WARD_ADMIN" or row.branchId != branch_seed["id"]):
            sys.exit(f"{email} already belongs to a {row.role} user on another branch. Nothing changed.")

        payload = {
            "name": f"Receptionist — {branch_seed['location']}",
            "email": email,
            "role": "WARD_ADMIN",
            "hospitalChainId": OVUM_CHAIN_ID,
            "branchId": branch_seed["id"],
            "location": f"Front desk, {branch_seed['name']}",
            "passwordHash": hash_password(password),
            "isActive": True,
        }
        created = row is None
        if row is None:
            phone = ovum_receptionist_phone(branch_index)
            if db.query(User).filter(or_(User.phone == phone, User.id == user_id)).first():
                sys.exit(f"Phone {phone} or id {user_id} is already in use. Nothing changed.")
            db.add(User(id=user_id, phone=phone, **payload))
        else:
            for key, value in payload.items():
                setattr(row, key, value)
        db.commit()
    finally:
        db.close()

    print(f"{'Created' if created else 'Updated'} receptionist for {branch_seed['name']}")
    print(f"  Email:    {email}")
    print(f"  Password: {password}")
    print("  Login:    /staff/login  ->  /dashboard/ams")


if __name__ == "__main__":
    main()
