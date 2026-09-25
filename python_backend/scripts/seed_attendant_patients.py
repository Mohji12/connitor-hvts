"""
Seed attendant-module demo patients + ACTIVE admissions
for Connitor Hospital (Electronic City).

Also ensures a WARD_ADMIN login for the ward dashboard.

Usage:
  python scripts/seed_attendant_patients.py --yes
"""
from __future__ import annotations

import argparse

from app.constants.electronic_city_entities import (
    CONNITOR_CHAIN_ID,
    ELECTRONIC_CITY_BRANCH_ID,
)
from app.database import SessionLocal
from app.models import Branch, User
from app.models.attendant_entities import Admission, Attendant, Patient
from app.utils.passwords import hash_password

# Deterministic IDs so re-runs are idempotent (Electronic City namespace)
WARD_ADMIN_ID = "11000000-0000-4000-8000-000000000021"
WARD_ADMIN_EMAIL = "ward.admin@connitor-elcity.com"
WARD_ADMIN_PHONE = "9100100021"
WARD_ADMIN_PASSWORD = "Connitor@123"

BRANCH_ID = ELECTRONIC_CITY_BRANCH_ID
CHAIN_ID = CONNITOR_CHAIN_ID

SEED_PATIENTS: list[dict] = [
    {
        "id": "11000000-0000-4000-8000-000000000101",
        "admissionId": "11000000-0000-4000-8000-000000000201",
        "mrn": "MRN-ICU-1001",
        "firstName": "Ravi",
        "lastName": "Kumar",
        "phone": "9111001001",
        "wardName": "ICU",
        "roomNumber": "101",
        "bedNumber": "A",
        "attendant": {
            "id": "11000000-0000-4000-8000-000000000301",
            "name": "Anita Kumar",
            "email": "anita.kumar@example.com",
            "phone": "9222002001",
            "relationship": "Spouse",
            "status": "PENDING",
        },
    },
    {
        "id": "11000000-0000-4000-8000-000000000102",
        "admissionId": "11000000-0000-4000-8000-000000000202",
        "mrn": "MRN-GEN-2002",
        "firstName": "Priya",
        "lastName": "Sharma",
        "phone": "9111001002",
        "wardName": "General Ward",
        "roomNumber": "215",
        "bedNumber": "B",
        "attendant": {
            "id": "11000000-0000-4000-8000-000000000302",
            "name": "Amit Sharma",
            "email": "amit.sharma@example.com",
            "phone": "9222002002",
            "relationship": "Brother",
            "status": "APPROVED",
        },
    },
    {
        "id": "11000000-0000-4000-8000-000000000103",
        "admissionId": "11000000-0000-4000-8000-000000000203",
        "mrn": "MRN-PED-3003",
        "firstName": "Arjun",
        "lastName": "Nair",
        "phone": "9111001003",
        "wardName": "Pediatrics",
        "roomNumber": "12",
        "bedNumber": "1",
        "attendant": None,
    },
    {
        "id": "11000000-0000-4000-8000-000000000104",
        "admissionId": "11000000-0000-4000-8000-000000000204",
        "mrn": "MRN-CARD-4004",
        "firstName": "Meera",
        "lastName": "Iyer",
        "phone": "9111001004",
        "wardName": "Cardiology",
        "roomNumber": "308",
        "bedNumber": "2",
        "attendant": {
            "id": "11000000-0000-4000-8000-000000000304",
            "name": "Suresh Iyer",
            "email": "suresh.iyer@example.com",
            "phone": "9222002004",
            "relationship": "Son",
            "status": "PENDING",
        },
    },
]


def _ensure_ward_admin(db) -> None:
    existing = db.query(User).filter(User.email == WARD_ADMIN_EMAIL).first()
    if existing:
        if existing.branchId != BRANCH_ID:
            existing.branchId = BRANCH_ID
            existing.hospitalChainId = CHAIN_ID
            print(f"Updated WARD_ADMIN branch → Electronic City: {WARD_ADMIN_EMAIL}")
        else:
            print(f"WARD_ADMIN already exists: {WARD_ADMIN_EMAIL}")
        return
    db.add(
        User(
            id=WARD_ADMIN_ID,
            name="Ward Admin (Electronic City)",
            phone=WARD_ADMIN_PHONE,
            email=WARD_ADMIN_EMAIL,
            role="WARD_ADMIN",
            branchId=BRANCH_ID,
            hospitalChainId=CHAIN_ID,
            passwordHash=hash_password(WARD_ADMIN_PASSWORD),
            isActive=True,
        )
    )
    print(f"Created WARD_ADMIN {WARD_ADMIN_EMAIL} / {WARD_ADMIN_PASSWORD}")


