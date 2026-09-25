"""Activate a visitor account for headed e2e (email verified + ACTIVE).

Run from python_backend:
  $env:PYTHONPATH="."
  python scripts/e2e_activate_visitor.py visitor@example.com
"""
from __future__ import annotations

import sys

from app.database import SessionLocal
from app.models.enums import ProfileStatus
from app.models.visitor_account_entities import VisitorAccount


def main() -> int:
    email = (sys.argv[1] if len(sys.argv) > 1 else "").strip().lower()
    if not email or "@" not in email:
        print("Usage: python scripts/e2e_activate_visitor.py <email>", file=sys.stderr)
        return 2

    db = SessionLocal()
    try:
        account = db.query(VisitorAccount).filter(VisitorAccount.email == email).first()
        if not account:
            print(f"Visitor account not found: {email}", file=sys.stderr)
            return 1
        account.emailVerified = True
        account.phoneVerified = True
        account.profileStatus = ProfileStatus.ACTIVE.value
        db.commit()
        print(f"Activated visitor {email} id={account.id}")
        return 0
    finally:
        db.close()


if __name__ == "__main__":
    raise SystemExit(main())
