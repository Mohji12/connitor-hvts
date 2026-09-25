"""
Convert Excel contacts to iPhone / iCloud compatible .vcf (vCard 3.0).

iCloud is strict: use minimal cards, no blank lines between cards, small batches.

Usage:
  python vf.py                          # batch files (100 contacts each)
  python vf.py --test                   # create test_import.vcf (3 contacts)
  python vf.py --batch-size 0           # single file (not recommended for large lists)

Requirements:
  pip install pandas openpyxl
"""
from __future__ import annotations

import argparse
import re
import unicodedata
from pathlib import Path

import pandas as pd

DEFAULT_INPUT = Path(__file__).resolve().parent / "contact number.xlsx"
DEFAULT_OUTPUT = Path(__file__).resolve().parent / "contacts.vcf"

PHONE_CANDIDATES = ("phone", "mobile", "contact", "number", "tel", "cell")
NAME_CANDIDATES = ("name", "full name", "contact name", "person")

INVALID_PHONE_TEXT = re.compile(
    r"not\s*mention|na\b|n/?a|nil|none|null|unknown|-",
    re.IGNORECASE,
)



def normalize_header(value: object) -> str:
    return re.sub(r"\s+", " ", str(value).strip().lower())


def pick_column(columns: list[str], candidates: tuple[str, ...]) -> str | None:
    normalized = {normalize_header(col): col for col in columns}
    for candidate in candidates:
        if candidate in normalized:
            return normalized[candidate]
    for col in columns:
        header = normalize_header(col)
        if any(candidate in header for candidate in candidates):
            return col
    return None


def collapse_whitespace(value: str) -> str:
    return re.sub(r"\s+", " ", value).strip()


def strip_control_chars(value: str) -> str:
    cleaned: list[str] = []
    for char in value:
        if char in "\t\n\r":
            continue
        if unicodedata.category(char).startswith("C"):
            continue
        cleaned.append(char)
    return "".join(cleaned)


def sanitize_name(value: str) -> str:
    """Keep only characters safe for iCloud vCard import."""
    value = strip_control_chars(value)
    value = collapse_whitespace(value)
    value = re.sub(r"[<>{}[\]|\\^`~]", "", value)
    value = value.replace("\u00a0", " ")
    value = re.sub(r"[,;]+$", "", value).strip()
    return collapse_whitespace(value)


def escape_vcard_text(value: str) -> str:
    value = value.replace("\\", "\\\\")
    value = value.replace(",", r"\,")
    value = value.replace(";", r"\;")
    value = value.replace("\n", " ")
    value = value.replace("\r", " ")
    return value


def clean_phone(raw: object) -> str | None:
    if pd.isna(raw):
        return None

    phone = strip_control_chars(str(raw).strip())
    if not phone or INVALID_PHONE_TEXT.search(phone):
        return None

    phone = re.sub(r"\.0$", "", phone)
    phone = phone.replace(",", " ").replace("-", " ").replace("/", " ")
    digits = re.sub(r"\D", "", phone)
    if not digits:
        return None

    # Leading 0 on 11-digit Indian mobile: 09876543210 -> 9876543210
    if len(digits) == 11 and digits.startswith("0"):
        digits = digits[1:]

    if len(digits) == 10:
        return f"+91{digits}"

    if len(digits) == 12 and digits.startswith("91"):
        return f"+{digits}"

    # Malaysia, UAE, Australia, etc.
    if 11 <= len(digits) <= 15:
        return f"+{digits}"

    return None


def build_vcard(name: str, phone: str) -> str:
    """
    Minimal iCloud-safe vCard 3.0.
    Only FN + TEL (N kept simple: full name in family slot).
    """
    display_name = sanitize_name(name) or phone
    if not display_name:
        display_name = phone

    fn_value = escape_vcard_text(display_name)
    # Simple N field: full name in family slot, semicolons only as delimiters.
    n_value = escape_vcard_text(display_name)

    lines = [
        "BEGIN:VCARD",
        "VERSION:3.0",
        "PRODID:-//Connitor Contact Export//EN",
        f"N:{n_value};;;;",
        f"FN:{fn_value}",
        f"TEL;TYPE=CELL:{phone}",
        "END:VCARD",
    ]
    return "\r\n".join(lines)


