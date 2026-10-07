"""Persist warnings and errors, and build the hourly product-admin digest."""

from __future__ import annotations

import logging
import traceback
from datetime import datetime, timedelta

from sqlalchemy.orm import Session

from app.models.app_log import AppLog
from app.utils.timezone import now_ist

logger = logging.getLogger(__name__)

_MAX_MESSAGE = 4000
_MAX_TRACE = 8000
_SECRET_MARKERS = ("SMTP_PASSWORD", "PASSWORD=", "SECRET_KEY", "AWS_SECRET")


def ensure_app_log_table() -> None:
    from app.database import engine

    AppLog.__table__.create(bind=engine, checkfirst=True)


def _safe_text(value: str, limit: int) -> str:
    text = value.replace("\x00", "")
    for marker in _SECRET_MARKERS:
        if marker in text:
            return "[redacted: log line contained a secret]"
    if len(text) > limit:
        return text[:limit] + "…"
    return text


def record_log(
    db: Session,
    *,
    level: str,
    logger_name: str,
    message: str,
    traceback_text: str | None = None,
) -> None:
    db.add(
        AppLog(
            level=level[:16],
            loggerName=(logger_name or "app")[:191],
            message=_safe_text(message or "", _MAX_MESSAGE),
            tracebackText=_safe_text(traceback_text, _MAX_TRACE) if traceback_text else None,
            createdAt=now_ist(),
        )
    )
    db.commit()


def list_logs(db: Session, *, level: str | None = None, limit: int = 100) -> list[AppLog]:
    query = db.query(AppLog)
    if level:
        query = query.filter(AppLog.level == level.upper())
    return query.order_by(AppLog.createdAt.desc()).limit(min(limit, 200)).all()


def errors_since(db: Session, since: datetime) -> list[AppLog]:
    return (
        db.query(AppLog)
        .filter(AppLog.level == "ERROR", AppLog.createdAt >= since)
        .order_by(AppLog.createdAt.asc())
        .limit(50)
        .all()
    )


def format_digest(errors: list[AppLog], *, started: datetime, ended: datetime) -> tuple[str, str, str]:
    window = f"{started.strftime('%Y-%m-%d %H:%M')} to {ended.strftime('%H:%M')}"
    if not errors:
        subject = "Connitor logs: zero errors in the last hour"
        text = (
            f"The hour from {window} had zero errors.\n"
            "No application errors were recorded in that hour."
        )
    else:
        subject = f"Connitor logs: {len(errors)} error(s) in the last hour"
        lines = [f"The hour from {window} had {len(errors)} error(s).", ""]
        for index, row in enumerate(errors, start=1):
            when = row.createdAt.strftime("%H:%M:%S") if row.createdAt else ""
            lines.append(f"{index}. {when} {row.loggerName}: {row.message}")
        text = "\n".join(lines)
    html = "<pre style=\"font-family:sans-serif;white-space:pre-wrap\">" + (
        text.replace("&", "&amp;").replace("<", "&lt;")
    ) + "</pre>"
    return subject, text, html


def send_hourly_digest(db: Session, *, hours: int = 1) -> dict:
    from app.config import get_settings
    from app.services.messaging_service import EmailService

    settings = get_settings()
    ended = now_ist()
    started = ended - timedelta(hours=hours)
    errors = errors_since(db, started)
    subject, text, html = format_digest(errors, started=started, ended=ended)
    recipient = settings.product_log_email
    if not settings.smtp_host or not settings.smtp_from:
        raise RuntimeError("SMTP is not configured. Set SMTP_HOST, SMTP_FROM, SMTP_USER, and SMTP_PASSWORD.")
    EmailService()._send_via_smtp(recipient, subject, text, html)
    logger.info("Product log digest sent to %s (%s errors)", recipient, len(errors))
    return {"to": recipient, "errorCount": len(errors), "subject": subject}


class AppLogHandler(logging.Handler):
    """Write WARNING and ERROR records into AppLog without logging its own failures."""

    def emit(self, record: logging.LogRecord) -> None:
        if record.levelno < logging.WARNING:
            return
        if record.name.startswith("sqlalchemy"):
            return
        try:
            message = record.getMessage()
        except Exception:
            message = str(record.msg)
        trace = None
        if record.exc_info:
            trace = "".join(traceback.format_exception(*record.exc_info))
        try:
            from app.database import SessionLocal

            db = SessionLocal()
            try:
                record_log(
                    db,
                    level=record.levelname,
                    logger_name=record.name,
                    message=message,
                    traceback_text=trace,
                )
            finally:
                db.close()
        except Exception:
            return
