from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies.auth import get_current_user
from app.services.notifications_service import NotificationsService
from app.utils.serializers import model_to_dict

router = APIRouter(dependencies=[Depends(get_current_user)])


@router.get("/unread")
def unread(user: Annotated[dict, Depends(get_current_user)], db: Annotated[Session, Depends(get_db)]):
    notes = NotificationsService(db).get_unread_notifications(user["id"])
    return [model_to_dict(n) for n in notes]


@router.patch("/{notification_id}/read")
def mark_read(
    notification_id: str, user: Annotated[dict, Depends(get_current_user)], db: Annotated[Session, Depends(get_db)]
):
    note = NotificationsService(db).mark_as_read(notification_id, user["id"])
    return model_to_dict(note)
