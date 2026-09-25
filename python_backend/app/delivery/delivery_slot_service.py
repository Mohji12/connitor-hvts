"""Branch delivery slot management — hospital windows with shared minute capacity."""

from __future__ import annotations

from datetime import date, datetime, timedelta

from sqlalchemy.orm import Session

from app.delivery.utils import bad_request, not_found
from app.models import Branch
from app.models.delivery_entities import BranchDeliverySlot
from app.utils.timezone import now_ist


class DeliverySlotService:
    def __init__(self, db: Session) -> None:
        self.db = db

    def _assert_branch_access(self, user: dict, branch_id: str) -> None:
        role = user.get("role") or ""
        if role == "SUPER_ADMIN":
            return
        if role in ("HOSPITAL_ADMIN", "BRANCH_ADMIN", "SECURITY", "SECURITY_SUPERVISOR", "DISTRIBUTOR"):
            if user.get("branchId") and user["branchId"] != branch_id and role != "DISTRIBUTOR":
                raise bad_request("You can only access slots for your branch")
            return
        if role == "DISTRIBUTOR":
            return
        raise bad_request("Not authorized for this branch")

    @staticmethod
    def capacity_minutes(slot: BranchDeliverySlot) -> int:
        return max(0, int((slot.slotEnd - slot.slotStart).total_seconds() // 60))

    @classmethod
    def remaining_minutes(cls, slot: BranchDeliverySlot) -> int:
        return max(0, cls.capacity_minutes(slot) - int(slot.bookedMinutes or 0))

    def list_slots(
        self,
        branch_id: str,
        user: dict,
        *,
        slot_date: date | None = None,
        needed_minutes: int | None = None,
        include_full: bool = False,
    ) -> dict:
        self._assert_branch_access(user, branch_id)
        day = slot_date or now_ist().date()
        day_start = datetime.combine(day, datetime.min.time())
        day_end = day_start + timedelta(days=1)
        query = self.db.query(BranchDeliverySlot).filter(
            BranchDeliverySlot.branchId == branch_id,
            BranchDeliverySlot.isActive.is_(True),
            BranchDeliverySlot.slotStart >= day_start,
            BranchDeliverySlot.slotStart < day_end,
        )
        if not include_full:
            # Show windows that are still open (not ended), even if they already started
            query = query.filter(BranchDeliverySlot.slotEnd > now_ist())
        rows = query.order_by(BranchDeliverySlot.slotStart.asc()).all()
        need = max(0, int(needed_minutes or 0))
        slots_out = []
        for s in rows:
            remaining = self.remaining_minutes(s)
            if not include_full and remaining <= 0:
                continue
            if need and remaining < need:
                continue
            slots_out.append(self._serialize_slot(s))
        return {"date": day.isoformat(), "slots": slots_out}

    def bulk_create_slots(self, branch_id: str, user: dict, data: dict) -> dict:
        self._assert_branch_access(user, branch_id)
        branch = self.db.get(Branch, branch_id)
        if not branch:
            raise not_found("Branch")

        start_date = date.fromisoformat(data["startDate"])
        end_date = date.fromisoformat(data["endDate"])
        if end_date < start_date:
            raise bad_request("endDate must be on or after startDate")

        windows = data.get("windows") or [
            {"start": "09:00", "end": "11:00"},
            {"start": "14:00", "end": "16:00"},
        ]
        # windows = one BranchDeliverySlot per time window (shared minute pool)
        # grid = chop each window into slotMinutes chunks (legacy)
        mode = (data.get("mode") or "windows").strip().lower()
        slot_minutes = int(data.get("slotMinutes") or 60)
        max_deliveries = int(data.get("maxDeliveries") or 999)
        created = 0
        cursor = start_date
        while cursor <= end_date:
            if cursor.weekday() != 6:  # skip Sunday
                for window in windows:
                    start_h, start_m = map(int, window["start"].split(":"))
                    end_h, end_m = map(int, window["end"].split(":"))
                    window_start = datetime.combine(cursor, datetime.min.time()).replace(
                        hour=start_h, minute=start_m
                    )
                    window_end = datetime.combine(cursor, datetime.min.time()).replace(
                        hour=end_h, minute=end_m
                    )
                    if window_end <= window_start:
                        raise bad_request("Each window end must be after start")

                    if mode == "grid":
                        slot_start = window_start
                        while slot_start + timedelta(minutes=slot_minutes) <= window_end:
                            slot_end = slot_start + timedelta(minutes=slot_minutes)
                            created += self._add_slot_if_missing(
                                branch_id, slot_start, slot_end, max_deliveries
                            )
                            slot_start = slot_end
                    else:
                        created += self._add_slot_if_missing(
                            branch_id, window_start, window_end, max_deliveries
                        )
            cursor += timedelta(days=1)

        self.db.commit()
        return {"created": created, "branchId": branch_id, "mode": mode}

    def _add_slot_if_missing(
        self,
        branch_id: str,
        slot_start: datetime,
        slot_end: datetime,
        max_deliveries: int,
    ) -> int:
        exists = (
            self.db.query(BranchDeliverySlot)
            .filter(
                BranchDeliverySlot.branchId == branch_id,
                BranchDeliverySlot.slotStart == slot_start,
            )
            .first()
        )
        if exists:
            return 0
        self.db.add(
            BranchDeliverySlot(
                branchId=branch_id,
                slotStart=slot_start,
                slotEnd=slot_end,
                maxDeliveries=max_deliveries,
                bookedCount=0,
                bookedMinutes=0,
                isActive=True,
            )
        )
        return 1

    def update_slot(self, slot_id: str, user: dict, data: dict) -> dict:
        slot = self.db.get(BranchDeliverySlot, slot_id)
        if not slot:
            raise not_found("Slot")
        self._assert_branch_access(user, slot.branchId)
        if (slot.bookedCount > 0 or slot.bookedMinutes > 0) and data.get("isActive") is False:
            raise bad_request("Cannot disable a slot with active bookings")
        if "maxDeliveries" in data:
            max_d = int(data["maxDeliveries"])
            if max_d < slot.bookedCount:
                raise bad_request("maxDeliveries cannot be less than bookedCount")
            slot.maxDeliveries = max_d
        if "isActive" in data:
            slot.isActive = bool(data["isActive"])
        self.db.commit()
        return self._serialize_slot(slot)

    def delete_slot(self, slot_id: str, user: dict) -> dict:
        slot = self.db.get(BranchDeliverySlot, slot_id)
        if not slot:
            raise not_found("Slot")
        self._assert_branch_access(user, slot.branchId)
        if slot.bookedCount > 0 or slot.bookedMinutes > 0:
            raise bad_request("Cannot delete a slot with bookings")
        slot.isActive = False
        self.db.commit()
        return {"id": slot_id, "deleted": True}

    def reserve_slot(self, slot_id: str, minutes: int | None = None) -> BranchDeliverySlot:
        """Reserve capacity inside a hospital window.

        Prefer minute capacity (shared pool). Falls back to count-based maxDeliveries
        only when minutes is omitted and capacity minutes is unavailable.
        """
        slot = (
            self.db.query(BranchDeliverySlot)
            .filter(BranchDeliverySlot.id == slot_id)
            .with_for_update()
            .first()
        )
        if not slot or not slot.isActive:
            raise bad_request("Delivery slot not available")
        if slot.slotEnd <= now_ist():
            raise bad_request("Delivery window has already ended")

        need = int(minutes) if minutes is not None else 10
        if need < 1:
            raise bad_request("Delivery duration must be at least 1 minute")

        capacity = self.capacity_minutes(slot)
        remaining = self.remaining_minutes(slot)
        if need > remaining:
            raise bad_request(
                f"Not enough time left in this window ({remaining} min left, need {need} min)"
            )

        slot.bookedMinutes = int(slot.bookedMinutes or 0) + need
        slot.bookedCount = int(slot.bookedCount or 0) + 1
        # Keep count guard for legacy tiny slots that still use maxDeliveries tightly
        if capacity <= 0 and slot.bookedCount > slot.maxDeliveries:
            raise bad_request("Delivery slot is fully booked")
        self.db.flush()
        return slot

    def release_minutes(self, slot_id: str | None, minutes: int) -> None:
        if not slot_id or minutes <= 0:
            return
        slot = self.db.get(BranchDeliverySlot, slot_id)
        if not slot:
            return
        slot.bookedMinutes = max(0, int(slot.bookedMinutes or 0) - minutes)
        slot.bookedCount = max(0, int(slot.bookedCount or 0) - 1)
        self.db.flush()

    @classmethod
    def _serialize_slot(cls, slot: BranchDeliverySlot) -> dict:
        capacity = cls.capacity_minutes(slot)
        remaining_min = cls.remaining_minutes(slot)
        return {
            "id": slot.id,
            "branchId": slot.branchId,
            "slotStart": slot.slotStart.isoformat(),
            "slotEnd": slot.slotEnd.isoformat(),
            "capacityMinutes": capacity,
            "bookedMinutes": int(slot.bookedMinutes or 0),
            "remainingMinutes": remaining_min,
            "maxDeliveries": slot.maxDeliveries,
            "bookedCount": slot.bookedCount,
            # "remaining" = minutes left (distributors pick windows by time left)
            "remaining": remaining_min,
            "isActive": slot.isActive,
        }
