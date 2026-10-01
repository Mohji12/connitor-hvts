"""
Seed Ovum Woman & Child Speciality Hospital chain: 7 Bengaluru branches,
HOSPITAL_ADMIN per branch, 6 departments + DEPARTMENT_ADMIN per branch,
2 doctors + 1 nurse per department, and public booking (OBGYN OPD + slots).

Password (hospital staff with login): Conninter123@

Usage:
  cd python_backend
  python scripts/seed_ovum_hospital.py --yes
"""
from __future__ import annotations

import argparse
import csv
import sys
import uuid
from datetime import timedelta
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from app.constants.ovum_branches_data import (  # noqa: E402
    OVUM_BRANCHES,
    branch_security_email,
    department_admin_email,
    sub_department_admin_email,
    department_doctor_email,
    department_nurse_email,
    location_to_email_slug,
)
from app.constants.ovum_departments_catalog import OBGYN_CODE, OVUM_DEPARTMENTS  # noqa: E402
from app.constants.ovum_entity_ids import (  # noqa: E402
    ovum_department_admin_id,
    ovum_department_admin_phone,
    ovum_sub_department_admin_id,
    ovum_sub_department_admin_phone,
    ovum_department_id,
    ovum_doctor_id,
    ovum_doctor_phone,
    ovum_nurse_id,
    ovum_nurse_phone,
    ovum_security_id,
    ovum_security_phone,
    ovum_sub_department_id,
)
from app.constants.ovum_credentials_txt import write_ovum_credentials_txt  # noqa: E402
from app.constants.ovum_entities import (  # noqa: E402
    OVUM_CHAIN_ADMIN_ID,
    OVUM_CHAIN_ID,
)

OVUM_NETWORK_ADMIN_EMAIL = "admin@ovum.conninter.com"
OVUM_NETWORK_ADMIN_PHONE = "9100200099"
from app.database import SessionLocal  # noqa: E402
from app.models import (  # noqa: E402
    Branch,
    BranchVisitSlotPolicy,
    Department,
    DoctorAvailabilitySlot,
    HospitalChain,
    SubDepartment,
    User,
)
from app.config import get_settings  # noqa: E402
from app.utils.passwords import hash_password  # noqa: E402
from app.utils.timezone import now_ist  # noqa: E402

def _default_password() -> str:
    value = (get_settings().default_user_password or "").strip()
    return value or "Conninter123@"


DEFAULT_PASSWORD = _default_password()

CHAIN = {
    "id": OVUM_CHAIN_ID,
    "name": "Ovum Woman & Child Speciality Hospital",
    "phone": "08040220001",
    "email": "info@ovumhospital.com",
    "street": "Bengaluru",
    "city": "Bengaluru",
    "state": "Karnataka",
    "pinCode": "560034",
    "country": "India",
}

SUB_CODE = "OPD"
SUB_NAME = "OPD"

SLOT_WINDOWS = [(9, 0, 12, 0), (14, 0, 17, 0)]
SLOT_MINUTES = 30

CREDENTIALS_CSV = Path(__file__).resolve().parent / "output" / "ovum_department_credentials.csv"
STAFF_CREDENTIALS_CSV = Path(__file__).resolve().parent / "output" / "ovum_staff_credentials.csv"
SECURITY_CREDENTIALS_CSV = Path(__file__).resolve().parent / "output" / "ovum_security_credentials.csv"
ALL_CREDENTIALS_TXT = Path(__file__).resolve().parent / "output" / "ovum_all_credentials.txt"
DOCTORS_PER_DEPARTMENT = 2


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


def ensure_branch_visit_slot_policy(db, branch_id: str, daily_quota: int = 50) -> None:
    """Idempotent: one BranchVisitSlotPolicy per branch (re-seed safe)."""
    exists = (
        db.query(BranchVisitSlotPolicy.id)
        .filter(BranchVisitSlotPolicy.branchId == branch_id)
        .first()
    )
    if exists:
        return
    db.add(BranchVisitSlotPolicy(branchId=branch_id, dailyQuota=daily_quota))


