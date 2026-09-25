"""Public distributor self-onboarding for Indian hospital vendors."""

from __future__ import annotations

import json
import logging
import re
from typing import Any

from fastapi import UploadFile
from sqlalchemy.orm import Session, joinedload

from app.delivery.utils import bad_request, not_found
from app.models import Branch, User
from app.models.delivery_entities import (
    Distributor,
    DistributorDocument,
    VendorBranchMapping,
    VendorCodeSequence,
    VendorWallet,
)
from app.models.enums import Role
from app.services.gcp_storage_service import GcpStorageService
from app.utils.passwords import hash_password
from app.utils.timezone import now_ist

logger = logging.getLogger(__name__)

VENDOR_TYPES = {
    "PHARMA",
    "MEDICAL_DEVICES",
    "SURGICAL_CONSUMABLES",
    "LAB_REAGENTS",
    "GENERAL_STORES",
    "LINEN_HOUSEKEEPING",
    "CATERING_FSSAI",
    "IT_EQUIPMENT",
    "MEDICAL",  # legacy
    "OTHER",
}

GSTIN_RE = re.compile(r"^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$")
PAN_RE = re.compile(r"^[A-Z]{5}[0-9]{4}[A-Z]{1}$")
PHONE_RE = re.compile(r"^[6-9]\d{9}$")


