"""Add passwordHash column and set default passwords for hospital users.

Run from python_backend:
  $env:PYTHONPATH="."
  python scripts/ensure_user_passwords.py

Password comes from DEFAULT_USER_PASSWORD in .env (falls back to Conninter123@).
"""
from sqlalchemy import inspect, text

from app.config import get_settings
from app.database import SessionLocal, engine
from app.models import User
from app.utils.passwords import hash_password

FALLBACK_PASSWORD = "Conninter123@"


def resolve_default_password() -> str:
    settings = get_settings()
    value = (settings.default_user_password or "").strip()
    return value or FALLBACK_PASSWORD


def ensure_column() -> None:
    inspector = inspect(engine)
    columns = {col["name"] for col in inspector.get_columns("User")}
    if "passwordHash" in columns:
        print("passwordHash column already exists.")
        return

    with engine.begin() as conn:
        conn.execute(text("ALTER TABLE `User` ADD COLUMN passwordHash VARCHAR(191) NULL"))
    print("Added passwordHash column to User table.")


def set_passwords(plain_password: str) -> None:
    hashed = hash_password(plain_password)
    db = SessionLocal()
    try:
        users = db.query(User).filter(User.email.isnot(None)).all()
        updated = 0
        for user in users:
            if not user.email:
                continue
            user.passwordHash = hashed
            updated += 1
        db.commit()
        print(f"Set login password for {updated} users (login ID = email).")
    finally:
        db.close()


def main() -> None:
    password = resolve_default_password()
    ensure_column()
    set_passwords(password)
    print(f"Default password: {password}")
    print("Source: DEFAULT_USER_PASSWORD in python_backend/.env (optional; falls back to Conninter123@).")
    print("Users sign in at /staff/login/ with their work email + this password.")


if __name__ == "__main__":
    main()
