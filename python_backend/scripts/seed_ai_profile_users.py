"""
Seed AI demo users for every Connitor role profile at Electronic City.

Password for all: Connitor@123

Usage:
  python scripts/seed_ai_profile_users.py --yes
"""
from __future__ import annotations

import argparse

from app.constants.electronic_city_entities import (
    CONNITOR_CHAIN_ID,
    DEPARTMENT_ADMIN_ID,
    DOCTOR_ID,
    ELECTRONIC_CITY_BRANCH_ID,
    GENERAL_MEDICINE_DEPT_ID,
    HOSPITAL_ADMIN_ID,
    OPD_SUB_DEPT_ID,
    SUB_DEPARTMENT_ADMIN_ID,
    SUPER_ADMIN_ID,
)
from app.database import SessionLocal
from app.delivery.distributor_service import DistributorService
from app.models import Branch, User
from app.models.delivery_entities import Distributor, VendorBranchMapping
from app.utils.passwords import hash_password

PASSWORD = "Connitor@123"
BRANCH_ID = ELECTRONIC_CITY_BRANCH_ID
CHAIN_ID = CONNITOR_CHAIN_ID

# Deterministic AI profile users (Electronic City)
AI_USERS: list[dict] = [
    {
        "id": SUPER_ADMIN_ID,
        "name": "AI Super Admin",
        "email": "superadmin@hvts.com",
        "phone": "6987456321",
        "role": "SUPER_ADMIN",
        "reuse_existing_id": True,
    },
    {
        "id": HOSPITAL_ADMIN_ID,
        "name": "AI Hospital Admin",
        "email": "hospital.admin@connitor-elcity.com",
        "phone": "9100100001",
        "role": "HOSPITAL_ADMIN",
        "hospitalChainId": CHAIN_ID,
        "branchId": BRANCH_ID,
        "reuse_existing_id": True,
    },
    {
        "id": DEPARTMENT_ADMIN_ID,
        "name": "AI Department Admin",
        "email": "dept.admin@connitor-elcity.com",
        "phone": "9100100002",
        "role": "DEPARTMENT_ADMIN",
        "hospitalChainId": CHAIN_ID,
        "branchId": BRANCH_ID,
        "departmentId": GENERAL_MEDICINE_DEPT_ID,
        "reuse_existing_id": True,
    },
    {
        "id": SUB_DEPARTMENT_ADMIN_ID,
        "name": "AI Sub-Department Admin",
        "email": "subdept.admin@connitor-elcity.com",
        "phone": "9100100003",
        "role": "SUB_DEPARTMENT_ADMIN",
        "hospitalChainId": CHAIN_ID,
        "branchId": BRANCH_ID,
        "departmentId": GENERAL_MEDICINE_DEPT_ID,
        "subDepartmentId": OPD_SUB_DEPT_ID,
        "reuse_existing_id": True,
    },
    {
        "id": DOCTOR_ID,
        "name": "AI Doctor Priya",
        "email": "priya.nair@connitor-elcity.com",
        "phone": "9100100004",
        "role": "STAFF",
        "userType": "DOCTOR",
        "hospitalChainId": CHAIN_ID,
        "branchId": BRANCH_ID,
        "departmentId": GENERAL_MEDICINE_DEPT_ID,
        "subDepartmentId": OPD_SUB_DEPT_ID,
        "reuse_existing_id": True,
    },
    {
        "id": "11000000-0000-4000-8000-000000000031",
        "name": "AI Security Gate",
        "email": "security@connitor-elcity.com",
        "phone": "9100100031",
        "role": "SECURITY",
        "hospitalChainId": CHAIN_ID,
        "branchId": BRANCH_ID,
    },
    {
        "id": "11000000-0000-4000-8000-000000000021",
        "name": "AI Ward Admin",
        "email": "ward.admin@connitor-elcity.com",
        "phone": "9100100021",
        "role": "WARD_ADMIN",
        "hospitalChainId": CHAIN_ID,
        "branchId": BRANCH_ID,
        "reuse_existing_id": True,
    },
    {
        "id": "11000000-0000-4000-8000-000000000032",
        "name": "AI Receiving Staff",
        "email": "receiving@connitor-elcity.com",
        "phone": "9100100032",
        "role": "RECEIVING",
        "hospitalChainId": CHAIN_ID,
        "branchId": BRANCH_ID,
    },
    {
        "id": "11000000-0000-4000-8000-000000000033",
        "name": "AI Purchase Ops",
        "email": "purchase@connitor-elcity.com",
        "phone": "9100100033",
        "role": "PURCHASE",
        "hospitalChainId": CHAIN_ID,
        "branchId": BRANCH_ID,
    },
]


