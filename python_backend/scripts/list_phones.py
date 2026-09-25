"""List phone numbers stored across main HVTS tables."""
from sqlalchemy import text

from app.database import engine

QUERIES = {
    "User": """
        SELECT id, name, phone, role, userType, isActive
        FROM User
        ORDER BY role, name
    """,
    "Visitor": """
        SELECT id, firstName, lastName, phone, alternatePhone, branchId
        FROM Visitor
        ORDER BY phone
    """,
    "HospitalChain": """
        SELECT id, name, phone FROM HospitalChain ORDER BY name
    """,
    "Branch": """
        SELECT id, name, phone FROM Branch ORDER BY name
    """,
    "Visit (staffPhone snapshot)": """
        SELECT id, staffName, staffPhone, status, createdAt
        FROM Visit
        WHERE staffPhone IS NOT NULL
        ORDER BY createdAt DESC
        LIMIT 30
    """,
}


def main() -> None:
    with engine.connect() as conn:
        for label, sql in QUERIES.items():
            print("=" * 70)
            print(label)
            print("=" * 70)
            result = conn.execute(text(sql))
            rows = result.fetchall()
            keys = list(result.keys())
            if not rows:
                print("(no rows)")
            else:
                print(" | ".join(keys))
                print("-" * 70)
                for row in rows:
                    print(" | ".join(str(row._mapping[k]) if row._mapping[k] is not None else "" for k in keys))
            print(f"Total: {len(rows)}")
            print()


if __name__ == "__main__":
    main()
