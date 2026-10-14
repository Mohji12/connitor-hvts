import asyncio
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock, patch

from app.services.visitors_service import VisitorsService


def _upload(name: str, content_type: str) -> SimpleNamespace:
    return SimpleNamespace(filename=name, content_type=content_type)


def _service(visitor: SimpleNamespace) -> VisitorsService:
    with patch("app.services.visitors_service.GcpStorageService"), patch(
        "app.services.visitors_service.NotificationsService"
    ):
        service = VisitorsService(MagicMock())
    service.find_visitor_by_phone_and_branch = MagicMock(return_value=visitor)
    service.gcp.upload_visitor_document = AsyncMock(
        side_effect=lambda _file, visitor_id, doc_type: f"https://store/{visitor_id}/{doc_type}"
    )
    return service


def test_guest_meeting_registration_saves_photo_and_both_ids() -> None:
    visitor = SimpleNamespace(id="v1", phoneVerified=True, firstName="A", lastName="B")
    service = _service(visitor)

    asyncio.run(
        service.register_public_visitor(
            {"branchId": "b1", "phone": "9000000001", "visitCategory": "MEETING"},
            {
                "photo": _upload("live.jpg", "image/jpeg"),
                "governmentIdDocument": _upload("aadhaar.pdf", "application/pdf"),
                "officeIdDocument": _upload("office.jpg", "image/jpeg"),
            },
        )
    )

    assert visitor.photo == "https://store/v1/photo"
    assert visitor.governmentIdDocument == "https://store/v1/government-id"
    assert visitor.officeIdDocument == "https://store/v1/office-id"


def test_guest_delivery_registration_without_ids_keeps_existing_documents() -> None:
    visitor = SimpleNamespace(
        id="v2", phoneVerified=True, firstName="A", lastName="B", governmentIdDocument="old-id"
    )
    service = _service(visitor)

    asyncio.run(
        service.register_public_visitor(
            {"branchId": "b1", "phone": "9000000002", "visitCategory": "DELIVERY"},
            {"photo": _upload("live.jpg", "image/jpeg")},
        )
    )

    assert visitor.photo == "https://store/v2/photo"
    assert visitor.governmentIdDocument == "old-id"
