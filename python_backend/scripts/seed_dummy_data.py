"""
Seed dummy hospital chains, branches, and users (including SUPER_ADMIN) into hvts.
Mirrors backend/prisma/data.ts
"""
import sys
from datetime import datetime
from pathlib import Path

from sqlalchemy.orm import Session

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from app.database import SessionLocal  # noqa: E402
from app.models import Branch, HospitalChain, User  # noqa: E402

# --- IDs (from backend/prisma/data.ts) ---
CHAIN_APOLLO = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"
CHAIN_FORTIS = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb"
CHAIN_MAX = "cccccccc-cccc-4ccc-8ccc-cccccccccccc"

BRANCH_CHENNAI = "dddddddd-dddd-4ddd-8ddd-dddddddddddd"
BRANCH_BANGALORE = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee"
BRANCH_MOHALI = "ffffffff-ffff-4fff-8fff-ffffffffffff"
BRANCH_GURGAON_FORTIS = "gggggggg-gggg-4ggg-8ggg-gggggggggggg"
BRANCH_SAKET = "hhhhhhhh-hhhh-4hhh-8hhh-hhhhhhhhhhhh"
BRANCH_GURGAON_MAX = "iiiiiiii-iiii-4iii-8iii-iiiiiiiiiiii"

HOSPITAL_CHAINS = [
    {
        "id": CHAIN_APOLLO,
        "name": "Apollo Hospitals",
        "phone": "0331111111",
        "email": "info@apollohospitals.com",
        "street": "21 Greams Lane, Off Greams Road",
        "city": "Chennai",
        "state": "Tamil Nadu",
        "pinCode": "600006",
        "country": "India",
    },
    {
        "id": CHAIN_FORTIS,
        "name": "Fortis Healthcare",
        "phone": "0331111112",
        "email": "info@fortishealthcare.com",
        "street": "Sector 62, Phase VIII",
        "city": "Mohali",
        "state": "Punjab",
        "pinCode": "160062",
        "country": "India",
    },
    {
        "id": CHAIN_MAX,
        "name": "Max Healthcare",
        "phone": "0331111113",
        "email": "info@maxhealthcare.com",
        "street": "Press Enclave Road, Saket",
        "city": "New Delhi",
        "state": "Delhi",
        "pinCode": "110017",
        "country": "India",
    },
]

BRANCHES = [
    {
        "id": BRANCH_CHENNAI,
        "name": "Apollo Hospitals (Chennai)",
        "email": "chennai@apollohospitals.com",
        "phone": "0332222221",
        "street": "21 Greams Lane, Off Greams Road",
        "city": "Chennai",
        "state": "Tamil Nadu",
        "pinCode": "600006",
        "hospitalChainId": CHAIN_APOLLO,
    },
    {
        "id": BRANCH_BANGALORE,
        "name": "Apollo Hospitals (Bangalore)",
        "email": "bangalore@apollohospitals.com",
        "phone": "0332222222",
        "street": "154/11, Bannerghatta Road",
        "city": "Bangalore",
        "state": "Karnataka",
        "pinCode": "560076",
        "hospitalChainId": CHAIN_APOLLO,
    },
    {
        "id": BRANCH_MOHALI,
        "name": "Fortis Hospital (Mohali)",
        "email": "mohali@fortishealthcare.com",
        "phone": "0332222223",
        "street": "Sector 62, Phase VIII",
        "city": "Mohali",
        "state": "Punjab",
        "pinCode": "160062",
        "hospitalChainId": CHAIN_FORTIS,
    },
    {
        "id": BRANCH_GURGAON_FORTIS,
        "name": "Fortis Hospital (Gurgaon)",
        "email": "gurgaon@fortishealthcare.com",
        "phone": "0332222224",
        "street": "Sector 62, Golf Course Road",
        "city": "Gurgaon",
        "state": "Haryana",
        "pinCode": "122002",
        "hospitalChainId": CHAIN_FORTIS,
    },
    {
        "id": BRANCH_SAKET,
        "name": "Max Hospital (Saket)",
        "email": "saket@maxhealthcare.com",
        "phone": "0332222225",
        "street": "Press Enclave Road, Saket",
        "city": "New Delhi",
        "state": "Delhi",
        "pinCode": "110017",
        "hospitalChainId": CHAIN_MAX,
    },
    {
        "id": BRANCH_GURGAON_MAX,
        "name": "Max Hospital (Gurgaon)",
        "email": "gurgaon@maxhealthcare.com",
        "phone": "0332222226",
        "street": "Sector 38B, Chandigarh Road",
        "city": "Gurgaon",
        "state": "Haryana",
        "pinCode": "122001",
        "hospitalChainId": CHAIN_MAX,
    },
]

