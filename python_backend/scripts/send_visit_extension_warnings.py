"""Send doctor visit-extension warning emails when a slot is about to end.

Usage:
  python scripts/send_visit_extension_warnings.py --yes
"""
from __future__ import annotations

import argparse

from app.database import SessionLocal
from app.services.visit_slot_extension_service import VisitSlotExtensionService


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--yes", action="store_true")
    args = parser.parse_args()
    if not args.yes:
        parser.error("Pass --yes")
    db = SessionLocal()
    try:
        result = VisitSlotExtensionService(db).send_due_warnings()
        print(f"Sent {result.get('sent', 0)} extension warning(s).")
    finally:
        db.close()


if __name__ == "__main__":
    main()
