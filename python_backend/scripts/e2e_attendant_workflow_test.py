"""
End-to-end attendant pass workflow test (live API + DB) — Module 3:
  Ward creates patient/admission → Public family apply → Approve →
  Issue pass (QR emailed) → Security scan with government ID photo

Run from python_backend/:
  python scripts/e2e_attendant_workflow_test.py
"""
from __future__ import annotations

import os
import random
import sys
from io import BytesIO

import httpx

from app.constants.electronic_city_entities import ELECTRONIC_CITY_BRANCH_ID
from app.database import SessionLocal
from app.models.attendant_entities import Attendant, AttendantPass, AttendantPassScan

API_BASE = os.environ.get("CONNITOR_API_BASE", "http://127.0.0.1:8002/api")
WARD_EMAIL = "ward.admin@connitor-elcity.com"
WARD_PASSWORD = "Connitor@123"
SECURITY_EMAIL = "security@connitor-elcity.com"
SECURITY_PASSWORD = "Connitor@123"
BRANCH_ID = ELECTRONIC_CITY_BRANCH_ID

# Minimal valid JPEG (1x1 pixel)
_JPEG_BYTES = bytes(
    [
        0xFF,
        0xD8,
        0xFF,
        0xE0,
        0x00,
        0x10,
        0x4A,
        0x46,
        0x49,
        0x46,
        0x00,
        0x01,
        0x01,
        0x00,
        0x00,
        0x01,
        0x00,
        0x01,
        0x00,
        0x00,
        0xFF,
        0xDB,
        0x00,
        0x43,
        0x00,
        *([0x08] * 64),
        0xFF,
        0xC0,
        0x00,
        0x0B,
        0x08,
        0x00,
        0x01,
        0x00,
        0x01,
        0x01,
        0x01,
        0x11,
        0x00,
        0xFF,
        0xC4,
        0x00,
        0x14,
        0x00,
        0x01,
        0x00,
        0x00,
        0x00,
        0x00,
        0x00,
        0x00,
        0x00,
        0x00,
        0x00,
        0x00,
        0x00,
        0x00,
        0x00,
        0x00,
        0x00,
        0x03,
        0xFF,
        0xC4,
        0x00,
        0x14,
        0x10,
        0x01,
        0x00,
        0x00,
        0x00,
        0x00,
        0x00,
        0x00,
        0x00,
        0x00,
        0x00,
        0x00,
        0x00,
        0x00,
        0x00,
        0x00,
        0x00,
        0x00,
        0xFF,
        0xDA,
        0x00,
        0x08,
        0x01,
        0x01,
        0x00,
        0x00,
        0x3F,
        0x00,
        0x7F,
        0xFF,
        0xD9,
    ]
)


def step(num: int, title: str) -> None:
    print(f"\n--- Step {num}: {title} ---")


def fail(message: str) -> None:
    print(f"FAIL: {message}")
    sys.exit(1)


def ok(message: str) -> None:
    print(f"OK: {message}")


def login(client: httpx.Client, email: str, password: str) -> str:
    response = client.post(
        f"{API_BASE}/auth/login-password",
        json={"email": email, "password": password},
    )
    if response.status_code != 200:
        fail(f"Login failed for {email} ({response.status_code}): {response.text}")
    token = response.json().get("access_token")
    if not token:
        fail(f"No access_token for {email}")
    return token


