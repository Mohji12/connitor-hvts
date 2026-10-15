from collections.abc import Generator
from datetime import datetime

from sqlalchemy import create_engine, event, inspect
from sqlalchemy.orm import Session, declarative_base, sessionmaker

from app.config import get_settings
from app.utils.timezone import to_ist_naive

settings = get_settings()
engine = create_engine(
    settings.database_url,
    pool_pre_ping=True,
    pool_size=10,
    max_overflow=20,
    pool_recycle=1800,
)


@event.listens_for(engine, "connect")
def _set_mysql_session_timezone(dbapi_connection, _connection_record) -> None:
    cursor = dbapi_connection.cursor()
    cursor.execute("SET time_zone = '+05:30'")
    cursor.close()


SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


@event.listens_for(Session, "before_flush")
def _store_datetimes_as_ist(session: Session, _flush_context, _instances) -> None:
    """DATETIME columns hold naive IST. The MySQL driver drops tzinfo, so an aware
    UTC value would be saved 5h30m early; convert it to IST wall time first."""
    for obj in (*session.new, *session.dirty):
        mapper = inspect(obj).mapper
        for attr in mapper.column_attrs:
            value = getattr(obj, attr.key, None)
            if isinstance(value, datetime) and value.tzinfo is not None:
                setattr(obj, attr.key, to_ist_naive(value))


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