def upsert_user(db, data: dict, password: str | None) -> User:
    payload = {**data, "isActive": True}
    if password is not None:
        payload["passwordHash"] = hash_password(password)
    row = db.get(User, data["id"])
    if row is None:
        row = User(**payload)
        db.add(row)
    else:
        for key, value in payload.items():
            setattr(row, key, value)
    return row


def upsert_department_row(db, data: dict) -> Department:
    row = db.get(Department, data["id"])
    if row is None:
        row = Department(**data)
        db.add(row)
    else:
        for key, value in data.items():
            setattr(row, key, value)
    return row


def upsert_sub_department_row(db, data: dict) -> SubDepartment:
    row = db.get(SubDepartment, data["id"])
    if row is None:
        row = SubDepartment(**data)
        db.add(row)
    else:
        for key, value in data.items():
            setattr(row, key, value)
    return row


def deactivate_legacy_departments(db, branch_id: str, keep_dept_ids: set[str]) -> None:
    legacy = (
        db.query(Department)
        .filter(Department.branchId == branch_id, Department.isActive == True)  # noqa: E712
        .all()
    )
    for dept in legacy:
        if dept.id not in keep_dept_ids and dept.code in ("WOMEN-CHILD",):
            dept.isActive = False


def seed_doctor_slots_today(db, doctor: User) -> int:
    now = now_ist()
    day = now.replace(hour=0, minute=0, second=0, microsecond=0)
    candidates: list[tuple] = []
    for offset in range(2):
        d = day + timedelta(days=offset)
        for start_h, start_m, end_h, end_m in SLOT_WINDOWS:
            cursor = d.replace(hour=start_h, minute=start_m, second=0, microsecond=0)
            window_end = d.replace(hour=end_h, minute=end_m, second=0, microsecond=0)
            while cursor + timedelta(minutes=SLOT_MINUTES) <= window_end:
                slot_end = cursor + timedelta(minutes=SLOT_MINUTES)
                if cursor > now:
                    candidates.append((cursor, slot_end))
                cursor = slot_end
    created = 0
    for slot_start, slot_end in candidates[:2]:
        exists = (
            db.query(DoctorAvailabilitySlot)
            .filter(
                DoctorAvailabilitySlot.doctorId == doctor.id,
                DoctorAvailabilitySlot.slotStart == slot_start,
            )
            .first()
        )
        if exists:
            continue
        db.add(
            DoctorAvailabilitySlot(
                id=str(uuid.uuid4()),
                doctorId=doctor.id,
                slotStart=slot_start,
                slotEnd=slot_end,
                isBooked=False,
            )
        )
        created += 1
    return created


