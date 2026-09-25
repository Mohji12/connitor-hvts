"""Expire unconfirmed sales-rep meetings past the confirmation window.

Usage:
  python scripts/expire_sales_meeting_confirmations.py --yes
"""
from __future__ import annotations

import argparse

from app.services.sales_meeting_dispatch import dispatch_auto_expire_and_notify


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--yes", action="store_true")
    args = parser.parse_args()
    if not args.yes:
        parser.error("Pass --yes")
    result = dispatch_auto_expire_and_notify()
    print(f"Expired {result.get('expired', 0)} meeting(s).")


if __name__ == "__main__":
    main()
