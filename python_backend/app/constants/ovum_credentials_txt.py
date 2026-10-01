"""Write location-wise Ovum credentials as plain text."""

from __future__ import annotations

from pathlib import Path
from typing import Any

from app.constants.ovum_branches_data import OVUM_BRANCHES
from app.constants.ovum_credentials_manifest import (
    DEFAULT_PASSWORD,
    OVUM_NETWORK_ADMIN_EMAIL,
)

ROLE_ORDER = (
    "HOSPITAL_ADMIN",
    "SECURITY",
    "DEPARTMENT_ADMIN",
    "SUB_DEPARTMENT_ADMIN",
    "DOCTOR",
    "NURSE",
)
ROLE_LABELS = {
    "HOSPITAL_ADMIN": "Hospital admin (branch)",
    "SECURITY": "Security (gate)",
    "DEPARTMENT_ADMIN": "Department admin",
    "SUB_DEPARTMENT_ADMIN": "Sub-department admin (OPD)",
    "DOCTOR": "Doctor",
    "NURSE": "Nurse",
}

STAFF_LOGIN_LOCAL = "http://localhost:3000/staff/login/"
STAFF_LOGIN_PROD = "https://conninter-main.vercel.app/staff/login/"
SECURITY_LOGIN_LOCAL = "http://localhost:3000/security/login/"
SECURITY_LOGIN_PROD = "https://conninter-main.vercel.app/security/login/"
VISITOR_BOOK_LOCAL = "http://localhost:3000/book-appointment/ovum/"
VISITOR_BOOK_PROD = "https://conninter-main.vercel.app/book-appointment/ovum/"


def _login_urls_for_role(role: str) -> tuple[str, str]:
    if role == "SECURITY":
        return SECURITY_LOGIN_LOCAL, SECURITY_LOGIN_PROD
    return STAFF_LOGIN_LOCAL, STAFF_LOGIN_PROD


def write_ovum_credentials_txt(
    rows: list[dict[str, Any]],
    path: Path,
    *,
    chain_admin_email: str = OVUM_NETWORK_ADMIN_EMAIL,
    default_password: str = DEFAULT_PASSWORD,
) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    by_branch: dict[str, list[dict[str, Any]]] = {b["location"]: [] for b in OVUM_BRANCHES}
    for row in rows:
        loc = row.get("branch")
        if loc and loc in by_branch:
            by_branch[loc].append(row)

    lines: list[str] = [
        "OVUM WOMAN & CHILD SPECIALITY HOSPITAL",
        "Bengaluru — area-wise login credentials",
        "=" * 78,
        "",
        f"Default password (all accounts in this file): {default_password}",
        "",
        "LOGIN URLS (use the line that matches your environment)",
        "-" * 78,
        "Hospital staff (hospital admin, chain admin, department admin, sub-department admin, doctors, nurses):",
        f"  Local:      {STAFF_LOGIN_LOCAL}",
        f"  Production: {STAFF_LOGIN_PROD}",
        "",
        "Security gate only:",
        f"  Local:      {SECURITY_LOGIN_LOCAL}",
        f"  Production: {SECURITY_LOGIN_PROD}",
        "",
        "Public visitor booking (all 7 centres):",
        f"  Local:      {VISITOR_BOOK_LOCAL}",
        f"  Production: {VISITOR_BOOK_PROD}",
        "",
        "=" * 78,
        "NETWORK — ALL 7 LOCATIONS",
        "=" * 78,
        "Role:          Chain admin (entire Ovum network)",
        f"Email:         {chain_admin_email}",
        f"Password:      {default_password}",
        f"Login (local): {STAFF_LOGIN_LOCAL}",
        f"Login (prod):  {STAFF_LOGIN_PROD}",
        "",
    ]

    for branch_seed in OVUM_BRANCHES:
        loc = branch_seed["location"]
        lines.append("=" * 78)
        lines.append(f"AREA / LOCATION: {loc.upper()}")
        lines.append(
            f"Branch: {branch_seed['name']}",
        )
        lines.append(
            f"Address: {branch_seed['street']}, {branch_seed['city']} {branch_seed['pinCode']}",
        )
        lines.append("-" * 78)

        branch_rows = by_branch.get(loc, [])
        for role in ROLE_ORDER:
            role_rows = [r for r in branch_rows if r.get("role") == role]
            if not role_rows:
                continue
            login_local, login_prod = _login_urls_for_role(role)
            lines.append("")
            lines.append(f"  {ROLE_LABELS.get(role, role)}")
            lines.append(f"    Login (local): {login_local}")
            lines.append(f"    Login (prod):  {login_prod}")
            for r in role_rows:
                dept = r.get("department", "")
                if role in ("DEPARTMENT_ADMIN", "SUB_DEPARTMENT_ADMIN", "DOCTOR", "NURSE") and dept:
                    lines.append(f"    --- {dept} ---")
                lines.append(f"    Email:    {r['email']}")
                if r.get("name"):
                    lines.append(f"    Name:     {r['name']}")
                lines.append(f"    Password: {r['password']}")
        lines.append("")

    lines.append("=" * 78)
    lines.append("Regenerate this file:  cd python_backend && python scripts/export_ovum_credentials_txt.py")
    lines.append("=" * 78)
    path.write_text("\n".join(lines), encoding="utf-8")
