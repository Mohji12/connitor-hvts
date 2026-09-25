"""Add doctorFeedback columns to Visit. Run: python scripts/add_doctor_feedback_columns.py"""
from sqlalchemy import inspect, text

from app.database import engine


def main() -> None:
    inspector = inspect(engine)
    columns = {col["name"] for col in inspector.get_columns("Visit")}
    statements = []
    if "doctorFeedback" not in columns:
        statements.append("ALTER TABLE `Visit` ADD COLUMN doctorFeedback TEXT NULL")
    if "doctorFeedbackAt" not in columns:
        statements.append("ALTER TABLE `Visit` ADD COLUMN doctorFeedbackAt DATETIME NULL")

    if not statements:
        print("doctorFeedback columns already exist.")
        return

    with engine.begin() as conn:
        for stmt in statements:
            conn.execute(text(stmt))
            print(f"Executed: {stmt}")
    print("Done.")


if __name__ == "__main__":
    main()
