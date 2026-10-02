import tempfile
import unittest
from pathlib import Path
from unittest.mock import MagicMock, patch

from app.services.s3_storage_service import (
    S3StorageService,
    _sign_local_asset,
    resolve_local_asset,
)


def _settings() -> MagicMock:
    settings = MagicMock()
    settings.aws_s3_bucket = "bucket"
    settings.aws_region = "ap-south-1"
    settings.aws_access_key_id = "key"
    settings.aws_secret_access_key = "secret"
    settings.jwt_secret = "test-secret"
    settings.runtime = "development"
    settings.public_api_base_url = None
    return settings


class VisitorUploadFallbackTests(unittest.TestCase):
    def test_s3_failure_saves_file_locally(self) -> None:
        settings = _settings()
        with patch("app.services.s3_storage_service.get_settings", return_value=settings):
            with patch("app.services.s3_storage_service.is_aws_s3_configured", return_value=True):
                with patch("boto3.client", return_value=MagicMock()):
                    service = S3StorageService()
        service._client.put_object.side_effect = RuntimeError("InvalidAccessKeyId")

        with tempfile.TemporaryDirectory() as tmp:
            with patch("app.services.s3_storage_service.visitor_upload_root", return_value=Path(tmp)):
                key = service.upload_visitor_asset(
                    "acct-1",
                    "live-photo",
                    b"\xff\xd8\xff\xd9",
                    "image/jpeg",
                )
            self.assertTrue(key.startswith("local:visitor-accounts/acct-1/live-photo/"))
            saved = list(Path(tmp).rglob("*.jpg"))
            self.assertEqual(len(saved), 1)
            self.assertEqual(saved[0].read_bytes(), b"\xff\xd8\xff\xd9")

    def test_local_link_resolves_saved_file(self) -> None:
        settings = _settings()
        settings.aws_s3_bucket = None
        with patch("app.services.s3_storage_service.get_settings", return_value=settings):
            with patch("app.services.s3_storage_service.is_aws_s3_configured", return_value=False):
                service = S3StorageService()
            with tempfile.TemporaryDirectory() as tmp:
                root = Path(tmp)
                with patch("app.services.s3_storage_service.visitor_upload_root", return_value=root):
                    key = service.upload_visitor_asset(
                        "acct-1",
                        "live-photo",
                        b"\xff\xd8\xff\xd9",
                        "image/jpeg",
                    )
                    relative = key.removeprefix("local:")
                    self.assertIsNone(service.get_presigned_url(key, ttl_seconds=60))
                    exp = 9_999_999_999
                    sig = _sign_local_asset(relative, exp, "test-secret")
                    path = resolve_local_asset(relative, exp, sig)
                    self.assertEqual(path.read_bytes(), b"\xff\xd8\xff\xd9")
