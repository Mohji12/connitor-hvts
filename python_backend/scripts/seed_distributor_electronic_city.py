"""Seed distributor delivery slots and branch mapping for Electronic City."""

from __future__ import annotations

import argparse
import uuid
from datetime import timedelta

from app.database import SessionLocal
from app.delivery.branch_delivery_service import BranchDeliveryService
from app.delivery.delivery_slot_service import DeliverySlotService
from app.delivery.distributor_service import DistributorService
from app.models import User
from app.models.delivery_entities import Distributor, VendorBranchMapping
from app.constants.electronic_city_entities import ELECTRONIC_CITY_BRANCH_ID
from app.utils.passwords import hash_password
from app.utils.timezone import now_ist


def run() -> None:
    db = SessionLocal()
    try:
        branch_id = ELECTRONIC_CITY_BRANCH_ID
        BranchDeliveryService(db).get_settings(branch_id)

        dist = db.query(Distributor).filter(Distributor.email == "distributor@citygen.demo").first()
        if not dist:
            dist_row = DistributorService(db).create_distributor(
                {"id": "seed"},
                {
                    "vendorName": "CityGen Distributors",
                    "vendorType": "MEDICAL",
                    "email": "distributor@citygen.demo",
                    "phone": "9000000101",
                    "branchId": branch_id,
                },
            )
            dist_id = dist_row["id"]
        else:
            dist_id = dist.id

        mapping = (
            db.query(VendorBranchMapping)
            .filter(
                VendorBranchMapping.vendorId == dist_id,
                VendorBranchMapping.branchId == branch_id,
            )
            .first()
        )
        if mapping:
            mapping.approvalStatus = "APPROVED"
        else:
            db.add(
                VendorBranchMapping(
                    vendorId=dist_id,
                    branchId=branch_id,
                    approvalStatus="APPROVED",
                )
            )

        user = db.query(User).filter(User.email == "distributor@citygen.demo").first()
        if not user:
            db.add(
                User(
                    id=str(uuid.uuid4()),
                    name="CityGen Distributor",
                    phone="9000000102",
                    email="distributor@citygen.demo",
                    role="DISTRIBUTOR",
                    distributorId=dist_id,
                    passwordHash=hash_password("Demo@123"),
                    isActive=True,
                )
            )

        start = now_ist().date()
        end = start + timedelta(days=7)
        DeliverySlotService(db).bulk_create_slots(
            branch_id,
            {"id": "seed", "role": "SUPER_ADMIN"},
            {
                "startDate": start.isoformat(),
                "endDate": end.isoformat(),
                "slotMinutes": 60,
                "maxDeliveries": 2,
            },
        )

        db.commit()
        print(f"Seeded distributor delivery data for branch {branch_id}")
        print("Distributor login: distributor@citygen.demo / Demo@123")
    finally:
        db.close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--yes", action="store_true")
    args = parser.parse_args()
    if args.yes:
        run()
    else:
        print("Pass --yes to seed Electronic City distributor delivery data")
