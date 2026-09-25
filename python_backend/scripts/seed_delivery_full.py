"""
Seed delivery management demo data for Apollo Chennai branch.

Usage:
  python scripts/seed_delivery_full.py --yes
"""
from __future__ import annotations

import argparse
import uuid

from app.constants.demo_entities import CHENNAI_BRANCH_ID
from app.database import SessionLocal
from app.delivery.branch_delivery_service import BranchDeliveryService
from app.delivery.distributor_service import DistributorService
from app.delivery.wallet_service import WalletService
from app.models import User
from app.models.delivery_entities import (
    DeliveryAgent,
    DeliveryGate,
    DeliveryVehicle,
    ReceivingDock,
    VendorBranchMapping,
)
from app.utils.passwords import hash_password


def run() -> None:
    db = SessionLocal()
    try:
        branch_id = CHENNAI_BRANCH_ID
        BranchDeliveryService(db).get_settings(branch_id)
        print(f"Branch delivery settings ready for {branch_id}")

        if not db.query(ReceivingDock).filter(ReceivingDock.branchId == branch_id).first():
            db.add(
                ReceivingDock(
                    id=str(uuid.uuid4()),
                    branchId=branch_id,
                    dockName="Main Receiving Dock",
                    dockCode="DOCK-01",
                )
            )
            print("Created receiving dock DOCK-01")

        if not db.query(DeliveryGate).filter(DeliveryGate.branchId == branch_id).first():
            db.add(
                DeliveryGate(
                    id=str(uuid.uuid4()),
                    branchId=branch_id,
                    gateName="Main Gate",
                    gateCode="GATE-01",
                    gateType="MAIN",
                )
            )
            print("Created delivery gate GATE-01")

        dist_svc = DistributorService(db)
        # Ensure any existing vendor↔branch mapping is APPROVED for demos/e2e
        for mapping in (
            db.query(VendorBranchMapping).filter(VendorBranchMapping.branchId == branch_id).all()
        ):
            if mapping.approvalStatus != "APPROVED":
                mapping.approvalStatus = "APPROVED"
                print(f"Approved vendor mapping {mapping.id}")

        existing = dist_svc.list_distributors(branch_id, limit=1)
        if existing["total"] == 0:
            vendor = dist_svc.create_distributor(
                {"id": "seed"},
                {
                    "vendorName": "MedSupply Distributors",
                    "vendorType": "MEDICAL",
                    "gstNumber": "27AABCM1234F1Z5",
                    "email": "vendor1@citygen.demo",
                    "phone": "9000000001",
                    "branchId": branch_id,
                },
            )
            vendor_id = vendor["id"]
            # Seed should be immediately bookable for demos/e2e
            mapping = (
                db.query(VendorBranchMapping)
                .filter(
                    VendorBranchMapping.vendorId == vendor_id,
                    VendorBranchMapping.branchId == branch_id,
                )
                .first()
            )
            if mapping:
                mapping.approvalStatus = "APPROVED"
            WalletService(db).recharge({"id": "seed"}, vendor_id, 50000)
            db.add(
                DeliveryAgent(
                    id=str(uuid.uuid4()),
                    distributorId=vendor_id,
                    name="Ravi Agent",
                    phone="9000000002",
                    isActive=True,
                )
            )
            db.add(
                DeliveryVehicle(
                    id=str(uuid.uuid4()),
                    distributorId=vendor_id,
                    registrationNumber="TN01AB1234",
                    vehicleType="VAN",
                    isActive=True,
                )
            )
            print(f"Created vendor {vendor['vendorCode']} with wallet and agent/vehicle")

        vendor_user = db.query(User).filter(User.email == "vendor1@citygen.demo").first()
        if not vendor_user:
            vendor_row = dist_svc.list_distributors(branch_id, limit=1)["items"][0]
            db.add(
                User(
                    id=str(uuid.uuid4()),
                    name="MedSupply Vendor",
                    phone="9000000010",
                    email="vendor1@citygen.demo",
                    role="DISTRIBUTOR",
                    branchId=branch_id,
                    distributorId=vendor_row["id"],
                    passwordHash=hash_password("Demo@123"),
                    isActive=True,
                )
            )
            print("Created DISTRIBUTOR user vendor1@citygen.demo / Demo@123")

        receiving_user = db.query(User).filter(User.email == "receiving@citygen.demo").first()
        if not receiving_user:
            db.add(
                User(
                    id=str(uuid.uuid4()),
                    name="Receiving Staff",
                    phone="9000000020",
                    email="receiving@citygen.demo",
                    role="RECEIVING",
                    branchId=branch_id,
                    hospitalChainId="aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
                    passwordHash=hash_password("Demo@123"),
                    isActive=True,
                )
            )
            print("Created RECEIVING user receiving@citygen.demo / Demo@123")

        db.commit()
        print("Delivery seed complete.")
    finally:
        db.close()


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--yes", action="store_true")
    args = parser.parse_args()
    if not args.yes:
        parser.error("Pass --yes to seed delivery data")
    run()


if __name__ == "__main__":
    main()
