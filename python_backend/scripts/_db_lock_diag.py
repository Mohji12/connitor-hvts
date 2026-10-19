import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from sqlalchemy import text

from app.database import SessionLocal

db = SessionLocal()
try:
    print("--- PROCESSLIST (connitor) ---")
    for r in db.execute(text("SHOW FULL PROCESSLIST")).mappings():
        if r["db"] == "connitor":
            print(dict(r))
    print("--- innodb_trx ---")
    try:
        for r in db.execute(text("SELECT * FROM information_schema.innodb_trx")).mappings():
            print(dict(r))
    except Exception as exc:
        print("innodb_trx unavailable:", exc)
    print("--- killing long Sleep on connitor ---")
    for r in db.execute(text("SHOW FULL PROCESSLIST")).mappings():
        if r["db"] == "connitor" and r["Command"] in ("Sleep", "Query") and r["Time"] and int(r["Time"]) > 30:
            if r["Info"] and "PROCESSLIST" in str(r["Info"]):
                continue
            print("KILL", r["Id"], r["Command"], r["Time"], r["Info"])
            try:
                db.execute(text(f"KILL {r['Id']}"))
                db.commit()
            except Exception as exc:
                print(" fail", exc)
                db.rollback()
finally:
    db.close()
