"""
Seed Kauvery Hospital Bengaluru: 2 branches (Electronic City, Marathahalli),
full department / sub-department catalog, 2 doctors + 1 nurse per sub-department,
and login credentials.

Password: DEFAULT_USER_PASSWORD from .env, else Conninter123@

Usage:
  cd python_backend
  python scripts/seed_kauvery_hospital.py --yes
"""
from __future__ import annotations

import argparse
import csv
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from app.constants.kauvery_catalog import KAUVERY_DEPARTMENTS  # noqa: E402
from app.constants.kauvery_entities import (  # noqa: E402
    KAUVERY_BRANCHES,
    KAUVERY_CHAIN_ADMIN_ID,
    KAUVERY_CHAIN_ID,
    KAUVERY_HOSPITAL_ADMIN_IDS,
)
from app.constants.kauvery_entity_ids import (  # noqa: E402
    kauvery_department_admin_id,
    kauvery_department_id,
    kauvery_doctor_id,
    kauvery_nurse_id,
    kauvery_phone,
    kauvery_security_id,
    kauvery_sub_department_admin_id,
    kauvery_sub_department_id,
)
from app.config import get_settings  # noqa: E402
from app.database import SessionLocal  # noqa: E402
from app.models import Branch, Department, HospitalChain, SubDepartment, User  # noqa: E402
from app.utils.passwords import hash_password  # noqa: E402
from app.utils.timezone import now_ist  # noqa: E402

OUTPUT_DIR = Path(__file__).resolve().parent / "output"
CREDENTIALS_CSV = OUTPUT_DIR / "kauvery_staff_credentials.csv"
CREDENTIALS_TXT = OUTPUT_DIR / "kauvery_all_credentials.txt"
DOCTORS_PER_SUB = 2


def _default_password() -> str:
    value = (get_settings().default_user_password or "").strip()
    return value or "Conninter123@"


DEFAULT_PASSWORD = _default_password()
# Hash once — bcrypt per user is the dominant cost on a full catalog seed.
DEFAULT_PASSWORD_HASH = hash_password(DEFAULT_PASSWORD)

CHAIN = {
    "id": KAUVERY_CHAIN_ID,
    "name": "Kauvery Hospital",
    "phone": "08045601000",
    "email": "admin@kauvery.conninter.com",
    "street": "Bengaluru",
    "city": "Bengaluru",
    "state": "Karnataka",
    "pinCode": "560100",
    "country": "India",
}


def upsert_chain(db, data: dict) -> HospitalChain:
    row = db.get(HospitalChain, data["id"])
    if row is None:
        row = HospitalChain(**data)
        db.add(row)
    else:
        for key, value in data.items():
            setattr(row, key, value)
    return row


def upsert_branch(db, data: dict) -> Branch:
    row = db.get(Branch, data["id"])
    if row is None:
        row = Branch(**data)
        db.add(row)
    else:
        for key, value in data.items():
            setattr(row, key, value)
    return row


# Populated once per seed run to avoid per-row SELECT round-trips on remote MySQL.
_EXISTING_USER_IDS: set[str] = set()
_EXISTING_DEPT_IDS: set[str] = set()
_EXISTING_SUB_IDS: set[str] = set()
_USER_CACHE: dict[str, User] = {}
_DEPT_CACHE: dict[str, Department] = {}
_SUB_CACHE: dict[str, SubDepartment] = {}


def _load_existing_ids(db) -> None:
    _EXISTING_USER_IDS.clear()
    _EXISTING_DEPT_IDS.clear()
    _EXISTING_SUB_IDS.clear()
    _USER_CACHE.clear()
    _DEPT_CACHE.clear()
    _SUB_CACHE.clear()
    _EXISTING_USER_IDS.update(
        r[0]
        for r in db.query(User.id).filter(User.hospitalChainId == KAUVERY_CHAIN_ID).all()
    )
    _EXISTING_DEPT_IDS.update(
        r[0]
        for r in db.query(Department.id)
        .filter(Department.hospitalChainId == KAUVERY_CHAIN_ID)
        .all()
    )
    _EXISTING_SUB_IDS.update(
        r[0]
        for r in db.query(SubDepartment.id)
        .filter(SubDepartment.hospitalChainId == KAUVERY_CHAIN_ID)
        .all()
    )
    print(
        f"Existing Kauvery rows — users={len(_EXISTING_USER_IDS)} "
        f"depts={len(_EXISTING_DEPT_IDS)} subs={len(_EXISTING_SUB_IDS)}",
        flush=True,
    )


