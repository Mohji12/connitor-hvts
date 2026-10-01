"""
Ovum Bengaluru centre metadata for seeding.

Each branch HOSPITAL_ADMIN login: {location-slug}@ovum.conninter.com
Department admins: {dept-slug}.{branch-slug}@ovum.conninter.com

Re-run after edits:
  python scripts/seed_ovum_hospital.py --yes
"""

from __future__ import annotations

import re
from typing import TypedDict

from app.constants.ovum_entities import OVUM_BRANCH_IDS, OVUM_HOSPITAL_ADMIN_IDS

OVUM_ADMIN_EMAIL_DOMAIN = "ovum.conninter.com"
OVUM_BRANCH_EMAIL_DOMAIN = "ovumhospital.com"


def location_to_email_slug(location: str) -> str:
    """Turn display location into email local-part: 'HSR Layout' -> 'hsr-layout'."""
    slug = location.lower().strip()
    slug = re.sub(r"[^a-z0-9]+", "-", slug)
    return re.sub(r"-+", "-", slug).strip("-")


def branch_slug_from_display_name(branch_name: str) -> str:
    """'Ovum Hospital — HSR Layout' -> 'hsr-layout'."""
    if "—" in branch_name:
        return location_to_email_slug(branch_name.split("—")[-1].strip())
    return location_to_email_slug(branch_name)


def department_admin_email(dept_slug: str, branch_slug: str) -> str:
    return f"{dept_slug}.{branch_slug}@{OVUM_ADMIN_EMAIL_DOMAIN}"


def sub_department_admin_email(dept_slug: str, branch_slug: str) -> str:
    return f"opd.{dept_slug}.{branch_slug}@{OVUM_ADMIN_EMAIL_DOMAIN}"


def department_doctor_email(dept_slug: str, branch_slug: str, doctor_index: int) -> str:
    return f"doctor.{dept_slug}.{doctor_index}.{branch_slug}@{OVUM_ADMIN_EMAIL_DOMAIN}"


def department_nurse_email(dept_slug: str, branch_slug: str) -> str:
    return f"nurse.{dept_slug}.{branch_slug}@{OVUM_ADMIN_EMAIL_DOMAIN}"


def branch_security_email(branch_slug: str) -> str:
    return f"security.{branch_slug}@{OVUM_ADMIN_EMAIL_DOMAIN}"


class OvumBranchSeed(TypedDict):
    id: str
    location: str
    name: str
    street: str
    city: str
    state: str
    pinCode: str
    phone: str
    email: str
    admin_id: str
    admin_name: str
    admin_email: str
    admin_phone: str


def _branch(
    index: int,
    location: str,
    street: str,
    pin_code: str,
    phone_suffix: str,
) -> OvumBranchSeed:
    i = index
    slug = location_to_email_slug(location)
    display = f"Ovum Hospital — {location}"
    return {
        "id": OVUM_BRANCH_IDS[i],
        "location": location,
        "name": display,
        "street": street,
        "city": "Bengaluru",
        "state": "Karnataka",
        "pinCode": pin_code,
        "phone": f"0804022{phone_suffix}",
        "email": f"{slug}@{OVUM_BRANCH_EMAIL_DOMAIN}",
        "admin_id": OVUM_HOSPITAL_ADMIN_IDS[i],
        "admin_name": f"Ovum Admin — {location}",
        "admin_email": f"{slug}@{OVUM_ADMIN_EMAIL_DOMAIN}",
        "admin_phone": f"9100200{100 + i:03d}",
    }


OVUM_BRANCHES: tuple[OvumBranchSeed, ...] = (
    _branch(0, "Kalyan Nagar", "HRBR Layout / Outer Ring Road", "560043", "001"),
    _branch(1, "HSR Layout", "Sector 2", "560102", "002"),
    _branch(2, "Banashankari", "100 Feet Outer Ring Road", "560070", "003"),
    _branch(3, "Hennur", "Hennur Main Road / Kothanur", "560084", "004"),
    _branch(4, "Bhattarahalli", "Old Madras Road", "560049", "005"),
    _branch(5, "Budigere Cross", "Bidarahalli", "560049", "006"),
    _branch(6, "Hoskote", "Swamy Vivekananda Nagar", "562114", "007"),
)
