from sqlalchemy import text

from app.database import SessionLocal

db = SessionLocal()
try:
    rows = db.execute(text("SHOW FULL PROCESSLIST")).mappings().all()
    for r in rows:
        if r["db"] == "connitor" and r["Command"] == "Sleep" and r["Time"] and int(r["Time"]) > 60:
            print("KILL", r["Id"], r["Host"], r["Time"])
            try:
                db.execute(text(f"KILL {r['Id']}"))
                db.commit()
            except Exception as exc:
                print("  fail", exc)
                db.rollback()
finally:
    db.close()
print("done")