def seed_branch_catalog(
    db,
    branch_seed: dict,
    branch_index: int,
    credential_rows: list[dict],
) -> None:
    branch_id = branch_seed["id"]
    branch_slug = location_to_email_slug(branch_seed["location"])
    keep_dept_ids: set[str] = set()

    for dept_index, dept_tpl in enumerate(OVUM_DEPARTMENTS):
        dept_id = ovum_department_id(branch_id, branch_index, dept_tpl["code"])
        keep_dept_ids.add(dept_id)

        upsert_department_row(
            db,
            {
                "id": dept_id,
                "name": dept_tpl["name"],
                "code": dept_tpl["code"],
                "description": dept_tpl["description"],
                "branchId": branch_id,
                "hospitalChainId": OVUM_CHAIN_ID,
                "isActive": True,
            },
        )

        admin_email = department_admin_email(dept_tpl["slug"], branch_slug)
        upsert_user(
            db,
            {
                "id": ovum_department_admin_id(branch_id, dept_tpl["code"]),
                "name": f"Dept Admin — {dept_tpl['name']} ({branch_seed['location']})",
                "email": admin_email,
                "phone": ovum_department_admin_phone(branch_index, dept_index),
                "role": "DEPARTMENT_ADMIN",
                "hospitalChainId": OVUM_CHAIN_ID,
                "branchId": branch_id,
                "departmentId": dept_id,
                "subDepartmentId": None,
            },
            DEFAULT_PASSWORD,
        )
        credential_rows.append(
            {
                "branch": branch_seed["location"],
                "department": dept_tpl["name"],
                "role": "DEPARTMENT_ADMIN",
                "name": f"Dept Admin — {dept_tpl['name']}",
                "email": admin_email,
                "password": DEFAULT_PASSWORD,
            }
        )

        sub_id = ovum_sub_department_id(branch_id, branch_index, dept_tpl["code"])
        upsert_sub_department_row(
            db,
            {
                "id": sub_id,
                "name": SUB_NAME,
                "code": SUB_CODE,
                "description": "Outpatient consultations",
                "departmentId": dept_id,
                "branchId": branch_id,
                "hospitalChainId": OVUM_CHAIN_ID,
                "isActive": True,
            },
        )

        sub_admin_email = sub_department_admin_email(dept_tpl["slug"], branch_slug)
        upsert_user(
            db,
            {
                "id": ovum_sub_department_admin_id(branch_id, dept_tpl["code"]),
                "name": f"Sub-Dept Admin — {dept_tpl['name']} OPD ({branch_seed['location']})",
                "email": sub_admin_email,
                "phone": ovum_sub_department_admin_phone(branch_index, dept_index),
                "role": "SUB_DEPARTMENT_ADMIN",
                "hospitalChainId": OVUM_CHAIN_ID,
                "branchId": branch_id,
                "departmentId": dept_id,
                "subDepartmentId": sub_id,
            },
            DEFAULT_PASSWORD,
        )
        credential_rows.append(
            {
                "branch": branch_seed["location"],
                "department": f"{dept_tpl['name']} OPD",
                "role": "SUB_DEPARTMENT_ADMIN",
                "name": f"Sub-Dept Admin — {dept_tpl['name']} OPD",
                "email": sub_admin_email,
                "password": DEFAULT_PASSWORD,
            }
        )

        legacy_dept = (
            "OBSTETRICS_GYNAECOLOGY" if dept_tpl["code"] == OBGYN_CODE else "GENERAL_MEDICINE"
        )
        for doctor_index in range(1, DOCTORS_PER_DEPARTMENT + 1):
            doc_email = department_doctor_email(dept_tpl["slug"], branch_slug, doctor_index)
            doctor = upsert_user(
                db,
                {
                    "id": ovum_doctor_id(branch_id, branch_index, dept_tpl["code"], doctor_index),
                    "name": (
                        f"Dr. {dept_tpl['name']} {doctor_index} "
                        f"({branch_seed['location']})"
                    ),
                    "phone": ovum_doctor_phone(branch_index, dept_index, doctor_index),
                    "email": doc_email,
                    "role": "STAFF",
                    "userType": "DOCTOR",
                    "hospitalChainId": OVUM_CHAIN_ID,
                    "branchId": branch_id,
                    "departmentId": dept_id,
                    "subDepartmentId": sub_id,
                    "department": legacy_dept,
                    "location": branch_seed["name"],
                },
                DEFAULT_PASSWORD,
            )
            credential_rows.append(
                {
                    "branch": branch_seed["location"],
                    "department": dept_tpl["name"],
                    "role": "DOCTOR",
                    "name": doctor.name or "",
                    "email": doc_email,
                    "password": DEFAULT_PASSWORD,
                }
            )
            if dept_tpl["code"] == OBGYN_CODE and doctor_index == 1:
                seed_doctor_slots_today(db, doctor)

        nurse_email = department_nurse_email(dept_tpl["slug"], branch_slug)
        nurse = upsert_user(
            db,
            {
                "id": ovum_nurse_id(branch_id, dept_tpl["code"]),
                "name": f"Staff Nurse — {dept_tpl['name']} ({branch_seed['location']})",
                "phone": ovum_nurse_phone(branch_index, dept_index),
                "email": nurse_email,
                "role": "STAFF",
                "userType": "NURSE",
                "hospitalChainId": OVUM_CHAIN_ID,
                "branchId": branch_id,
                "departmentId": dept_id,
                "subDepartmentId": sub_id,
                "department": legacy_dept,
                "location": branch_seed["name"],
            },
            DEFAULT_PASSWORD,
        )
        credential_rows.append(
            {
                "branch": branch_seed["location"],
                "department": dept_tpl["name"],
                "role": "NURSE",
                "name": nurse.name or "",
                "email": nurse_email,
                "password": DEFAULT_PASSWORD,
            }
        )

    deactivate_legacy_departments(db, branch_id, keep_dept_ids)
    seed_branch_security(db, branch_seed, branch_index, credential_rows)