USERS = [
    {
        "id": "11111111-1111-1111-1111-111111111111",
        "name": "Sushobhit Kundra",
        "phone": "6987456321",
        "email": "superadmin@hvts.com",
        "role": "SUPER_ADMIN",
        "isActive": True,
    },
    {
        "id": "22222222-2222-2222-2222-222222222222",
        "name": "Rajesh Kumar",
        "phone": "8482022111",
        "email": "rajesh.kumar@apollohospitals.com",
        "role": "CHAIN_ADMIN",
        "hospitalChainId": CHAIN_APOLLO,
        "isActive": True,
    },
    {
        "id": "22333333-3333-3333-3333-333333333333",
        "name": "Priya Sharma",
        "phone": "8482022112",
        "email": "priya.sharma@apollohospitals.com",
        "role": "CHAIN_ADMIN",
        "hospitalChainId": CHAIN_APOLLO,
        "isActive": True,
    },
    {
        "id": "33333333-3333-3333-3333-333333333333",
        "name": "Anil Patel",
        "phone": "7980427511",
        "email": "anil.patel@apollochennai.com",
        "role": "BRANCH_ADMIN",
        "branchId": BRANCH_CHENNAI,
        "hospitalChainId": CHAIN_APOLLO,
        "isActive": True,
    },
    {
        "id": "33444444-4444-4444-4444-444444444444",
        "name": "Sneha Reddy",
        "phone": "7980427512",
        "email": "sneha.reddy@apollobangalore.com",
        "role": "BRANCH_ADMIN",
        "branchId": BRANCH_BANGALORE,
        "hospitalChainId": CHAIN_APOLLO,
        "isActive": True,
    },
    {
        "id": "44444444-4444-4444-4444-444444444444",
        "name": "Vikram Singh",
        "phone": "8482022113",
        "email": "vikram.singh@fortishealthcare.com",
        "role": "CHAIN_ADMIN",
        "hospitalChainId": CHAIN_FORTIS,
        "isActive": True,
    },
    {
        "id": "44555555-5555-5555-5555-555555555555",
        "name": "Meera Gupta",
        "phone": "8482022114",
        "email": "meera.gupta@fortishealthcare.com",
        "role": "CHAIN_ADMIN",
        "hospitalChainId": CHAIN_FORTIS,
        "isActive": True,
    },
    {
        "id": "55555555-5555-5555-5555-555555555555",
        "name": "Rahul Malhotra",
        "phone": "7980427513",
        "email": "rahul.malhotra@fortismohali.com",
        "role": "BRANCH_ADMIN",
        "branchId": BRANCH_MOHALI,
        "hospitalChainId": CHAIN_FORTIS,
        "isActive": True,
    },
    {
        "id": "55666666-6666-6666-6666-666666666666",
        "name": "Neha Kapoor",
        "phone": "7980427514",
        "email": "neha.kapoor@fortisgurgaon.com",
        "role": "BRANCH_ADMIN",
        "branchId": BRANCH_GURGAON_FORTIS,
        "hospitalChainId": CHAIN_FORTIS,
        "isActive": True,
    },
    {
        "id": "66666666-6666-6666-6666-666666666666",
        "name": "Amit Verma",
        "phone": "8482022115",
        "email": "amit.verma@maxhealthcare.com",
        "role": "CHAIN_ADMIN",
        "hospitalChainId": CHAIN_MAX,
        "isActive": True,
    },
    {
        "id": "66777777-7777-7777-7777-777777777777",
        "name": "Divya Joshi",
        "phone": "8482022116",
        "email": "divya.joshi@maxhealthcare.com",
        "role": "CHAIN_ADMIN",
        "hospitalChainId": CHAIN_MAX,
        "isActive": True,
    },
    {
        "id": "77777777-7777-7777-7777-777777777777",
        "name": "Sanjay Mehta",
        "phone": "7980427515",
        "email": "sanjay.mehta@maxsaket.com",
        "role": "BRANCH_ADMIN",
        "branchId": BRANCH_SAKET,
        "hospitalChainId": CHAIN_MAX,
        "isActive": True,
    },
    {
        "id": "77888888-8888-8888-8888-888888888888",
        "name": "Kavita Singh",
        "phone": "7980427516",
        "email": "kavita.singh@maxgurgaon.com",
        "role": "BRANCH_ADMIN",
        "branchId": BRANCH_GURGAON_MAX,
        "hospitalChainId": CHAIN_MAX,
        "isActive": True,
    },
    {
        "id": "88888888-8888-8888-8888-888888888888",
        "name": "Dr. Arjun Desai",
        "phone": "7003636111",
        "email": "arjun.desai@apollochennai.com",
        "role": "STAFF",
        "userType": "DOCTOR",
        "department": "CARDIOLOGY",
        "location": "Room 101",
        "branchId": BRANCH_CHENNAI,
        "hospitalChainId": CHAIN_APOLLO,
        "isActive": True,
    },
    {
        "id": "88999999-9999-9999-9999-999999999999",
        "name": "Sunita Rao",
        "phone": "7003636112",
        "email": "sunita.rao@apollochennai.com",
        "role": "STAFF",
        "userType": "DOCTOR",
        "department": "GENERAL_MEDICINE",
        "location": "Room 205",
        "branchId": BRANCH_CHENNAI,
        "hospitalChainId": CHAIN_APOLLO,
        "isActive": True,
    },
    {
        "id": "99999999-9999-9999-9999-999999999999",
        "name": "Rameshwar Tiwari",
        "phone": "9883578111",
        "email": "rameshwar.tiwari@apollochennai.com",
        "role": "SECURITY",
        "branchId": BRANCH_CHENNAI,
        "hospitalChainId": CHAIN_APOLLO,
        "isActive": True,
    },
    {
        "id": "99aaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        "name": "Ravi Shankar",
        "phone": "9883578112",
        "email": "ravi.shankar@apollochennai.com",
        "role": "SECURITY",
        "branchId": BRANCH_CHENNAI,
        "hospitalChainId": CHAIN_APOLLO,
        "isActive": True,
    },
]


