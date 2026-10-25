"""Distributor office visit slots, public booking, and vendor approval."""

from __future__ import annotations

import base64
import json
import logging
import random
from datetime import datetime, timedelta

from sqlalchemy.orm import Session

from app.delivery.utils import bad_request, not_found
from app.models.delivery_entities import Distributor
from app.models.distributor_visit_entities import DistributorAvailabilitySlot, DistributorVisit
from app.models.entities import User
from app.models.enums import Role
from app.models.visitor_account_entities import VisitorAccount
from app.utils.passwords import hash_password
from app.utils.timezone import now_ist

DESK_ROLES = {"DISTRIBUTOR", "DISTRIBUTOR_SECURITY"}
OWNER_ROLES = {"DISTRIBUTOR"}

logger = logging.getLogger(__name__)

OPEN_STATUSES = {"REQUEST_SENT", "APPROVED"}


class DistributorVisitService:
    def __init__(self, db: Session) -> None:
        self.db = db

    def _parse_date(self, value: str) -> datetime:
        try:
            return datetime.strptime(value.strip()[:10], "%Y-%m-%d")
        except ValueError as exc:
            raise bad_request("Invalid date. Use YYYY-MM-DD.") from exc

    def _parse_time(self, value: str) -> tuple[int, int]:
        raw = (value or "").strip()
        try:
            parts = raw.split(":")
            hour = int(parts[0])
            minute = int(parts[1]) if len(parts) > 1 else 0
            if hour < 0 or hour > 23 or minute < 0 or minute > 59:
                raise ValueError("out of range")
            return hour, minute
        except (ValueError, IndexError) as exc:
            raise bad_request("Invalid time. Use HH:MM.") from exc

    def _approved_distributor(self, distributor_id: str) -> Distributor:
        dist = self.db.get(Distributor, distributor_id)
        if not dist or not dist.isActive:
            raise not_found("Distributor")
        if (dist.verificationStatus or "").upper() != "APPROVED":
            raise bad_request("This distributor is not accepting visits")
        return dist

    def _vendor_id(self, user: dict, *, owner_only: bool = False) -> str:
        vendor_id = user.get("distributorId")
        role = user.get("role")
        allowed = OWNER_ROLES if owner_only else DESK_ROLES
        if not vendor_id or role not in allowed:
            raise bad_request("This account is not linked to a distributor profile")
        return str(vendor_id)

    def _serialize_slot(self, slot: DistributorAvailabilitySlot) -> dict:
        return {
            "id": slot.id,
            "slotStart": slot.slotStart.isoformat(),
            "slotEnd": slot.slotEnd.isoformat(),
            "isBooked": bool(slot.isBooked),
            "visitId": slot.visitId,
            "label": slot.slotStart.strftime("%I:%M %p").lstrip("0"),
        }

    def _serialize_visit(self, visit: DistributorVisit, *, include_pass: bool = False) -> dict:
        account = self.db.get(VisitorAccount, visit.visitorAccountId)
        dist = self.db.get(Distributor, visit.distributorId)
        show_pass = include_pass and visit.status in ("APPROVED", "CHECKED_IN")
        full_name = " ".join(
            part for part in [getattr(account, "firstName", None), getattr(account, "lastName", None)] if part
        ).strip()
        return {
            "id": visit.id,
            "bookingId": visit.id,
            "hostKind": "DISTRIBUTOR",
            "status": visit.status,
            "purpose": visit.purpose,
            "itemsCarrying": None,
            "visitorType": None,
            "appointmentMode": "IN_PERSON",
            "appointmentDate": visit.appointmentDate.isoformat() if visit.appointmentDate else None,
            "vendorName": dist.vendorName if dist else None,
            "vendorCode": dist.vendorCode if dist else None,
            "vendorCity": dist.city if dist else None,
            "visitorName": full_name or None,
            "visitorPhone": account.phone if account else None,
            "visitorEmail": account.email if account else None,
            "companyName": account.companyName if account else None,
            "visitCode": visit.visitCode if show_pass else None,
            "visitQRCode": visit.visitQRCode if show_pass else None,
            "checkInQrCode": visit.visitQRCode if show_pass else None,
            "checkInOtp": visit.visitCode if show_pass else None,
            "checkInOtpExpiry": None,
            "rejectionReason": visit.rejectionReason,
            "approvedAt": visit.approvedAt.isoformat() if visit.approvedAt else None,
            "createdAt": visit.createdAt.isoformat() if visit.createdAt else None,
            "doctorName": dist.vendorName if dist else None,
            "doctorFeedback": None,
            "doctorFeedbackAt": None,
            "checkInTime": visit.checkInTime.isoformat() if visit.checkInTime else None,
            "checkOutTime": visit.checkOutTime.isoformat() if visit.checkOutTime else None,
            "checkedInByUserId": visit.checkedInByUserId,
            "totalDurationMinutes": None,
            "hospitalChainName": None,
            "branchName": (dist.city if dist and dist.city else "Distributor office"),
            "departmentName": "Distributor visit",
            "subDepartmentName": None,
            "meetingJoinUrl": None,
        }

    def list_public_distributors(self, query: str | None = None) -> list[dict]:
        rows = (
            self.db.query(Distributor)
            .filter(
                Distributor.isActive.is_(True),
                Distributor.verificationStatus == "APPROVED",
            )
            .order_by(Distributor.vendorName)
            .all()
        )
        needle = (query or "").strip().lower()
        items: list[dict] = []
        for dist in rows:
            hay = " ".join(
                part
                for part in [dist.vendorName, dist.city, dist.goodsDescription, dist.vendorCode]
                if part
            ).lower()
            if needle and needle not in hay:
                continue
            items.append(
                {
                    "id": dist.id,
                    "vendorName": dist.vendorName,
                    "vendorCode": dist.vendorCode,
                    "city": dist.city,
                    "state": dist.state,
                    "goodsDescription": dist.goodsDescription,
                }
            )
        return items

    def list_public_slots(self, distributor_id: str, date: str) -> dict:
        self._approved_distributor(distributor_id)
        day = self._parse_date(date).replace(hour=0, minute=0, second=0, microsecond=0)
        end = day + timedelta(days=1)
        now = now_ist().replace(tzinfo=None)
        rows = (
            self.db.query(DistributorAvailabilitySlot)
            .filter(
                DistributorAvailabilitySlot.distributorId == distributor_id,
                DistributorAvailabilitySlot.slotStart >= day,
                DistributorAvailabilitySlot.slotStart < end,
                DistributorAvailabilitySlot.isBooked.is_(False),
                DistributorAvailabilitySlot.slotStart >= now,
            )
            .order_by(DistributorAvailabilitySlot.slotStart)
            .all()
        )
        return {"items": [self._serialize_slot(s) for s in rows]}

    def list_public_available_dates(self, distributor_id: str, from_date: str, to_date: str) -> dict:
        self._approved_distributor(distributor_id)
        start = self._parse_date(from_date).replace(hour=0, minute=0, second=0, microsecond=0)
        end_day = self._parse_date(to_date).replace(hour=0, minute=0, second=0, microsecond=0)
        if end_day < start:
            raise bad_request("to date must be on or after from date")
        end = end_day + timedelta(days=1)
        now = now_ist().replace(tzinfo=None)
        rows = (
            self.db.query(DistributorAvailabilitySlot)
            .filter(
                DistributorAvailabilitySlot.distributorId == distributor_id,
                DistributorAvailabilitySlot.slotStart >= start,
                DistributorAvailabilitySlot.slotStart < end,
                DistributorAvailabilitySlot.isBooked.is_(False),
                DistributorAvailabilitySlot.slotStart >= now,
            )
            .all()
        )
        dates = sorted({row.slotStart.strftime("%Y-%m-%d") for row in rows})
        return {"dates": dates}

    def book(self, account_id: str, data: dict) -> dict:
        account = self.db.get(VisitorAccount, account_id)
        if not account:
            raise not_found("Visitor account")
        distributor_id = (data.get("distributorId") or "").strip()
        slot_id = (data.get("slotId") or "").strip()
        purpose = (data.get("purpose") or "").strip()
        if not distributor_id:
            raise bad_request("distributorId is required")
        if not slot_id:
            raise bad_request("slotId is required")
        if not purpose:
            raise bad_request("Purpose is required")
        dist = self._approved_distributor(distributor_id)
        slot = self.db.get(DistributorAvailabilitySlot, slot_id)
        if not slot or slot.distributorId != dist.id:
            raise not_found("Slot")
        if slot.isBooked or slot.visitId:
            raise bad_request("That slot is already booked")
        now = now_ist().replace(tzinfo=None)
        if slot.slotStart < now:
            raise bad_request("That slot has already passed")

        visit = DistributorVisit(
            visitorAccountId=account.id,
            distributorId=dist.id,
            slotId=slot.id,
            appointmentDate=slot.slotStart,
            purpose=purpose,
            status="REQUEST_SENT",
        )
        self.db.add(visit)
        self.db.flush()
        slot.isBooked = True
        slot.visitId = visit.id
        self.db.commit()
        self.db.refresh(visit)
        self._notify_distributor_new_request(visit, dist, account)
        return self._serialize_visit(visit)

    def list_vendor_slots(self, user: dict, from_date: str, to_date: str) -> dict:
        vendor_id = self._vendor_id(user)
        start = self._parse_date(from_date).replace(hour=0, minute=0, second=0, microsecond=0)
        end_day = self._parse_date(to_date).replace(hour=0, minute=0, second=0, microsecond=0)
        if end_day < start:
            raise bad_request("to date must be on or after from date")
        end = end_day + timedelta(days=1)
        rows = (
            self.db.query(DistributorAvailabilitySlot)
            .filter(
                DistributorAvailabilitySlot.distributorId == vendor_id,
                DistributorAvailabilitySlot.slotStart >= start,
                DistributorAvailabilitySlot.slotStart < end,
            )
            .order_by(DistributorAvailabilitySlot.slotStart)
            .all()
        )
        return {"items": [self._serialize_slot(s) for s in rows]}

    def create_slots(
        self,
        user: dict,
        *,
        date: str,
        start_time: str,
        end_time: str,
        slot_minutes: int = 30,
    ) -> dict:
        vendor_id = self._vendor_id(user, owner_only=True)
        if slot_minutes < 5 or slot_minutes > 720:
            raise bad_request("slotMinutes must be between 5 and 720")
        day = self._parse_date(date)
        start_h, start_m = self._parse_time(start_time)
        end_h, end_m = self._parse_time(end_time)
        cursor = day.replace(hour=start_h, minute=start_m, second=0, microsecond=0)
        window_end = day.replace(hour=end_h, minute=end_m, second=0, microsecond=0)
        if window_end <= cursor:
            raise bad_request("End time must be after start time")
        created: list[DistributorAvailabilitySlot] = []
        while cursor + timedelta(minutes=slot_minutes) <= window_end:
            slot_end = cursor + timedelta(minutes=slot_minutes)
            exists = (
                self.db.query(DistributorAvailabilitySlot)
                .filter(
                    DistributorAvailabilitySlot.distributorId == vendor_id,
                    DistributorAvailabilitySlot.slotStart == cursor,
                )
                .first()
            )
            if not exists:
                row = DistributorAvailabilitySlot(
                    distributorId=vendor_id,
                    slotStart=cursor,
                    slotEnd=slot_end,
                    isBooked=False,
                )
                self.db.add(row)
                created.append(row)
            cursor = slot_end
        self.db.commit()
        for row in created:
            self.db.refresh(row)
        return {"items": [self._serialize_slot(s) for s in created], "created": len(created)}

    def delete_slot(self, user: dict, slot_id: str) -> dict:
        vendor_id = self._vendor_id(user, owner_only=True)
        slot = self.db.get(DistributorAvailabilitySlot, slot_id)
        if not slot or slot.distributorId != vendor_id:
            raise not_found("Slot")
        if slot.isBooked or slot.visitId:
            raise bad_request("Cannot delete a booked slot")
        self.db.delete(slot)
        self.db.commit()
        return {"ok": True}

    def list_vendor_visits(self, user: dict, status: str | None = None) -> dict:
        vendor_id = self._vendor_id(user)
        query = self.db.query(DistributorVisit).filter(DistributorVisit.distributorId == vendor_id)
        if status:
            query = query.filter(DistributorVisit.status == status.strip().upper())
        rows = query.order_by(DistributorVisit.createdAt.desc()).all()
        return {"items": [self._serialize_visit(v, include_pass=True) for v in rows]}

    def get_vendor_visit(self, user: dict, visit_id: str) -> dict:
        vendor_id = self._vendor_id(user)
        visit = self.db.get(DistributorVisit, visit_id)
        if not visit or visit.distributorId != vendor_id:
            raise not_found("Visit")
        return self._serialize_visit(visit, include_pass=True)

    def approve(self, user: dict, visit_id: str) -> dict:
        vendor_id = self._vendor_id(user, owner_only=True)
        visit = self.db.get(DistributorVisit, visit_id)
        if not visit or visit.distributorId != vendor_id:
            raise not_found("Visit")
        if visit.status != "REQUEST_SENT":
            raise bad_request(f"This visit is already {visit.status}")
        visit_code = f"{random.randint(100000, 999999)}"
        visit.status = "APPROVED"
        visit.approvedAt = now_ist()
        visit.visitCode = visit_code
        visit.visitQRCode = self._generate_qr_base64(visit, visit_code)
        if visit.slotId:
            slot = self.db.get(DistributorAvailabilitySlot, visit.slotId)
            if slot:
                slot.isBooked = True
                slot.visitId = visit.id
        self.db.commit()
        self.db.refresh(visit)
        self._notify_approved(visit)
        self._send_visit_pass_whatsapp(visit)
        return self._serialize_visit(visit, include_pass=True)

    def reject(self, user: dict, visit_id: str, reason: str | None = None) -> dict:
        vendor_id = self._vendor_id(user, owner_only=True)
        visit = self.db.get(DistributorVisit, visit_id)
        if not visit or visit.distributorId != vendor_id:
            raise not_found("Visit")
        if visit.status != "REQUEST_SENT":
            raise bad_request(f"This visit is already {visit.status}")
        visit.status = "REJECTED"
        visit.rejectionReason = (reason or "").strip() or None
        if visit.slotId:
            slot = self.db.get(DistributorAvailabilitySlot, visit.slotId)
            if slot and slot.visitId == visit.id:
                slot.isBooked = False
                slot.visitId = None
        self.db.commit()
        self.db.refresh(visit)
        return self._serialize_visit(visit)

    def list_for_account(self, account_id: str) -> list[dict]:
        rows = (
            self.db.query(DistributorVisit)
            .filter(DistributorVisit.visitorAccountId == account_id)
            .order_by(DistributorVisit.appointmentDate.desc())
            .all()
        )
        return [self._serialize_visit(v, include_pass=True) for v in rows]

    def list_security_staff(self, user: dict) -> dict:
        vendor_id = self._vendor_id(user, owner_only=True)
        rows = (
            self.db.query(User)
            .filter(User.distributorId == vendor_id, User.role == Role.DISTRIBUTOR_SECURITY.value)
            .order_by(User.createdAt.desc())
            .all()
        )
        return {"items": [self._serialize_staff(row) for row in rows]}

    def create_security_staff(self, user: dict, data: dict) -> dict:
        vendor_id = self._vendor_id(user, owner_only=True)
        name = (data.get("name") or "").strip()
        email = (data.get("email") or "").strip().lower()
        phone = "".join(ch for ch in (data.get("phone") or "") if ch.isdigit())
        password = data.get("password") or ""
        if not name:
            raise bad_request("Name is required")
        if "@" not in email:
            raise bad_request("A valid email is required")
        if len(phone) != 10:
            raise bad_request("Phone must be a 10-digit mobile number")
        if len(password) < 8:
            raise bad_request("Password must be at least 8 characters")
        if self.db.query(User).filter(User.email == email).first():
            raise bad_request("That email is already in use")
        if self.db.query(User).filter(User.phone == phone).first():
            raise bad_request("That phone number is already in use")
        staff = User(
            name=name,
            email=email,
            phone=phone,
            role=Role.DISTRIBUTOR_SECURITY.value,
            passwordHash=hash_password(password),
            isActive=True,
            phoneVerified=True,
            distributorId=vendor_id,
        )
        self.db.add(staff)
        self.db.commit()
        self.db.refresh(staff)
        return self._serialize_staff(staff)

    def set_security_staff_active(self, user: dict, staff_id: str, is_active: bool) -> dict:
        vendor_id = self._vendor_id(user, owner_only=True)
        staff = self.db.get(User, staff_id)
        if not staff or staff.distributorId != vendor_id or staff.role != Role.DISTRIBUTOR_SECURITY.value:
            raise not_found("Desk security")
        staff.isActive = is_active
        self.db.commit()
        self.db.refresh(staff)
        return self._serialize_staff(staff)

    def scan_pass(self, user: dict, payload: str) -> dict:
        vendor_id = self._vendor_id(user)
        visit = self._resolve_scan(vendor_id, payload)
        return self._serialize_visit(visit, include_pass=True)

    def check_in(self, user: dict, visit_id: str) -> dict:
        vendor_id = self._vendor_id(user)
        visit = self.db.get(DistributorVisit, visit_id)
        if not visit or visit.distributorId != vendor_id:
            raise not_found("Visit")
        if visit.status == "CHECKED_IN":
            raise bad_request("This visitor is already checked in")
        if visit.status != "APPROVED":
            raise bad_request("Only an approved visit can be checked in")
        visit.status = "CHECKED_IN"
        visit.checkInTime = now_ist()
        visit.checkedInByUserId = user.get("id")
        self.db.commit()
        self.db.refresh(visit)
        return self._serialize_visit(visit, include_pass=True)

    def check_out(self, user: dict, visit_id: str) -> dict:
        vendor_id = self._vendor_id(user)
        visit = self.db.get(DistributorVisit, visit_id)
        if not visit or visit.distributorId != vendor_id:
            raise not_found("Visit")
        if visit.status != "CHECKED_IN":
            raise bad_request("This visitor is not checked in")
        visit.status = "CHECKED_OUT"
        visit.checkOutTime = now_ist()
        self.db.commit()
        self.db.refresh(visit)
        return self._serialize_visit(visit, include_pass=True)

    def _resolve_scan(self, vendor_id: str, payload: str) -> DistributorVisit:
        raw = (payload or "").strip()
        if not raw:
            raise bad_request("Scan a meeting pass or enter the 6-digit code")
        visit_id = None
        visit_code = None
        if raw.isdigit() and len(raw) == 6:
            visit_code = raw
        else:
            try:
                parsed = json.loads(raw)
            except json.JSONDecodeError:
                parsed = None
            if isinstance(parsed, dict):
                if (parsed.get("kind") or "").upper() not in ("", "DISTRIBUTOR_VISIT"):
                    raise bad_request("This QR is not a distributor meeting pass")
                visit_id = (parsed.get("visitId") or parsed.get("bookingId") or "").strip() or None
                visit_code = (parsed.get("visitCode") or parsed.get("checkInOtp") or "").strip() or None
            else:
                visit_id = raw
        query = self.db.query(DistributorVisit).filter(DistributorVisit.distributorId == vendor_id)
        visit = None
        if visit_id:
            visit = query.filter(DistributorVisit.id == visit_id).first()
        if visit is None and visit_code:
            visit = query.filter(DistributorVisit.visitCode == visit_code).first()
        if visit is None:
            raise not_found("Visit")
        if visit.status not in ("APPROVED", "CHECKED_IN", "CHECKED_OUT"):
            raise bad_request("This visit is not approved yet")
        return visit

    @staticmethod
    def _serialize_staff(user: User) -> dict:
        return {
            "id": user.id,
            "name": user.name,
            "email": user.email,
            "phone": user.phone,
            "isActive": bool(user.isActive),
            "role": user.role,
            "createdAt": user.createdAt.isoformat() if user.createdAt else None,
        }

    def _generate_qr_base64(self, visit: DistributorVisit, visit_code: str) -> str:
        dist = self.db.get(Distributor, visit.distributorId)
        account = self.db.get(VisitorAccount, visit.visitorAccountId)
        payload = {
            "kind": "DISTRIBUTOR_VISIT",
            "visitId": visit.id,
            "visitorName": " ".join(
                part for part in [getattr(account, "firstName", None), getattr(account, "lastName", None)] if part
            ).strip(),
            "vendorName": dist.vendorName if dist else None,
            "visitCode": visit_code,
            "timestamp": now_ist().isoformat(),
        }
        from app.services.meeting_pass_image import _qr_png

        return "data:image/png;base64," + base64.b64encode(
            _qr_png(json.dumps(payload, separators=(",", ":")), 640)
        ).decode()

    def _notify_approved(self, visit: DistributorVisit) -> None:
        account = self.db.get(VisitorAccount, visit.visitorAccountId)
        dist = self.db.get(Distributor, visit.distributorId)
        if not account or not account.email:
            return
        when = visit.appointmentDate.strftime("%d %b %Y %I:%M %p") if visit.appointmentDate else "the scheduled time"
        vendor = dist.vendorName if dist else "the distributor"
        try:
            from app.services.messaging_service import EmailService

            EmailService().send_notification(
                account.email,
                f"Visit approved — {vendor}",
                (
                    f"Hello {account.firstName},\n\n"
                    f"Your visit to {vendor} on {when} is approved.\n"
                    f"Show visit code {visit.visitCode} and the QR pass in your Conninter dashboard.\n\n"
                    "— Conninter"
                ),
            )
        except Exception as exc:
            logger.error("Distributor visit approval email failed for %s: %s", visit.id, exc)

    def _owner_phone_and_name(self, dist: Distributor) -> tuple[str | None, str]:
        owner = (
            self.db.query(User)
            .filter(
                User.distributorId == dist.id,
                User.role == Role.DISTRIBUTOR.value,
                User.isActive == True,  # noqa: E712
                User.phone.isnot(None),
            )
            .first()
        )
        phone = (getattr(owner, "phone", None) or dist.phone or "").strip() or None
        name = (getattr(owner, "name", None) or dist.contactPerson or dist.vendorName or "Partner").strip()
        return phone, name

    def _visit_date_time(self, visit: DistributorVisit) -> tuple[str, str]:
        slot = self.db.get(DistributorAvailabilitySlot, visit.slotId) if visit.slotId else None
        start = slot.slotStart if slot else visit.appointmentDate
        end = slot.slotEnd if slot else None
        if not start:
            return "—", "—"
        date_text = start.strftime("%d %b %Y")
        start_text = start.strftime("%I:%M %p").lstrip("0")
        if end:
            end_text = end.strftime("%I:%M %p").lstrip("0")
            if end_text != start_text:
                return date_text, f"{start_text} - {end_text}"
        return date_text, start_text

    def _notify_distributor_new_request(
        self, visit: DistributorVisit, dist: Distributor, account: VisitorAccount
    ) -> None:
        phone, owner_name = self._owner_phone_and_name(dist)
        if not phone:
            return
        visitor_name = " ".join(
            p for p in [account.firstName, account.lastName] if p
        ).strip() or "Visitor"
        date_text, time_text = self._visit_date_time(visit)
        try:
            from app.services.messaging_service import WhatsAppService

            WhatsAppService().send_distributor_visit_approval(
                phone,
                distributor_name=owner_name,
                visitor_name=visitor_name,
                company=account.companyName or "—",
                visit_date=date_text,
                visit_time=time_text,
                purpose=visit.purpose or "—",
                visit_id=visit.id,
            )
        except Exception as exc:
            logger.error("Distributor visit approval WhatsApp failed for %s: %s", visit.id, exc)

    def _send_visit_pass_whatsapp(self, visit: DistributorVisit) -> None:
        account = self.db.get(VisitorAccount, visit.visitorAccountId)
        dist = self.db.get(Distributor, visit.distributorId)
        if not account or not account.phone:
            return
        visitor_name = " ".join(
            p for p in [account.firstName, account.lastName] if p
        ).strip() or "Visitor"
        date_text, time_text = self._visit_date_time(visit)
        vendor_name = dist.vendorName if dist else "Distributor"
        try:
            from app.services.distributor_visit_pass_image import (
                DistributorVisitPassContent,
                render_distributor_visit_pass,
            )
            from app.services.meeting_pass_image import decode_image_source, hospital_logo_bytes
            from app.services.messaging_service import WhatsAppService
            from app.services.s3_storage_service import S3StorageService

            png = render_distributor_visit_pass(
                DistributorVisitPassContent(
                    visitor_name=visitor_name,
                    vendor_name=vendor_name,
                    date_text=date_text,
                    time_text=time_text,
                    visit_code=visit.visitCode or "",
                    qr_png=decode_image_source(visit.visitQRCode),
                    photo_png=decode_image_source(getattr(account, "photoStorageKey", None)),
                    logo_png=hospital_logo_bytes(getattr(dist, "hospitalChainId", None) if dist else None),
                ),
                scale=2,
            )
            image_url = S3StorageService().publish_gate_pass_png(visit.id, png)
            if not image_url:
                return
            WhatsAppService().send_distributor_visit_pass(
                account.phone,
                visitor_name=visitor_name,
                vendor_name=vendor_name,
                visit_date=date_text,
                visit_time=time_text,
                image_url=image_url,
            )
        except Exception as exc:
            logger.error("Distributor visit pass WhatsApp failed for %s: %s", visit.id, exc)