def seed_branch_security(
    db,
    branch_seed: dict,
    branch_index: int,
    credential_rows: list[dict],
) -> None:
    branch_id = branch_seed["id"]
    branch_slug = location_to_email_slug(branch_seed["location"])
    dept_id = ovum_department_id(branch_id, branch_index, OBGYN_CODE)
    sub_id = ovum_sub_department_id(branch_id, branch_index, OBGYN_CODE)
    sec_email = branch_security_email(branch_slug)
    security = upsert_user(
        db,
        {
            "id": ovum_security_id(branch_id),
            "name": f"Security — {branch_seed['location']}",
            "phone": ovum_security_phone(branch_index),
            "email": sec_email,
            "role": "SECURITY",
            "userType": None,
            "hospitalChainId": OVUM_CHAIN_ID,
            "branchId": branch_id,
            "departmentId": dept_id,
            "subDepartmentId": sub_id,
            "department": "GENERAL_MEDICINE",
            "location": f"Main gate, {branch_seed['name']}",
        },
        DEFAULT_PASSWORD,
    )
    credential_rows.append(
        {
            "branch": branch_seed["location"],
            "department": "Hospital security",
            "role": "SECURITY",
            "name": security.name or "",
            "email": sec_email,
            "password": DEFAULT_PASSWORD,
        }
    )