def upsert_chain(db: Session, data: dict) -> None:
    row = db.get(HospitalChain, data["id"])
    now = datetime.utcnow()
    if row:
        for k, v in data.items():
            setattr(row, k, v)
        row.updatedAt = now
    else:
        db.add(HospitalChain(**data, createdAt=now, updatedAt=now))


def upsert_branch(db: Session, data: dict) -> None:
    row = db.get(Branch, data["id"])
    now = datetime.utcnow()
    if row:
        for k, v in data.items():
            setattr(row, k, v)
        row.updatedAt = now
    else:
        db.add(Branch(**data, country="India", createdAt=now, updatedAt=now))


def upsert_user(db: Session, data: dict) -> None:
    row = db.get(User, data["id"])
    now = datetime.utcnow()
    if row:
        for k, v in data.items():
            setattr(row, k, v)
        row.updatedAt = now
    else:
        db.add(User(**data, createdAt=now, updatedAt=now))


def main() -> None:
    db = SessionLocal()
    try:
        print("Seeding hospital chains...")
        for chain in HOSPITAL_CHAINS:
            upsert_chain(db, chain)
        db.commit()

        print("Seeding branches...")
        for branch in BRANCHES:
            upsert_branch(db, branch)
        db.commit()

        print("Seeding users (admins + staff + security)...")
        for user in USERS:
            upsert_user(db, user)
            print(f"  {user['role']:14} {user['name']} ({user['phone']})")
        db.commit()

        total = db.query(User).count()
        admins = (
            db.query(User)
            .filter(User.role.in_(["SUPER_ADMIN", "CHAIN_ADMIN", "BRANCH_ADMIN"]))
            .count()
        )
        print(f"\nDone. Users: {total} total, {admins} admin roles.")
        print("\nLogin (OTP): use phone numbers above, e.g. SUPER_ADMIN phone 6987456321")
    except Exception as exc:
        db.rollback()
        print("Seed failed:", exc)
        raise
    finally:
        db.close()


if __name__ == "__main__":
    main()