class DistributorOnboardingService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.gcp = GcpStorageService()

    def list_public_branches(self) -> list[dict]:
        branches = (
            self.db.query(Branch)
            .options(joinedload(Branch.hospitalChain))
            .order_by(Branch.name)
            .all()
        )
        return [
            {
                "id": b.id,
                "name": b.name,
                "city": b.city,
                "state": b.state,
                "hospitalChainId": b.hospitalChainId,
                "hospitalChainName": b.hospitalChain.name if b.hospitalChain else None,
            }
            for b in branches
        ]

    def _next_vendor_code(self) -> str:
        seq = self.db.get(VendorCodeSequence, 1)
        if not seq:
            seq = VendorCodeSequence(id=1, lastNumber=0)
            self.db.add(seq)
        seq.lastNumber += 1
        self.db.flush()
        return f"VEN-{seq.lastNumber:06d}"

    def _normalize_phone(self, phone: str) -> str:
        digits = re.sub(r"\D", "", phone or "")
        if len(digits) > 10:
            digits = digits[-10:]
        return digits

    def _validate_apply(self, data: dict) -> None:
        email = (data.get("email") or "").strip().lower()
        password = data.get("password") or ""
        contact = (data.get("contactPerson") or "").strip()
        phone = self._normalize_phone(data.get("phone") or "")
        vendor_name = (data.get("vendorName") or "").strip()
        vendor_type = (data.get("vendorType") or "").strip().upper()
        gst = (data.get("gstNumber") or "").strip().upper() or None
        pan = (data.get("panNumber") or "").strip().upper()
        gst_type = (data.get("gstRegistrationType") or "").strip()
        entity_type = (data.get("legalEntityType") or "").strip()
        branch_ids = data.get("branchIds") or []
        supply = data.get("supplyCategories") or []
        delivery_mode = (data.get("deliveryMode") or "").strip()
        goods = (data.get("goodsDescription") or "").strip()

        if not email or "@" not in email:
            raise bad_request("Valid email is required")
        if not password or len(password) < 8:
            raise bad_request("Password must be at least 8 characters")
        if not contact:
            raise bad_request("Primary contact name is required")
        if not PHONE_RE.match(phone):
            raise bad_request("Enter a valid 10-digit Indian mobile number")
        if not vendor_name:
            raise bad_request("Legal entity name is required")
        if vendor_type not in VENDOR_TYPES:
            raise bad_request("Invalid vendor category")
        if not entity_type:
            raise bad_request("Entity type is required")
        if not gst_type:
            raise bad_request("GST registration type is required")
        if gst_type != "Unregistered":
            if not gst or not GSTIN_RE.match(gst):
                raise bad_request("Valid GSTIN is required for registered businesses")
        if not pan or not PAN_RE.match(pan):
            raise bad_request("Valid PAN is required")
        if entity_type in ("Pvt Ltd", "Public Ltd") and not (data.get("cin") or "").strip():
            raise bad_request("CIN is required for companies")
        if not isinstance(branch_ids, list) or len(branch_ids) < 1:
            raise bad_request("Select at least one hospital branch")
        if not isinstance(supply, list) or len(supply) < 1:
            raise bad_request("Select at least one supply category")
        if delivery_mode not in ("OWN_FLEET", "THIRD_PARTY"):
            raise bad_request("Delivery mode must be OWN_FLEET or THIRD_PARTY")
        if not goods:
            raise bad_request("Primary goods description is required")
        if not data.get("acceptTerms"):
            raise bad_request("You must accept the terms")
        if not data.get("declarationTrue"):
            raise bad_request("You must confirm the declaration")

        city = (data.get("city") or "").strip()
        state = (data.get("state") or "").strip()
        pin = (data.get("pinCode") or "").strip()
        addr1 = (data.get("addressLine1") or "").strip()
        if not addr1 or not city or not state or not re.match(r"^\d{6}$", pin):
            raise bad_request("Complete registered address with 6-digit PIN is required")

        if vendor_type == "PHARMA":
            docs = data.get("documents") or []
            has_drug = any(
                (d.get("documentType") or "").upper() in ("DRUG_LICENSE_20", "DRUG_LICENSE_21", "DRUG_LICENSE")
                and (d.get("documentNumber") or "").strip()
                for d in docs
                if isinstance(d, dict)
            )
            if not has_drug:
                raise bad_request("Drug license number is required for PHARMA vendors")

        existing_user = self.db.query(User).filter(User.email == email).first()
        if existing_user:
            raise bad_request("An account with this email already exists")
        existing_phone = self.db.query(User).filter(User.phone == phone).first()
        if existing_phone:
            raise bad_request("An account with this mobile number already exists")
        if gst:
            existing_gst = self.db.query(Distributor).filter(Distributor.gstNumber == gst).first()
            if existing_gst:
                raise bad_request("GSTIN already registered")

    async def apply(
        self,
        data: dict,
        files: dict[str, UploadFile] | None = None,
    ) -> dict:
        self._validate_apply(data)
        email = data["email"].strip().lower()
        phone = self._normalize_phone(data["phone"])
        gst = (data.get("gstNumber") or "").strip().upper() or None
        pan = (data.get("panNumber") or "").strip().upper()
        vendor_type = data["vendorType"].strip().upper()
        if vendor_type == "MEDICAL":
            vendor_type = "OTHER"

        registered = {
            "line1": (data.get("addressLine1") or "").strip(),
            "line2": (data.get("addressLine2") or "").strip() or None,
            "city": (data.get("city") or "").strip(),
            "state": (data.get("state") or "").strip(),
            "pinCode": (data.get("pinCode") or "").strip(),
        }
        same_ops = bool(data.get("operatingSameAsRegistered", True))
        if same_ops:
            operating = registered
        else:
            operating = {
                "line1": (data.get("operatingAddressLine1") or "").strip(),
                "line2": (data.get("operatingAddressLine2") or "").strip() or None,
                "city": (data.get("operatingCity") or "").strip(),
                "state": (data.get("operatingState") or "").strip(),
                "pinCode": (data.get("operatingPinCode") or "").strip(),
            }
            if not operating["line1"] or not operating["city"]:
                raise bad_request("Operating address is required when different from registered")

        now = now_ist()
        dist = Distributor(
            vendorCode=self._next_vendor_code(),
            vendorName=data["vendorName"].strip(),
            vendorType=vendor_type,
            gstNumber=gst,
            panNumber=pan,
            contactPerson=data["contactPerson"].strip(),
            email=email,
            phone=phone,
            city=registered["city"],
            state=registered["state"],
            isActive=True,
            verificationStatus="PENDING",
            legalEntityType=(data.get("legalEntityType") or "").strip() or None,
            tradeName=(data.get("tradeName") or "").strip() or None,
            cin=(data.get("cin") or "").strip() or None,
            udyamNumber=(data.get("udyamNumber") or "").strip() or None,
            website=(data.get("website") or "").strip() or None,
            yearEstablished=int(data["yearEstablished"]) if data.get("yearEstablished") else None,
            gstRegistrationType=(data.get("gstRegistrationType") or "").strip() or None,
            registeredAddressJson=json.dumps(registered),
            operatingAddressJson=json.dumps(operating),
            serviceableStatesJson=json.dumps(data.get("serviceableStates") or []),
            supplyCategoriesJson=json.dumps(data.get("supplyCategories") or []),
            deliveryMode=(data.get("deliveryMode") or "").strip() or None,
            goodsDescription=(data.get("goodsDescription") or "").strip() or None,
            accountsEmail=(data.get("accountsEmail") or "").strip().lower() or None,
            dispatchPhone=self._normalize_phone(data.get("dispatchPhone") or "") or None,
            alternatePhone=self._normalize_phone(data.get("alternatePhone") or "") or None,
            designation=(data.get("designation") or "").strip() or None,
            preferredLanguage=(data.get("preferredLanguage") or "").strip() or None,
            onboardingStatus="SUBMITTED",
            submittedAt=now,
            termsAcceptedAt=now,
        )
        self.db.add(dist)
        self.db.flush()

        user = User(
            name=data["contactPerson"].strip(),
            email=email,
            phone=phone,
            role=Role.DISTRIBUTOR.value if hasattr(Role, "DISTRIBUTOR") else "DISTRIBUTOR",
            passwordHash=hash_password(data["password"]),
            isActive=True,
            distributorId=dist.id,
        )
        # Role enum may not have DISTRIBUTOR — use string
        user.role = "DISTRIBUTOR"
        self.db.add(user)

        self.db.add(VendorWallet(vendorId=dist.id, balance=0))

        branch_ids: list[str] = list(dict.fromkeys(data.get("branchIds") or []))
        for bid in branch_ids:
            branch = self.db.get(Branch, bid)
            if not branch:
                raise bad_request(f"Unknown hospital branch: {bid}")
            self.db.add(
                VendorBranchMapping(
                    vendorId=dist.id,
                    branchId=bid,
                    approvalStatus="PENDING",
                )
            )

        # Document metadata from JSON list
        doc_meta: list[dict] = [
            d for d in (data.get("documents") or []) if isinstance(d, dict) and d.get("documentType")
        ]
        files = files or {}
        created_docs: list[DistributorDocument] = []

        # Ensure PAN / GST / bank placeholders from files if present
        file_type_map = {
            "gstCertificate": "GST_CERTIFICATE",
            "panCard": "PAN_CARD",
            "bankProof": "BANK_PROOF",
            "drugLicense": "DRUG_LICENSE",
            "deviceCertificate": "MEDICAL_DEVICE_CERT",
            "fssaiLicense": "FSSAI_LICENSE",
            "signatoryId": "SIGNATORY_ID",
        }
        for form_key, doc_type in file_type_map.items():
            if form_key in files and not any(
                (d.get("documentType") or "").upper() == doc_type for d in doc_meta
            ):
                doc_meta.append({"documentType": doc_type})

        for meta in doc_meta:
            doc_type = str(meta["documentType"]).strip().upper()
            file_url: str | None = None
            upload = files.get(doc_type) or files.get(doc_type.lower())
            # Also match form keys
            for fk, mapped in file_type_map.items():
                if mapped == doc_type and fk in files:
                    upload = files[fk]
                    break
            if upload and upload.filename:
                try:
                    file_url = await self.gcp.upload_visitor_document(
                        upload, dist.id, f"distributor-{doc_type.lower()}"
                    )
                except Exception as exc:
                    logger.error("Document upload failed for %s: %s", doc_type, exc)
                    raise bad_request(f"Could not upload {doc_type} document") from exc

            expires = None
            if meta.get("expiresAt"):
                try:
                    from datetime import datetime

                    expires = datetime.fromisoformat(str(meta["expiresAt"]).replace("Z", "+00:00"))
                except ValueError:
                    expires = None

            row = DistributorDocument(
                distributorId=dist.id,
                documentType=doc_type,
                documentNumber=(meta.get("documentNumber") or "").strip() or None,
                expiresAt=expires,
                fileUrl=file_url,
                verificationStatus="PENDING",
            )
            self.db.add(row)
            created_docs.append(row)

        # MVP: require PAN + bank file when GST registered
        if gst and not any(d.documentType == "GST_CERTIFICATE" for d in created_docs):
            # soft — hospital can still request later
            pass

        self.db.commit()
        self.db.refresh(dist)

        try:
            self._notify_application_received(dist)
        except Exception as exc:
            logger.error("Onboarding email failed for %s: %s", dist.id, exc)

        return {
            "id": dist.id,
            "vendorCode": dist.vendorCode,
            "vendorName": dist.vendorName,
            "email": dist.email,
            "onboardingStatus": dist.onboardingStatus,
            "verificationStatus": dist.verificationStatus,
            "message": (
                "Application submitted. You can sign in, but delivery booking unlocks after "
                "hospital verification and branch approval."
            ),
        }

    def _notify_application_received(self, dist: Distributor) -> None:
        if not dist.email:
            return
        from app.services.messaging_service import EmailService

        settings_email = EmailService()
        subject = f"Connitor — Distributor application received ({dist.vendorCode})"
        text = (
            f"Hello {dist.contactPerson or dist.vendorName},\n\n"
            f"We received your distributor application for {dist.vendorName} "
            f"({dist.vendorCode}).\n"
            "Hospital staff will review your details and documents. "
            "You can sign in now; booking unlocks after approval.\n\n"
            "— Connitor"
        )
        html = f"<p>{text.replace(chr(10), '<br/>')}</p>"
        settings_email._deliver_email(
            dist.email,
            subject,
            text,
            html,
            context="distributor onboarding received",
        )

    def get_distributor_detail(self, distributor_id: str) -> dict:
        dist = (
            self.db.query(Distributor)
            .options(
                joinedload(Distributor.documents),
                joinedload(Distributor.branchMappings),
            )
            .filter(Distributor.id == distributor_id)
            .first()
        )
        if not dist:
            raise not_found("Distributor")
        return self._serialize_full(dist)

    def set_verification_status(
        self,
        user: dict,
        distributor_id: str,
        *,
        status: str,
        rejection_reason: str | None = None,
    ) -> dict:
        status = status.upper()
        if status not in ("APPROVED", "REJECTED", "PENDING", "UNDER_REVIEW"):
            raise bad_request("Invalid verification status")
        dist = self.db.get(Distributor, distributor_id)
        if not dist:
            raise not_found("Distributor")
        dist.verificationStatus = status
        if status == "APPROVED":
            dist.onboardingStatus = "APPROVED"
            dist.rejectionReason = None
        elif status == "REJECTED":
            dist.onboardingStatus = "REJECTED"
            dist.rejectionReason = rejection_reason
        elif status == "UNDER_REVIEW":
            dist.onboardingStatus = "UNDER_REVIEW"
        dist.reviewedAt = now_ist()
        dist.reviewedById = user.get("id")
        self.db.commit()
        self.db.refresh(dist)

        if status in ("APPROVED", "REJECTED") and dist.email:
            try:
                self._notify_verification_result(dist)
            except Exception as exc:
                logger.error("Verification email failed for %s: %s", dist.id, exc)

        return self._serialize_full(dist)

    def _notify_verification_result(self, dist: Distributor) -> None:
        from app.services.messaging_service import EmailService

        email = EmailService()
        if dist.verificationStatus == "APPROVED":
            subject = f"Connitor — Distributor approved ({dist.vendorCode})"
            body = (
                f"Hello {dist.contactPerson or dist.vendorName},\n\n"
                f"Your distributor profile {dist.vendorName} has been verified. "
                "Once a hospital branch also approves your mapping, you can book deliveries.\n\n"
                "— Connitor"
            )
        else:
            subject = f"Connitor — Distributor application update ({dist.vendorCode})"
            reason = dist.rejectionReason or "Please contact the hospital vendor desk."
            body = (
                f"Hello {dist.contactPerson or dist.vendorName},\n\n"
                f"Your application for {dist.vendorName} was not approved.\n"
                f"Reason: {reason}\n\n— Connitor"
            )
        email._deliver_email(
            dist.email,
            subject,
            body,
            f"<p>{body.replace(chr(10), '<br/>')}</p>",
            context="distributor verification",
        )

    def _serialize_full(self, dist: Distributor) -> dict:
        def _loads(raw: str | None) -> Any:
            if not raw:
                return None
            try:
                return json.loads(raw)
            except json.JSONDecodeError:
                return raw

        mappings = []
        for m in dist.branchMappings or []:
            branch = self.db.get(Branch, m.branchId)
            mappings.append(
                {
                    "mappingId": m.id,
                    "branchId": m.branchId,
                    "branchName": branch.name if branch else None,
                    "approvalStatus": m.approvalStatus,
                }
            )
        return {
            "id": dist.id,
            "vendorCode": dist.vendorCode,
            "vendorName": dist.vendorName,
            "tradeName": dist.tradeName,
            "vendorType": dist.vendorType,
            "legalEntityType": dist.legalEntityType,
            "gstNumber": dist.gstNumber,
            "gstRegistrationType": dist.gstRegistrationType,
            "panNumber": dist.panNumber,
            "cin": dist.cin,
            "udyamNumber": dist.udyamNumber,
            "website": dist.website,
            "yearEstablished": dist.yearEstablished,
            "contactPerson": dist.contactPerson,
            "email": dist.email,
            "phone": dist.phone,
            "alternatePhone": dist.alternatePhone,
            "designation": dist.designation,
            "preferredLanguage": dist.preferredLanguage,
            "city": dist.city,
            "state": dist.state,
            "registeredAddress": _loads(dist.registeredAddressJson),
            "operatingAddress": _loads(dist.operatingAddressJson),
            "serviceableStates": _loads(dist.serviceableStatesJson) or [],
            "supplyCategories": _loads(dist.supplyCategoriesJson) or [],
            "deliveryMode": dist.deliveryMode,
            "goodsDescription": dist.goodsDescription,
            "accountsEmail": dist.accountsEmail,
            "dispatchPhone": dist.dispatchPhone,
            "verificationStatus": dist.verificationStatus,
            "onboardingStatus": dist.onboardingStatus,
            "rejectionReason": dist.rejectionReason,
            "submittedAt": dist.submittedAt.isoformat() if dist.submittedAt else None,
            "reviewedAt": dist.reviewedAt.isoformat() if dist.reviewedAt else None,
            "isActive": dist.isActive,
            "branchMappings": mappings,
            "documents": [
                {
                    "id": d.id,
                    "documentType": d.documentType,
                    "documentNumber": d.documentNumber,
                    "expiresAt": d.expiresAt.isoformat() if d.expiresAt else None,
                    "fileUrl": d.fileUrl,
                    "verificationStatus": d.verificationStatus,
                }
                for d in (dist.documents or [])
            ],
            "canBookDeliveries": self.can_book(dist),
        }

    def can_book(self, dist: Distributor) -> bool:
        if dist.verificationStatus != "APPROVED":
            return False
        return any(m.approvalStatus == "APPROVED" for m in (dist.branchMappings or []))
