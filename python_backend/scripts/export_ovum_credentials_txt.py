"""
Regenerate Ovum credential files (TXT + CSV) without touching the database.

  cd python_backend
  python scripts/export_ovum_credentials_txt.py
"""
from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from app.constants.ovum_credentials_manifest import build_ovum_credential_rows  # noqa: E402
from app.constants.ovum_credentials_txt import write_ovum_credentials_txt  # noqa: E402
from scripts.seed_ovum_hospital import (  # noqa: E402
    ALL_CREDENTIALS_TXT,
    write_credentials_csv,
)


def main() -> None:
    rows = build_ovum_credential_rows()
    write_credentials_csv(rows)
    write_ovum_credentials_txt(rows, ALL_CREDENTIALS_TXT)
    print(f"Created: {ALL_CREDENTIALS_TXT}")
    print(f"Also updated CSV files in {ALL_CREDENTIALS_TXT.parent}")


if __name__ == "__main__":
    main()
