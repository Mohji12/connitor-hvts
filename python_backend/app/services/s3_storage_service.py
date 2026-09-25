"""AWS S3 storage for visitor pre-registration assets."""

from __future__ import annotations

import logging
import time
from typing import BinaryIO

from fastapi import HTTPException, UploadFile

from app.config import get_settings

logger = logging.getLogger(__name__)

ALLOWED_MIME = {
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
    "application/pdf",
}

MAX_UPLOAD_BYTES = 5 * 1024 * 1024


def is_aws_s3_configured() -> bool:
    settings = get_settings()
    return bool(settings.aws_s3_bucket and settings.aws_region)


class S3StorageService:
    def __init__(self) -> None:
        self.settings = get_settings()
        self._client = None
        if is_aws_s3_configured():
            try:
                import boto3

                kwargs: dict = {"region_name": self.settings.aws_region}
                if self.settings.aws_access_key_id and self.settings.aws_secret_access_key:
                    kwargs["aws_access_key_id"] = self.settings.aws_access_key_id
                    kwargs["aws_secret_access_key"] = self.settings.aws_secret_access_key
                self._client = boto3.client("s3", **kwargs)
            except Exception as exc:
                logger.warning("S3 client init failed: %s", exc)

    def _validate_content(self, content: bytes, mime: str) -> None:
        if mime not in ALLOWED_MIME:
            raise HTTPException(status_code=400, detail="Invalid file type")
        if len(content) > MAX_UPLOAD_BYTES:
            raise HTTPException(status_code=400, detail="File too large (max 5MB)")

    def _extension_for_mime(self, mime: str) -> str:
        if mime == "application/pdf":
            return ".pdf"
        if "png" in mime:
            return ".png"
        if "webp" in mime:
            return ".webp"
        return ".jpg"

    def upload_visitor_asset(
        self,
        account_id: str,
        category: str,
        content: bytes,
        mime: str,
        *,
        suffix: str = "",
    ) -> str:
        self._validate_content(content, mime)
        ext = self._extension_for_mime(mime)
        ts = int(time.time())
        key = f"visitor-accounts/{account_id}/{category}/{ts}{suffix}{ext}"

        if not self._client or not self.settings.aws_s3_bucket:
            logger.warning("S3 not configured; storing key only: %s", key)
            return key

        self._client.put_object(
            Bucket=self.settings.aws_s3_bucket,
            Key=key,
            Body=content,
            ContentType=mime,
        )
        return key

    async def upload_from_upload_file(
        self,
        account_id: str,
        category: str,
        file: UploadFile,
        *,
        suffix: str = "",
    ) -> str:
        content = await file.read()
        mime = file.content_type or "image/jpeg"
        return self.upload_visitor_asset(account_id, category, content, mime, suffix=suffix)

    def get_presigned_url(self, storage_key: str, ttl_seconds: int = 900) -> str | None:
        if not self._client or not self.settings.aws_s3_bucket:
            return None
        try:
            return self._client.generate_presigned_url(
                "get_object",
                Params={"Bucket": self.settings.aws_s3_bucket, "Key": storage_key},
                ExpiresIn=ttl_seconds,
            )
        except Exception as exc:
            logger.error("Presigned URL failed for %s: %s", storage_key, exc)
            return None

    def upload_bytes_local_fallback(self, account_id: str, category: str, stream: BinaryIO, mime: str) -> str:
        content = stream.read()
        return self.upload_visitor_asset(account_id, category, content, mime)
