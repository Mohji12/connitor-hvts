from datetime import datetime
from typing import Any


def model_to_dict(obj: Any, exclude: set[str] | None = None) -> dict[str, Any]:
    exclude = exclude or set()
    exclude = exclude | {"passwordHash", "otp"}
    result: dict[str, Any] = {}
    for column in obj.__table__.columns:
        key = column.name
        if key in exclude:
            continue
        value = getattr(obj, key)
        if isinstance(value, datetime):
            result[key] = value.isoformat()
        else:
            result[key] = value
    return result