def collect_vcards(df: pd.DataFrame, name_col: str, phone_col: str) -> tuple[list[str], int]:
    records: list[str] = []
    seen_phones: set[str] = set()
    skipped = 0

    for _, row in df.iterrows():
        phone = clean_phone(row.get(phone_col))
        if not phone or phone in seen_phones:
            skipped += 1
            continue

        raw_name = row.get(name_col)
        if pd.notna(raw_name):
            name = sanitize_name(str(raw_name))
        else:
            name = phone

        if not name:
            skipped += 1
            continue

        records.append(build_vcard(name, phone))
        seen_phones.add(phone)

    return records, skipped


def join_vcards(cards: list[str]) -> str:
    """iCloud expects cards back-to-back with no blank line between them."""
    if not cards:
        return ""
    return "\r\n".join(cards) + "\r\n"


def write_vcf(path: Path, cards: list[str]) -> None:
    path.write_text(join_vcards(cards), encoding="utf-8", newline="")


def convert_excel_to_vcf(
    input_path: Path,
    output_path: Path,
    *,
    batch_size: int | None = 100,
    limit: int | None = None,
) -> list[Path]:
    if not input_path.exists():
        raise FileNotFoundError(f"Excel file not found: {input_path}")

    df = pd.read_excel(input_path, dtype=str)
    if df.empty:
        raise ValueError("Excel file has no rows.")
    if limit:
        df = df.head(limit)

    name_col = pick_column(list(df.columns), NAME_CANDIDATES)
    phone_col = pick_column(list(df.columns), PHONE_CANDIDATES)
    if not phone_col:
        raise ValueError(
            f"Could not find a phone column. Available columns: {list(df.columns)}"
        )
    if not name_col:
        name_col = phone_col

    cards, skipped = collect_vcards(df, name_col, phone_col)
    if not cards:
        raise ValueError("No valid contacts found after cleaning phone numbers.")

    written_files: list[Path] = []
    stem = output_path.stem
    suffix = output_path.suffix or ".vcf"
    parent = output_path.parent

    if batch_size and batch_size > 0 and len(cards) > batch_size:
        for batch_index, start in enumerate(range(0, len(cards), batch_size), start=1):
            chunk_path = parent / f"{stem}_{batch_index:03d}{suffix}"
            write_vcf(chunk_path, cards[start : start + batch_size])
            written_files.append(chunk_path)
    else:
        write_vcf(output_path, cards)
        written_files.append(output_path)

    print(f"Input:   {input_path}")
    print(f"Columns: name='{name_col}', phone='{phone_col}'")
    print(f"Exported {len(cards)} contacts into {len(written_files)} file(s).")
    if skipped:
        print(f"Skipped {skipped} rows (blank/duplicate/invalid phone).")
    print("Output files:")
    for path in written_files:
        size_kb = path.stat().st_size / 1024
        count = path.read_text(encoding="utf-8").count("BEGIN:VCARD")
        print(f"  {path}  ({count} contacts, {size_kb:.1f} KB)")
    if len(written_files) > 1:
        print(
            "\nImport tip: upload ONE small file first (e.g. contacts_001.vcf) at icloud.com/contacts."
        )
    return written_files


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Convert Excel contacts to iPhone/iCloud compatible .vcf"
    )
    parser.add_argument("--input", "-i", type=Path, default=DEFAULT_INPUT)
    parser.add_argument("--output", "-o", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument(
        "--batch-size",
        type=int,
        default=100,
        help="Contacts per .vcf file (default 100). Use 0 for a single file.",
    )
    parser.add_argument(
        "--test",
        action="store_true",
        help="Create test_import.vcf with first 3 contacts only.",
    )
    args = parser.parse_args()

    if args.test:
        out = args.output.parent / "test_import.vcf"
        convert_excel_to_vcf(
            args.input,
            out,
            batch_size=None,
            limit=3,
        )
        print("\nTry importing test_import.vcf into iCloud first.")
        return

    batch_size = args.batch_size if args.batch_size > 0 else None
    convert_excel_to_vcf(args.input, args.output, batch_size=batch_size)


if __name__ == "__main__":
    main()
