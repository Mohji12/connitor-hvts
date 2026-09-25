"""Receiving dock and GRN operations."""

from __future__ import annotations

from sqlalchemy.orm import Session

from app.delivery.inbound_delivery_service import InboundDeliveryService
from app.delivery.utils import bad_request, not_found
from app.models.delivery_entities import DockAssignment, GrnRecord, InboundDelivery, ReceivingDock, ReceivingRecord
from app.models.enums import DeliveryStatus
from app.utils.timezone import now_ist


class ReceivingService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.delivery_svc = InboundDeliveryService(db)

    def assign_dock(self, user: dict, delivery_id: str, dock_id: str) -> dict:
        delivery = self.db.get(InboundDelivery, delivery_id)
        if not delivery:
            raise not_found("Delivery")
        if delivery.status not in (
            DeliveryStatus.ARRIVED_AT_GATE.value,
            DeliveryStatus.GATE_VERIFIED.value,
            DeliveryStatus.IN_PROGRESS.value,
        ):
            raise bad_request(
                f"Assign dock only when delivery is at gate (current: {delivery.status})"
            )
        dock = self.db.get(ReceivingDock, dock_id)
        if not dock or not dock.isActive:
            raise not_found("Dock")
        existing = (
            self.db.query(DockAssignment).filter(DockAssignment.deliveryId == delivery_id).first()
        )
        if existing:
            existing.dockId = dock_id
        else:
            self.db.add(DockAssignment(deliveryId=delivery_id, dockId=dock_id))
        if delivery.status != DeliveryStatus.IN_PROGRESS.value:
            self.delivery_svc.transition_status(
                delivery_id, user, DeliveryStatus.IN_PROGRESS.value, f"Dock {dock.dockCode} assigned"
            )
        else:
            self.db.commit()
        return {"deliveryId": delivery_id, "dockId": dock_id}

    def start_receiving(self, user: dict, delivery_id: str) -> dict:
        delivery = self.db.get(InboundDelivery, delivery_id)
        if not delivery:
            raise not_found("Delivery")
        dock = self.db.query(DockAssignment).filter(DockAssignment.deliveryId == delivery_id).first()
        if not dock:
            raise bad_request("Assign a dock before starting receiving")
        if delivery.status in (
            DeliveryStatus.ARRIVED_AT_GATE.value,
            DeliveryStatus.GATE_VERIFIED.value,
        ):
            self.delivery_svc.transition_status(
                delivery_id, user, DeliveryStatus.IN_PROGRESS.value, "Receiving started"
            )
        elif delivery.status != DeliveryStatus.IN_PROGRESS.value:
            raise bad_request(
                f"Start receiving only for at-gate / at-dock deliveries (current: {delivery.status})"
            )
        record = self.db.query(ReceivingRecord).filter(ReceivingRecord.deliveryId == delivery_id).first()
        if not record:
            record = ReceivingRecord(deliveryId=delivery_id, status="IN_PROGRESS", startedAt=now_ist())
            self.db.add(record)
        else:
            record.status = "IN_PROGRESS"
            record.startedAt = now_ist()
        self.db.commit()
        return {"deliveryId": delivery_id, "status": record.status, "deliveryStatus": DeliveryStatus.IN_PROGRESS.value}

    def generate_grn(self, user: dict, delivery_id: str) -> dict:
        delivery = self.db.get(InboundDelivery, delivery_id)
        if not delivery:
            raise not_found("Delivery")
        if delivery.status != DeliveryStatus.IN_PROGRESS.value:
            raise bad_request(
                f"Generate GRN only while receiving is in progress (current: {delivery.status})"
            )
        record = self.db.query(ReceivingRecord).filter(ReceivingRecord.deliveryId == delivery_id).first()
        if not record or not record.startedAt:
            raise bad_request("Start receiving before generating GRN")
        existing = self.db.query(GrnRecord).filter(GrnRecord.deliveryId == delivery_id).first()
        if existing:
            return {"grnNumber": existing.grnNumber, "id": existing.id}
        grn_number = f"GRN-{now_ist().year}-{delivery.deliveryNumber[-6:]}"
        grn = GrnRecord(
            deliveryId=delivery_id,
            grnNumber=grn_number,
            generatedById=user["id"],
        )
        self.db.add(grn)
        self.delivery_svc.transition_status(
            delivery_id, user, DeliveryStatus.RECEIVED.value, "GRN generated"
        )
        self.db.commit()
        return {"grnNumber": grn_number, "deliveryId": delivery_id}

    def list_docks(self, branch_id: str) -> list[dict]:
        rows = (
            self.db.query(ReceivingDock)
            .filter(ReceivingDock.branchId == branch_id, ReceivingDock.isActive.is_(True))
            .all()
        )
        return [
            {"id": d.id, "dockName": d.dockName, "dockCode": d.dockCode, "branchId": d.branchId}
            for d in rows
        ]

    def receiving_queue(self, branch_id: str) -> dict:
        """Board data: docks + deliveries in gate/receiving statuses."""
        from app.models.delivery_entities import DeliveryAgent, DeliveryVehicle, Distributor

        docks = self.list_docks(branch_id)
        statuses = [
            DeliveryStatus.ARRIVED_AT_GATE.value,
            DeliveryStatus.GATE_VERIFIED.value,
            DeliveryStatus.IN_PROGRESS.value,
            DeliveryStatus.RECEIVED.value,
        ]
        rows = (
            self.db.query(InboundDelivery)
            .filter(
                InboundDelivery.branchId == branch_id,
                InboundDelivery.isActive.is_(True),
                InboundDelivery.status.in_(statuses),
            )
            .order_by(InboundDelivery.expectedArrivalTime.asc())
            .all()
        )
        assignments = {
            a.deliveryId: a.dockId
            for a in self.db.query(DockAssignment)
            .filter(DockAssignment.deliveryId.in_([d.id for d in rows] or ["__none__"]))
            .all()
        }
        started_ids = {
            r.deliveryId
            for r in self.db.query(ReceivingRecord)
            .filter(
                ReceivingRecord.deliveryId.in_([d.id for d in rows] or ["__none__"]),
                ReceivingRecord.startedAt.isnot(None),
            )
            .all()
        }
        items = []
        for d in rows:
            vendor = self.db.get(Distributor, d.vendorId)
            agent = self.db.get(DeliveryAgent, d.agentId) if d.agentId else None
            vehicle = self.db.get(DeliveryVehicle, d.vehicleId) if d.vehicleId else None
            items.append(
                {
                    "id": d.id,
                    "deliveryNumber": d.deliveryNumber,
                    "status": d.status,
                    "goodsType": d.goodsType,
                    "totalBoxes": d.totalBoxes,
                    "expectedArrivalTime": d.expectedArrivalTime.isoformat()
                    if d.expectedArrivalTime
                    else None,
                    "vendorName": vendor.vendorName if vendor else None,
                    "agentName": agent.name if agent else None,
                    "vehicleNumber": vehicle.registrationNumber if vehicle else None,
                    "dockId": assignments.get(d.id),
                    "receivingStarted": d.id in started_ids,
                }
            )
        return {"docks": docks, "deliveries": items, "total": len(items)}
