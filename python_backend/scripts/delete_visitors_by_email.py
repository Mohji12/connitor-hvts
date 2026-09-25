"""Remove visitor records (and related visits/notifications) for given emails."""
from sqlalchemy import text

from app.database import SessionLocal

EMAILS = [
    "info.krintix@gmail.com",
    "innerpath2026@gmail.com",
    "mohangola89@gmail.com",
]


def delete_visitor_data(db, email: str) -> None:
    visitors = (
        db.execute(
            text("SELECT id, firstName, lastName FROM Visitor WHERE email = :email"),
            {"email": email},
        )
        .mappings()
        .all()
    )
    if not visitors:
        print(f"No visitor record for {email}")
        return

    for visitor in visitors:
        visitor_id = visitor["id"]
        visits = (
            db.execute(
                text("SELECT id FROM Visit WHERE visitorId = :id"),
                {"id": visitor_id},
            )
            .mappings()
            .all()
        )
        visit_ids = [row["id"] for row in visits]

        if visit_ids:
            placeholders = ", ".join(f":v{i}" for i in range(len(visit_ids)))
            params = {f"v{i}": visit_id for i, visit_id in enumerate(visit_ids)}

            notification_count = db.execute(
                text(f"DELETE FROM Notification WHERE visitId IN ({placeholders})"),
                params,
            ).rowcount
            visit_count = db.execute(
                text(f"DELETE FROM Visit WHERE id IN ({placeholders})"),
                params,
            ).rowcount
            print(
                f"{email}: removed {notification_count} notification(s), "
                f"{visit_count} visit(s)"
            )

        db.execute(text("DELETE FROM Visitor WHERE id = :id"), {"id": visitor_id})
        print(
            f"{email}: removed visitor {visitor['firstName']} {visitor['lastName']} "
            f"({visitor_id})"
        )


def main() -> None:
    db = SessionLocal()
    try:
        for email in EMAILS:
            delete_visitor_data(db, email)
        db.commit()
        print("All visitor data removed successfully.")
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    main()
