"""Smoke tests for the Python FastAPI backend."""
import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

# Dev OTP path — must be set before Settings is loaded
os.environ.setdefault("HVTS_TEST_MODE", "true")

from jose import jwt

from app.config import get_settings
from app.database import SessionLocal
from app.models import User
from main import app

try:
    from fastapi.testclient import TestClient
except ImportError:
    print("FAIL: install httpx for TestClient (pip install httpx)")
    sys.exit(1)

get_settings.cache_clear()
settings = get_settings()
client = TestClient(app)

passed = 0
failed = 0


def check(name: str, ok: bool, detail: str = "") -> None:
    global passed, failed
    if ok:
        passed += 1
        print(f"  PASS  {name}" + (f" — {detail}" if detail else ""))
    else:
        failed += 1
        print(f"  FAIL  {name}" + (f" — {detail}" if detail else ""))


def main() -> None:
    print("\n=== HVTS Python Backend Smoke Test ===\n")

    # 1. Root & docs
    r = client.get("/")
    check("GET /", r.status_code == 200, f"status={r.status_code}")

    r = client.get("/openapi.json")
    paths = r.json().get("paths", {}) if r.status_code == 200 else {}
    check("GET /openapi.json", r.status_code == 200, f"{len(paths)} routes")

    dashboard_paths = [p for p in paths if "super-admin/dashboard" in p]
    check(
        "Dashboard route registered",
        len(dashboard_paths) > 0,
        ", ".join(dashboard_paths) or "missing",
    )

    # 2. Database
    db = SessionLocal()
    try:
        user_count = db.query(User).count()
        check("Database query", user_count >= 0, f"{user_count} users")
        test_email = "mohangola47@gmail.com"
        user = db.query(User).filter(User.email == test_email).first()
        check("Seed user exists", user is not None, test_email)
    except Exception as exc:
        check("Database query", False, str(exc))
        user = None
    finally:
        db.close()

    # 3. Auth (test mode — fixed OTP)
    if user:
        r = client.post("/api/auth/login", json={"email": user.email})
        check("POST /api/auth/login", r.status_code == 200, r.text[:80])
        otp = r.json().get("testOtp", settings.e2e_fixed_otp)
        r = client.post(
            "/api/auth/verify-otp",
            json={"email": user.email, "otp": otp},
        )
        check("POST /api/auth/verify-otp", r.status_code == 200)
        token = r.json().get("access_token") if r.status_code == 200 else None
    else:
        token = None
        check("POST /api/auth/login", False, "no test user")

    # 4. Protected routes
    if token:
        headers = {"Authorization": f"Bearer {token}"}
        r = client.get("/api/analytics/super-admin/dashboard/", params={"period": "weekly"}, headers=headers)
        check(
            "GET /api/analytics/super-admin/dashboard/",
            r.status_code == 200,
            f"keys={list(r.json().keys())[:4]}..." if r.status_code == 200 else r.text[:80],
        )
        r = client.get("/api/hospital-chains", headers=headers)
        check("GET /api/hospital-chains", r.status_code == 200, f"count={len(r.json())}")
        r = client.get("/api/auth/me", headers=headers)
        check("GET /api/auth/me", r.status_code == 200, r.json().get("email", ""))
    else:
        check("Protected routes", False, "no token")

    # 5. Unauthorized
    r = client.get("/api/analytics/super-admin/dashboard/")
    check("Dashboard requires auth", r.status_code == 401, f"status={r.status_code}")

    print(f"\n=== Results: {passed} passed, {failed} failed ===\n")
    sys.exit(0 if failed == 0 else 1)


if __name__ == "__main__":
    main()