def upsert_user(db, data: dict, password: str | None) -> User:
    payload = {**data, "isActive": True}
    if password is not None:
        payload["passwordHash"] = (
            DEFAULT_PASSWORD_HASH if password == DEFAULT_PASSWORD else hash_password(password)
        )
    uid = data["id"]
    if uid in _USER_CACHE:
        row = _USER_CACHE[uid]
        for key, value in payload.items():
            setattr(row, key, value)
        return row
    if uid in _EXISTING_USER_IDS:
        row = db.get(User, uid)
        if row is None:
            row = User(**payload)
            db.add(row)
        else:
            for key, value in payload.items():
                setattr(row, key, value)
    else:
        row = User(**payload)
        db.add(row)
        _EXISTING_USER_IDS.add(uid)
    _USER_CACHE[uid] = row
    return row


def upsert_department_row(db, data: dict) -> Department:
    did = data["id"]
    if did in _DEPT_CACHE:
        row = _DEPT_CACHE[did]
        for key, value in data.items():
            setattr(row, key, value)
        return row
    if did in _EXISTING_DEPT_IDS:
        row = db.get(Department, did)
        if row is None:
            row = Department(**data)
            db.add(row)
        else:
            for key, value in data.items():
                setattr(row, key, value)
    else:
        row = Department(**data)
        db.add(row)
        _EXISTING_DEPT_IDS.add(did)
    _DEPT_CACHE[did] = row
    return row


def upsert_sub_department_row(db, data: dict) -> SubDepartment:
    sid = data["id"]
    if sid in _SUB_CACHE:
        row = _SUB_CACHE[sid]
        for key, value in data.items():
            setattr(row, key, value)
        return row
    if sid in _EXISTING_SUB_IDS:
        row = db.get(SubDepartment, sid)
        if row is None:
            row = SubDepartment(**data)
            db.add(row)
        else:
            for key, value in data.items():
                setattr(row, key, value)
    else:
        row = SubDepartment(**data)
        db.add(row)
        _EXISTING_SUB_IDS.add(sid)
    _SUB_CACHE[sid] = row
    return row


def _email(local: str) -> str:
    return f"{local}@kauvery.conninter.com"


def _cred(
    rows: list[dict],
    *,
    branch: str,
    department: str,
    role: str,
    name: str,
    email: str,
) -> None:
    rows.append(
        {
            "branch": branch,
            "department": department,
            "role": role,
            "name": name,
            "email": email,
            "password": DEFAULT_PASSWORD,
        }
    )


