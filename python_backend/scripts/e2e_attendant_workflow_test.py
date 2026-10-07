"""
End-to-end attendant pass workflow test (live API + DB) — Module 3:
  Reception registers a fixed attendant → visitor books during visiting hours →
  pass is issued immediately → security scans the same QR in and out.

Run from python_backend/:
  python scripts/e2e_attendant_workflow_test.py
"""
from __future__ import annotations

import os
import random
import sys

import httpx

from app.constants.ovum_entities import OVUM_BRANCH_ID
from app.database import SessionLocal
from app.models.attendant_entities import Attendant, AttendantPass, AttendantPassScan

API_BASE = os.environ.get("CONNITOR_API_BASE", "http://127.0.0.1:8002/api")
PRIMARY_PHONE = os.environ.get("E2E_PRIMARY_PHONE", "8625877312")
ALT_PHONE = os.environ.get("E2E_ALT_PHONE", "7893982875")
WARD_EMAIL = os.environ.get("E2E_WARD_EMAIL", "kalyan-nagar@ovum.conninter.com")
WARD_PASSWORD = os.environ.get("E2E_WARD_PASSWORD", "Conninter123@")
SECURITY_EMAIL = os.environ.get("E2E_SECURITY_EMAIL", "security.kalyan-nagar@ovum.conninter.com")
SECURITY_PASSWORD = os.environ.get("E2E_SECURITY_PASSWORD", "Conninter123@")
BRANCH_ID = os.environ.get("E2E_BRANCH_ID", OVUM_BRANCH_ID)

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
    fixed_phone = PRIMARY_PHONE
    visitor_phone = ALT_PHONE

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

        step(6, "Open visiting hours for this run")
        policy_res = client.get(
            f"{API_BASE}/attendant-passes/policy",
            headers=auth_headers(ward_token),
            params={"branchId": BRANCH_ID},
        )
        saved_start = None
        saved_end = None
        if policy_res.status_code == 200:
            saved_start = policy_res.json().get("defaultVisitStart")
            saved_end = policy_res.json().get("defaultVisitEnd")
        open_res = client.put(
            f"{API_BASE}/attendant-passes/policy",
            headers=auth_headers(ward_token),
            params={"branchId": BRANCH_ID},
            json={"defaultVisitStart": "00:00", "defaultVisitEnd": "23:59"},
        )
        if open_res.status_code != 200:
            fail(f"Could not open visiting hours ({open_res.status_code}): {open_res.text}")
        ok("Visiting hours opened for the test")

        try:
            step(7, "Reception registers the fixed attendant")
            fixed_res = client.post(
                f"{API_BASE}/attendant-passes/attendants",
                headers=auth_headers(ward_token),
                json={
                    "admissionId": admission_id,
                    "name": "E2E Fixed Attendant",
                    "phone": fixed_phone,
                    "relationship": "Mother",
                    "attendantKind": "FIXED",
                },
            )
            if fixed_res.status_code not in (200, 201):
                fail(f"Register fixed attendant failed ({fixed_res.status_code}): {fixed_res.text}")
            fixed_id = fixed_res.json().get("id")
            if not fixed_id:
                fail(f"No fixed attendant id: {fixed_res.json()}")
            approve_fixed = client.post(
                f"{API_BASE}/attendant-passes/attendants/{fixed_id}/approve",
                headers=auth_headers(ward_token),
            )
            if approve_fixed.status_code != 200:
                fail(f"Approve fixed attendant failed ({approve_fixed.status_code}): {approve_fixed.text}")
            issue_fixed = client.post(
                f"{API_BASE}/attendant-passes/passes/{fixed_id}/issue",
                headers=auth_headers(ward_token),
                json={"revokeExisting": True},
            )
            if issue_fixed.status_code not in (200, 201):
                fail(f"Issue fixed pass failed ({issue_fixed.status_code}): {issue_fixed.text}")
            if issue_fixed.json().get("status") != "ACTIVE":
                fail(f"Fixed pass not ACTIVE: {issue_fixed.json()}")
            ok(f"Fixed pass issued to {fixed_phone} — WhatsApp {issue_fixed.json().get('whatsappSent')}")

            step(8, "Visitor books a pass with one companion")
            apply_res = client.post(
                f"{API_BASE}/public/attendant-passes/apply",
                json={
                    "admissionId": admission_id,
                    "name": "E2E Visitor Attendant",
                    "phone": visitor_phone,
                    "relationship": "Sister",
                    "addCompanion": True,
                    "companionName": "E2E Companion",
                    "companionPhone": fixed_phone,
                    "companionRelationship": "Brother",
                },
            )
            if apply_res.status_code not in (200, 201):
                fail(f"Public apply failed ({apply_res.status_code}): {apply_res.text}")
            issued = apply_res.json()
            pass_id = issued.get("id")
            attendant_id = issued.get("attendantId")
            pass_number = issued.get("passNumber")
            qr_payload = issued.get("qrPayload")
            qr_signature = issued.get("qrSignature")
            if not pass_id or not attendant_id or not qr_payload or not qr_signature:
                fail(f"Missing pass/QR fields: {issued}")
            if issued.get("status") != "ACTIVE":
                fail(f"Expected ACTIVE pass on booking, got {issued.get('status')}")
            ok(f"Visitor pass {pass_number} issued to {visitor_phone} — WhatsApp {issued.get('whatsappSent')}")

            step(9, "Security checks the visitor in with the same QR")
            security_token = login(client, SECURITY_EMAIL, SECURITY_PASSWORD)
            scan_res = client.post(
                f"{API_BASE}/attendant-passes/passes/scan",
                headers=auth_headers(security_token),
                data={"qrPayload": qr_payload, "signature": qr_signature},
            )
            if scan_res.status_code != 200:
                fail(f"Check-in scan failed ({scan_res.status_code}): {scan_res.text}")
            scan = scan_res.json()
            if not scan.get("valid") or scan.get("scanType") != "ENTRY":
                fail(f"Expected ENTRY scan: {scan}")
            if not scan.get("isInside"):
                fail(f"Visitor should be inside: {scan}")
            ok(f"Checked in {pass_number}")

            step(10, "Another booking is blocked while the visitor is inside")
            blocked = client.post(
                f"{API_BASE}/public/attendant-passes/apply",
                json={
                    "admissionId": admission_id,
                    "name": "E2E Late Visitor",
                    "phone": visitor_phone,
                    "relationship": "Friend",
                },
            )
            if blocked.status_code not in (400, 409):
                fail(f"Expected booking block, got {blocked.status_code}: {blocked.text}")
            ok("New booking blocked while someone is inside")

            summary = client.get(
                f"{API_BASE}/attendant-passes/dashboard/summary",
                headers=auth_headers(security_token),
                params={"branchId": BRANCH_ID},
            )
            if summary.status_code != 200:
                fail(f"Dashboard summary failed ({summary.status_code}): {summary.text}")
            meetings = summary.json().get("meetings") or []
            if not any(item.get("passId") == pass_id for item in meetings):
                fail(f"Meeting line missing for this patient: {meetings}")
            ok("Dashboard shows the second attendant is meeting")

            step(11, "Security checks the visitor out with the same QR")
            exit_res = client.post(
                f"{API_BASE}/attendant-passes/passes/scan",
                headers=auth_headers(security_token),
                data={"qrPayload": qr_payload, "signature": qr_signature},
            )
            if exit_res.status_code != 200:
                fail(f"Check-out scan failed ({exit_res.status_code}): {exit_res.text}")
            exited = exit_res.json()
            if exited.get("scanType") != "EXIT" or exited.get("isInside"):
                fail(f"Expected EXIT and outside: {exited}")
            ok(f"Checked out {pass_number}")

            step(12, "Verify final records in database")
            db = SessionLocal()
            try:
                pass_row = db.get(AttendantPass, pass_id)
                attendant_row = db.get(Attendant, attendant_id)
                if not pass_row or pass_row.status != "USED":
                    fail(f"Pass not USED in DB: {getattr(pass_row, 'status', None)}")
                if not attendant_row or attendant_row.status != "APPROVED":
                    fail(f"Attendant not APPROVED in DB: {getattr(attendant_row, 'status', None)}")
                scans = (
                    db.query(AttendantPassScan)
                    .filter(AttendantPassScan.passId == pass_id)
                    .all()
                )
                kinds = {row.scanType for row in scans}
                if kinds != {"ENTRY", "EXIT"}:
                    fail(f"Expected ENTRY and EXIT scans, got {kinds}")
                ok(
                    f"DB OK | pass={pass_row.passNumber} | attendant={attendant_row.name} | "
                    f"scans={len(scans)} | id={pass_id}"
                )
            finally:
                db.close()
        finally:
            restore_body = {}
            if saved_start:
                restore_body["defaultVisitStart"] = saved_start
            if saved_end:
                restore_body["defaultVisitEnd"] = saved_end
            if restore_body:
                client.put(
                    f"{API_BASE}/attendant-passes/policy",
                    headers=auth_headers(ward_token),
                    params={"branchId": BRANCH_ID},
                    json=restore_body,
                )
                ok("Visiting hours restored")

    print("\n=== ALL E2E STEPS PASSED (Module 3 — Attendant) ===")


if __name__ == "__main__":
    main()
