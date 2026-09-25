"""Update a doctor's phone number in User and related Visit.staffPhone."""
from sqlalchemy import text

from app.database import SessionLocal

DOCTOR_NAME = "Mohan Gola Agra"
NEW_PHONE = "6379983352"


def _run_update(sql: str, params: dict) -> int:
    db = SessionLocal()
    try:
        result = db.execute(text(sql), params)
        db.commit()
        return result.rowcount
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


def main() -> None:
    db = SessionLocal()
    try:
        doctor = (
            db.execute(
                text(
                    "SELECT id, name, phone, role FROM User "
                    "WHERE name = :name AND role = 'STAFF'"
                ),
                {"name": DOCTOR_NAME},
            )
            .mappings()
            .first()
        )
        if not doctor:
            print(f"Doctor not found: {DOCTOR_NAME}")
            return

        doctor_id = doctor["id"]
        old_phone = doctor["phone"]
        print(f"Found: {doctor['name']} ({doctor_id})")
        print(f"Old phone: {old_phone}")

        conflict = (
            db.execute(
                text(
                    "SELECT id, name, phone, role FROM User "
                    "WHERE phone = :phone AND id != :id"
                ),
                {"phone": NEW_PHONE, "id": doctor_id},
            )
            .mappings()
            .first()
        )
    finally:
        db.close()

    if conflict:
        placeholder = f"unassigned-{conflict['id'][:8]}"
        print(
            f"Phone {NEW_PHONE} in use by {conflict['name']} ({conflict['id']}); "
            f"moving to placeholder {placeholder}"
        )
        _run_update(
            "UPDATE User SET phone = :phone WHERE id = :id",
            {"phone": placeholder, "id": conflict["id"]},
        )

    _run_update(
        "UPDATE User SET phone = :phone WHERE id = :id",
        {"phone": NEW_PHONE, "id": doctor_id},
    )
    visit_count = _run_update(
        "UPDATE Visit SET staffPhone = :phone WHERE staffId = :id",
        {"phone": NEW_PHONE, "id": doctor_id},
    )

    db = SessionLocal()
    try:
        updated = (
            db.execute(
                text("SELECT name, phone FROM User WHERE id = :id"),
                {"id": doctor_id},
            )
            .mappings()
            .first()
        )
        print(f"New phone: {updated['phone']}")
        print(f"Updated {visit_count} visit(s) staffPhone")
    finally:
        db.close()


if __name__ == "__main__":
    main()
