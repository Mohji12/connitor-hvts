"""Seed department hierarchy demo data. Run: python scripts/seed_department_hierarchy.py"""
from datetime import datetime

from app.constants.demo_entities import (
    APOLLO_CHAIN_ID,
    CARDIOLOGY_DEPARTMENT_ID,
    CHENNAI_BRANCH_ID,
    DEPARTMENT_ADMIN_ID,
    DOCTOR_USER_ID,
    HOSPITAL_ADMIN_ID,
    ICU_CARDIOLOGY_SUB_DEPT_ID,
    SECURITY_USER_ID,
    SUB_DEPARTMENT_ADMIN_ID,
)
from app.database import SessionLocal
from app.models import Branch, Department, HospitalChain, SubDepartment, User
from app.utils.passwords import hash_password


def run() -> None:
    db = SessionLocal()
    try:
        chain = db.get(HospitalChain, APOLLO_CHAIN_ID)
        branch = db.get(Branch, CHENNAI_BRANCH_ID)
        if not chain or not branch:
            print("Apollo chain/branch not found — run main seed first.")
            return

        dept = db.get(Department, CARDIOLOGY_DEPARTMENT_ID)
        if not dept:
            dept = Department(
                id=CARDIOLOGY_DEPARTMENT_ID,
                name="Cardiology",
                code="CARDIO",
                description="Cardiology department",
                branchId=CHENNAI_BRANCH_ID,
                hospitalChainId=APOLLO_CHAIN_ID,
                isActive=True,
            )
            db.add(dept)
            print("Created Cardiology department")

        sub = db.get(SubDepartment, ICU_CARDIOLOGY_SUB_DEPT_ID)
        if not sub:
            sub = SubDepartment(
                id=ICU_CARDIOLOGY_SUB_DEPT_ID,
                name="ICU Cardiology",
                code="ICU-CARD",
                description="Intensive care cardiology unit",
                departmentId=CARDIOLOGY_DEPARTMENT_ID,
                branchId=CHENNAI_BRANCH_ID,
                hospitalChainId=APOLLO_CHAIN_ID,
                isActive=True,
            )
            db.add(sub)
            print("Created ICU Cardiology sub-department")

        hospital_admin = db.get(User, HOSPITAL_ADMIN_ID)
        if not hospital_admin:
            hospital_admin = User(
                id=HOSPITAL_ADMIN_ID,
                name="Priya Sharma",
                phone="9123456780",
                email="hospital.admin@apollochennai.com",
                role="HOSPITAL_ADMIN",
                hospitalChainId=APOLLO_CHAIN_ID,
                branchId=CHENNAI_BRANCH_ID,
                isActive=True,
                passwordHash=hash_password("HospitalAdmin@123"),
            )
            db.add(hospital_admin)
            print("Created Hospital Admin (Chennai)")
        else:
            hospital_admin.role = "HOSPITAL_ADMIN"
            hospital_admin.hospitalChainId = APOLLO_CHAIN_ID
            hospital_admin.branchId = CHENNAI_BRANCH_ID
            hospital_admin.departmentId = None
            hospital_admin.subDepartmentId = None
            print(f"Updated hospital admin {hospital_admin.name}")

        updates = [
            (DEPARTMENT_ADMIN_ID, "DEPARTMENT_ADMIN", CARDIOLOGY_DEPARTMENT_ID, None),
            (SUB_DEPARTMENT_ADMIN_ID, "SUB_DEPARTMENT_ADMIN", CARDIOLOGY_DEPARTMENT_ID, ICU_CARDIOLOGY_SUB_DEPT_ID),
            (DOCTOR_USER_ID, "STAFF", CARDIOLOGY_DEPARTMENT_ID, ICU_CARDIOLOGY_SUB_DEPT_ID),
            (SECURITY_USER_ID, "SECURITY", CARDIOLOGY_DEPARTMENT_ID, ICU_CARDIOLOGY_SUB_DEPT_ID),
        ]
        for user_id, role, dept_id, sub_id in updates:
            user = db.get(User, user_id)
            if user:
                user.role = role
                user.departmentId = dept_id
                user.subDepartmentId = sub_id
                user.updatedAt = datetime.utcnow()
                print(f"Updated user {user.name} -> {role}")

        db.commit()
        print("Department hierarchy seed complete.")
    finally:
        db.close()


if __name__ == "__main__":
    run()
