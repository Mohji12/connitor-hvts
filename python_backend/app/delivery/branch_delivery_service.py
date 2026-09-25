"""Branch delivery settings, docks, and gates."""

from __future__ import annotations

from sqlalchemy.orm import Session

from app.models.delivery_entities import BranchDeliverySettings, DeliveryGate, ReceivingDock


class BranchDeliveryService:
    def __init__(self, db: Session) -> None:
        self.db = db

    def get_settings(self, branch_id: str) -> dict:
        row = (
            self.db.query(BranchDeliverySettings)
            .filter(BranchDeliverySettings.branchId == branch_id)
            .first()
        )
        if not row:
            row = BranchDeliverySettings(branchId=branch_id)
            self.db.add(row)
            self.db.commit()
            self.db.refresh(row)
        return {
            "branchId": row.branchId,
            "allowUnscheduledDeliveries": row.allowUnscheduledDeliveries,
            "allowEcommerceDeliveries": row.allowEcommerceDeliveries,
            "requireAgentPhoto": row.requireAgentPhoto,
            "enableQrPass": row.enableQrPass,
        }

    def update_settings(self, branch_id: str, data: dict) -> dict:
        row = (
            self.db.query(BranchDeliverySettings)
            .filter(BranchDeliverySettings.branchId == branch_id)
            .first()
        )
        if not row:
            row = BranchDeliverySettings(branchId=branch_id)
            self.db.add(row)
        for key in (
            "allowUnscheduledDeliveries",
            "allowEcommerceDeliveries",
            "requireAgentPhoto",
            "requireVehiclePhoto",
            "requirePoValidation",
            "enableQrPass",
        ):
            if key in data:
                setattr(row, key, data[key])
        self.db.commit()
        return self.get_settings(branch_id)

    def list_gates(self, branch_id: str) -> list[dict]:
        rows = (
            self.db.query(DeliveryGate)
            .filter(DeliveryGate.branchId == branch_id, DeliveryGate.isActive.is_(True))
            .all()
        )
        return [
            {"id": g.id, "gateName": g.gateName, "gateCode": g.gateCode, "gateType": g.gateType}
            for g in rows
        ]

    def create_gate(self, branch_id: str, data: dict) -> dict:
        gate = DeliveryGate(
            branchId=branch_id,
            gateName=data["gateName"],
            gateCode=data["gateCode"],
            gateType=data.get("gateType", "MAIN"),
        )
        self.db.add(gate)
        self.db.commit()
        self.db.refresh(gate)
        return {"id": gate.id, "gateName": gate.gateName, "gateCode": gate.gateCode}

    def create_dock(self, branch_id: str, data: dict) -> dict:
        dock = ReceivingDock(
            branchId=branch_id,
            dockName=data["dockName"],
            dockCode=data["dockCode"],
            locationDescription=data.get("locationDescription"),
        )
        self.db.add(dock)
        self.db.commit()
        self.db.refresh(dock)
        return {"id": dock.id, "dockName": dock.dockName, "dockCode": dock.dockCode}
