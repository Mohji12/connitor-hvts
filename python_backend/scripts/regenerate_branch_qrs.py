"""
Regenerate Branch.qrCode images after VISITOR_FORM_URL changes.

Usage:
  python scripts/regenerate_branch_qrs.py --yes
"""
from __future__ import annotations

import argparse

from app.database import SessionLocal
from app.models import Branch
from app.services.branches_service import BranchesService


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--yes", action="store_true")
    args = parser.parse_args()
    if not args.yes:
        parser.error("Pass --yes to regenerate all branch QR codes")

    db = SessionLocal()
    try:
        service = BranchesService(db)
        branches = db.query(Branch).all()
        updated = 0
        for branch in branches:
            branch.qrCode = service._generate_qr(branch)
            updated += 1
            print(f"Updated QR for {branch.name} ({branch.id})")
        db.commit()
        print(f"Regenerated {updated} branch QR code(s).")
    finally:
        db.close()


if __name__ == "__main__":
    main()
