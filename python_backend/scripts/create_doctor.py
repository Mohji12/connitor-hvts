"""Create or update a doctor under a branch / department / sub-department."""
from __future__ import annotations

import argparse
import uuid
from datetime import datetime

from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.models import Branch, Department, SubDepartment, User
from app.models.enums import Role


def create_doctor(
    db: Session,
    *,
    name: str,
    phone: str,
    branch_name: str,
    department_name: str,
    email: str | None = None,
    location: str | None = None,
) -> User:
    branch = (
        db.query(Branch)
        .filter(Branch.name.ilike(f"%{branch_name}%"))
        .first()
    )
    if not branch:
        raise SystemExit(f"Branch not found matching: {branch_name}")

    department = (
        db.query(Department)
        .filter(
            Department.branchId == branch.id,
            Department.name.ilike(f"%{department_name}%"),
            Department.isActive == True,  # noqa: E712
        )
        .first()
    )
    if not department:
        raise SystemExit(
            f"Department not found: {department_name} at branch {branch.name}"
        )

    sub_department = (
        db.query(SubDepartment)
        .filter(
            SubDepartment.departmentId == department.id,
            SubDepartment.isActive == True,  # noqa: E712
        )
        .order_by(SubDepartment.name)
        .first()
    )
    if not sub_department:
        raise SystemExit(
            f"No active sub-department under {department.name} at {branch.name}"
        )

    existing = db.query(User).filter(User.phone == phone).first()
    display_name = name if name.lower().startswith("dr") else f"Dr. {name}"
    doctor_email = email or f"{name.lower().replace(' ', '.')}@connitor.local"

    if existing:
        existing.name = display_name
        existing.role = Role.STAFF.value
        existing.userType = "DOCTOR"
        existing.branchId = branch.id
        existing.hospitalChainId = branch.hospitalChainId
        existing.departmentId = department.id
        existing.subDepartmentId = sub_department.id
        existing.department = "CARDIOLOGY"
        existing.location = location or branch.city
        existing.isActive = True
        existing.updatedAt = datetime.utcnow()
        if not existing.email:
            existing.email = doctor_email
        doctor = existing
        action = "Updated"
    else:
        doctor = User(
            id=str(uuid.uuid4()),
            name=display_name,
            phone=phone,
            email=doctor_email,
            role=Role.STAFF.value,
            userType="DOCTOR",
            department="CARDIOLOGY",
            location=location or branch.city,
            hospitalChainId=branch.hospitalChainId,
            branchId=branch.id,
            departmentId=department.id,
            subDepartmentId=sub_department.id,
            isActive=True,
        )
        db.add(doctor)
        action = "Created"

    db.commit()
    db.refresh(doctor)
    print(f"{action} doctor: {doctor.name} ({doctor.id})")
    print(f"  Phone: {doctor.phone}")
    print(f"  Branch: {branch.name} ({branch.city})")
    print(f"  Department: {department.name}")
    print(f"  Section: {sub_department.name}")
    return doctor


def main() -> None:
    parser = argparse.ArgumentParser(description="Create a doctor in Connitor")
    parser.add_argument("--name", required=True)
    parser.add_argument("--phone", required=True)
    parser.add_argument("--branch", default="Electronic City")
    parser.add_argument("--department", default="Critical Care")
    parser.add_argument("--email", default=None)
    parser.add_argument("--location", default=None)
    args = parser.parse_args()

    db = SessionLocal()
    try:
        create_doctor(
            db,
            name=args.name,
            phone=args.phone,
            branch_name=args.branch,
            department_name=args.department,
            email=args.email,
            location=args.location,
        )
    finally:
        db.close()


if __name__ == "__main__":
    main()
