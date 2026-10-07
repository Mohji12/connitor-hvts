"""Product admin view of stored application logs."""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies.permissions import require_permission

router = APIRouter()


@router.get("")
def list_product_logs(
    db: Annotated[Session, Depends(get_db)],
    _user: Annotated[dict, Depends(require_permission("VIEW_APP_LOGS"))],
    level: str | None = Query(default=None),
    limit: int = Query(default=100, ge=1, le=200),
) -> dict:
    from app.services.app_log_service import list_logs

    rows = list_logs(db, level=level, limit=limit)
    return {
        "logs": [
            {
                "id": row.id,
                "level": row.level,
                "loggerName": row.loggerName,
                "message": row.message,
                "tracebackText": row.tracebackText,
                "createdAt": row.createdAt.isoformat() if row.createdAt else None,
            }
            for row in rows
        ]
    }
