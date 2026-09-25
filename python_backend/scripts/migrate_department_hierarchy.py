"""
Add Department hierarchy tables and columns to an existing database.
Run: python scripts/migrate_department_hierarchy.py
"""
from sqlalchemy import inspect, text

from app.database import Base, engine
from app.models import Department, SubDepartment  # noqa: F401 — register models


def column_exists(table: str, column: str) -> bool:
    insp = inspect(engine)
    return column in {c["name"] for c in insp.get_columns(table)}


def table_exists(table: str) -> bool:
    return inspect(engine).has_table(table)


def run() -> None:
    with engine.begin() as conn:
        if not table_exists("Department"):
            Base.metadata.tables["Department"].create(bind=conn)
            print("Created Department table")
        if not table_exists("SubDepartment"):
            Base.metadata.tables["SubDepartment"].create(bind=conn)
            print("Created SubDepartment table")

        user_cols = [
            ("departmentId", "VARCHAR(36) NULL"),
            ("subDepartmentId", "VARCHAR(36) NULL"),
        ]
        for col, ddl in user_cols:
            if not column_exists("User", col):
                conn.execute(text(f"ALTER TABLE `User` ADD COLUMN `{col}` {ddl}"))
                print(f"Added User.{col}")

        visit_cols = [
            ("departmentId", "VARCHAR(36) NULL"),
            ("subDepartmentId", "VARCHAR(36) NULL"),
            ("appointmentDate", "DATETIME NULL"),
            ("idProofVerified", "TINYINT(1) NOT NULL DEFAULT 0"),
            ("idProofType", "VARCHAR(50) NULL"),
            ("idProofNumber", "VARCHAR(191) NULL"),
            ("verifiedBySecurityId", "VARCHAR(36) NULL"),
            ("totalDurationMinutes", "INT NULL"),
            ("doctorNotifiedAt", "DATETIME NULL"),
        ]
        for col, ddl in visit_cols:
            if not column_exists("Visit", col):
                conn.execute(text(f"ALTER TABLE `Visit` ADD COLUMN `{col}` {ddl}"))
                print(f"Added Visit.{col}")

        # Widen legacy ENUM columns so hierarchy codes/names are accepted
        visit_dept_col = next(c for c in inspect(engine).get_columns("Visit") if c["name"] == "department")
        if "ENUM" in str(visit_dept_col["type"]).upper():
            conn.execute(text("ALTER TABLE `Visit` MODIFY COLUMN `department` VARCHAR(50) NULL"))
            print("Updated Visit.department to VARCHAR(50)")

    print("Migration complete.")


if __name__ == "__main__":
    run()
