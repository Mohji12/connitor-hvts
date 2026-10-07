"""
Create or update the product admin account.

Password is read from PRODUCT_ADMIN_PASSWORD and is not written into the repo.
Email defaults to PRODUCT_LOG_EMAIL (mohangola2202@gmail.com).

Usage (from python_backend):
  python scripts/create_product_admin.py
"""

from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.config import get_settings
from app.database import SessionLocal
from app.models.entities import User
from app.models.enums import Role
from app.services.app_log_service import ensure_app_log_table
from app.utils.passwords import hash_password
from app.utils.timezone import now_ist

PRODUCT_ADMIN_PHONE = "9100220220"


def main() -> None:
    settings = get_settings()
    password = (settings.product_admin_password or "").strip()
    if not password:
        raise SystemExit("Set PRODUCT_ADMIN_PASSWORD in the server environment, then run this script again.")
    email = settings.product_log_email.strip().lower()
    ensure_app_log_table()
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == email).first()
        if user is None:
            user = db.query(User).filter(User.phone == PRODUCT_ADMIN_PHONE).first()
        if user is None:
            user = User(
                name="Product Admin",
                phone=PRODUCT_ADMIN_PHONE,
                email=email,
                role=Role.PRODUCT_ADMIN.value,
                isActive=True,
                phoneVerified=True,
                passwordHash=hash_password(password),
                createdAt=now_ist(),
                updatedAt=now_ist(),
            )
            db.add(user)
        else:
            user.name = "Product Admin"
            user.email = email
            user.role = Role.PRODUCT_ADMIN.value
            user.isActive = True
            user.passwordHash = hash_password(password)
            user.hospitalChainId = None
            user.branchId = None
            user.departmentId = None
            user.subDepartmentId = None
            user.updatedAt = now_ist()
        db.commit()
        print(f"Product admin ready: {email}")
    finally:
        db.close()


if __name__ == "__main__":
    main()
