"""Shared delivery utilities."""

from __future__ import annotations

from fastapi import HTTPException


def bad_request(detail: str) -> HTTPException:
    return HTTPException(status_code=400, detail=detail)


def not_found(entity: str = "Resource") -> HTTPException:
    return HTTPException(status_code=404, detail=f"{entity} not found")


def resolve_branch_filter(user: dict, branch_id: str | None) -> str | None:
    role = user.get("role")
    user_branch = user.get("branchId")
    if role == "SUPER_ADMIN":
        return branch_id
    if role in ("HOSPITAL_ADMIN", "BRANCH_ADMIN", "SECURITY", "SECURITY_SUPERVISOR", "RECEIVING", "PURCHASE", "WARD_ADMIN"):
        return user_branch or branch_id
    if role == "DISTRIBUTOR":
        return branch_id
    return user_branch
