from typing import Annotated, Literal

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies.auth import public_route
from app.services.livekit_service import LiveKitService

router = APIRouter()


class MeetingTokenBody(BaseModel):
    joinToken: str = Field(min_length=10)


class MeetingVisitSummary(BaseModel):
    visitId: str
    doctorName: str | None
    visitorName: str | None
    hospitalName: str | None
    appointmentDate: str | None
    purpose: str | None
    status: str


class MeetingTokenResponse(BaseModel):
    serverUrl: str
    participantToken: str
    roomName: str
    role: Literal["host", "guest"]
    identity: str
    displayName: str
    opensAt: str
    closesAt: str
    visit: MeetingVisitSummary


@router.post("/token", response_model=MeetingTokenResponse)
@public_route
def create_meeting_token(
    body: MeetingTokenBody,
    db: Annotated[Session, Depends(get_db)],
) -> MeetingTokenResponse:
    access = LiveKitService(db).mint_participant_token(body.joinToken)
    visit = access.visit
    visitor = visit.visitor
    return MeetingTokenResponse(
        serverUrl=access.server_url,
        participantToken=access.participant_token,
        roomName=access.room_name,
        role=access.role,
        identity=access.identity,
        displayName=access.display_name,
        opensAt=access.window.opens_at.isoformat(),
        closesAt=access.window.closes_at.isoformat(),
        visit=MeetingVisitSummary(
            visitId=visit.id,
            doctorName=visit.staff.name if visit.staff else visit.staffName,
            visitorName=f"{visitor.firstName} {visitor.lastName}".strip() if visitor else None,
            hospitalName=visit.branch.name if visit.branch else None,
            appointmentDate=visit.appointmentDate.isoformat() if visit.appointmentDate else None,
            purpose=visit.purpose,
            status=visit.status,
        ),
    )
