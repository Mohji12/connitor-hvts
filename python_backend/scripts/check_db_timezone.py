from sqlalchemy import text
from app.database import SessionLocal

db = SessionLocal()
try:
    cols = db.execute(
        text(
            """
            SELECT COLUMN_NAME, DATA_TYPE, COLUMN_TYPE
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE()
              AND TABLE_NAME = 'Visit'
              AND COLUMN_NAME IN (
                'appointmentDate', 'checkInTime', 'checkOutTime', 'createdAt', 'updatedAt'
              )
            """
        )
    ).mappings().all()
    print("Visit datetime columns:")
    for c in cols:
        print(f"  {c['COLUMN_NAME']}: {c['COLUMN_TYPE']}")

    for name in ("@@global.time_zone", "@@session.time_zone", "@@system_time_zone"):
        val = db.execute(text(f"SELECT {name}")).scalar()
        print(f"{name}: {val}")

    now_row = db.execute(
        text("SELECT NOW() AS now_local, UTC_TIMESTAMP() AS now_utc")
    ).mappings().one()
    print("NOW():", now_row["now_local"])
    print("UTC_TIMESTAMP():", now_row["now_utc"])
finally:
    db.close()
