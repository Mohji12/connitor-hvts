"""Delivery agent and vehicle management for distributors."""

from __future__ import annotations

import uuid

from sqlalchemy.orm import Session

from app.delivery.utils import bad_request
from app.models import Branch
from app.models.delivery_entities import (
    DeliveryAgent,
    DeliveryVehicle,
    VendorBranchMapping,
)
from app.services.auth_service import AuthService


def _phone_digits(phone: str | None) -> str:
    return "".join(ch for ch in (phone or "") if ch.isdigit())


class AgentVehicleService:
    def __init__(self, db: Session) -> None:
        self.db = db

    def _distributor_id(self, user: dict) -> str:
        dist_id = user.get("distributorId")
        if not dist_id:
            raise bad_request("Distributor account not linked")
        return dist_id

    def _find_agent_by_phone(self, dist_id: str, phone: str | None) -> DeliveryAgent | None:
        digits = _phone_digits(phone)
        if len(digits) < 10:
            return None
        rows = (
            self.db.query(DeliveryAgent)
            .filter(DeliveryAgent.distributorId == dist_id, DeliveryAgent.phone.isnot(None))
            .all()
        )
        for agent in rows:
            if _phone_digits(agent.phone) == digits[-10:]:
                return agent
        return None

    def _scoped_email(self, dist_id: str, phone: str | None, fallback: str = "driver") -> str:
        digits = _phone_digits(phone)
        base = digits[-10:] if digits else fallback
        return AuthService.normalize_email(f"{base}.{dist_id[:8]}@delivery.local")

    def _unique_email(self, dist_id: str, phone: str | None, preferred: str) -> str:
        """Return preferred email if free; otherwise a distributor-scoped unique address."""
        email = AuthService.normalize_email(preferred)
        existing = self.db.query(DeliveryAgent).filter(DeliveryAgent.email == email).first()
        if not existing:
            return email
        if existing.distributorId == dist_id:
            return email
        # Global unique constraint — never collide with another vendor's driver.
        scoped = self._scoped_email(dist_id, phone)
        clash = self.db.query(DeliveryAgent).filter(DeliveryAgent.email == scoped).first()
        if not clash or clash.distributorId == dist_id:
            return scoped
        return AuthService.normalize_email(
            f"{_phone_digits(phone) or 'driver'}.{dist_id[:8]}.{uuid.uuid4().hex[:6]}@delivery.local"
        )

    def list_approved_branches(self, user: dict) -> dict:
        dist_id = self._distributor_id(user)
        rows = (
            self.db.query(VendorBranchMapping, Branch)
            .join(Branch, Branch.id == VendorBranchMapping.branchId)
            .filter(
                VendorBranchMapping.vendorId == dist_id,
                VendorBranchMapping.approvalStatus == "APPROVED",
            )
            .all()
        )
        return {
            "branches": [
                {
                    "id": branch.id,
                    "name": branch.name,
                    "phone": branch.phone,
                    "email": branch.email,
                    "street": branch.street,
                    "city": branch.city,
                    "state": branch.state,
                    "pinCode": branch.pinCode,
                }
                for _, branch in rows
            ]
        }

    def list_agents(self, user: dict) -> dict:
        dist_id = self._distributor_id(user)
        rows = (
            self.db.query(DeliveryAgent)
            .filter(DeliveryAgent.distributorId == dist_id, DeliveryAgent.isActive.is_(True))
            .order_by(DeliveryAgent.name.asc())
            .all()
        )
        return {"agents": [self._serialize_agent(a) for a in rows]}

    def list_vehicles(self, user: dict) -> dict:
        dist_id = self._distributor_id(user)
        rows = (
            self.db.query(DeliveryVehicle)
            .filter(DeliveryVehicle.distributorId == dist_id, DeliveryVehicle.isActive.is_(True))
            .order_by(DeliveryVehicle.registrationNumber.asc())
            .all()
        )
        return {"vehicles": [self._serialize_vehicle(v) for v in rows]}

    def create_agent(self, user: dict, data: dict) -> dict:
        dist_id = self._distributor_id(user)
        name = (data.get("name") or "").strip()
        if not name:
            raise bad_request("Driver name is required")
        phone = (data.get("phone") or "").strip() or None
        raw_email = (data.get("email") or "").strip()
        if not raw_email:
            if _phone_digits(phone):
                raw_email = self._scoped_email(dist_id, phone)
            else:
                raise bad_request("Driver email or phone is required")

        # Reuse an existing driver for this vendor by phone or email.
        by_phone = self._find_agent_by_phone(dist_id, phone)
        if by_phone:
            by_phone.name = name
            if phone:
                by_phone.phone = phone
            if raw_email and (
                not by_phone.email
                or by_phone.email.endswith("@delivery.local")
            ):
                by_phone.email = self._unique_email(dist_id, phone, raw_email)
            self.db.commit()
            self.db.refresh(by_phone)
            return self._serialize_agent(by_phone)

        email = self._unique_email(dist_id, phone, raw_email)
        existing = (
            self.db.query(DeliveryAgent)
            .filter(DeliveryAgent.distributorId == dist_id, DeliveryAgent.email == email)
            .first()
        )
        if existing:
            existing.name = name
            if phone:
                existing.phone = phone
            self.db.commit()
            self.db.refresh(existing)
            return self._serialize_agent(existing)

        agent = DeliveryAgent(
            distributorId=dist_id,
            name=name,
            email=email,
            phone=phone,
            licenseNumber=data.get("licenseNumber"),
            isActive=True,
        )
        self.db.add(agent)
        self.db.commit()
        self.db.refresh(agent)
        return self._serialize_agent(agent)

    def save_agent_photo(self, user: dict, agent_id: str, content: bytes, mime: str) -> dict:
        dist_id = self._distributor_id(user)
        agent = self.db.get(DeliveryAgent, agent_id)
        if not agent or agent.distributorId != dist_id:
            raise bad_request("Invalid driver")
        if mime == "image/jpg":
            mime = "image/jpeg"
        if not mime.startswith("image/"):
            raise bad_request("Driver photo must be an image")
        from app.services.s3_storage_service import S3StorageService

        agent.photoStorageKey = S3StorageService().upload_visitor_asset(
            agent.id, "driver-photo", content, mime
        )
        self.db.commit()
        self.db.refresh(agent)
        return self._serialize_agent(agent)

    def create_vehicle(self, user: dict, data: dict) -> dict:
        dist_id = self._distributor_id(user)
        reg = data["registrationNumber"].strip().upper()
        existing = self.db.query(DeliveryVehicle).filter(DeliveryVehicle.registrationNumber == reg).first()
        if existing:
            raise bad_request("Vehicle registration already exists")
        from app.delivery.delivery_pricing import vehicle_volume_from_dims

        length = data.get("lengthCm")
        breadth = data.get("breadthCm")
        height = data.get("heightCm")
        volume = vehicle_volume_from_dims(length, breadth, height)
        if volume is None and data.get("volumeCm3") is not None:
            try:
                volume = float(data["volumeCm3"])
            except (TypeError, ValueError):
                volume = None
        vehicle = DeliveryVehicle(
            distributorId=dist_id,
            registrationNumber=reg,
            vehicleType=data.get("vehicleType"),
            lengthCm=length,
            breadthCm=breadth,
            heightCm=height,
            volumeCm3=volume,
            isActive=True,
        )
        self.db.add(vehicle)
        self.db.commit()
        self.db.refresh(vehicle)
        return self._serialize_vehicle(vehicle)

    def resolve_agent(self, user: dict, data: dict | str) -> DeliveryAgent:
        dist_id = self._distributor_id(user)
        if isinstance(data, str):
            agent = self.db.get(DeliveryAgent, data)
            if not agent or agent.distributorId != dist_id:
                raise bad_request("Invalid driver")
            return agent

        if data.get("agentId"):
            return self.resolve_agent(user, data["agentId"])

        name = (data.get("name") or "").strip()
        if not name:
            raise bad_request("Driver name is required")
        phone = (data.get("phone") or "").strip() or None
        raw_email = (data.get("email") or "").strip()
        if not raw_email:
            if _phone_digits(phone):
                raw_email = self._scoped_email(dist_id, phone)
            else:
                raise bad_request("Driver email or phone is required")

        by_phone = self._find_agent_by_phone(dist_id, phone)
        if by_phone:
            by_phone.name = name
            if phone:
                by_phone.phone = phone
            self.db.flush()
            return by_phone

        email = self._unique_email(dist_id, phone, raw_email)
        agent = (
            self.db.query(DeliveryAgent)
            .filter(DeliveryAgent.distributorId == dist_id, DeliveryAgent.email == email)
            .first()
        )
        if agent:
            agent.name = name
            if phone:
                agent.phone = phone
            self.db.flush()
            return agent

        agent = DeliveryAgent(
            distributorId=dist_id,
            name=name,
            email=email,
            phone=phone,
            licenseNumber=data.get("licenseNumber"),
            isActive=True,
        )
        self.db.add(agent)
        self.db.flush()
        return agent

    def resolve_vehicle(self, user: dict, data: dict | str) -> DeliveryVehicle:
        dist_id = self._distributor_id(user)
        if isinstance(data, str):
            vehicle = self.db.get(DeliveryVehicle, data)
            if not vehicle or vehicle.distributorId != dist_id:
                raise bad_request("Invalid vehicle")
            return vehicle

        if data.get("vehicleId"):
            return self.resolve_vehicle(user, data["vehicleId"])

        reg = data["registrationNumber"].strip().upper()
        vehicle = (
            self.db.query(DeliveryVehicle)
            .filter(DeliveryVehicle.distributorId == dist_id, DeliveryVehicle.registrationNumber == reg)
            .first()
        )
        if vehicle:
            if data.get("vehicleType"):
                vehicle.vehicleType = data["vehicleType"]
            self._apply_vehicle_dims(vehicle, data)
            self.db.flush()
            return vehicle

        from app.delivery.delivery_pricing import vehicle_volume_from_dims

        length = data.get("lengthCm")
        breadth = data.get("breadthCm")
        height = data.get("heightCm")
        volume = vehicle_volume_from_dims(length, breadth, height)
        vehicle = DeliveryVehicle(
            distributorId=dist_id,
            registrationNumber=reg,
            vehicleType=data.get("vehicleType"),
            lengthCm=length,
            breadthCm=breadth,
            heightCm=height,
            volumeCm3=volume,
            isActive=True,
        )
        self.db.add(vehicle)
        self.db.flush()
        return vehicle

    def _apply_vehicle_dims(self, vehicle: DeliveryVehicle, data: dict) -> None:
        from app.delivery.delivery_pricing import vehicle_volume_from_dims

        if any(k in data for k in ("lengthCm", "breadthCm", "heightCm", "volumeCm3")):
            length = data.get("lengthCm", vehicle.lengthCm)
            breadth = data.get("breadthCm", vehicle.breadthCm)
            height = data.get("heightCm", vehicle.heightCm)
            vehicle.lengthCm = length
            vehicle.breadthCm = breadth
            vehicle.heightCm = height
            volume = vehicle_volume_from_dims(length, breadth, height)
            if volume is not None:
                vehicle.volumeCm3 = volume
            elif data.get("volumeCm3") is not None:
                vehicle.volumeCm3 = float(data["volumeCm3"])

    @staticmethod
    def _serialize_agent(agent: DeliveryAgent) -> dict:
        return {
            "id": agent.id,
            "name": agent.name,
            "email": agent.email,
            "phone": agent.phone,
            "licenseNumber": agent.licenseNumber,
            "isActive": agent.isActive,
            "photoUrl": AgentVehicleService._photo_url(agent.photoStorageKey),
        }

    @staticmethod
    def _photo_url(storage_key: str | None) -> str | None:
        key = (storage_key or "").strip()
        if not key:
            return None
        from app.services.s3_storage_service import S3StorageService

        return S3StorageService().get_presigned_url(key)

    @staticmethod
    def _serialize_vehicle(vehicle: DeliveryVehicle) -> dict:
        return {
            "id": vehicle.id,
            "registrationNumber": vehicle.registrationNumber,
            "vehicleType": vehicle.vehicleType,
            "lengthCm": float(vehicle.lengthCm) if vehicle.lengthCm is not None else None,
            "breadthCm": float(vehicle.breadthCm) if vehicle.breadthCm is not None else None,
            "heightCm": float(vehicle.heightCm) if vehicle.heightCm is not None else None,
            "volumeCm3": float(vehicle.volumeCm3) if vehicle.volumeCm3 is not None else None,
            "isActive": vehicle.isActive,
        }
