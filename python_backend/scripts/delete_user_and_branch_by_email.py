"""Remove super admin user and Electronic City branch (innerpath2026@gmail.com)."""
from sqlalchemy import text

from app.database import SessionLocal

SUPER_ADMIN_EMAIL = "mohangola89@gmail.com"
BRANCH_EMAIL = "innerpath2026@gmail.com"


def main() -> None:
    db = SessionLocal()
    try:
        # 1. Remove super admin user
        user = (
            db.execute(
                text("SELECT id, name FROM User WHERE email = :email"),
                {"email": SUPER_ADMIN_EMAIL},
            )
            .mappings()
            .first()
        )
        if user:
            user_id = user["id"]
            notification_count = db.execute(
                text("DELETE FROM Notification WHERE recipientId = :id"),
                {"id": user_id},
            ).rowcount
            db.execute(text("DELETE FROM User WHERE id = :id"), {"id": user_id})
            print(
                f"Removed user {user['name']} ({SUPER_ADMIN_EMAIL}): "
                f"{notification_count} notification(s)"
            )
        else:
            print(f"No user found for {SUPER_ADMIN_EMAIL}")

        # 2. Remove Electronic City branch and its hierarchy
        branch = (
            db.execute(
                text("SELECT id, name, hospitalChainId FROM Branch WHERE email = :email"),
                {"email": BRANCH_EMAIL},
            )
            .mappings()
            .first()
        )
        if not branch:
            print(f"No branch found for {BRANCH_EMAIL}")
        else:
            branch_id = branch["id"]
            chain_id = branch["hospitalChainId"]

            branch_user_ids = [
                row[0]
                for row in db.execute(
                    text("SELECT id FROM User WHERE branchId = :id"),
                    {"id": branch_id},
                ).all()
            ]

            for user_id in branch_user_ids:
                db.execute(
                    text("DELETE FROM Notification WHERE recipientId = :id"),
                    {"id": user_id},
                )

            sub_count = db.execute(
                text("DELETE FROM SubDepartment WHERE branchId = :id"),
                {"id": branch_id},
            ).rowcount
            dept_count = db.execute(
                text("DELETE FROM Department WHERE branchId = :id"),
                {"id": branch_id},
            ).rowcount
            user_count = db.execute(
                text("DELETE FROM User WHERE branchId = :id"),
                {"id": branch_id},
            ).rowcount
            db.execute(text("DELETE FROM Branch WHERE id = :id"), {"id": branch_id})

            print(
                f"Removed branch {branch['name']} ({BRANCH_EMAIL}): "
                f"{sub_count} sub-department(s), {dept_count} department(s), "
                f"{user_count} user(s)"
            )

            remaining_branches = db.execute(
                text(
                    "SELECT COUNT(*) FROM Branch WHERE hospitalChainId = :id"
                ),
                {"id": chain_id},
            ).scalar()
            if remaining_branches == 0:
                chain = (
                    db.execute(
                        text("SELECT name FROM HospitalChain WHERE id = :id"),
                        {"id": chain_id},
                    )
                    .mappings()
                    .first()
                )
                db.execute(
                    text("DELETE FROM HospitalChain WHERE id = :id"),
                    {"id": chain_id},
                )
                if chain:
                    print(f"Removed empty hospital chain: {chain['name']}")

        db.commit()
        print("Cleanup completed successfully.")
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    main()
