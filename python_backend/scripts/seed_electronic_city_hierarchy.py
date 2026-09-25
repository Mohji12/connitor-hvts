"""
Seed full org hierarchy for Electronic City, Bangalore, Karnataka.

Hierarchy:
  Super Admin → Hospital Admin → Department Admin → Sub-Department Admin
    → Doctor, Nurse, Staff

Run from python_backend:
  python scripts/seed_electronic_city_hierarchy.py
  python scripts/seed_electronic_city_hierarchy.py --yes
"""
from __future__ import annotations

import argparse
import sys
import uuid
from datetime import datetime, timedelta
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from app.constants.electronic_city_entities import (  # noqa: E402
    CONNITOR_CHAIN_ID,
    DEPARTMENT_ADMIN_ID,
    DOCTOR_ID,
    ELECTRONIC_CITY_BRANCH_ID,
    GENERAL_MEDICINE_DEPT_ID,
    HOSPITAL_ADMIN_ID,
    NURSE_ID,
    OPD_SUB_DEPT_ID,
    STAFF_ID,
    SUB_DEPARTMENT_ADMIN_ID,
    SUPER_ADMIN_ID,
)
from app.database import SessionLocal  # noqa: E402
from app.models import (  # noqa: E402
    Branch,
    Department,
    DoctorAvailabilitySlot,
    HospitalChain,
    SubDepartment,
    User,
)
from app.utils.passwords import hash_password  # noqa: E402
from app.utils.timezone import now_ist  # noqa: E402

DEFAULT_PASSWORD = "Connitor@123"

CHAIN = {
    "id": CONNITOR_CHAIN_ID,
    "name": "Connitor Health Network",
    "phone": "08040110001",
    "email": "info@connitorhealth.com",
    "street": "Electronic City Phase 1, Hosur Road",
    "city": "Bangalore",
    "state": "Karnataka",
    "pinCode": "560100",
    "country": "India",
}

BRANCH = {
    "id": ELECTRONIC_CITY_BRANCH_ID,
    "name": "Connitor Hospital (Electronic City)",
    "email": "electroniccity@connitorhealth.com",
    "phone": "08040110002",
    "street": "Electronic City Phase 1, Hosur Road",
    "city": "Bangalore",
    "state": "Karnataka",
    "pinCode": "560100",
    "hospitalChainId": CONNITOR_CHAIN_ID,
    "country": "India",
}

DEPARTMENT = {
    "id": GENERAL_MEDICINE_DEPT_ID,
    "name": "General Medicine",
    "code": "GEN-MED",
    "description": "General medicine and primary care",
    "branchId": ELECTRONIC_CITY_BRANCH_ID,
    "hospitalChainId": CONNITOR_CHAIN_ID,
    "isActive": True,
}

SUB_DEPARTMENT = {
    "id": OPD_SUB_DEPT_ID,
    "name": "OPD",
    "code": "OPD",
    "description": "Outpatient department",
    "departmentId": GENERAL_MEDICINE_DEPT_ID,
    "branchId": ELECTRONIC_CITY_BRANCH_ID,
    "hospitalChainId": CONNITOR_CHAIN_ID,
    "isActive": True,
}