def seed_branch(
    db,
    branch_seed: dict,
    branch_index: int,
    credential_rows: list[dict],
) -> None:
    branch_id = branch_seed["id"]
    location = branch_seed["location"]
    branch_slug = branch_seed["slug"]

    upsert_branch(
        db,
        {
            "id": branch_id,
            "name": branch_seed["name"],
            "email": branch_seed["email"],
            "phone": branch_seed["phone"],
            "street": branch_seed["street"],
            "city": branch_seed["city"],
            "state": branch_seed["state"],
            "pinCode": branch_seed["pinCode"],
            "country": branch_seed["country"],
            "hospitalChainId": KAUVERY_CHAIN_ID,
            "slug": branch_seed["slug"],
        },
    )

    hospital_admin_email = _email(f"admin.{branch_slug}")
    hospital_admin = upsert_user(
        db,
        {
            "id": KAUVERY_HOSPITAL_ADMIN_IDS[branch_index],
            "name": f"Hospital Admin — {location}",
            "email": hospital_admin_email,
            "phone": kauvery_phone(branch_index, 99, 0, 7),
            "role": "HOSPITAL_ADMIN",
            "hospitalChainId": KAUVERY_CHAIN_ID,
            "branchId": branch_id,
        },
        DEFAULT_PASSWORD,
    )
    _cred(
        credential_rows,
        branch=location,
        department="Hospital",
        role="HOSPITAL_ADMIN",
        name=hospital_admin.name or "",
        email=hospital_admin_email,
    )
    db.commit()

    for dept_index, dept in enumerate(KAUVERY_DEPARTMENTS):
        print(
            f"  [{location}] department {dept_index + 1}/{len(KAUVERY_DEPARTMENTS)}: {dept['name']}",
            flush=True,
        )
        dept_id = kauvery_department_id(branch_id, dept["code"])
        upsert_department_row(
            db,
            {
                "id": dept_id,
                "name": dept["name"],
                "code": dept["code"],
                "description": dept["description"],
                "branchId": branch_id,
                "hospitalChainId": KAUVERY_CHAIN_ID,
                "isActive": True,
            },
        )

        dept_admin_email = _email(f"dept.{dept['slug']}.{branch_slug}")
        dept_admin = upsert_user(
            db,
            {
                "id": kauvery_department_admin_id(branch_id, dept["code"]),
                "name": f"Dept Admin — {dept['name']} ({location})",
                "email": dept_admin_email,
                "phone": kauvery_phone(branch_index, dept_index, 0, 1),
                "role": "DEPARTMENT_ADMIN",
                "hospitalChainId": KAUVERY_CHAIN_ID,
                "branchId": branch_id,
                "departmentId": dept_id,
            },
            DEFAULT_PASSWORD,
        )
        _cred(
            credential_rows,
            branch=location,
            department=dept["name"],
            role="DEPARTMENT_ADMIN",
            name=dept_admin.name or "",
            email=dept_admin_email,
        )

        for sub_index, sub in enumerate(dept["subDepartments"]):
            sub_id = kauvery_sub_department_id(branch_id, dept["code"], sub["code"])
            upsert_sub_department_row(
                db,
                {
                    "id": sub_id,
                    "name": sub["name"],
                    "code": sub["code"],
                    "description": sub["description"],
                    "departmentId": dept_id,
                    "branchId": branch_id,
                    "hospitalChainId": KAUVERY_CHAIN_ID,
                    "isActive": True,
                },
            )

            sub_admin_email = _email(f"sub.{dept['slug']}.{sub['slug']}.{branch_slug}")
            sub_admin = upsert_user(
                db,
                {
                    "id": kauvery_sub_department_admin_id(
                        branch_id, dept["code"], sub["code"]
                    ),
                    "name": f"Sub-Dept Admin — {sub['name']} ({location})",
                    "email": sub_admin_email,
                    "phone": kauvery_phone(branch_index, dept_index, sub_index, 2),
                    "role": "SUB_DEPARTMENT_ADMIN",
                    "hospitalChainId": KAUVERY_CHAIN_ID,
                    "branchId": branch_id,
                    "departmentId": dept_id,
                    "subDepartmentId": sub_id,
                },
                DEFAULT_PASSWORD,
            )
            _cred(
                credential_rows,
                branch=location,
                department=f"{dept['name']} / {sub['name']}",
                role="SUB_DEPARTMENT_ADMIN",
                name=sub_admin.name or "",
                email=sub_admin_email,
            )

            for doctor_index in range(1, DOCTORS_PER_SUB + 1):
                role_code = 2 + doctor_index  # 3, 4
                doc_email = _email(
                    f"dr{doctor_index}.{dept['slug']}.{sub['slug']}.{branch_slug}"
                )
                doctor = upsert_user(
                    db,
                    {
                        "id": kauvery_doctor_id(
                            branch_id, dept["code"], sub["code"], doctor_index
                        ),
                        "name": (
                            f"Dr. {sub['name']} {doctor_index} ({location})"
                        ),
                        "email": doc_email,
                        "phone": kauvery_phone(
                            branch_index, dept_index, sub_index, role_code
                        ),
                        "role": "STAFF",
                        "userType": "DOCTOR",
                        "hospitalChainId": KAUVERY_CHAIN_ID,
                        "branchId": branch_id,
                        "departmentId": dept_id,
                        "subDepartmentId": sub_id,
                        "department": "GENERAL_MEDICINE",
                        "location": branch_seed["name"],
                    },
                    DEFAULT_PASSWORD,
                )
                _cred(
                    credential_rows,
                    branch=location,
                    department=f"{dept['name']} / {sub['name']}",
                    role="DOCTOR",
                    name=doctor.name or "",
                    email=doc_email,
                )

            nurse_email = _email(f"nurse.{dept['slug']}.{sub['slug']}.{branch_slug}")
            nurse = upsert_user(
                db,
                {
                    "id": kauvery_nurse_id(branch_id, dept["code"], sub["code"]),
                    "name": f"Staff Nurse — {sub['name']} ({location})",
                    "email": nurse_email,
                    "phone": kauvery_phone(branch_index, dept_index, sub_index, 5),
                    "role": "STAFF",
                    "userType": "NURSE",
                    "hospitalChainId": KAUVERY_CHAIN_ID,
                    "branchId": branch_id,
                    "departmentId": dept_id,
                    "subDepartmentId": sub_id,
                    "department": "GENERAL_MEDICINE",
                    "location": branch_seed["name"],
                },
                DEFAULT_PASSWORD,
            )
            _cred(
                credential_rows,
                branch=location,
                department=f"{dept['name']} / {sub['name']}",
                role="NURSE",
                name=nurse.name or "",
                email=nurse_email,
            )

        # Commit per department so remote MySQL locks stay short.
        db.commit()

    first_dept = KAUVERY_DEPARTMENTS[0]
    first_sub = first_dept["subDepartments"][0]
    sec_email = _email(f"security.{branch_slug}")
    security = upsert_user(
        db,
        {
            "id": kauvery_security_id(branch_id),
            "name": f"Security — {location}",
            "email": sec_email,
            "phone": kauvery_phone(branch_index, 98, 0, 6),
            "role": "SECURITY",
            "hospitalChainId": KAUVERY_CHAIN_ID,
            "branchId": branch_id,
            "departmentId": kauvery_department_id(branch_id, first_dept["code"]),
            "subDepartmentId": kauvery_sub_department_id(
                branch_id, first_dept["code"], first_sub["code"]
            ),
            "department": "GENERAL_MEDICINE",
            "location": f"Main gate, {branch_seed['name']}",
        },
        DEFAULT_PASSWORD,
    )
    _cred(
        credential_rows,
        branch=location,
        department="Hospital security",
        role="SECURITY",
        name=security.name or "",
        email=sec_email,
    )
    db.commit()


