"""Kill local idle connitor sessions, dispose pool, insert Kauvery chain smoke-test."""
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from sqlalchemy import text

from app.constants.kauvery_entities import KAUVERY_CHAIN_ID
from app.database import SessionLocal, engine
from app.models import HospitalChain

db = SessionLocal()
try:
    me = db.execute(text("SELECT CONNECTION_ID()")).scalar()
    print("me", me)
    for r in db.execute(text("SHOW FULL PROCESSLIST")).mappings():
        if r["db"] != "connitor":
            continue
        if r["Id"] == me:
            continue
        print("KILL", r["Id"], r["Host"], r["Command"], r["Time"])
        try:
            db.execute(text(f"KILL {r['Id']}"))
            db.commit()
        except Exception as exc:
            print(" fail", exc)
            db.rollback()
finally:
    db.close()

engine.dispose()
print("pool disposed")

db = SessionLocal()
try:
    row = db.get(HospitalChain, KAUVERY_CHAIN_ID)
    print("existing", row)
    if row is None:
        db.add(
            HospitalChain(
                id=KAUVERY_CHAIN_ID,
                name="Kauvery Hospital",
                phone="08045601000",
                email="admin@kauvery.conninter.com",
                street="Bengaluru",
                city="Bengaluru",
                state="Karnataka",
                pinCode="560100",
                country="India",
            )
        )
        db.commit()
        print("chain inserted OK")
    else:
        print("chain already present", row.name)
finally:
    db.close()
