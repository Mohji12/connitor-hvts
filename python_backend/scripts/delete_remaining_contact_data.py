"""Remove remaining user/branch records for wiped email addresses."""
from sqlalchemy import text

from app.database import SessionLocal

USER_EMAIL = "mohangola89@gmail.com"
BRANCH_EMAIL = "innerpath2026@gmail.com"


def delete_user_by_email(db, email: str) -> None:
    user = db.execute(
        text("SELECT id, name, role FROM User WHERE email = :email"),
        {"email": email},
    ).mappings().first()
    if not user:
        print(f"No user for {email}")
        return

    user_id = user["id"]
    db.execute(
        text("DELETE FROM Notification WHERE recipientId = :id"),
        {"id": user_id},
    )
    db.execute(
        text("UPDATE Visit SET staffId = NULL WHERE staffId = :id"),
        {"id": user_id},
    )
    db.execute(
        text("UPDATE Visit SET checkedInById = NULL WHERE checkedInById = :id"),
        {"id": user_id},
    )
    db.execute(
        text("UPDATE Visit SET checkedOutById = NULL WHERE checkedOutById = :id"),
        {"id": user_id},
    )
    db.execute(
        text("UPDATE Visit SET verifiedBySecurityId = NULL WHERE verifiedBySecurityId = :id"),
        {"id": user_id},
    )
    db.execute(text("DELETE FROM User WHERE id = :id"), {"id": user_id})
    print(f"Removed user {user['name']} ({user['role']}) — {email}")


def delete_branch_by_email(db, email: str) -> None:
    branch = db.execute(
        text("SELECT id, name FROM Branch WHERE email = :email"),
        {"email": email},
    ).mappings().first()
    if not branch:
        print(f"No branch for {email}")
        return

    branch_id = branch["id"]
    visit_ids = [
        row["id"]
        for row in db.execute(
            text("SELECT id FROM Visit WHERE branchId = :id"),
            {"id": branch_id},
        ).mappings().all()
    ]
    if visit_ids:
        placeholders = ", ".join(f":v{i}" for i in range(len(visit_ids)))
        params = {f"v{i}": visit_id for i, visit_id in enumerate(visit_ids)}
        db.execute(
            text(f"DELETE FROM Notification WHERE visitId IN ({placeholders})"),
            params,
        )
        db.execute(
            text(f"DELETE FROM Visit WHERE id IN ({placeholders})"),
            params,
        )
        print(f"Removed {len(visit_ids)} visit(s) for branch {branch['name']}")

    db.execute(
        text("UPDATE User SET branchId = NULL WHERE branchId = :id"),
        {"id": branch_id},
    )
    sub_dept_ids = [
        row["id"]
        for row in db.execute(
            text("SELECT id FROM SubDepartment WHERE branchId = :id"),
            {"id": branch_id},
        ).mappings().all()
    ]
    dept_ids = [
        row["id"]
        for row in db.execute(
            text("SELECT id FROM Department WHERE branchId = :id"),
            {"id": branch_id},
        ).mappings().all()
    ]
    if sub_dept_ids:
        placeholders = ", ".join(f":s{i}" for i in range(len(sub_dept_ids)))
        params = {f"s{i}": sid for i, sid in enumerate(sub_dept_ids)}
        db.execute(
            text(f"UPDATE User SET subDepartmentId = NULL WHERE subDepartmentId IN ({placeholders})"),
            params,
        )
        db.execute(
            text(f"DELETE FROM SubDepartment WHERE id IN ({placeholders})"),
            params,
        )
    if dept_ids:
        placeholders = ", ".join(f":d{i}" for i in range(len(dept_ids)))
        params = {f"d{i}": did for i, did in enumerate(dept_ids)}
        db.execute(
            text(f"UPDATE User SET departmentId = NULL WHERE departmentId IN ({placeholders})"),
            params,
        )
        db.execute(
            text(f"DELETE FROM Department WHERE id IN ({placeholders})"),
            params,
        )

    db.execute(text("DELETE FROM Visitor WHERE branchId = :id"), {"id": branch_id})
    db.execute(text("DELETE FROM Branch WHERE id = :id"), {"id": branch_id})
    print(f"Removed branch {branch['name']} — {email}")


def main() -> None:
    db = SessionLocal()
    try:
        delete_user_by_email(db, USER_EMAIL)
        delete_branch_by_email(db, BRANCH_EMAIL)
        db.commit()
        print("Cleanup complete.")
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    main()
