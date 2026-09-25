"""Delivery fee calculators.

v2 (default booking): package units + vehicle type base fee + over-capacity handling.
Legacy: volume fill-ratio × unload minutes × rate/min (kept for older quotes).
"""

from __future__ import annotations

import math
from decimal import Decimal, ROUND_HALF_UP
from typing import Any

from fastapi import HTTPException

from app.config import get_settings

PACKAGE_WEIGHT: dict[str, int] = {
    "Small": 1,
    "Medium": 2,
    "Large": 4,
    "Equipment": 8,
    "Custom": 10,
}

VEHICLE_BASE_FEE: dict[str, int] = {
    "Bike": 48,
    "Auto": 149,
    "SCV": 349,
    "MCV": 1449,
    "LCV": 1999,
}

VEHICLE_CAPACITY: dict[str, int] = {
    "Bike": 2,
    "Auto": 6,
    "SCV": 15,
    "MCV": 40,
    "LCV": 80,
}

VEHICLE_TYPES = tuple(VEHICLE_BASE_FEE.keys())
PACKAGE_TYPES = tuple(PACKAGE_WEIGHT.keys())


def _to_float(value, label: str) -> float:
    try:
        n = float(value)
    except (TypeError, ValueError) as exc:
        raise HTTPException(status_code=400, detail=f"Invalid {label}") from exc
    if n <= 0:
        raise HTTPException(status_code=400, detail=f"{label} must be greater than 0")
    return n


def compute_consignment_fee(
    *,
    packages: list[dict[str, Any]],
    vehicle_type: str,
) -> dict:
    """
    Conninter Delivery Booking v2 pricing.

    units = sum(package_weight[type] * qty)
    base = vehicle base fee
    over = max(0, units - vehicle_capacity)
    handling = ceil(over/5)*25 if over else 0
    slot_minutes = 10 + ceil(over/5)*5 if over else 10
    total = base + handling
    """
    vt = (vehicle_type or "").strip()
    if vt not in VEHICLE_BASE_FEE:
        raise HTTPException(
            status_code=400,
            detail=f"vehicleType must be one of: {', '.join(VEHICLE_TYPES)}",
        )
    if not packages:
        raise HTTPException(status_code=400, detail="Add at least one package")

    units = 0
    total_qty = 0
    normalized: list[dict[str, Any]] = []
    for idx, raw in enumerate(packages):
        ptype = (raw.get("packageType") or raw.get("type") or "").strip()
        if ptype not in PACKAGE_WEIGHT:
            raise HTTPException(
                status_code=400,
                detail=f"packages[{idx}].packageType must be one of: {', '.join(PACKAGE_TYPES)}",
            )
        try:
            qty = int(raw.get("qty") or raw.get("quantity") or 0)
        except (TypeError, ValueError) as exc:
            raise HTTPException(status_code=400, detail=f"packages[{idx}].qty is invalid") from exc
        if qty < 1:
            raise HTTPException(status_code=400, detail=f"packages[{idx}].qty must be at least 1")

        weight = PACKAGE_WEIGHT[ptype]
        line_units = weight * qty
        units += line_units
        total_qty += qty
        normalized.append(
            {
                "packageType": ptype,
                "qty": qty,
                "unitWeight": weight,
                "lineUnits": line_units,
                "remarks": (raw.get("remarks") or "").strip() or None,
                "customSize": (raw.get("customSize") or "").strip() or None,
                "customWeightKg": raw.get("customWeightKg"),
                "supportRequired": (raw.get("supportRequired") or "").strip() or None,
            }
        )

    capacity = VEHICLE_CAPACITY[vt]
    base = VEHICLE_BASE_FEE[vt]
    over = max(0, units - capacity)
    blocks = math.ceil(over / 5) if over else 0
    handling = blocks * 25
    slot_minutes = 10 + (blocks * 5 if over else 0)
    total = base + handling
    fee = Decimal(str(total)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

    return {
        "pricingModel": "consignment_v2",
        "vehicleType": vt,
        "capacityUnits": capacity,
        "usedUnits": units,
        "overUnits": over,
        "baseFee": float(base),
        "handlingFee": float(handling),
        "walletFee": float(fee),
        "slotMinutes": slot_minutes,
        "unloadMinutes": float(slot_minutes),
        "totalBoxes": total_qty,
        "packages": normalized,
        "overCapacity": over > 0,
        "warning": (
            "Selected vehicle exceeds its standard capacity. Consider upgrading the vehicle."
            if over > 0
            else None
        ),
        # Compatibility aliases used by older serializers
        "cargoVolumeCm3": float(units),
        "vehicleVolumeCm3": float(capacity),
        "fillPercent": round((units / capacity) * 100, 2) if capacity else 0,
        "ratePerMinute": 0,
        "fullUnloadMinutes": float(slot_minutes),
        "boxLengthCm": None,
        "boxBreadthCm": None,
        "boxHeightCm": None,
    }


def compute_delivery_fee(
    *,
    total_boxes: int,
    box_length_cm: float,
    box_breadth_cm: float,
    box_height_cm: float,
    vehicle_volume_cm3: float,
    full_unload_minutes: float | None = None,
    rate_per_minute: float | None = None,
) -> dict:
    """Legacy volume-based fee (kept for older API clients/tests)."""
    if total_boxes < 1:
        raise HTTPException(status_code=400, detail="totalBoxes must be at least 1")

    bl = _to_float(box_length_cm, "box length")
    bb = _to_float(box_breadth_cm, "box breadth")
    bh = _to_float(box_height_cm, "box height")
    vv = _to_float(vehicle_volume_cm3, "vehicle volume")

    settings = get_settings()
    n = float(full_unload_minutes if full_unload_minutes is not None else settings.delivery_full_unload_minutes)
    rate = float(rate_per_minute if rate_per_minute is not None else settings.delivery_rate_per_minute)

    cargo = total_boxes * bl * bb * bh
    if cargo > vv:
        raise HTTPException(
            status_code=400,
            detail=(
                f"Cargo volume ({cargo:.0f} cm³) exceeds vehicle capacity ({vv:.0f} cm³). "
                "Reduce boxes or use a larger vehicle."
            ),
        )

    unload = (cargo / vv) * n
    fee = Decimal(str(unload * rate)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
    fill_pct = (cargo / vv) * 100

    return {
        "pricingModel": "volume_legacy",
        "cargoVolumeCm3": round(cargo, 2),
        "vehicleVolumeCm3": round(vv, 2),
        "fillPercent": round(fill_pct, 2),
        "unloadMinutes": round(unload, 2),
        "ratePerMinute": rate,
        "fullUnloadMinutes": n,
        "walletFee": float(fee),
        "boxLengthCm": bl,
        "boxBreadthCm": bb,
        "boxHeightCm": bh,
        "totalBoxes": total_boxes,
    }


def vehicle_volume_from_dims(length_cm, breadth_cm, height_cm) -> float | None:
    if length_cm is None or breadth_cm is None or height_cm is None:
        return None
    try:
        l, b, h = float(length_cm), float(breadth_cm), float(height_cm)
    except (TypeError, ValueError):
        return None
    if l <= 0 or b <= 0 or h <= 0:
        return None
    return round(l * b * h, 2)
