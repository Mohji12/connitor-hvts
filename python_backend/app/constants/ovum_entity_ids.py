"""Deterministic UUIDs for Ovum seed entities (uuid5 under OVUM_CHAIN_ID namespace)."""

from __future__ import annotations

import uuid

from app.constants.ovum_departments_catalog import OBGYN_CODE
from app.constants.ovum_entities import (
    OVUM_CHAIN_ID,
    OVUM_DEPARTMENT_IDS,
    OVUM_DOCTOR_IDS,
    OVUM_SUB_DEPARTMENT_IDS,
)

_OVUM_NS = uuid.UUID(OVUM_CHAIN_ID)


def _uuid5(kind: str, branch_id: str, key: str) -> str:
    return str(uuid.uuid5(_OVUM_NS, f"{kind}:{branch_id}:{key}"))


def ovum_department_id(branch_id: str, branch_index: int, dept_code: str) -> str:
    if dept_code == OBGYN_CODE and 0 <= branch_index < len(OVUM_DEPARTMENT_IDS):
        return OVUM_DEPARTMENT_IDS[branch_index]
    return _uuid5("dept", branch_id, dept_code)


def ovum_sub_department_id(branch_id: str, branch_index: int, dept_code: str) -> str:
    if dept_code == OBGYN_CODE and 0 <= branch_index < len(OVUM_SUB_DEPARTMENT_IDS):
        return OVUM_SUB_DEPARTMENT_IDS[branch_index]
    return _uuid5("subdept", branch_id, dept_code)


def ovum_department_admin_id(branch_id: str, dept_code: str) -> str:
    return _uuid5("dept-admin", branch_id, dept_code)


def ovum_sub_department_admin_id(branch_id: str, dept_code: str) -> str:
    return _uuid5("subdept-admin", branch_id, dept_code)


def ovum_doctor_id(
    branch_id: str,
    branch_index: int,
    dept_code: str,
    doctor_index: int = 1,
) -> str:
    if (
        dept_code == OBGYN_CODE
        and doctor_index == 1
        and 0 <= branch_index < len(OVUM_DOCTOR_IDS)
    ):
        return OVUM_DOCTOR_IDS[branch_index]
    return _uuid5("doctor", branch_id, f"{dept_code}:{doctor_index}")


def ovum_nurse_id(branch_id: str, dept_code: str) -> str:
    return _uuid5("nurse", branch_id, dept_code)


def ovum_security_id(branch_id: str) -> str:
    return _uuid5("security", branch_id, "gate")


def ovum_department_admin_phone(branch_index: int, dept_index: int) -> str:
    """Unique 10-digit phone per branch × department."""
    return str(9100400000 + branch_index * 100 + dept_index)


def ovum_sub_department_admin_phone(branch_index: int, dept_index: int) -> str:
    return str(9100800000 + branch_index * 100 + dept_index)


def ovum_doctor_phone(branch_index: int, dept_index: int, doctor_index: int) -> str:
    return str(9100500000 + branch_index * 1000 + dept_index * 10 + doctor_index)


def ovum_nurse_phone(branch_index: int, dept_index: int) -> str:
    return str(9100600000 + branch_index * 100 + dept_index)


def ovum_security_phone(branch_index: int) -> str:
    return str(9100700000 + branch_index)
