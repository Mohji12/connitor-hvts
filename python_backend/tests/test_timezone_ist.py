from datetime import datetime, timezone

from sqlalchemy import DateTime, Integer, create_engine
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, sessionmaker

import app.database  # noqa: F401  registers the before_flush IST listener
from app.utils.timezone import to_ist_naive


class _Base(DeclarativeBase):
    pass


class _Stamp(_Base):
    __tablename__ = "tz_stamp"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    at: Mapped[datetime] = mapped_column(DateTime)


def test_browser_utc_string_becomes_ist_wall_time() -> None:
    assert to_ist_naive("2026-10-15T08:30:00.000Z") == datetime(2026, 10, 15, 14, 0)


def test_aware_utc_datetime_becomes_ist_wall_time() -> None:
    aware = datetime(2026, 10, 15, 8, 30, tzinfo=timezone.utc)
    assert to_ist_naive(aware) == datetime(2026, 10, 15, 14, 0)


def test_naive_values_are_already_ist() -> None:
    assert to_ist_naive(datetime(2026, 10, 15, 14, 0)) == datetime(2026, 10, 15, 14, 0)
    assert to_ist_naive("2026-10-15T14:00") == datetime(2026, 10, 15, 14, 0)
    assert to_ist_naive("") is None
    assert to_ist_naive(None) is None


def test_aware_datetime_is_saved_as_ist() -> None:
    engine = create_engine("sqlite:///:memory:")
    _Base.metadata.create_all(engine)
    session = sessionmaker(bind=engine)()
    row = _Stamp(id=1, at=datetime(2026, 10, 15, 8, 30, tzinfo=timezone.utc))
    session.add(row)
    session.commit()
    session.expire_all()
    assert session.get(_Stamp, 1).at == datetime(2026, 10, 15, 14, 0)
    session.close()
