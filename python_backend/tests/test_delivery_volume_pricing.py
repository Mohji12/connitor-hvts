"""Tests for delivery pricing (legacy volume + consignment v2)."""

import pytest
from fastapi import HTTPException

from app.delivery.delivery_pricing import compute_consignment_fee, compute_delivery_fee


def test_fee_example_100_boxes():
    """100 × 10×10×10 / 125000 × 60 = 48 min → ₹480."""
    result = compute_delivery_fee(
        total_boxes=100,
        box_length_cm=10,
        box_breadth_cm=10,
        box_height_cm=10,
        vehicle_volume_cm3=125000,
        full_unload_minutes=60,
        rate_per_minute=10,
    )
    assert result["cargoVolumeCm3"] == 100000.0
    assert result["unloadMinutes"] == 48.0
    assert result["walletFee"] == 480.0
    assert result["fillPercent"] == 80.0


def test_over_capacity_rejected():
    with pytest.raises(HTTPException) as ctx:
        compute_delivery_fee(
            total_boxes=200,
            box_length_cm=10,
            box_breadth_cm=10,
            box_height_cm=10,
            vehicle_volume_cm3=125000,
        )
    assert ctx.value.status_code == 400
    assert "exceeds vehicle capacity" in ctx.value.detail


def test_invalid_dims():
    with pytest.raises(HTTPException):
        compute_delivery_fee(
            total_boxes=1,
            box_length_cm=0,
            box_breadth_cm=10,
            box_height_cm=10,
            vehicle_volume_cm3=1000,
        )


def test_consignment_v2_within_capacity():
    result = compute_consignment_fee(
        packages=[{"packageType": "Small", "qty": 2}],
        vehicle_type="Bike",
    )
    assert result["usedUnits"] == 2
    assert result["overUnits"] == 0
    assert result["baseFee"] == 48
    assert result["handlingFee"] == 0
    assert result["walletFee"] == 48
    assert result["slotMinutes"] == 10
    assert result["totalBoxes"] == 2


def test_consignment_v2_over_capacity_handling():
    # Auto capacity 6; 4 Large = 16 units → over 10 → ceil(10/5)=2 → handling 50, slot 20
    result = compute_consignment_fee(
        packages=[{"packageType": "Large", "qty": 4}],
        vehicle_type="Auto",
    )
    assert result["usedUnits"] == 16
    assert result["overUnits"] == 10
    assert result["baseFee"] == 149
    assert result["handlingFee"] == 50
    assert result["walletFee"] == 199
    assert result["slotMinutes"] == 20
    assert result["overCapacity"] is True
