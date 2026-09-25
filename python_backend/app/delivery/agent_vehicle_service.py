"""Delivery agent and vehicle management for distributors."""

from __future__ import annotations

from sqlalchemy.orm import Session

from app.delivery.utils import bad_request
from app.models import Branch
from app.models.delivery_entities import (
    DeliveryAgent,
    DeliveryVehicle,
    VendorBranchMapping,
)
from app.services.auth_service import AuthService


class AgentVehicleService:
    def __init__(self, db: Session) -> None:
        self.db = db

    def _distributor_id(self, user: dict) -> str:
        dist_id = user.get("distributorId")
        if not dist_id:
            raise bad_request("Distributor account not linked")
        return dist_id

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
        email = AuthService.normalize_email(data["email"])
        existing = self.db.query(DeliveryAgent).filter(DeliveryAgent.email == email).first()
        if existing:
            raise bad_request("A driver with this email already exists")

        agent = DeliveryAgent(
            distributorId=dist_id,
            name=data["name"].strip(),
            email=email,
            phone=data.get("phone"),
            licenseNumber=data.get("licenseNumber"),
            isActive=True,
        )
        self.db.add(agent)
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

        email = AuthService.normalize_email(data["email"])
        agent = (
            self.db.query(DeliveryAgent)
            .filter(DeliveryAgent.distributorId == dist_id, DeliveryAgent.email == email)
            .first()
        )
        if agent:
            if data.get("name"):
                agent.name = data["name"].strip()
            if data.get("phone"):
                agent.phone = data["phone"]
            self.db.flush()
            return agent

        agent = DeliveryAgent(
            distributorId=dist_id,
            name=data["name"].strip(),
            email=email,
            phone=data.get("phone"),
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
        }

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
