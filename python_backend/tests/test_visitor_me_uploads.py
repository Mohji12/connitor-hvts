from unittest.mock import AsyncMock, patch

from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.database import get_db
from app.dependencies.visitor_auth import get_current_visitor_account
from app.routers import visitor_accounts


def _client(account_id: str | None = "acc-1") -> TestClient:
    app = FastAPI()
    app.include_router(visitor_accounts.router, prefix="/visitor-accounts")
    app.dependency_overrides[get_db] = lambda: None
    if account_id:
        app.dependency_overrides[get_current_visitor_account] = lambda: {"accountId": account_id}
    return TestClient(app)


def test_signed_in_visitor_uploads_live_photo_to_own_account() -> None:
    with patch.object(
        visitor_accounts.VisitorAccountService, "upload_live_photo", new_callable=AsyncMock
    ) as upload:
        upload.return_value = {"photoStorageKey": "k", "message": "Live photo saved"}
        res = _client().post(
            "/visitor-accounts/me/photo",
            files={"photo": ("live.jpg", b"jpg-bytes", "image/jpeg")},
        )
    assert res.status_code == 200
    assert upload.await_args.args[0] == "acc-1"


def test_government_id_accepts_pdf_and_passes_type() -> None:
    with patch.object(
        visitor_accounts.VisitorAccountService, "upload_government_id", new_callable=AsyncMock
    ) as upload:
        upload.return_value = {"storageKey": "k", "govtIdType": "AADHAAR", "message": "ok"}
        res = _client().post(
            "/visitor-accounts/me/government-id",
            data={"govtIdType": "AADHAAR"},
            files={"document": ("aadhaar.pdf", b"%PDF", "application/pdf")},
        )
    assert res.status_code == 200
    account_id, _file, meta = upload.await_args.args
    assert account_id == "acc-1"
    assert meta.govtIdType.value == "AADHAAR"


def test_photo_rejects_pdf() -> None:
    res = _client().post(
        "/visitor-accounts/me/photo",
        files={"photo": ("doc.pdf", b"%PDF", "application/pdf")},
    )
    assert res.status_code == 400


def test_me_upload_requires_sign_in() -> None:
    res = _client(account_id=None).post(
        "/visitor-accounts/me/photo",
        files={"photo": ("live.jpg", b"jpg", "image/jpeg")},
    )
    assert res.status_code in (401, 403)
