"""Extend User.role column and seed booking catalog data."""
from datetime import datetime

from sqlalchemy import inspect, text

from app.constants.demo_entities import (
    APOLLO_CHAIN_ID,
    CARDIOLOGY_DEPARTMENT_ID,
    CHENNAI_BRANCH_ID,
    DOCTOR_USER_ID,
    ICU_CARDIOLOGY_SUB_DEPT_ID,
)
from app.database import SessionLocal, engine
from app.models import Branch, Department, SubDepartment, User


def ensure_role_column_accepts_hierarchy_roles() -> None:
    """MySQL ENUM from legacy schema may reject DEPARTMENT_ADMIN; widen to VARCHAR."""
    insp = inspect(engine)
    role_col = next(c for c in insp.get_columns("User") if c["name"] == "role")
    col_type = str(role_col["type"]).upper()
    if "ENUM" in col_type or "VARCHAR(50)" not in col_type:
        with engine.begin() as conn:
            conn.execute(text("ALTER TABLE `User` MODIFY COLUMN `role` VARCHAR(50) NOT NULL"))
        print("Updated User.role to VARCHAR(50)")


def seed_booking_catalog() -> None:
    db = SessionLocal()
    try:
        branch = db.get(Branch, CHENNAI_BRANCH_ID)
        if not branch:
            print("Chennai branch not found.")
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
        else:
            sub.isActive = True
            sub.departmentId = CARDIOLOGY_DEPARTMENT_ID
            sub.branchId = CHENNAI_BRANCH_ID
            sub.updatedAt = datetime.utcnow()
            print("Activated ICU Cardiology sub-department")

        doctor = db.get(User, DOCTOR_USER_ID)
        if doctor:
            doctor.userType = "DOCTOR"
            doctor.subDepartmentId = ICU_CARDIOLOGY_SUB_DEPT_ID
            doctor.departmentId = CARDIOLOGY_DEPARTMENT_ID
            doctor.branchId = CHENNAI_BRANCH_ID
            doctor.isActive = True
            doctor.updatedAt = datetime.utcnow()
            print(f"Configured doctor: {doctor.name}")

        db.commit()
        print("Booking catalog seed complete.")
    finally:
        db.close()


if __name__ == "__main__":
    ensure_role_column_accepts_hierarchy_roles()
    seed_booking_catalog()
