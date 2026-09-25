"""One-off: add missing ORM columns to core MySQL tables (local dev)."""
from __future__ import annotations

from sqlalchemy import Boolean, Date, DateTime, Integer, String, Text, inspect, text

from app.database import Base, engine
import app.models  # noqa: F401


def mysql_type(col) -> str:
    t = col.type
    if isinstance(t, String):
        return f"VARCHAR({t.length or 191})"
    if isinstance(t, Boolean):
        return "TINYINT(1)"
    if isinstance(t, Integer):
        return "INT"
    if isinstance(t, DateTime):
        return "DATETIME"
    if isinstance(t, Date):
        return "DATE"
    if isinstance(t, Text):
        return "TEXT"
    name = type(t).__name__.upper()
    if "BOOL" in name:
        return "TINYINT(1)"
    if "INT" in name:
        return "INT"
    if name == "DATE":
        return "DATE"
    if "DATETIME" in name or "TIMESTAMP" in name:
        return "DATETIME"
    return "TEXT"


def main() -> None:
    insp = inspect(engine)
    tables = [
        "Visitor",
        "Visit",
        "User",
        "Branch",
        "VisitorPass",
        "BranchVisitorPassPolicy",
    ]
    with engine.begin() as conn:
        for table_name in tables:
            if table_name not in insp.get_table_names():
                print("skip missing table", table_name)
                continue
            existing = {c["name"] for c in insp.get_columns(table_name)}
            table = Base.metadata.tables.get(table_name)
            if table is None:
                continue
            adds: list[str] = []
            for col in table.columns:
                if col.name in existing:
                    continue
                sql_t = mysql_type(col)
                if not col.nullable and isinstance(col.type, Boolean):
                    clause = f"ADD COLUMN `{col.name}` {sql_t} NOT NULL DEFAULT 0"
                else:
                    clause = f"ADD COLUMN `{col.name}` {sql_t} NULL"
                adds.append(clause)
                print(table_name, "missing", col.name, sql_t)
            if adds:
                sql = f"ALTER TABLE `{table_name}` " + ", ".join(adds)
                conn.execute(text(sql))
                print("updated", table_name, len(adds))
            else:
                print(table_name, "ok")


if __name__ == "__main__":
    main()
