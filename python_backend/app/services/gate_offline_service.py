"""Signed gate manifests, device enrollment, online verify, and idempotent sync."""

from __future__ import annotations

import hashlib
import hmac
import json
import secrets
import uuid
from datetime import datetime, timedelta

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.config import get_settings
from app.models import Visit
from app.models.attendant_entities import AttendantPass
from app.models.delivery_entities import DeliveryQrCode, InboundDelivery
from app.models.enums import Role
from app.models.gate_offline_entities import (
    GateDevice,
    GateManifestVersion,
    GatePassRedemption,
    GateScanEvent,
)
from app.utils.timezone import now_ist

MANIFEST_KEY_ID = "gate-manifest-v1"
ADMIN_ROLES = {
    Role.SUPER_ADMIN.value,
    Role.CHAIN_ADMIN.value,
    Role.HOSPITAL_ADMIN.value,
    Role.BRANCH_ADMIN.value,
}
OPS_ROLES = ADMIN_ROLES | {Role.SECURITY_SUPERVISOR.value}
SCAN_ROLES = {
    Role.SECURITY.value,
    Role.SECURITY_SUPERVISOR.value,
    Role.HOSPITAL_ADMIN.value,
    Role.SUPER_ADMIN.value,
}

VISITOR_ELIGIBLE = {"APPROVED", "CHECKED_IN"}
VISITOR_REVOKED = {"REJECTED", "CHECKED_OUT", "CANCELLED"}
DELIVERY_ELIGIBLE = {"SCHEDULED", "APPROVED"}
DELIVERY_REVOKED = {"CANCELLED", "REJECTED", "EXITED", "CLOSED"}
ATTENDANT_ELIGIBLE = {"ACTIVE"}
ATTENDANT_REVOKED = {"USED", "EXPIRED", "CANCELLED", "REVOKED"}


def _hash_secret(secret: str) -> str:
    return hashlib.sha256(secret.encode("utf-8")).hexdigest()


def manifest_hmac_key() -> bytes:
    settings = get_settings()
    override = getattr(settings, "gate_manifest_hmac_key", None)
    if override:
        return override.encode("utf-8")
    return hashlib.sha256(f"gate-manifest:{settings.jwt_secret}".encode("utf-8")).digest()


def sign_manifest_body(body: dict) -> str:
    canonical = json.dumps(body, sort_keys=True, separators=(",", ":"), default=str)
    return hmac.new(manifest_hmac_key(), canonical.encode("utf-8"), hashlib.sha256).hexdigest()


_SIGNED_FIELDS = (
    "manifestId",
    "version",
    "gateId",
    "branchId",
    "issuedAt",
    "expiresAt",
    "keyId",
    "algorithm",
    "offlineAcceptance",
    "serverTime",
    "passes",
    "revocations",
)


def verify_manifest_signature(manifest: dict) -> bool:
    signature = manifest.get("signature")
    if not isinstance(signature, str) or len(signature) < 32:
        return False
    body = {key: manifest[key] for key in _SIGNED_FIELDS if key in manifest}
    expected = sign_manifest_body(body)
    return hmac.compare_digest(expected, signature)


def parse_pass_from_qr(raw: str) -> tuple[str | None, str | None]:
    """Return (pass_id, pass_type_hint). Type hint may be None."""
    text = (raw or "").strip()
    if not text:
        return None, None
    if text.startswith("{") or text.startswith("["):
        try:
            data = json.loads(text)
        except json.JSONDecodeError:
            data = None
        if isinstance(data, dict):
            if data.get("qrPayload"):
                payload = str(data["qrPayload"])
                if payload.startswith("PASS:") or payload.startswith("PASS-EXIT:"):
                    parts = payload.split(":")
                    return (parts[1] if len(parts) > 1 else payload), "attendant"
                if payload.startswith("EXIT:") or ":" in payload:
                    return payload.split(":")[0] if not payload.startswith("EXIT:") else payload.split(":")[1], "delivery"
                if len(payload) == 36 and payload.count("-") == 4:
                    return payload, "delivery"
                return payload, "delivery"
            visit_id = data.get("v") or data.get("visitId") or data.get("id")
            if visit_id:
                return str(visit_id), "visitor"
    if text.startswith("PASS:") or text.startswith("PASS-EXIT:"):
        parts = text.split(":")
        return (parts[1] if len(parts) > 1 else text), "attendant"
    if len(text) == 36 and text.count("-") == 4:
        return text, None
    return text, None