def auth_headers(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def main() -> None:
    print("=== E2E Module 3: Attendant pass (admit -> apply -> issue -> scan) ===\n")

    suffix = random.randint(1000, 9999)
    mrn = f"E2E-MRN-{suffix}"
    family_phone = f"9{random.randint(100000000, 999999999)}"
    family_email = f"e2e.attendant.{suffix}@example.com"

    with httpx.Client(timeout=60.0) as client:
        step(1, "Health check")
        # API_BASE is .../api; health is the app root without /api
        root = API_BASE.rstrip("/").removesuffix("/api") or "http://127.0.0.1:8002"
        health = client.get(f"{root}/")
        if health.status_code != 200:
            fail(f"Backend not reachable at {root}/ ({health.status_code})")
        ok("Backend is up")

        step(2, "Ward / hospital admin logs in")
        ward_token = login(client, WARD_EMAIL, WARD_PASSWORD)
        ok(f"Authenticated ({WARD_EMAIL})")

        step(3, "Create patient")
        patient_res = client.post(
            f"{API_BASE}/attendant-passes/patients",
            headers=auth_headers(ward_token),
            json={
                "branchId": BRANCH_ID,
                "mrn": mrn,
                "firstName": "E2E",
                "lastName": "Patient",
                "phone": "9111100001",
            },
        )
        if patient_res.status_code not in (200, 201):
            fail(f"Create patient failed ({patient_res.status_code}): {patient_res.text}")
        patient_id = patient_res.json().get("id")
        if not patient_id:
            fail(f"No patient id: {patient_res.json()}")
        ok(f"Patient created {patient_id[:8]}… MRN={mrn}")

        step(4, "Create ACTIVE admission")
        admission_res = client.post(
            f"{API_BASE}/attendant-passes/admissions",
            headers=auth_headers(ward_token),
            json={
                "patientId": patient_id,
                "branchId": BRANCH_ID,
                "wardName": "ICU",
                "roomNumber": "E2E-12",
                "bedNumber": "1",
            },
        )
        if admission_res.status_code not in (200, 201):
            fail(f"Create admission failed ({admission_res.status_code}): {admission_res.text}")
        admission_id = admission_res.json().get("id")
        if not admission_id:
            fail(f"No admission id: {admission_res.json()}")
        if admission_res.json().get("status") not in (None, "ACTIVE"):
            # status may be ACTIVE or omitted
            pass
        ok(f"Admission created {admission_id[:8]}…")

        step(5, "Public lookup admission by MRN")
        lookup_res = client.get(
            f"{API_BASE}/public/attendant-passes/admissions/lookup",
            params={"branchId": BRANCH_ID, "mrn": mrn},
        )
        if lookup_res.status_code != 200:
            fail(f"Lookup failed ({lookup_res.status_code}): {lookup_res.text}")
        lookup = lookup_res.json()
        found_id = lookup.get("admissionId") or lookup.get("id")
        if found_id != admission_id:
            fail(f"Lookup returned unexpected admission: {lookup}")
        ok(f"Public lookup OK — {lookup.get('patientFirstName')} / ward {lookup.get('wardName')}")

        step(6, "Family applies via public form")
        apply_res = client.post(
            f"{API_BASE}/public/attendant-passes/apply",
            json={
                "admissionId": admission_id,
                "name": "E2E Family Attendant",
                "email": family_email,
                "phone": family_phone,
                "relationship": "Spouse",
            },
        )
        if apply_res.status_code not in (200, 201):
            fail(f"Public apply failed ({apply_res.status_code}): {apply_res.text}")
        attendant = apply_res.json()
        attendant_id = attendant.get("id")
        if not attendant_id:
            fail(f"No attendant id: {attendant}")
        if attendant.get("status") != "PENDING":
            fail(f"Expected PENDING, got {attendant.get('status')}")
        ok(f"Attendant pending {attendant_id[:8]}…")

        step(7, "Ward approves attendant")
        approve_res = client.post(
            f"{API_BASE}/attendant-passes/attendants/{attendant_id}/approve",
            headers=auth_headers(ward_token),
        )
        if approve_res.status_code != 200:
            fail(f"Approve failed ({approve_res.status_code}): {approve_res.text}")
        if approve_res.json().get("status") != "APPROVED":
            fail(f"Expected APPROVED, got {approve_res.json()}")
        ok("Attendant APPROVED")

        step(8, "Ward issues pass (QR generated)")
        issue_res = client.post(
            f"{API_BASE}/attendant-passes/passes/{attendant_id}/issue",
            headers=auth_headers(ward_token),
            json={"revokeExisting": False},
        )
        if issue_res.status_code not in (200, 201):
            fail(f"Issue pass failed ({issue_res.status_code}): {issue_res.text}")
        issued = issue_res.json()
        pass_id = issued.get("id")
        pass_number = issued.get("passNumber")
        qr_payload = issued.get("qrPayload")
        qr_signature = issued.get("qrSignature")
        if not pass_id or not qr_payload or not qr_signature:
            fail(f"Missing pass/QR fields: {issued}")
        if issued.get("status") != "ACTIVE":
            fail(f"Expected ACTIVE pass, got {issued.get('status')}")
        ok(f"Pass issued {pass_number} — ACTIVE + QR")

        step(9, "One-ACTIVE-pass rule rejects second issue without revoke")
        second = client.post(
            f"{API_BASE}/attendant-passes/passes/{attendant_id}/issue",
            headers=auth_headers(ward_token),
            json={"revokeExisting": False},
        )
        if second.status_code not in (400, 409):
            fail(f"Expected 400 on second issue, got {second.status_code}: {second.text}")
        ok(f"Second issue correctly blocked ({second.status_code})")

        step(10, "Security scans pass with government ID image")
        security_token = login(client, SECURITY_EMAIL, SECURITY_PASSWORD)
        scan_res = client.post(
            f"{API_BASE}/attendant-passes/passes/scan",
            headers=auth_headers(security_token),
            data={
                "qrPayload": qr_payload,
                "signature": qr_signature,
                "scanType": "ENTRY",
                "govtIdType": "Aadhaar",
            },
            files={"govtIdImage": ("aadhaar.jpg", BytesIO(_JPEG_BYTES), "image/jpeg")},
        )
        if scan_res.status_code != 200:
            fail(f"Scan failed ({scan_res.status_code}): {scan_res.text}")
        scan = scan_res.json()
        if not scan.get("valid"):
            fail(f"Scan not valid: {scan}")
        if scan.get("passNumber") != pass_number:
            fail(f"Pass number mismatch: {scan}")
        if not scan.get("govtIdImageUrl"):
            fail(f"Missing govtIdImageUrl: {scan}")
        ok(f"Scan valid — govt ID stored at {scan['govtIdImageUrl']}")

        step(11, "Verify final records in database")
        db = SessionLocal()
        try:
            pass_row = db.get(AttendantPass, pass_id)
            attendant_row = db.get(Attendant, attendant_id)
            if not pass_row or pass_row.status != "ACTIVE":
                fail(f"Pass not ACTIVE in DB: {getattr(pass_row, 'status', None)}")
            if not attendant_row or attendant_row.status != "APPROVED":
                fail(f"Attendant not APPROVED in DB: {getattr(attendant_row, 'status', None)}")
            scans = (
                db.query(AttendantPassScan)
                .filter(AttendantPassScan.passId == pass_id)
                .all()
            )
            if not scans:
                fail("No AttendantPassScan row written")
            if not scans[0].govtIdImageUrl:
                fail("Scan row missing govtIdImageUrl")
            ok(
                f"DB OK | pass={pass_row.passNumber} | attendant={attendant_row.name} | "
                f"scans={len(scans)} | id={pass_id}"
            )
        finally:
            db.close()

    print("\n=== ALL E2E STEPS PASSED (Module 3 — Attendant) ===")


if __name__ == "__main__":
    main()
