"""
End-to-end delivery workflow test (live API + DB):
  Distributor books → Security scan QR → Allow entry →
  Receiving assign dock / start / GRN → Security mark exit

Run from python_backend/:
  python scripts/seed_delivery_full.py --yes   # once, if demo vendor missing
  python scripts/e2e_delivery_workflow_test.py
"""
from __future__ import annotations

import sys
from datetime import timedelta

import httpx

from app.constants.electronic_city_entities import ELECTRONIC_CITY_BRANCH_ID
from app.database import SessionLocal
from app.models import User
from app.models.delivery_entities import InboundDelivery, VendorBranchMapping
from app.models.enums import DeliveryStatus
from app.utils.timezone import now_ist

API_BASE = "http://127.0.0.1:8001/api"
VENDOR_EMAIL = "distributor@citygen.demo"
VENDOR_PASSWORD = "Connitor@123"
SECURITY_EMAIL = "security@connitor-elcity.com"
SECURITY_PASSWORD = "Connitor@123"
RECEIVING_EMAIL = "receiving@connitor-elcity.com"
RECEIVING_PASSWORD = "Connitor@123"
BRANCH_ID = ELECTRONIC_CITY_BRANCH_ID


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
    print("=== E2E: Distributor book -> Security gate -> Receiving GRN -> Exit ===\n")

    with httpx.Client(timeout=60.0) as client:
        step(1, "Health check")
        health = client.get("http://127.0.0.1:8001/")
        if health.status_code != 200:
            fail(f"Backend not reachable ({health.status_code})")
        ok("Backend is up")

        step(2, "Distributor logs in")
        # Ensure vendor↔branch mapping is APPROVED (seed may leave PENDING)
        db = SessionLocal()
        try:
            vendor_user = db.query(User).filter(User.email == VENDOR_EMAIL).first()
            if not vendor_user or not vendor_user.distributorId:
                fail(
                    f"Missing DISTRIBUTOR user {VENDOR_EMAIL} — run: "
                    "python scripts/seed_delivery_full.py --yes"
                )
            mapping = (
                db.query(VendorBranchMapping)
                .filter(
                    VendorBranchMapping.vendorId == vendor_user.distributorId,
                    VendorBranchMapping.branchId == BRANCH_ID,
                )
                .first()
            )
            if mapping and mapping.approvalStatus != "APPROVED":
                mapping.approvalStatus = "APPROVED"
                db.commit()
                ok("Approved pending vendor branch mapping")
        finally:
            db.close()

        vendor_token = login(client, VENDOR_EMAIL, VENDOR_PASSWORD)
        ok(f"Distributor authenticated ({VENDOR_EMAIL})")

        step(3, "Load fleet (agents + vehicles)")
        agents_res = client.get(f"{API_BASE}/delivery/agents", headers=auth_headers(vendor_token))
        vehicles_res = client.get(f"{API_BASE}/delivery/vehicles", headers=auth_headers(vendor_token))
        if agents_res.status_code != 200:
            fail(f"List agents failed ({agents_res.status_code}): {agents_res.text}")
        if vehicles_res.status_code != 200:
            fail(f"List vehicles failed ({vehicles_res.status_code}): {vehicles_res.text}")
        agents = agents_res.json()
        vehicles = vehicles_res.json()
        agent_list = agents if isinstance(agents, list) else agents.get("items") or agents.get("agents") or []
        vehicle_list = (
            vehicles if isinstance(vehicles, list) else vehicles.get("items") or vehicles.get("vehicles") or []
        )
        if not agent_list:
            create_agent = client.post(
                f"{API_BASE}/delivery/agents",
                headers=auth_headers(vendor_token),
                json={
                    "name": "E2E Driver",
                    "email": "e2e.driver@example.com",
                    "phone": "9000099999",
                },
            )
            if create_agent.status_code not in (200, 201):
                fail(f"Create agent failed ({create_agent.status_code}): {create_agent.text}")
            agent_list = [create_agent.json()]
            ok("Created driver for e2e")
        if not vehicle_list:
            create_vehicle = client.post(
                f"{API_BASE}/delivery/vehicles",
                headers=auth_headers(vendor_token),
                json={"registrationNumber": "TN99E2E001", "vehicleType": "VAN"},
            )
            if create_vehicle.status_code not in (200, 201):
                fail(f"Create vehicle failed ({create_vehicle.status_code}): {create_vehicle.text}")
            vehicle_list = [create_vehicle.json()]
            ok("Created vehicle for e2e")
        agent_id = agent_list[0]["id"]
        vehicle_id = vehicle_list[0]["id"]
        ok(f"Using agent {agent_id[:8]}… / vehicle {vehicle_id[:8]}…")

        step(4, "Distributor books delivery (unscheduled ETA)")
        eta = (now_ist() + timedelta(hours=2)).replace(microsecond=0).isoformat()
        book_res = client.post(
            f"{API_BASE}/delivery/deliveries/book",
            headers=auth_headers(vendor_token),
            json={
                "branchId": BRANCH_ID,
                "expectedArrivalTime": eta,
                "goodsType": "E2E Medical Supplies",
                "totalBoxes": 3,
                "agentId": agent_id,
                "vehicleId": vehicle_id,
                "remarks": "E2E delivery workflow test",
            },
        )
        if book_res.status_code not in (200, 201):
            fail(f"Book delivery failed ({book_res.status_code}): {book_res.text}")
        booking = book_res.json()
        delivery_id = booking.get("id")
        status = booking.get("status")
        qr = booking.get("qr") or {}
        if not delivery_id:
            fail(f"No delivery id in response: {booking}")
        if status != DeliveryStatus.SCHEDULED.value:
            fail(f"Expected SCHEDULED, got {status}")
        if not qr.get("qrPayload") or not qr.get("signature"):
            fail(f"Missing QR payload/signature: {qr}")
        ok(f"Booked {booking.get('deliveryNumber')} — status SCHEDULED + QR issued")

        step(5, "Security logs in and scans QR")
        security_token = login(client, SECURITY_EMAIL, SECURITY_PASSWORD)
        scan_res = client.post(
            f"{API_BASE}/delivery/security/scan-qr",
            headers=auth_headers(security_token),
            json={"qrPayload": qr["qrPayload"], "signature": qr["signature"]},
        )
        if scan_res.status_code != 200:
            fail(f"Scan QR failed ({scan_res.status_code}): {scan_res.text}")
        if not scan_res.json().get("valid"):
            fail(f"QR not valid: {scan_res.json()}")
        ok("QR valid")

        step(6, "Security allows entry")
        entry_res = client.post(
            f"{API_BASE}/delivery/security/allow-entry/{delivery_id}",
            headers=auth_headers(security_token),
        )
        if entry_res.status_code != 200:
            fail(f"Allow entry failed ({entry_res.status_code}): {entry_res.text}")
        pass_number = entry_res.json().get("passNumber")
        if not pass_number:
            fail(f"No passNumber: {entry_res.json()}")
        ok(f"Entry allowed — pass {pass_number}")

        step(7, "Receiving loads queue and assigns dock")
        receiving_token = login(client, RECEIVING_EMAIL, RECEIVING_PASSWORD)
        queue_res = client.get(
            f"{API_BASE}/delivery/receiving/queue",
            headers=auth_headers(receiving_token),
            params={"branchId": BRANCH_ID},
        )
        if queue_res.status_code != 200:
            fail(f"Receiving queue failed ({queue_res.status_code}): {queue_res.text}")
        queue = queue_res.json()
        docks = queue.get("docks") or []
        if not docks:
            fail("No receiving docks — run: python scripts/seed_delivery_full.py --yes")
        dock_id = docks[0]["id"]
        assign_res = client.post(
            f"{API_BASE}/delivery/receiving/assign-dock",
            headers=auth_headers(receiving_token),
            json={"deliveryId": delivery_id, "dockId": dock_id},
        )
        if assign_res.status_code != 200:
            fail(f"Assign dock failed ({assign_res.status_code}): {assign_res.text}")
        ok(f"Dock assigned ({docks[0].get('dockCode')})")

        step(8, "Receiving starts + generates GRN")
        start_res = client.post(
            f"{API_BASE}/delivery/receiving/start",
            headers=auth_headers(receiving_token),
            json={"deliveryId": delivery_id},
        )
        if start_res.status_code != 200:
            fail(f"Start receiving failed ({start_res.status_code}): {start_res.text}")
        grn_res = client.post(
            f"{API_BASE}/delivery/grn/generate",
            headers=auth_headers(receiving_token),
            json={"deliveryId": delivery_id},
        )
        if grn_res.status_code != 200:
            fail(f"Generate GRN failed ({grn_res.status_code}): {grn_res.text}")
        grn_number = grn_res.json().get("grnNumber")
        if not grn_number:
            fail(f"No grnNumber: {grn_res.json()}")
        ok(f"GRN generated — {grn_number}")

        step(9, "Security marks exit")
        exit_res = client.post(
            f"{API_BASE}/delivery/security/mark-exit/{delivery_id}",
            headers=auth_headers(security_token),
        )
        if exit_res.status_code != 200:
            fail(f"Mark exit failed ({exit_res.status_code}): {exit_res.text}")
        ok("Exit marked")

        step(10, "Verify final delivery status in database")
        db = SessionLocal()
        try:
            delivery = db.get(InboundDelivery, delivery_id)
            if not delivery:
                fail(f"Delivery {delivery_id} not found")
            if delivery.status != DeliveryStatus.EXITED.value:
                fail(f"Expected EXITED, got {delivery.status}")
            ok(
                f"Final status EXITED | {delivery.deliveryNumber} | "
                f"goods={delivery.goodsType} | id={delivery.id}"
            )
        finally:
            db.close()

    print("\n=== ALL E2E STEPS PASSED ===")


if __name__ == "__main__":
    main()