USERS = [
    {
        "id": SUPER_ADMIN_ID,
        "name": "Sushobhit Kundra",
        "phone": "6987456321",
        "email": "superadmin@hvts.com",
        "role": "SUPER_ADMIN",
        "isActive": True,
    },
    {
        "id": HOSPITAL_ADMIN_ID,
        "name": "Ananya Iyer",
        "phone": "9100100001",
        "email": "hospital.admin@connitor-elcity.com",
        "role": "HOSPITAL_ADMIN",
        "hospitalChainId": CONNITOR_CHAIN_ID,
        "branchId": ELECTRONIC_CITY_BRANCH_ID,
        "isActive": True,
    },
    {
        "id": DEPARTMENT_ADMIN_ID,
        "name": "Rohit Menon",
        "phone": "9100100002",
        "email": "dept.admin@connitor-elcity.com",
        "role": "DEPARTMENT_ADMIN",
        "hospitalChainId": CONNITOR_CHAIN_ID,
        "branchId": ELECTRONIC_CITY_BRANCH_ID,
        "departmentId": GENERAL_MEDICINE_DEPT_ID,
        "isActive": True,
    },
    {
        "id": SUB_DEPARTMENT_ADMIN_ID,
        "name": "Kavya Reddy",
        "phone": "9100100003",
        "email": "subdept.admin@connitor-elcity.com",
        "role": "SUB_DEPARTMENT_ADMIN",
        "hospitalChainId": CONNITOR_CHAIN_ID,
        "branchId": ELECTRONIC_CITY_BRANCH_ID,
        "departmentId": GENERAL_MEDICINE_DEPT_ID,
        "subDepartmentId": OPD_SUB_DEPT_ID,
        "isActive": True,
    },
    {
        "id": DOCTOR_ID,
        "name": "Dr. Priya Nair",
        "phone": "9100100004",
        "email": "priya.nair@connitor-elcity.com",
        "role": "STAFF",
        "userType": "DOCTOR",
        "department": "GENERAL_MEDICINE",
        "location": "OPD Room 3, Electronic City",
        "hospitalChainId": CONNITOR_CHAIN_ID,
        "branchId": ELECTRONIC_CITY_BRANCH_ID,
        "departmentId": GENERAL_MEDICINE_DEPT_ID,
        "subDepartmentId": OPD_SUB_DEPT_ID,
        "isActive": True,
    },
    {
        "id": NURSE_ID,
        "name": "Lakshmi Devi",
        "phone": "9100100005",
        "email": "lakshmi.devi@connitor-elcity.com",
        "role": "STAFF",
        "userType": "NURSE",
        "department": "GENERAL_MEDICINE",
        "location": "OPD Nursing Station, Electronic City",
        "hospitalChainId": CONNITOR_CHAIN_ID,
        "branchId": ELECTRONIC_CITY_BRANCH_ID,
        "departmentId": GENERAL_MEDICINE_DEPT_ID,
        "subDepartmentId": OPD_SUB_DEPT_ID,
        "isActive": True,
    },
    {
        "id": STAFF_ID,
        "name": "Manoj Kumar",
        "phone": "9100100006",
        "email": "manoj.kumar@connitor-elcity.com",
        "role": "STAFF",
        "userType": "RECEPTIONIST",
        "department": "GENERAL_MEDICINE",
        "location": "OPD Front Desk, Electronic City",
        "hospitalChainId": CONNITOR_CHAIN_ID,
        "branchId": ELECTRONIC_CITY_BRANCH_ID,
        "departmentId": GENERAL_MEDICINE_DEPT_ID,
        "subDepartmentId": OPD_SUB_DEPT_ID,
        "isActive": True,
    },
]

SLOT_WINDOWS = [(9, 0, 12, 0), (14, 0, 17, 0)]
SLOT_MINUTES = 30
DAYS_AHEAD = 14


def _upsert_chain(db, data: dict) -> None:
    row = db.get(HospitalChain, data["id"])
    now = datetime.utcnow()
    if row:
        for key, value in data.items():
            setattr(row, key, value)
        row.updatedAt = now
    else:
        db.add(HospitalChain(**data, createdAt=now, updatedAt=now))


def _upsert_branch(db, data: dict) -> None:
    row = db.get(Branch, data["id"])
    now = datetime.utcnow()
    payload = dict(data)
    country = payload.pop("country", "India")
    if row:
        for key, value in payload.items():
            setattr(row, key, value)
        row.country = country
        row.updatedAt = now
    else:
        db.add(Branch(**payload, country=country, createdAt=now, updatedAt=now))


def _upsert_department(db, data: dict) -> None:
    row = db.get(Department, data["id"])
    now = datetime.utcnow()
    if row:
        for key, value in data.items():
            setattr(row, key, value)
        row.updatedAt = now
    else:
        db.add(Department(**data, createdAt=now, updatedAt=now))


def _upsert_sub_department(db, data: dict) -> None:
    row = db.get(SubDepartment, data["id"])
    now = datetime.utcnow()
    if row:
        for key, value in data.items():
            setattr(row, key, value)
        row.updatedAt = now
    else:
        db.add(SubDepartment(**data, createdAt=now, updatedAt=now))


