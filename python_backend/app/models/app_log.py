"""Stored application warnings and errors for the product admin."""

from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import DateTime, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base
from app.utils.timezone import now_ist


def _uuid() -> str:
    return str(uuid.uuid4())


class AppLog(Base):
    __tablename__ = "AppLog"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    level: Mapped[str] = mapped_column(String(16), index=True)
    loggerName: Mapped[str] = mapped_column(String(191))
    message: Mapped[str] = mapped_column(Text)
    tracebackText: Mapped[str | None] = mapped_column(Text, nullable=True)
    createdAt: Mapped[datetime] = mapped_column(DateTime, default=now_ist, index=True)
