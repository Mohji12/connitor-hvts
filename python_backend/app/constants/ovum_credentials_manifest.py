"""Build full Ovum credential list from constants (no database required)."""

from __future__ import annotations

from typing import Any

from app.constants.ovum_branches_data import (
    OVUM_BRANCHES,
    branch_security_email,
    department_admin_email,
    sub_department_admin_email,
    department_doctor_email,
    department_nurse_email,
    location_to_email_slug,
)
from app.constants.ovum_departments_catalog import OVUM_DEPARTMENTS
from app.config import get_settings

def _default_password() -> str:
    value = (get_settings().default_user_password or "").strip()
    return value or "Conninter123@"


DEFAULT_PASSWORD = _default_password()
OVUM_NETWORK_ADMIN_EMAIL = "admin@ovum.conninter.com"
DOCTORS_PER_DEPARTMENT = 2


def build_ovum_credential_rows() -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    for branch_seed in OVUM_BRANCHES:
        branch_slug = location_to_email_slug(branch_seed["location"])
        rows.append(
            {
                "branch": branch_seed["location"],
                "department": "Hospital administration",
                "role": "HOSPITAL_ADMIN",
                "name": branch_seed["admin_name"],
                "email": branch_seed["admin_email"],
                "password": DEFAULT_PASSWORD,
            }
        )
        for dept_tpl in OVUM_DEPARTMENTS:
            rows.append(
                {
                    "branch": branch_seed["location"],
                    "department": dept_tpl["name"],
                    "role": "DEPARTMENT_ADMIN",
                    "name": f"Dept Admin — {dept_tpl['name']}",
                    "email": department_admin_email(dept_tpl["slug"], branch_slug),
                    "password": DEFAULT_PASSWORD,
                }
            )
            rows.append(
                {
                    "branch": branch_seed["location"],
                    "department": f"{dept_tpl['name']} OPD",
                    "role": "SUB_DEPARTMENT_ADMIN",
                    "name": f"Sub-Dept Admin — {dept_tpl['name']} OPD",
                    "email": sub_department_admin_email(dept_tpl["slug"], branch_slug),
                    "password": DEFAULT_PASSWORD,
                }
            )
            for doctor_index in range(1, DOCTORS_PER_DEPARTMENT + 1):
                rows.append(
                    {
                        "branch": branch_seed["location"],
                        "department": dept_tpl["name"],
                        "role": "DOCTOR",
                        "name": f"Dr. {dept_tpl['name']} {doctor_index}",
                        "email": department_doctor_email(
                            dept_tpl["slug"], branch_slug, doctor_index
                        ),
                        "password": DEFAULT_PASSWORD,
                    }
                )
            rows.append(
                {
                    "branch": branch_seed["location"],
                    "department": dept_tpl["name"],
                    "role": "NURSE",
                    "name": f"Staff Nurse — {dept_tpl['name']}",
                    "email": department_nurse_email(dept_tpl["slug"], branch_slug),
                    "password": DEFAULT_PASSWORD,
                }
            )
        rows.append(
            {
                "branch": branch_seed["location"],
                "department": "Hospital security",
                "role": "SECURITY",
                "name": f"Security — {branch_seed['location']}",
                "email": branch_security_email(branch_slug),
                "password": DEFAULT_PASSWORD,
            }
        )
    return rows
