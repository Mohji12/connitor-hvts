"""
End-to-end workflow test (live API + DB):
  Visitor books → Doctor approves via one-time link → Security ID verify → Check-in

Run from python_backend/:
  python scripts/e2e_visitor_workflow_test.py
"""
from __future__ import annotations

import random
import sys
from datetime import datetime, timedelta

import httpx
from sqlalchemy.orm import joinedload

from app.constants.demo_entities import (
    CARDIOLOGY_DEPARTMENT_ID,
    CHENNAI_BRANCH_ID,
    DOCTOR_USER_ID,
    ICU_CARDIOLOGY_SUB_DEPT_ID,
)
from app.database import SessionLocal
from app.models import Visit
from app.models.enums import VisitStatus
from app.services.visit_approval_link_service import VisitApprovalLinkService

API_BASE = "http://127.0.0.1:8001/api"
SECURITY_EMAIL = "rameshwar.tiwari@apollochennai.com"
SECURITY_PASSWORD = "Conninter123@"


def step(num: int, title: str) -> None:
    print(f"\n--- Step {num}: {title} ---")


def fail(message: str) -> None:
    print(f"FAIL: {message}")
    sys.exit(1)


def ok(message: str) -> None:
    print(f"OK: {message}")


def auth_token(client: httpx.Client) -> str:
    response = client.post(
        f"{API_BASE}/auth/login-password",
        json={"email": SECURITY_EMAIL, "password": SECURITY_PASSWORD},
    )
    if response.status_code != 200:
        fail(f"Security login failed ({response.status_code}): {response.text}")
    token = response.json().get("access_token")
    if not token:
        fail("Security login returned no access_token")
    return token


