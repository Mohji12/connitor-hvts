"""Permission checks for delivery and attendant modules."""

from __future__ import annotations

from functools import lru_cache
from typing import Annotated

from fastapi import Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies.auth import get_current_user
from app.models.permission_entities import Permission, RolePermission

# Default permission sets per connitor role (seeded by migrate_delivery_permissions.py)
ROLE_PERMISSION_DEFAULTS: dict[str, set[str]] = {
    "SUPER_ADMIN": {"*"},
    "HOSPITAL_ADMIN": {
        "VIEW_DELIVERY", "CREATE_DELIVERY", "UPDATE_DELIVERY", "VIEW_VENDOR", "CREATE_VENDOR",
        "APPROVE_VENDOR", "SCAN_QR", "VIEW_SECURITY_DASHBOARD", "VIEW_RECEIVING",
        "ASSIGN_DOCK", "START_RECEIVING", "GENERATE_GRN",
        "VIEW_WALLET", "VIEW_ATTENDANT_PASS", "MANAGE_ATTENDANT_PASS", "APPROVE_ATTENDANT_PASS", "MANAGE_DELIVERY_SLOTS",
    },
    "BRANCH_ADMIN": {
        "VIEW_DELIVERY", "VIEW_VENDOR", "APPROVE_VENDOR", "VIEW_SECURITY_DASHBOARD",
        "VIEW_RECEIVING", "VIEW_ATTENDANT_PASS", "MANAGE_DELIVERY_SLOTS",
    },
    "SECURITY": {
        "VIEW_DELIVERY", "SCAN_QR", "ALLOW_ENTRY", "REJECT_ENTRY", "MARK_EXIT",
        "VIEW_SECURITY_DASHBOARD", "VIEW_ATTENDANT_PASS", "SCAN_ATTENDANT_PASS",
    },
    "SECURITY_SUPERVISOR": {
        "VIEW_DELIVERY", "SCAN_QR", "ALLOW_ENTRY", "REJECT_ENTRY", "MARK_EXIT",
        "VIEW_SECURITY_DASHBOARD", "VIEW_VIOLATIONS", "VIEW_ATTENDANT_PASS", "SCAN_ATTENDANT_PASS",
    },
    "RECEIVING": {
        "VIEW_DELIVERY", "UPDATE_DELIVERY", "VIEW_RECEIVING", "ASSIGN_DOCK",
        "START_RECEIVING", "VERIFY_ITEMS", "GENERATE_GRN", "COMPLETE_RECEIVING",
    },
    "PURCHASE": {"VIEW_DELIVERY", "CREATE_DELIVERY", "VIEW_VENDOR"},
    "DISTRIBUTOR": {"VIEW_DELIVERY", "CREATE_DELIVERY", "VIEW_WALLET", "CREATE_PAYMENT", "MANAGE_AGENTS"},
    "DELIVERY_AGENT": {"VIEW_DELIVERY", "UPDATE_DELIVERY"},
    "WARD_ADMIN": {"VIEW_ATTENDANT_PASS", "MANAGE_ATTENDANT_PASS", "APPROVE_ATTENDANT_PASS"},
}


@lru_cache(maxsize=256)
def _role_has_permission_db(role: str, code: str, role_perm_key: str) -> bool:
  # placeholder — actual check uses DB session in has_permission
  return False


def has_permission(db: Session, role: str, code: str) -> bool:
    defaults = ROLE_PERMISSION_DEFAULTS.get(role, set())
    if "*" in defaults or code in defaults:
        return True
    row = (
        db.query(RolePermission)
        .filter(RolePermission.role == role, RolePermission.permissionCode == code)
        .first()
    )
    return row is not None


def require_permission(*codes: str):
    def dependency(
        user: Annotated[dict, Depends(get_current_user)],
        db: Annotated[Session, Depends(get_db)],
    ) -> dict:
        role = user.get("role") or ""
        if not any(has_permission(db, role, code) for code in codes):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")
        return user

    return dependency


def list_permissions_for_role(db: Session, role: str) -> list[str]:
    defaults = ROLE_PERMISSION_DEFAULTS.get(role, set())
    if "*" in defaults:
        return [p.code for p in db.query(Permission).all()]
    db_codes = [
        r.permissionCode for r in db.query(RolePermission).filter(RolePermission.role == role).all()
    ]
    return sorted(set(defaults) | set(db_codes))
