"""List all email addresses and phone numbers from the database."""
from sqlalchemy import text

from app.database import SessionLocal

QUERIES = [
    ("User", "SELECT name, role, email, phone FROM User ORDER BY email, phone"),
    (
        "Visitor",
        "SELECT firstName, lastName, email, alternateEmail, phone, alternatePhone "
        "FROM Visitor ORDER BY phone",
    ),
    ("HospitalChain", "SELECT name, email, phone FROM HospitalChain ORDER BY name"),
    ("Branch", "SELECT name, email, phone FROM Branch ORDER BY name"),
]


def main() -> None:
    db = SessionLocal()
    all_emails: set[str] = set()
    all_phones: set[str] = set()

    try:
        for label, sql in QUERIES:
            rows = db.execute(text(sql)).mappings().all()
            print(f"\n=== {label} ({len(rows)} rows) ===")
            for row in rows:
                data = dict(row)
                print(data)
                for key, value in data.items():
                    if not value:
                        continue
                    key_lower = key.lower()
                    text_val = str(value).strip()
                    if "email" in key_lower and "@" in text_val:
                        all_emails.add(text_val.lower())
                    if "phone" in key_lower:
                        all_phones.add(text_val)

        print("\n=== SUMMARY ===")
        print(f"Unique emails (all tables): {len(all_emails)}")
        for email in sorted(all_emails):
            print(f"  {email}")

        print(f"\nUnique phone numbers (all tables): {len(all_phones)}")
        for phone in sorted(all_phones):
            print(f"  {phone}")
    finally:
        db.close()


if __name__ == "__main__":
    main()