def _upsert_patient_row(db, row: dict) -> None:
    patient = db.get(Patient, row["id"])
    if not patient:
        by_mrn = (
            db.query(Patient)
            .filter(Patient.branchId == BRANCH_ID, Patient.mrn == row["mrn"])
            .first()
        )
        if by_mrn:
            patient = by_mrn
            print(f"Patient MRN {row['mrn']} already exists ({patient.id})")
        else:
            patient = Patient(
                id=row["id"],
                branchId=BRANCH_ID,
                mrn=row["mrn"],
                firstName=row["firstName"],
                lastName=row["lastName"],
                phone=row["phone"],
                isActive=True,
            )
            db.add(patient)
            print(f"Created patient {row['mrn']} — {row['firstName']} {row['lastName']}")
    else:
        print(f"Patient {row['mrn']} already seeded")

    db.flush()

    admission = db.get(Admission, row["admissionId"])
    if not admission:
        active = (
            db.query(Admission)
            .filter(Admission.patientId == patient.id, Admission.status == "ACTIVE")
            .first()
        )
        if active:
            admission = active
            print(f"  Active admission already exists for {row['mrn']}")
        else:
            admission = Admission(
                id=row["admissionId"],
                patientId=patient.id,
                branchId=BRANCH_ID,
                wardName=row["wardName"],
                roomNumber=row["roomNumber"],
                bedNumber=row["bedNumber"],
                status="ACTIVE",
            )
            db.add(admission)
            print(
                f"  Created admission {row['wardName']} "
                f"Rm {row['roomNumber']}/{row['bedNumber']}"
            )
    else:
        print(f"  Admission {row['admissionId'][:8]}… already seeded")

    db.flush()

    att = row.get("attendant")
    if not att:
        return

    existing_att = db.get(Attendant, att["id"])
    if existing_att:
        print(f"  Attendant {att['name']} already seeded")
        return

    by_email = (
        db.query(Attendant)
        .filter(Attendant.admissionId == admission.id, Attendant.email == att["email"])
        .first()
    )
    if by_email:
        print(f"  Attendant {att['email']} already exists for this admission")
        return

    db.add(
        Attendant(
            id=att["id"],
            admissionId=admission.id,
            branchId=BRANCH_ID,
            name=att["name"],
            email=att["email"],
            phone=att["phone"],
            relationship=att.get("relationship"),
            status=att.get("status", "PENDING"),
        )
    )
    print(f"  Created attendant {att['name']} ({att.get('status', 'PENDING')})")


def run() -> None:
    db = SessionLocal()
    try:
        branch = db.get(Branch, BRANCH_ID)
        if not branch:
            raise SystemExit(
                f"Branch {BRANCH_ID} not found. "
                "Run: python scripts/seed_electronic_city_hierarchy.py --yes"
            )

        print(f"Seeding attendant patients for {branch.name} ({BRANCH_ID})")
        _ensure_ward_admin(db)

        for row in SEED_PATIENTS:
            _upsert_patient_row(db, row)

        db.commit()
        print("\nAttendant patient seed complete (Electronic City).")
        print("Public apply lookup examples:")
        for row in SEED_PATIENTS:
            print(f"  MRN={row['mrn']}  ward={row['wardName']}")
        print(f"\nWard login: {WARD_ADMIN_EMAIL} / {WARD_ADMIN_PASSWORD}")
        print("Hospital admin: hospital.admin@connitor-elcity.com / Connitor@123")
        print("Dashboard: /dashboard/ams")
        print("Public apply: /attendant-pass/apply")
    finally:
        db.close()


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--yes", action="store_true")
    args = parser.parse_args()
    if not args.yes:
        parser.error("Pass --yes to seed attendant patient data")
    run()


if __name__ == "__main__":
    main()