def main() -> None:
    print("=== E2E: Visitor booking -> Doctor approval -> Security check-in ===\n")

    visitor_phone = f"9{random.randint(100000000, 999999999)}"
    appt_dt = (datetime.now() + timedelta(days=2)).replace(hour=15, minute=0, second=0, microsecond=0)
    appt_iso = appt_dt.strftime("%Y-%m-%dT%H:%M:%S")

    with httpx.Client(timeout=60.0) as client:
        step(1, "Health check")
        health = client.get("http://127.0.0.1:8001/")
        if health.status_code != 200:
            fail(f"Backend not reachable ({health.status_code})")
        ok("Backend is up")

        step(2, "Visitor books appointment (public API)")
        book_payload = {
            "branchId": CHENNAI_BRANCH_ID,
            "departmentId": CARDIOLOGY_DEPARTMENT_ID,
            "subDepartmentId": ICU_CARDIOLOGY_SUB_DEPT_ID,
            "doctorId": DOCTOR_USER_ID,
            "firstName": "E2E",
            "lastName": "Visitor",
            "phone": visitor_phone,
            "email": f"e2e.visitor.{visitor_phone}@example.com",
            "appointmentDate": appt_iso,
            "purpose": "E2E workflow test — cardiology follow-up",
            "appointmentMode": "IN_PERSON",
        }
        book_res = client.post(f"{API_BASE}/public/appointments", json=book_payload)
        if book_res.status_code not in (200, 201):
            fail(f"Booking failed ({book_res.status_code}): {book_res.text}")
        booking = book_res.json()
        booking_id = booking.get("bookingId")
        if not booking_id:
            fail(f"No bookingId in response: {booking}")
        if booking.get("status") != VisitStatus.REQUEST_SENT.value:
            fail(f"Expected REQUEST_SENT, got {booking.get('status')}")
        ok(f"Booked visit {booking_id} — status REQUEST_SENT")

        step(3, "Visitor checks booking status (pending approval)")
        status_res = client.get(
            f"{API_BASE}/public/appointments/{booking_id}/status",
            params={"phone": visitor_phone},
        )
        if status_res.status_code != 200:
            fail(f"Status check failed ({status_res.status_code}): {status_res.text}")
        if status_res.json().get("status") != VisitStatus.REQUEST_SENT.value:
            fail("Visitor status should still be REQUEST_SENT")
        ok("Visitor sees pending approval")

        step(4, "Doctor opens one-time approval link (preview)")
        db = SessionLocal()
        try:
            visit = (
                db.query(Visit)
                .options(joinedload(Visit.visitor), joinedload(Visit.staff))
                .filter(Visit.id == booking_id)
                .first()
            )
            if not visit:
                fail(f"Visit {booking_id} not found in database")
            _token, approval_url, _reschedule_url = VisitApprovalLinkService(db).create_link(visit)
            token = approval_url.split("token=")[-1]
        finally:
            db.close()

        preview_res = client.get(
            f"{API_BASE}/public/appointment-approval/preview",
            params={"token": token},
        )
        if preview_res.status_code != 200:
            fail(f"Approval preview failed ({preview_res.status_code}): {preview_res.text}")
        preview = preview_res.json()
        if preview.get("visitorName") != "E2E Visitor":
            fail(f"Unexpected visitor name: {preview.get('visitorName')}")
        if not preview.get("canAct"):
            fail(f"Link not actionable: {preview}")
        ok(f"Preview: {preview.get('visitorName')} | {preview.get('appointmentDate')} | {preview.get('purpose')}")

        step(5, "Doctor taps Yes — approve via secure link")
        approve_res = client.post(
            f"{API_BASE}/public/appointment-approval/approve",
            json={"token": token},
        )
        if approve_res.status_code != 200:
            fail(f"Approval failed ({approve_res.status_code}): {approve_res.text}")
        if approve_res.json().get("status") != VisitStatus.APPROVED.value:
            fail(f"Expected APPROVED, got {approve_res.json()}")
        ok("Doctor approved — visit APPROVED")

        step(6, "One-time link cannot be reused")
        reuse_res = client.post(
            f"{API_BASE}/public/appointment-approval/approve",
            json={"token": token},
        )
        if reuse_res.status_code not in (404, 410):
            fail(f"Expected 404/410 on reuse, got {reuse_res.status_code}: {reuse_res.text}")
        ok(f"Link correctly disabled after use ({reuse_res.status_code})")

        step(7, "Visitor sees approved status + visit code")
        approved_status = client.get(
            f"{API_BASE}/public/appointments/{booking_id}/status",
            params={"phone": visitor_phone},
        )
        if approved_status.status_code != 200:
            fail(f"Post-approval status failed: {approved_status.text}")
        approved_body = approved_status.json()
        if approved_body.get("status") != VisitStatus.APPROVED.value:
            fail(f"Visitor status should be APPROVED, got {approved_body.get('status')}")
        ok("Visitor booking status is APPROVED")

        step(8, "Security logs in")
        sec_token = auth_token(client)
        sec_headers = {"Authorization": f"Bearer {sec_token}"}
        ok(f"Security authenticated ({SECURITY_EMAIL})")

        step(9, "Security verifies visitor ID proof")
        id_res = client.post(
            f"{API_BASE}/security/visits/{booking_id}/verify-id-proof",
            headers=sec_headers,
            json={"idProofType": "AADHAAR", "idProofNumber": "123456789012"},
        )
        if id_res.status_code != 200:
            fail(f"ID verification failed ({id_res.status_code}): {id_res.text}")
        ok(id_res.json().get("message", "ID proof verified"))

        step(10, "Security checks in visitor")
        checkin_res = client.post(
            f"{API_BASE}/visitors/checkin/{booking_id}",
            headers=sec_headers,
        )
        if checkin_res.status_code != 200:
            fail(f"Check-in failed ({checkin_res.status_code}): {checkin_res.text}")
        checkin_body = checkin_res.json()
        if not checkin_body.get("success"):
            fail(f"Check-in response missing success: {checkin_body}")
        ok(f"Checked in at {checkin_body.get('checkInTime')}")

        step(11, "Verify final visit status in database")
        db = SessionLocal()
        try:
            visit = db.get(Visit, booking_id)
            if not visit:
                fail("Visit missing after check-in")
            if visit.status != VisitStatus.CHECKED_IN.value:
                fail(f"Expected CHECKED_IN, got {visit.status}")
            if not visit.checkInTime:
                fail("checkInTime not set")
            if not visit.idProofVerified:
                fail("idProofVerified not set")
        finally:
            db.close()
        ok(f"Final status CHECKED_IN | phone {visitor_phone} | visit {booking_id}")

    print("\n=== ALL E2E STEPS PASSED ===\n")


if __name__ == "__main__":
    main()
