"""Hourly product-log digest text."""

from datetime import datetime
from types import SimpleNamespace

from app.services.app_log_service import format_digest


def test_digest_says_zero_when_there_are_no_errors():
    started = datetime(2026, 10, 8, 3, 0)
    ended = datetime(2026, 10, 8, 4, 0)
    subject, text, _html = format_digest([], started=started, ended=ended)
    assert "zero errors" in subject
    assert "zero errors" in text


def test_digest_lists_error_messages():
    started = datetime(2026, 10, 8, 3, 0)
    ended = datetime(2026, 10, 8, 4, 0)
    row = SimpleNamespace(
        createdAt=datetime(2026, 10, 8, 3, 15, 2),
        loggerName="app.gate",
        message="QR scan failed",
    )
    subject, text, _html = format_digest([row], started=started, ended=ended)
    assert "1 error" in subject
    assert "QR scan failed" in text
    assert "app.gate" in text