def _ensure_distributor_user(db) -> None:
    dist = db.query(Distributor).filter(Distributor.email == "distributor@citygen.demo").first()
    if not dist:
        row = DistributorService(db).create_distributor(
            {"id": "seed"},
            {
                "vendorName": "AI CityGen Distributors",
                "vendorType": "MEDICAL",
                "email": "distributor@citygen.demo",
                "phone": "9000000101",
                "branchId": BRANCH_ID,
            },
        )
        dist_id = row["id"]
        print(f"Created distributor {row['vendorCode']}")
    else:
        dist_id = dist.id

    mapping = (
        db.query(VendorBranchMapping)
        .filter(
            VendorBranchMapping.vendorId == dist_id,
            VendorBranchMapping.branchId == BRANCH_ID,
        )
        .first()
    )
    if not mapping:
        db.add(
            VendorBranchMapping(
                vendorId=dist_id,
                branchId=BRANCH_ID,
                approvalStatus="APPROVED",
            )
        )
        print("Created APPROVED vendor↔Electronic City mapping")
    elif mapping.approvalStatus != "APPROVED":
        mapping.approvalStatus = "APPROVED"
        print("Approved vendor↔Electronic City mapping")

    user = db.query(User).filter(User.email == "distributor@citygen.demo").first()
    if not user:
        db.add(
            User(
                id="11000000-0000-4000-8000-000000000034",
                name="AI Distributor",
                email="distributor@citygen.demo",
                phone="9000000102",
                role="DISTRIBUTOR",
                branchId=BRANCH_ID,
                hospitalChainId=CHAIN_ID,
                distributorId=dist_id,
                passwordHash=hash_password(PASSWORD),
                isActive=True,
            )
        )
        print("Created DISTRIBUTOR distributor@citygen.demo")
    else:
        user.passwordHash = hash_password(PASSWORD)
        user.distributorId = dist_id
        user.branchId = BRANCH_ID
        user.hospitalChainId = CHAIN_ID
        user.isActive = True
        print("Updated DISTRIBUTOR distributor@citygen.demo")


def _upsert_user(db, data: dict, password_hash: str) -> None:
    email = data["email"].lower()
    by_email = db.query(User).filter(User.email == email).first()
    by_id = db.get(User, data["id"])
    row = by_email or by_id

    payload = {
        "name": data["name"],
        "email": email,
        "phone": data["phone"],
        "role": data["role"],
        "isActive": True,
        "passwordHash": password_hash,
    }
    for key in (
        "hospitalChainId",
        "branchId",
        "departmentId",
        "subDepartmentId",
        "userType",
        "distributorId",
    ):
        if key in data:
            payload[key] = data[key]

    if row:
        for key, value in payload.items():
            setattr(row, key, value)
        print(f"Updated {data['role']}: {email}")
    else:
        db.add(User(id=data["id"], **payload))
        print(f"Created {data['role']}: {email}")


def run() -> None:
    db = SessionLocal()
    try:
        branch = db.get(Branch, BRANCH_ID)
        if not branch:
            raise SystemExit(
                "Electronic City branch missing. "
                "Run: python scripts/seed_electronic_city_hierarchy.py --yes"
            )

        print(f"Seeding AI profile users for {branch.name}\n")
        password_hash = hash_password(PASSWORD)

        for user in AI_USERS:
            _upsert_user(db, user, password_hash)

        _ensure_distributor_user(db)
        db.commit()

        print("\n=== AI profile logins (password: Connitor@123) ===")
        print("SUPER_ADMIN          superadmin@hvts.com")
        print("HOSPITAL_ADMIN       hospital.admin@connitor-elcity.com")
        print("DEPARTMENT_ADMIN     dept.admin@connitor-elcity.com")
        print("SUB_DEPARTMENT_ADMIN subdept.admin@connitor-elcity.com")
        print("STAFF/DOCTOR         priya.nair@connitor-elcity.com")
        print("SECURITY             security@connitor-elcity.com")
        print("WARD_ADMIN           ward.admin@connitor-elcity.com")
        print("RECEIVING            receiving@connitor-elcity.com")
        print("PURCHASE             purchase@connitor-elcity.com")
        print("DISTRIBUTOR          distributor@citygen.demo")
    finally:
        db.close()


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--yes", action="store_true")
    args = parser.parse_args()
    if not args.yes:
        parser.error("Pass --yes to seed AI profile users")
    run()


if __name__ == "__main__":
    main()
