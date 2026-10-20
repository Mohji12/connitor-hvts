from datetime import datetime

from pydantic import BaseModel, Field


class GateDeviceRegisterRequest(BaseModel):
    label: str = Field(min_length=2, max_length=191)
    branchId: str | None = None
    gateId: str | None = Field(default=None, max_length=80)
    offlineEnabled: bool = False


class GateVerifyRequest(BaseModel):
    rawValue: str = Field(min_length=1, max_length=4000)


class GateSyncEvent(BaseModel):
    eventId: str = Field(min_length=8, max_length=64)
    passId: str = Field(min_length=1, max_length=80)
    passType: str = Field(pattern="^(visitor|delivery|attendant)$")
    eventType: str = Field(pattern="^(ACCEPT|REJECT|UNCERTAIN)$")
    reasonCode: str = Field(min_length=2, max_length=40)
    occurredAt: datetime
    decisionMode: str = Field(default="OFFLINE", pattern="^(ONLINE|OFFLINE)$")


class GateSyncRequest(BaseModel):
    events: list[GateSyncEvent] = Field(min_length=1, max_length=200)
    manifestId: str | None = None