def write_credentials_csv(rows: list[dict]) -> None:
    CREDENTIALS_CSV.parent.mkdir(parents=True, exist_ok=True)
    fields = ["branch", "department", "role", "name", "email", "password"]
    admin_rows = [r for r in rows if r.get("role") == "DEPARTMENT_ADMIN"]
    staff_rows = [r for r in rows if r.get("role") in ("DOCTOR", "NURSE")]
    security_rows = [r for r in rows if r.get("role") == "SECURITY"]
    with CREDENTIALS_CSV.open("w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fields)
        writer.writeheader()
        writer.writerows(admin_rows)
    with STAFF_CREDENTIALS_CSV.open("w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fields)
        writer.writeheader()
        writer.writerows(staff_rows)
    with SECURITY_CREDENTIALS_CSV.open("w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fields)
        writer.writeheader()
        writer.writerows(security_rows)

    hospital_rows = [
        {
            "branch": b["location"],
            "department": "Hospital administration",
            "role": "HOSPITAL_ADMIN",
            "name": b["admin_name"],
            "email": b["admin_email"],
            "password": DEFAULT_PASSWORD,
        }
        for b in OVUM_BRANCHES
    ]
    full_rows = hospital_rows + rows
    write_ovum_credentials_txt(full_rows, ALL_CREDENTIALS_TXT)


def main() -> None:
    parser = argparse.ArgumentParser(description="Seed Ovum hospital chain (7 branches)")
    parser.add_argument("--yes", action="store_true", help="Apply changes")
    parser.add_argument(
        "--credentials-only",
        action="store_true",
        help="Write credential CSV/TXT files only (no database changes)",
    )
    args = parser.parse_args()
    if args.credentials_only:
        from app.constants.ovum_credentials_manifest import build_ovum_credential_rows  # noqa: E402

        rows = build_ovum_credential_rows()
        write_credentials_csv(rows)
        write_ovum_credentials_txt(rows, ALL_CREDENTIALS_TXT)
        print(f"Wrote {ALL_CREDENTIALS_TXT}")
        print(f"Wrote {CREDENTIALS_CSV}, {STAFF_CREDENTIALS_CSV}, {SECURITY_CREDENTIALS_CSV}")
        return
    if not args.yes:
        print("Dry run. Pass --yes to write to the database.")
        print(f"  Chain: {CHAIN['name']}")
        print(f"  Branches: {len(OVUM_BRANCHES)}")
        print(f"  Departments per branch: {len(OVUM_DEPARTMENTS)}")
        per_branch = len(OVUM_DEPARTMENTS)
        print(f"  Department admins: {len(OVUM_BRANCHES) * per_branch}")
        print(
            f"  Doctors: {len(OVUM_BRANCHES) * per_branch * DOCTORS_PER_DEPARTMENT}; "
            f"Nurses: {len(OVUM_BRANCHES) * per_branch}; "
            f"Security: {len(OVUM_BRANCHES)} (one per branch)"
        )
        for b in OVUM_BRANCHES:
            print(f"    - {b['name']}: hospital admin {b['admin_email']}")
        print(f"  Password (all admins): {DEFAULT_PASSWORD}")
        print(f"  Chain admin (all branches in dashboard): {OVUM_NETWORK_ADMIN_EMAIL}")
        return

    db = SessionLocal()
    credential_rows: list[dict] = []
    try:
        upsert_chain(db, CHAIN)
        for branch_index, branch_seed in enumerate(OVUM_BRANCHES):
            branch_data = {
                "id": branch_seed["id"],
                "name": branch_seed["name"],
                "email": branch_seed["email"],
                "phone": branch_seed["phone"],
                "street": branch_seed["street"],
                "city": branch_seed["city"],
                "state": branch_seed["state"],
                "pinCode": branch_seed["pinCode"],
                "hospitalChainId": OVUM_CHAIN_ID,
                "country": "India",
            }
            upsert_branch(db, branch_data)
            ensure_branch_visit_slot_policy(db, branch_seed["id"])
            upsert_user(
                db,
                {
                    "id": branch_seed["admin_id"],
                    "name": branch_seed["admin_name"],
                    "email": branch_seed["admin_email"],
                    "phone": branch_seed["admin_phone"],
                    "role": "HOSPITAL_ADMIN",
                    "hospitalChainId": OVUM_CHAIN_ID,
                    "branchId": branch_seed["id"],
                },
                DEFAULT_PASSWORD,
            )
            seed_branch_catalog(db, branch_seed, branch_index, credential_rows)
            db.flush()

        upsert_user(
            db,
            {
                "id": OVUM_CHAIN_ADMIN_ID,
                "name": "Ovum Network Admin",
                "email": OVUM_NETWORK_ADMIN_EMAIL,
                "phone": OVUM_NETWORK_ADMIN_PHONE,
                "role": "CHAIN_ADMIN",
                "hospitalChainId": OVUM_CHAIN_ID,
                "branchId": None,
            },
            DEFAULT_PASSWORD,
        )

        db.commit()
        write_credentials_csv(credential_rows)

        print("Ovum hospital chain seeded (7 branches, 6 departments each).")
        print(f"  All credentials (TXT): {ALL_CREDENTIALS_TXT}")
        print(f"  Password (all admins): {DEFAULT_PASSWORD}")
        print("  Staff login: http://localhost:3000/staff/login/")
        print(f"  Dept admin CSV: {CREDENTIALS_CSV}")
        print(f"  Staff CSV: {STAFF_CREDENTIALS_CSV}")
        print(f"  Security CSV: {SECURITY_CREDENTIALS_CSV}")
        print()
        admins = [r for r in credential_rows if r["role"] == "DEPARTMENT_ADMIN"]
        staff = [r for r in credential_rows if r["role"] in ("DOCTOR", "NURSE")]
        print("| Branch | Department | Admin email |")
        print("| --- | --- | --- |")
        for row in admins:
            print(f"| {row['branch']} | {row['department']} | {row['email']} |")
        print()
        print(f"Department admins: {len(admins)}; staff (doctors+nurses): {len(staff)}")
        print("Sample doctor login:", staff[0]["email"] if staff else "n/a")
        print("| Centre | Hospital admin |")
        print("| --- | --- |")
        for b in OVUM_BRANCHES:
            print(f"| {b['location']} | {b['admin_email']} |")
        print()
        print(f"Chain admin (all 7 branches): {OVUM_NETWORK_ADMIN_EMAIL} / {DEFAULT_PASSWORD}")
        print()
        print("| Branch | Security email |")
        print("| --- | --- |")
        for row in [r for r in credential_rows if r["role"] == "SECURITY"]:
            print(f"| {row['branch']} | {row['email']} |")
        print("Security login: http://localhost:3000/security/login")
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    main()
