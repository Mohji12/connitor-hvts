"""Vendor/distributor management."""

from __future__ import annotations

import uuid

from sqlalchemy.orm import Session

from app.delivery.utils import bad_request, not_found
from app.models.delivery_entities import (
    Distributor,
    VendorBranchMapping,
    VendorCodeSequence,
    VendorWallet,
)


class DistributorService:
    def __init__(self, db: Session) -> None:
        self.db = db

    def _next_vendor_code(self) -> str:
        seq = self.db.get(VendorCodeSequence, 1)
        if not seq:
            seq = VendorCodeSequence(id=1, lastNumber=0)
            self.db.add(seq)
        seq.lastNumber += 1
        self.db.flush()
        return f"VEN-{seq.lastNumber:06d}"

    def list_distributors(self, branch_id: str | None = None, skip: int = 0, limit: int = 50) -> dict:
        q = self.db.query(Distributor).filter(Distributor.isActive.is_(True))
        if branch_id:
            q = q.join(VendorBranchMapping, VendorBranchMapping.vendorId == Distributor.id).filter(
                VendorBranchMapping.branchId == branch_id
            )
        total = q.count()
        rows = q.offset(skip).limit(limit).all()
        return {"total": total, "items": [self._serialize(d) for d in rows]}

    def create_distributor(self, user: dict, data: dict) -> dict:
        if data.get("gstNumber"):
            existing = (
                self.db.query(Distributor).filter(Distributor.gstNumber == data["gstNumber"]).first()
            )
            if existing:
                raise bad_request("GST number already registered")
        dist = Distributor(
            vendorCode=self._next_vendor_code(),
            vendorName=data["vendorName"],
            vendorType=data.get("vendorType", "MEDICAL"),
            gstNumber=data.get("gstNumber"),
            panNumber=data.get("panNumber"),
            contactPerson=data.get("contactPerson"),
            email=data.get("email"),
            phone=data.get("phone"),
            city=data.get("city"),
            state=data.get("state"),
        )
        self.db.add(dist)
        self.db.flush()
        if data.get("branchId"):
            self.db.add(
                VendorBranchMapping(
                    vendorId=dist.id,
                    branchId=data["branchId"],
                    approvalStatus="PENDING",
                )
            )
        self.db.add(VendorWallet(vendorId=dist.id, balance=0))
        self.db.commit()
        self.db.refresh(dist)
        return self._serialize(dist)

    def approve_vendor_branch(self, mapping_id: str, user: dict) -> dict:
        mapping = self.db.get(VendorBranchMapping, mapping_id)
        if not mapping:
            raise not_found("Vendor branch mapping")
        mapping.approvalStatus = "APPROVED"
        self.db.commit()
        return {"id": mapping.id, "approvalStatus": mapping.approvalStatus}

    def list_branch_mappings(self, branch_id: str) -> dict:
        rows = (
            self.db.query(VendorBranchMapping, Distributor)
            .join(Distributor, Distributor.id == VendorBranchMapping.vendorId)
            .filter(VendorBranchMapping.branchId == branch_id)
            .order_by(VendorBranchMapping.createdAt.desc())
            .all()
        )
        return {
            "items": [
                {
                    "mappingId": m.id,
                    "approvalStatus": m.approvalStatus,
                    "branchId": m.branchId,
                    "vendor": self._serialize(d),
                    "vendorId": d.id,
                    "verificationStatus": d.verificationStatus,
                    "onboardingStatus": getattr(d, "onboardingStatus", None),
                    "contactPerson": d.contactPerson,
                    "vendorType": d.vendorType,
                    "gstNumber": d.gstNumber,
                }
                for m, d in rows
            ]
        }

    def _serialize(self, d: Distributor) -> dict:
        return {
            "id": d.id,
            "vendorCode": d.vendorCode,
            "vendorName": d.vendorName,
            "vendorType": d.vendorType,
            "gstNumber": d.gstNumber,
            "panNumber": d.panNumber,
            "verificationStatus": d.verificationStatus,
            "onboardingStatus": getattr(d, "onboardingStatus", None),
            "email": d.email,
            "phone": d.phone,
            "contactPerson": d.contactPerson,
            "city": d.city,
            "state": d.state,
        }

    def get_distributor(self, distributor_id: str) -> dict:
        from app.delivery.onboarding_service import DistributorOnboardingService

        return DistributorOnboardingService(self.db).get_distributor_detail(distributor_id)

    def set_verification(
        self,
        user: dict,
        distributor_id: str,
        *,
        status: str,
        rejection_reason: str | None = None,
    ) -> dict:
        from app.delivery.onboarding_service import DistributorOnboardingService

        return DistributorOnboardingService(self.db).set_verification_status(
            user,
            distributor_id,
            status=status,
            rejection_reason=rejection_reason,
        )
