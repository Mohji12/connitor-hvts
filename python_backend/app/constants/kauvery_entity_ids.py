"""Deterministic UUIDs and phones for Kauvery seed entities."""

from __future__ import annotations

import uuid

from app.constants.kauvery_entities import KAUVERY_CHAIN_ID

_NS = uuid.UUID(KAUVERY_CHAIN_ID)


def _uuid5(kind: str, branch_id: str, key: str) -> str:
    return str(uuid.uuid5(_NS, f"{kind}:{branch_id}:{key}"))


def kauvery_department_id(branch_id: str, dept_code: str) -> str:
    return _uuid5("dept", branch_id, dept_code)


def kauvery_sub_department_id(branch_id: str, dept_code: str, sub_code: str) -> str:
    return _uuid5("subdept", branch_id, f"{dept_code}:{sub_code}")


def kauvery_department_admin_id(branch_id: str, dept_code: str) -> str:
    return _uuid5("dept-admin", branch_id, dept_code)


def kauvery_sub_department_admin_id(branch_id: str, dept_code: str, sub_code: str) -> str:
    return _uuid5("subdept-admin", branch_id, f"{dept_code}:{sub_code}")


def kauvery_doctor_id(branch_id: str, dept_code: str, sub_code: str, doctor_index: int) -> str:
    return _uuid5("doctor", branch_id, f"{dept_code}:{sub_code}:{doctor_index}")


def kauvery_nurse_id(branch_id: str, dept_code: str, sub_code: str) -> str:
    return _uuid5("nurse", branch_id, f"{dept_code}:{sub_code}")


def kauvery_security_id(branch_id: str) -> str:
    return _uuid5("security", branch_id, "gate")


def kauvery_phone(
    branch_index: int,
    dept_index: int,
    sub_index: int,
    role_code: int,
) -> str:
    """
    Unique 10-digit phone.
    role_code: 1 dept-admin, 2 sub-admin, 3 doc1, 4 doc2, 5 nurse, 6 security, 7 hospital-admin, 8 chain-admin
    """
    # 92 B DD SS R XX  → keep within 10 digits: 92 + 1 + 2 + 2 + 1 + 2
    return f"92{branch_index}{dept_index:02d}{sub_index:02d}{role_code}{0:02d}"
