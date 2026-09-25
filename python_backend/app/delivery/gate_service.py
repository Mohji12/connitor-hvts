"""Security gate operations for inbound deliveries."""

from __future__ import annotations

import hashlib
import hmac
import logging
from datetime import timedelta

from sqlalchemy.orm import Session, joinedload

from app.config import get_settings
from app.delivery.inbound_delivery_service import InboundDeliveryService
from app.delivery.utils import bad_request, not_found
from app.models.delivery_entities import (
    DeliveryGateEntry,
    DeliveryGateExit,
    DeliveryQrCode,
    DeliverySecurityScan,
    DeliveryVisitorLog,
    InboundDelivery,
    VisitDeliveryLink,
)
from app.models.enums import DeliveryStatus
from app.utils.timezone import now_ist

logger = logging.getLogger(__name__)


class DeliveryGateService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.delivery_svc = InboundDeliveryService(db)

    def _gate_timing(self, delivery_id: str) -> dict:
        entry = (
            self.db.query(DeliveryGateEntry)
            .filter(DeliveryGateEntry.deliveryId == delivery_id)
            .order_by(DeliveryGateEntry.entryTime.asc())
            .first()
        )
        exit_row = (
            self.db.query(DeliveryGateExit)
            .filter(DeliveryGateExit.deliveryId == delivery_id)
            .order_by(DeliveryGateExit.exitTime.desc())
            .first()
        )
        entry_time = entry.entryTime if entry else None
        exit_time = exit_row.exitTime if exit_row else None
        duration_minutes = None
        if entry_time and exit_time:
            duration_minutes = max(0, int((exit_time - entry_time).total_seconds() // 60))
        return {
            "entryTime": entry_time.isoformat() if entry_time else None,
            "exitTime": exit_time.isoformat() if exit_time else None,
            "durationMinutes": duration_minutes,
            "passNumber": entry.passNumber if entry else None,
        }

    def _suggested_action(self, status: str, *, qr_kind: str = "ENTRY") -> tuple[str, str]:
        kind = (qr_kind or "ENTRY").upper()
        if kind == "EXIT":
            if status == DeliveryStatus.RECEIVED.value:
                return "MARK_EXIT", "Checkout QR valid — confirm gate exit."
            if status in (DeliveryStatus.EXITED.value, DeliveryStatus.CLOSED.value):
                return "INFO", "Delivery already exited."
            if status in (
                DeliveryStatus.ARRIVED_AT_GATE.value,
                DeliveryStatus.GATE_VERIFIED.value,
                DeliveryStatus.IN_PROGRESS.value,
            ):
                return (
                    "INFO",
                    "Checkout QR scanned — finish receiving/GRN before exit is allowed.",
                )
            return "INFO", f"Checkout QR not ready for exit (status {status})."

        # ENTRY QR
        if status == DeliveryStatus.ON_HOLD.value:
            return (
                "INFO",
                "Delivery is on hold for hospital internal delivery — release hold before entry.",
            )
        if status in (DeliveryStatus.SCHEDULED.value, DeliveryStatus.APPROVED.value):
            return "ALLOW_ENTRY", "QR valid — allow vehicle entry."
        if status in (
            DeliveryStatus.ARRIVED_AT_GATE.value,
            DeliveryStatus.GATE_VERIFIED.value,
            DeliveryStatus.IN_PROGRESS.value,
            DeliveryStatus.RECEIVED.value,
        ):
            return (
                "INFO",
                "Already checked in — use the checkout QR emailed after entry (after GRN).",
            )
        if status in (DeliveryStatus.EXITED.value, DeliveryStatus.CLOSED.value):
            return "INFO", "Delivery already exited."
        return "INFO", f"No gate action for status {status}."

    def _ensure_exit_qr(self, delivery: InboundDelivery) -> DeliveryQrCode:
        existing = delivery.qr_for_kind("EXIT")
        if existing:
            return existing
        payload = f"EXIT:{delivery.id}:{delivery.deliveryNumber}:{now_ist().isoformat()}"
        secret = get_settings().jwt_secret
        signature = hmac.new(secret.encode(), payload.encode(), hashlib.sha256).hexdigest()
        entry_qr = delivery.qrCode
        expires = (
            entry_qr.expiresAt
            if entry_qr and entry_qr.expiresAt
            else now_ist() + timedelta(hours=48)
        )
        row = DeliveryQrCode(
            deliveryId=delivery.id,
            qrKind="EXIT",
            qrPayload=payload,
            signature=signature,
            expiresAt=expires,
        )
        self.db.add(row)
        self.db.flush()
        return row

    def allow_entry(self, user: dict, delivery_id: str, gate_id: str | None = None) -> dict:
        delivery = (
            self.db.query(InboundDelivery)
            .options(joinedload(InboundDelivery.qrCodes))
            .filter(InboundDelivery.id == delivery_id)
            .first()
        )
        if not delivery:
            raise not_found("Delivery")
        if delivery.status == DeliveryStatus.ON_HOLD.value:
            reason = (delivery.holdReason or "hospital internal delivery").strip()
            raise bad_request(
                f"Delivery is on hold — cannot allow entry until Security releases the hold. Reason: {reason}"
            )
        if delivery.status not in (
            DeliveryStatus.SCHEDULED.value,
            DeliveryStatus.APPROVED.value,
        ):
            raise bad_request(
                f"Allow entry only for SCHEDULED/APPROVED deliveries (current: {delivery.status})"
            )
        pass_number = f"PASS-{now_ist().year}-{delivery.deliveryNumber[-6:]}"
        self.db.add(
            DeliveryGateEntry(
                deliveryId=delivery.id,
                gateId=gate_id,
                passNumber=pass_number,
                allowedById=user["id"],
            )
        )
        self.delivery_svc.transition_status(
            delivery.id, user, DeliveryStatus.ARRIVED_AT_GATE.value, "Gate entry allowed"
        )
        # Re-load with qrCodes after status transition commit
        delivery = (
            self.db.query(InboundDelivery)
            .options(joinedload(InboundDelivery.qrCodes))
            .filter(InboundDelivery.id == delivery_id)
            .first()
        )
        assert delivery is not None
        exit_qr = self._ensure_exit_qr(delivery)
        self.db.commit()

        notify_result: dict = {"emailsSent": 0, "recipients": []}
        try:
            from app.services.notifications_service import NotificationsService

            fresh = (
                self.db.query(InboundDelivery)
                .options(joinedload(InboundDelivery.qrCodes))
                .filter(InboundDelivery.id == delivery.id)
                .first()
            )
            notify_result = NotificationsService(self.db).notify_on_delivery_checkout_qr(
                fresh or delivery, exit_qr
            ) or notify_result
        except Exception as exc:
            logger.error("Failed delivery checkout QR email for %s: %s", delivery.id, exc)

        timing = self._gate_timing(delivery.id)
        return {
            "passNumber": pass_number,
            "deliveryId": delivery.id,
            "entryTime": timing["entryTime"],
            "status": DeliveryStatus.ARRIVED_AT_GATE.value,
            "checkoutQrEmailed": int(notify_result.get("emailsSent") or 0) > 0,
            "emailsSent": notify_result.get("emailsSent", 0),
            "emailRecipients": notify_result.get("recipients") or [],
        }

    def mark_exit(self, user: dict, delivery_id: str) -> dict:
        delivery = self.db.get(InboundDelivery, delivery_id)
        if not delivery:
            raise not_found("Delivery")
        if delivery.status != DeliveryStatus.RECEIVED.value:
            raise bad_request(
                f"Mark exit only after GRN (RECEIVED). Current status: {delivery.status}"
            )
        exit_time = now_ist()
        self.db.add(
            DeliveryGateExit(
                deliveryId=delivery.id,
                markedById=user["id"],
                exitTime=exit_time,
            )
        )
        updated = self.delivery_svc.transition_status(
            delivery.id, user, DeliveryStatus.EXITED.value, "Exited gate"
        )
        timing = self._gate_timing(delivery.id)
        notify_result: dict = {"emailsSent": 0, "recipients": []}
        try:
            from app.services.notifications_service import NotificationsService

            # Re-load after commit so exit row + FKs are present for email templates
            fresh = self.db.get(InboundDelivery, delivery.id)
            notify_result = NotificationsService(self.db).notify_on_delivery_exit(
                fresh or delivery
            ) or notify_result
        except Exception as exc:
            logger.error("Failed delivery exit notifications for %s: %s", delivery.id, exc)

        return {
            "deliveryId": delivery.id,
            "status": updated.get("status", DeliveryStatus.EXITED.value),
            "entryTime": timing["entryTime"],
            "exitTime": timing["exitTime"],
            "durationMinutes": timing["durationMinutes"],
            "delivery": updated,
            "emailsSent": notify_result.get("emailsSent", 0),
            "emailRecipients": notify_result.get("recipients") or [],
        }

    def _validate_qr(
        self, user: dict, qr_payload: str, signature: str
    ) -> tuple[InboundDelivery, DeliveryQrCode]:
        secret = get_settings().jwt_secret
        expected = hmac.new(secret.encode(), qr_payload.encode(), hashlib.sha256).hexdigest()
        if not hmac.compare_digest(expected, signature):
            raise bad_request("Invalid QR signature")

        qr = self.db.query(DeliveryQrCode).filter(DeliveryQrCode.qrPayload == qr_payload).first()
        if not qr:
            raise not_found("QR code")
        if qr.expiresAt < now_ist():
            raise bad_request("QR code expired")

        delivery = (
            self.db.query(InboundDelivery)
            .options(joinedload(InboundDelivery.qrCodes))
            .filter(InboundDelivery.id == qr.deliveryId)
            .first()
        )
        if not delivery:
            raise not_found("Delivery")

        user_branch = user.get("branchId")
        if user_branch and delivery.branchId != user_branch and user.get("role") != "SUPER_ADMIN":
            raise bad_request("Delivery belongs to another branch")
        return delivery, qr

    def scan_qr(self, user: dict, qr_payload: str, signature: str) -> dict:
        delivery, qr = self._validate_qr(user, qr_payload, signature)

        self.db.add(
            DeliverySecurityScan(
                deliveryId=delivery.id,
                scannedById=user["id"],
                scanResult="VALID",
            )
        )
        self.db.commit()
        self.db.refresh(delivery)

        action, message = self._suggested_action(delivery.status, qr_kind=qr.qrKind or "ENTRY")
        payload = self.delivery_svc._serialize_dashboard(delivery)
        return {
            "valid": True,
            "suggestedAction": action,
            "message": message,
            "qrKind": qr.qrKind or "ENTRY",
            "delivery": payload,
        }

    def process_scanned_qr(
        self,
        user: dict,
        qr_payload: str,
        signature: str,
        *,
        auto_exit: bool = True,
        gate_id: str | None = None,
    ) -> dict:
        """Validate QR; complete exit only when checkout QR is scanned and status is RECEIVED."""
        delivery, qr = self._validate_qr(user, qr_payload, signature)
        qr_kind = (qr.qrKind or "ENTRY").upper()
        self.db.add(
            DeliverySecurityScan(
                deliveryId=delivery.id,
                scannedById=user["id"],
                scanResult="VALID",
            )
        )
        self.db.flush()

        action, message = self._suggested_action(delivery.status, qr_kind=qr_kind)
        result: dict = {
            "valid": True,
            "suggestedAction": action,
            "message": message,
            "qrKind": qr_kind,
        }

        if (
            auto_exit
            and qr_kind == "EXIT"
            and delivery.status == DeliveryStatus.RECEIVED.value
        ):
            exit_result = self.mark_exit(user, delivery.id)
            result.update(
                {
                    "actionTaken": "MARK_EXIT",
                    "entryTime": exit_result.get("entryTime"),
                    "exitTime": exit_result.get("exitTime"),
                    "durationMinutes": exit_result.get("durationMinutes"),
                    "delivery": exit_result.get("delivery"),
                    "status": exit_result.get("status"),
                    "emailsSent": exit_result.get("emailsSent", 0),
                    "emailRecipients": exit_result.get("emailRecipients") or [],
                    "message": (
                        f"Exit recorded. Time inside: {exit_result.get('durationMinutes') or 0} min."
                        + (
                            " Visit summary emailed to distributor and driver."
                            if (exit_result.get("emailsSent") or 0) > 0
                            else ""
                        )
                    ),
                }
            )
            return result

        self.db.commit()
        self.db.refresh(delivery)
        result["delivery"] = self.delivery_svc._serialize_dashboard(delivery)
        return result

    def register_courier(self, user: dict, data: dict) -> dict:
        log = DeliveryVisitorLog(
            branchId=data["branchId"],
            agentName=data.get("agentName"),
            mobileNumber=data.get("mobileNumber"),
            vehicleNumber=data.get("vehicleNumber"),
            purpose=f"COURIER:{data.get('courierCompany', 'Unknown')}",
            status="INSIDE",
            entryTime=now_ist(),
        )
        self.db.add(log)
        self.db.flush()
        if data.get("visitId"):
            self.db.add(VisitDeliveryLink(visitId=data["visitId"], visitorLogId=log.id))
        self.db.commit()
        return {"id": log.id, "status": log.status, "purpose": log.purpose}

    def unified_queue(self, user: dict, branch_id: str) -> dict:
        from app.models import Visit

        pending_visits = (
            self.db.query(Visit)
            .filter(
                Visit.branchId == branch_id,
                Visit.status.in_(["REQUEST_SENT", "APPROVED"]),
            )
            .order_by(Visit.createdAt.desc())
            .limit(50)
            .all()
        )
        scheduled = (
            self.db.query(InboundDelivery)
            .filter(
                InboundDelivery.branchId == branch_id,
                InboundDelivery.status.in_(
                    ["SCHEDULED", "APPROVED", "ARRIVED_AT_GATE", "GATE_VERIFIED"]
                ),
            )
            .order_by(InboundDelivery.expectedArrivalTime.asc())
            .limit(50)
            .all()
        )
        from app.models.delivery_entities import DeliveryAgent, DeliveryVehicle, Distributor

        vendor_deliveries = []
        for d in scheduled:
            vendor = self.db.get(Distributor, d.vendorId)
            agent = self.db.get(DeliveryAgent, d.agentId)
            vehicle = self.db.get(DeliveryVehicle, d.vehicleId)
            vendor_deliveries.append(
                {
                    "id": d.id,
                    "type": "INBOUND_DELIVERY",
                    "deliveryNumber": d.deliveryNumber,
                    "status": d.status,
                    "poNumber": d.poNumber,
                    "goodsType": d.goodsType,
                    "totalBoxes": d.totalBoxes,
                    "expectedArrivalTime": d.expectedArrivalTime.isoformat() if d.expectedArrivalTime else None,
                    "vendorName": vendor.vendorName if vendor else None,
                    "agentName": agent.name if agent else None,
                    "vehicleNumber": vehicle.registrationNumber if vehicle else None,
                }
            )
        return {
            "walkInVisits": [
                {
                    "id": v.id,
                    "type": "VISIT",
                    "visitCategory": v.visitCategory,
                    "status": v.status,
                    "platform": v.deliveryPlatform,
                    "recipient": v.deliveryRecipient,
                }
                for v in pending_visits
            ],
            "vendorDeliveries": vendor_deliveries,
        }