class GateOfflineService:
    def __init__(self, db: Session) -> None:
        self.db = db

    def _require_flag(self) -> None:
        if not get_settings().gate_offline_enabled:
            raise HTTPException(status_code=403, detail="GATE_OFFLINE_DISABLED")

    def _admin_branch(self, user: dict, requested: str | None) -> str:
        role = user.get("role")
        branch_id = requested or user.get("branchId")
        if not branch_id:
            raise HTTPException(status_code=400, detail="BRANCH_REQUIRED")
        if role in (Role.SUPER_ADMIN.value, Role.CHAIN_ADMIN.value):
            return branch_id
        if user.get("branchId") and user["branchId"] != branch_id:
            raise HTTPException(status_code=403, detail="BRANCH_FORBIDDEN")
        return branch_id

    def authenticate_device(self, public_id: str | None, secret: str | None) -> GateDevice:
        if not public_id or not secret:
            raise HTTPException(status_code=401, detail="GATE_DEVICE_REQUIRED")
        device = (
            self.db.query(GateDevice).filter(GateDevice.devicePublicId == public_id).one_or_none()
        )
        if device is None or not hmac.compare_digest(device.secretHash, _hash_secret(secret)):
            raise HTTPException(status_code=401, detail="GATE_DEVICE_INVALID")
        if device.status != "ACTIVE":
            raise HTTPException(status_code=403, detail="GATE_DEVICE_REVOKED")
        return device

    def register_device(self, user: dict, label: str, branch_id: str | None, gate_id: str | None, offline_enabled: bool) -> dict:
        if user.get("role") not in ADMIN_ROLES:
            raise HTTPException(status_code=403, detail="Forbidden")
        branch = self._admin_branch(user, branch_id)
        secret = secrets.token_urlsafe(32)
        public_id = f"gd_{uuid.uuid4().hex[:16]}"
        device = GateDevice(
            devicePublicId=public_id,
            secretHash=_hash_secret(secret),
            label=label.strip(),
            gateId=(gate_id or branch).strip(),
            branchId=branch,
            status="ACTIVE",
            offlineEnabled=offline_enabled and get_settings().gate_offline_enabled,
            registeredById=user.get("id"),
        )
        self.db.add(device)
        self.db.commit()
        self.db.refresh(device)
        return {
            "id": device.id,
            "devicePublicId": device.devicePublicId,
            "deviceSecret": secret,
            "gateId": device.gateId,
            "branchId": device.branchId,
            "offlineEnabled": device.offlineEnabled,
            "verifyKey": manifest_hmac_key().hex(),
            "keyId": MANIFEST_KEY_ID,
            "algorithm": "HMAC-SHA256",
        }

    def revoke_device(self, user: dict, device_id: str) -> dict:
        if user.get("role") not in ADMIN_ROLES:
            raise HTTPException(status_code=403, detail="Forbidden")
        device = self.db.get(GateDevice, device_id)
        if device is None:
            raise HTTPException(status_code=404, detail="GATE_DEVICE_NOT_FOUND")
        if user.get("role") not in (Role.SUPER_ADMIN.value, Role.CHAIN_ADMIN.value):
            if user.get("branchId") and user["branchId"] != device.branchId:
                raise HTTPException(status_code=403, detail="BRANCH_FORBIDDEN")
        device.status = "REVOKED"
        device.revokedAt = now_ist()
        device.offlineEnabled = False
        self.db.commit()
        return {"id": device.id, "status": device.status}

    def set_offline_enabled(self, user: dict, device_id: str, enabled: bool) -> dict:
        if user.get("role") not in ADMIN_ROLES:
            raise HTTPException(status_code=403, detail="Forbidden")
        device = self.db.get(GateDevice, device_id)
        if device is None:
            raise HTTPException(status_code=404, detail="GATE_DEVICE_NOT_FOUND")
        device.offlineEnabled = bool(enabled) and get_settings().gate_offline_enabled
        self.db.commit()
        return {"id": device.id, "offlineEnabled": device.offlineEnabled}

    def _snapshot_passes(self, branch_id: str) -> tuple[list[dict], list[dict]]:
        now = now_ist()
        window_start = now - timedelta(hours=12)
        window_end = now + timedelta(hours=36)
        passes: list[dict] = []
        revocations: list[dict] = []

        visits = (
            self.db.query(Visit)
            .filter(Visit.branchId == branch_id)
            .filter(Visit.status.in_(tuple(VISITOR_ELIGIBLE | VISITOR_REVOKED)))
            .all()
        )
        for visit in visits:
            aliases = [a for a in (visit.id, visit.entryQrPayload, visit.visitQRCode) if a]
            if visit.status in VISITOR_REVOKED:
                revocations.append({"passId": visit.id, "revokedAt": now.isoformat()})
                continue
            valid_until = visit.checkInOtpExpiry or window_end
            passes.append(
                {
                    "passId": visit.id,
                    "passType": "visitor",
                    "validFrom": (visit.appointmentDate or window_start).isoformat(),
                    "validUntil": valid_until.isoformat(),
                    "status": "ELIGIBLE",
                    "oneTime": visit.status == "APPROVED",
                    "aliases": aliases,
                }
            )

        deliveries = (
            self.db.query(InboundDelivery)
            .filter(InboundDelivery.branchId == branch_id)
            .filter(InboundDelivery.status.in_(tuple(DELIVERY_ELIGIBLE | DELIVERY_REVOKED)))
            .all()
        )
        for delivery in deliveries:
            aliases = [delivery.id, delivery.deliveryNumber]
            for qr in self.db.query(DeliveryQrCode).filter(DeliveryQrCode.deliveryId == delivery.id).all():
                if qr.qrPayload:
                    aliases.append(qr.qrPayload)
                aliases.append(qr.id)
            if delivery.status in DELIVERY_REVOKED:
                revocations.append({"passId": delivery.id, "revokedAt": now.isoformat()})
                continue
            passes.append(
                {
                    "passId": delivery.id,
                    "passType": "delivery",
                    "validFrom": (delivery.expectedArrivalTime or window_start).isoformat(),
                    "validUntil": window_end.isoformat(),
                    "status": "ELIGIBLE",
                    "oneTime": True,
                    "aliases": [a for a in aliases if a],
                }
            )

        attendant_passes = (
            self.db.query(AttendantPass)
            .filter(AttendantPass.branchId == branch_id)
            .filter(AttendantPass.status.in_(tuple(ATTENDANT_ELIGIBLE | ATTENDANT_REVOKED)))
            .all()
        )
        for row in attendant_passes:
            aliases = [a for a in (row.id, row.passNumber, row.qrPayload) if a]
            if row.status in ATTENDANT_REVOKED:
                revocations.append({"passId": row.id, "revokedAt": now.isoformat()})
                continue
            valid_until = row.expiresAt or row.validTo or window_end
            passes.append(
                {
                    "passId": row.id,
                    "passType": "attendant",
                    "validFrom": (row.validFrom or window_start).isoformat(),
                    "validUntil": valid_until.isoformat(),
                    "status": "ELIGIBLE",
                    "oneTime": False,
                    "aliases": aliases,
                }
            )
        return passes, revocations

    def build_manifest(self, device: GateDevice) -> dict:
        self._require_flag()
        last = (
            self.db.query(GateManifestVersion)
            .filter(GateManifestVersion.gateId == device.gateId)
            .order_by(GateManifestVersion.version.desc())
            .first()
        )
        version = (last.version + 1) if last else 1
        issued = now_ist()
        ttl = max(5, int(get_settings().gate_manifest_ttl_minutes))
        expires = issued + timedelta(minutes=ttl)
        passes, revocations = self._snapshot_passes(device.branchId)
        body = {
            "manifestId": str(uuid.uuid4()),
            "version": version,
            "gateId": device.gateId,
            "branchId": device.branchId,
            "issuedAt": issued.isoformat(),
            "expiresAt": expires.isoformat(),
            "keyId": MANIFEST_KEY_ID,
            "algorithm": "HMAC-SHA256",
            "offlineAcceptance": bool(device.offlineEnabled),
            "serverTime": issued.isoformat(),
            "passes": passes,
            "revocations": revocations,
        }
        signature = sign_manifest_body(body)
        body["signature"] = signature
        row = GateManifestVersion(
            id=body["manifestId"],
            gateId=device.gateId,
            branchId=device.branchId,
            version=version,
            keyId=MANIFEST_KEY_ID,
            issuedAt=issued,
            expiresAt=expires,
            signature=signature,
            payloadJson=json.dumps(body, separators=(",", ":"), default=str),
        )
        self.db.add(row)
        device.lastSyncAt = issued
        self.db.commit()
        return {
            **body,
            "verifyKey": manifest_hmac_key().hex(),
        }

    def verify_online(self, user: dict, raw_value: str) -> dict:
        if user.get("role") not in SCAN_ROLES and user.get("role") not in ADMIN_ROLES:
            raise HTTPException(status_code=403, detail="Forbidden")
        pass_id, hint = parse_pass_from_qr(raw_value)
        if not pass_id:
            return {
                "decision": "REJECT",
                "reasonCode": "QR_UNPARSEABLE",
                "passId": None,
                "passType": hint,
                "online": True,
            }
        branch_id = user.get("branchId")
        visit = self.db.get(Visit, pass_id)
        if visit is not None:
            if branch_id and user.get("role") not in (Role.SUPER_ADMIN.value,) and visit.branchId != branch_id:
                return {"decision": "REJECT", "reasonCode": "WRONG_GATE", "passId": visit.id, "passType": "visitor", "online": True}
            if visit.status in VISITOR_REVOKED:
                return {"decision": "REJECT", "reasonCode": "REVOKED", "passId": visit.id, "passType": "visitor", "online": True}
            if visit.status not in VISITOR_ELIGIBLE:
                return {"decision": "REJECT", "reasonCode": "NOT_ELIGIBLE", "passId": visit.id, "passType": "visitor", "online": True}
            if self._redeemed(visit.id, "ACCEPT"):
                return {"decision": "REJECT", "reasonCode": "ALREADY_REDEEMED", "passId": visit.id, "passType": "visitor", "online": True}
            return {"decision": "ACCEPT", "reasonCode": "ONLINE_OK", "passId": visit.id, "passType": "visitor", "online": True}

        delivery = self.db.get(InboundDelivery, pass_id)
        if delivery is None:
            qr = self.db.query(DeliveryQrCode).filter(DeliveryQrCode.qrPayload == pass_id).first()
            if qr is not None:
                delivery = self.db.get(InboundDelivery, qr.deliveryId)
        if delivery is not None:
            if branch_id and user.get("role") not in (Role.SUPER_ADMIN.value,) and delivery.branchId != branch_id:
                return {"decision": "REJECT", "reasonCode": "WRONG_GATE", "passId": delivery.id, "passType": "delivery", "online": True}
            if delivery.status in DELIVERY_REVOKED:
                return {"decision": "REJECT", "reasonCode": "REVOKED", "passId": delivery.id, "passType": "delivery", "online": True}
            if delivery.status not in DELIVERY_ELIGIBLE:
                return {"decision": "REJECT", "reasonCode": "NOT_ELIGIBLE", "passId": delivery.id, "passType": "delivery", "online": True}
            if self._redeemed(delivery.id, "ACCEPT"):
                return {"decision": "REJECT", "reasonCode": "ALREADY_REDEEMED", "passId": delivery.id, "passType": "delivery", "online": True}
            return {"decision": "ACCEPT", "reasonCode": "ONLINE_OK", "passId": delivery.id, "passType": "delivery", "online": True}

        attendant = self.db.get(AttendantPass, pass_id)
        if attendant is not None:
            if branch_id and user.get("role") not in (Role.SUPER_ADMIN.value,) and attendant.branchId != branch_id:
                return {"decision": "REJECT", "reasonCode": "WRONG_GATE", "passId": attendant.id, "passType": "attendant", "online": True}
            if attendant.status in ATTENDANT_REVOKED:
                return {"decision": "REJECT", "reasonCode": "REVOKED", "passId": attendant.id, "passType": "attendant", "online": True}
            if attendant.status not in ATTENDANT_ELIGIBLE:
                return {"decision": "REJECT", "reasonCode": "NOT_ELIGIBLE", "passId": attendant.id, "passType": "attendant", "online": True}
            return {"decision": "ACCEPT", "reasonCode": "ONLINE_OK", "passId": attendant.id, "passType": "attendant", "online": True}

        return {"decision": "REJECT", "reasonCode": "PASS_NOT_FOUND", "passId": pass_id, "passType": hint, "online": True}

    def _redeemed(self, pass_id: str, event_type: str) -> bool:
        return (
            self.db.query(GatePassRedemption)
            .filter(GatePassRedemption.passId == pass_id, GatePassRedemption.eventType == event_type)
            .first()
            is not None
        )

    def sync_events(self, device: GateDevice, events: list, manifest_id: str | None) -> dict:
        self._require_flag()
        results: list[dict] = []
        for event in events:
            results.append(self._sync_one(device, event, manifest_id))
        device.lastSyncAt = now_ist()
        self.db.commit()
        return {"results": results, "lastSyncAt": device.lastSyncAt.isoformat()}

    def _sync_one(self, device: GateDevice, event, manifest_id: str | None) -> dict:
        existing = (
            self.db.query(GateScanEvent).filter(GateScanEvent.eventId == event.eventId).one_or_none()
        )
        if existing is not None:
            return {
                "eventId": event.eventId,
                "result": "DUPLICATE",
                "reasonCode": existing.reasonCode,
                "syncStatus": existing.syncStatus,
            }

        now = now_ist()
        occurred = event.occurredAt.replace(tzinfo=None) if event.occurredAt.tzinfo else event.occurredAt
        drift = abs((now - occurred).total_seconds())
        if drift > 6 * 3600:
            row = GateScanEvent(
                eventId=event.eventId,
                deviceId=device.id,
                passId=event.passId,
                passType=event.passType,
                eventType=event.eventType,
                reasonCode="CLOCK_DRIFT",
                decisionMode=event.decisionMode,
                occurredAt=occurred,
                receivedAt=now,
                syncStatus="REJECTED",
            )
            self.db.add(row)
            self.db.flush()
            return {"eventId": event.eventId, "result": "REJECTED", "reasonCode": "CLOCK_DRIFT", "syncStatus": "REJECTED"}

        if event.eventType == "ACCEPT" and event.decisionMode == "OFFLINE":
            if not device.offlineEnabled or not get_settings().gate_offline_enabled:
                row = GateScanEvent(
                    eventId=event.eventId,
                    deviceId=device.id,
                    passId=event.passId,
                    passType=event.passType,
                    eventType=event.eventType,
                    reasonCode="OFFLINE_NOT_ENABLED",
                    decisionMode=event.decisionMode,
                    occurredAt=occurred,
                    receivedAt=now,
                    syncStatus="REJECTED",
                )
                self.db.add(row)
                self.db.flush()
                return {
                    "eventId": event.eventId,
                    "result": "REJECTED",
                    "reasonCode": "OFFLINE_NOT_ENABLED",
                    "syncStatus": "REJECTED",
                }
            if self._redeemed(event.passId, "ACCEPT"):
                prior = (
                    self.db.query(GatePassRedemption)
                    .filter(
                        GatePassRedemption.passId == event.passId,
                        GatePassRedemption.eventType == "ACCEPT",
                    )
                    .one()
                )
                row = GateScanEvent(
                    eventId=event.eventId,
                    deviceId=device.id,
                    passId=event.passId,
                    passType=event.passType,
                    eventType=event.eventType,
                    reasonCode="REDEMPTION_CONFLICT",
                    decisionMode=event.decisionMode,
                    occurredAt=occurred,
                    receivedAt=now,
                    syncStatus="CONFLICT",
                )
                self.db.add(row)
                self.db.flush()
                return {
                    "eventId": event.eventId,
                    "result": "CONFLICT",
                    "reasonCode": "REDEMPTION_CONFLICT",
                    "syncStatus": "CONFLICT",
                    "priorEventId": prior.eventId,
                    "priorDeviceId": prior.deviceId,
                }
            self.db.add(
                GatePassRedemption(
                    passId=event.passId,
                    passType=event.passType,
                    gateId=device.gateId,
                    deviceId=device.id,
                    eventId=event.eventId,
                    eventType="ACCEPT",
                    redeemedAt=now,
                )
            )

        row = GateScanEvent(
            eventId=event.eventId,
            deviceId=device.id,
            passId=event.passId,
            passType=event.passType,
            eventType=event.eventType,
            reasonCode=event.reasonCode,
            decisionMode=event.decisionMode,
            occurredAt=occurred,
            receivedAt=now,
            syncStatus="ACCEPTED",
        )
        self.db.add(row)
        self.db.flush()
        return {
            "eventId": event.eventId,
            "result": "ACCEPTED",
            "reasonCode": event.reasonCode,
            "syncStatus": "ACCEPTED",
            "manifestId": manifest_id,
        }

    def ops_summary(self, user: dict) -> dict:
        if user.get("role") not in OPS_ROLES:
            raise HTTPException(status_code=403, detail="Forbidden")
        query = self.db.query(GateDevice)
        if user.get("role") not in (Role.SUPER_ADMIN.value, Role.CHAIN_ADMIN.value) and user.get("branchId"):
            query = query.filter(GateDevice.branchId == user["branchId"])
        devices = query.order_by(GateDevice.registeredAt.desc()).all()
        device_ids = [d.id for d in devices]
        events = []
        if device_ids:
            events = (
                self.db.query(GateScanEvent)
                .filter(GateScanEvent.deviceId.in_(device_ids))
                .order_by(GateScanEvent.receivedAt.desc())
                .limit(200)
                .all()
            )
        manifests = []
        gate_ids = list({d.gateId for d in devices})
        if gate_ids:
            manifests = (
                self.db.query(GateManifestVersion)
                .filter(GateManifestVersion.gateId.in_(gate_ids))
                .order_by(GateManifestVersion.issuedAt.desc())
                .limit(50)
                .all()
            )
        latest_by_gate: dict[str, GateManifestVersion] = {}
        for row in manifests:
            latest_by_gate.setdefault(row.gateId, row)
        return {
            "offlineEnabled": get_settings().gate_offline_enabled,
            "devices": [
                {
                    "id": d.id,
                    "devicePublicId": d.devicePublicId,
                    "label": d.label,
                    "gateId": d.gateId,
                    "branchId": d.branchId,
                    "status": d.status,
                    "offlineEnabled": d.offlineEnabled,
                    "registeredAt": d.registeredAt.isoformat() if d.registeredAt else None,
                    "lastSyncAt": d.lastSyncAt.isoformat() if d.lastSyncAt else None,
                    "revokedAt": d.revokedAt.isoformat() if d.revokedAt else None,
                    "manifestVersion": latest_by_gate.get(d.gateId).version if latest_by_gate.get(d.gateId) else None,
                    "manifestExpiresAt": latest_by_gate.get(d.gateId).expiresAt.isoformat()
                    if latest_by_gate.get(d.gateId)
                    else None,
                }
                for d in devices
            ],
            "events": [
                {
                    "eventId": e.eventId,
                    "deviceId": e.deviceId,
                    "passId": e.passId,
                    "passType": e.passType,
                    "eventType": e.eventType,
                    "reasonCode": e.reasonCode,
                    "decisionMode": e.decisionMode,
                    "occurredAt": e.occurredAt.isoformat() if e.occurredAt else None,
                    "receivedAt": e.receivedAt.isoformat() if e.receivedAt else None,
                    "syncStatus": e.syncStatus,
                }
                for e in events
            ],
            "counts": {
                "devices": len(devices),
                "activeDevices": sum(1 for d in devices if d.status == "ACTIVE"),
                "conflicts": sum(1 for e in events if e.syncStatus == "CONFLICT"),
                "offlineAccepts": sum(
                    1 for e in events if e.eventType == "ACCEPT" and e.decisionMode == "OFFLINE"
                ),
                "rejectedSync": sum(1 for e in events if e.syncStatus == "REJECTED"),
            },
        }