def _upsert_user(db, data: dict, password_hash: str) -> None:
    row = db.get(User, data["id"])
    now = datetime.utcnow()
    payload = dict(data)
    if row:
        for key, value in payload.items():
            setattr(row, key, value)
        row.passwordHash = password_hash
        row.updatedAt = now
    else:
        db.add(User(**payload, passwordHash=password_hash, createdAt=now, updatedAt=now))


def _slot_times_for_day(day: datetime) -> list[tuple[datetime, datetime]]:
    slots: list[tuple[datetime, datetime]] = []
    for start_h, start_m, end_h, end_m in SLOT_WINDOWS:
        cursor = day.replace(hour=start_h, minute=start_m, second=0, microsecond=0)
        window_end = day.replace(hour=end_h, minute=end_m, second=0, microsecond=0)
        while cursor + timedelta(minutes=SLOT_MINUTES) <= window_end:
            slot_end = cursor + timedelta(minutes=SLOT_MINUTES)
            slots.append((cursor, slot_end))
            cursor = slot_end
    return slots


def _seed_doctor_slots(db, doctor_id: str) -> int:
    today = now_ist().replace(hour=0, minute=0, second=0, microsecond=0)
    created = 0
    for offset in range(DAYS_AHEAD):
        day = today + timedelta(days=offset)
        for slot_start, slot_end in _slot_times_for_day(day):
            if slot_start <= now_ist():
                continue
            exists = (
                db.query(DoctorAvailabilitySlot)
                .filter(
                    DoctorAvailabilitySlot.doctorId == doctor_id,
                    DoctorAvailabilitySlot.slotStart == slot_start,
                )
                .first()
            )
            if exists:
                continue
            db.add(
                DoctorAvailabilitySlot(
                    id=str(uuid.uuid4()),
                    doctorId=doctor_id,
                    slotStart=slot_start,
                    slotEnd=slot_end,
                    isBooked=False,
                )
            )
            created += 1
    return created


def run(*, skip_confirm: bool = False) -> None:
    if not skip_confirm:
        print("This will upsert Electronic City hierarchy into the database.")
        answer = input("Continue? [y/N]: ").strip().lower()
        if answer not in {"y", "yes"}:
            print("Aborted.")
            return

    password_hash = hash_password(DEFAULT_PASSWORD)
    db = SessionLocal()
    try:
        print("Seeding Connitor Health Network (Electronic City, Bangalore)...")
        _upsert_chain(db, CHAIN)
        _upsert_branch(db, BRANCH)
        _upsert_department(db, DEPARTMENT)
        _upsert_sub_department(db, SUB_DEPARTMENT)
        db.commit()

        print("Seeding users...")
        for user_data in USERS:
            _upsert_user(db, user_data, password_hash)
            print(f"  {user_data['role']:22} {user_data['name']} ({user_data['phone']})")
        db.commit()

        slots = _seed_doctor_slots(db, DOCTOR_ID)
        db.commit()

        print(f"\nCreated {slots} doctor availability slots for Dr. Priya Nair.")
        print("\nHierarchy ready — Electronic City, Bangalore, Karnataka")
        print("  Chain:    Connitor Health Network")
        print("  Branch:   Connitor Hospital (Electronic City)")
        print("  Dept:     General Medicine > OPD")
        print(f"\nLogin password for all users: {DEFAULT_PASSWORD}")
        print("\nAccounts:")
        for user_data in USERS:
            email = user_data.get("email", "")
            role = user_data["role"]
            user_type = user_data.get("userType", "")
            suffix = f" [{user_type}]" if user_type else ""
            print(f"  {role}{suffix}: {email}")
    except Exception as exc:
        db.rollback()
        print("Seed failed:", exc)
        raise
    finally:
        db.close()


def main() -> None:
    parser = argparse.ArgumentParser(description="Seed Electronic City hospital hierarchy")
    parser.add_argument("--yes", action="store_true", help="Skip confirmation prompt")
    args = parser.parse_args()
    run(skip_confirm=args.yes)


if __name__ == "__main__":
    main()