def write_credentials(rows: list[dict]) -> None:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    with CREDENTIALS_CSV.open("w", newline="", encoding="utf-8") as fh:
        writer = csv.DictWriter(
            fh,
            fieldnames=["branch", "department", "role", "name", "email", "password"],
        )
        writer.writeheader()
        writer.writerows(rows)

    lines = [
        "Kauvery Hospital — Bengaluru login credentials",
        f"Generated: {now_ist().isoformat(timespec='seconds')}",
        f"Default password: {DEFAULT_PASSWORD}",
        f"Branches: Electronic City, Marathahalli",
        f"Departments: {len(KAUVERY_DEPARTMENTS)} (mirrored on both branches)",
        f"Staff rows: {len(rows)}",
        "",
        "Hospital Super Admin (CHAIN_ADMIN — all Bengaluru branches):",
        f"  email: {_email('admin')}",
        f"  password: {DEFAULT_PASSWORD}",
        "",
    ]
    by_branch: dict[str, list[dict]] = {}
    for row in rows:
        by_branch.setdefault(row["branch"], []).append(row)
    for branch, items in by_branch.items():
        lines.append(f"=== {branch} ===")
        for item in items:
            lines.append(
                f"  [{item['role']}] {item['name']} | {item['email']} | {item['password']}"
                f" | {item['department']}"
            )
        lines.append("")
    CREDENTIALS_TXT.write_text("\n".join(lines), encoding="utf-8")


def seed(*, dry_run: bool) -> None:
    credential_rows: list[dict] = []
    db = SessionLocal()
    try:
        _load_existing_ids(db)
        upsert_chain(db, CHAIN)
        chain_email = _email("admin")
        upsert_user(
            db,
            {
                "id": KAUVERY_CHAIN_ADMIN_ID,
                "name": "Kauvery Hospital Super Admin",
                "email": chain_email,
                "phone": kauvery_phone(9, 99, 0, 8),
                "role": "CHAIN_ADMIN",
                "hospitalChainId": KAUVERY_CHAIN_ID,
                "branchId": None,
            },
            DEFAULT_PASSWORD,
        )
        _cred(
            credential_rows,
            branch="Network",
            department="Chain",
            role="CHAIN_ADMIN",
            name="Kauvery Hospital Super Admin",
            email=chain_email,
        )
        db.commit()

        for branch_index, branch_seed in enumerate(KAUVERY_BRANCHES):
            seed_branch(db, branch_seed, branch_index, credential_rows)

        if dry_run:
            db.rollback()
            print(f"Dry run OK — would write {len(credential_rows)} credential rows.")
            return

        db.commit()  # network admin + security users from last branch flush path
        write_credentials(credential_rows)
        print(f"Seeded Kauvery Hospital ({len(KAUVERY_BRANCHES)} branches).")
        print(f"Departments per branch: {len(KAUVERY_DEPARTMENTS)}")
        print(f"Credentials CSV: {CREDENTIALS_CSV}")
        print(f"Credentials TXT: {CREDENTIALS_TXT}")
        print(f"Password: {DEFAULT_PASSWORD}")
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


def main() -> None:
    parser = argparse.ArgumentParser(description="Seed Kauvery Hospital Bengaluru")
    parser.add_argument("--yes", action="store_true", help="Apply changes")
    parser.add_argument("--dry-run", action="store_true", help="Rollback after seed")
    args = parser.parse_args()
    if not args.yes and not args.dry_run:
        parser.error("Pass --yes to apply, or --dry-run to preview.")
    seed(dry_run=args.dry_run)


if __name__ == "__main__":
    main()
