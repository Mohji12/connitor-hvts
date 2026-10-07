"""AWS S3 storage for visitor pre-registration assets."""

from __future__ import annotations

import hashlib
import hmac
import logging
import time
from pathlib import Path
from typing import BinaryIO
from urllib.parse import quote

from fastapi import HTTPException, UploadFile

from app.config import get_public_api_base_url, get_settings

logger = logging.getLogger(__name__)

ALLOWED_MIME = {
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
    "application/pdf",
}

MAX_UPLOAD_BYTES = 5 * 1024 * 1024
LOCAL_KEY_PREFIX = "local:"


def visitor_upload_root() -> Path:
    root = Path(__file__).resolve().parents[2] / "var" / "visitor-uploads"
    root.mkdir(parents=True, exist_ok=True)
    return root


def _sign_local_asset(relative: str, exp: int, secret: str) -> str:
    message = f"{relative}:{exp}".encode()
    return hmac.new(secret.encode(), message, hashlib.sha256).hexdigest()


def resolve_local_asset(relative: str, exp: int, sig: str) -> Path:
    """Return a file saved after S3 upload failed, if the signed link is still valid."""
    if exp < int(time.time()):
        raise HTTPException(status_code=401, detail="Link expired")
    settings = get_settings()
    expected = _sign_local_asset(relative, exp, settings.jwt_secret)
    if not hmac.compare_digest(expected, sig):
        raise HTTPException(status_code=403, detail="Invalid link")
    root = visitor_upload_root().resolve()
    path = (root / relative).resolve()
    if path != root and root not in path.parents:
        raise HTTPException(status_code=404, detail="File not found")
    if not path.is_file():
        raise HTTPException(status_code=404, detail="File not found")
    return path


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

        if self._client and self.settings.aws_s3_bucket:
            try:
                self._client.put_object(
                    Bucket=self.settings.aws_s3_bucket,
                    Key=key,
                    Body=content,
                    ContentType=mime,
                )
                return key
            except Exception:
                logger.warning("S3 visitor upload failed; saving on the API server", exc_info=True)
        else:
            logger.warning("S3 not configured; saving visitor file on the API server: %s", key)
        return self._write_local(key, content)

    def _write_local(self, key: str, content: bytes) -> str:
        dest = visitor_upload_root() / key
        dest.parent.mkdir(parents=True, exist_ok=True)
        dest.write_bytes(content)
        return f"{LOCAL_KEY_PREFIX}{key}"

    def _local_asset_url(self, storage_key: str, ttl_seconds: int) -> str | None:
        relative = storage_key[len(LOCAL_KEY_PREFIX) :]
        exp = int(time.time()) + ttl_seconds
        sig = _sign_local_asset(relative, exp, self.settings.jwt_secret)
        base = get_public_api_base_url(self.settings)
        if not base and self.settings.runtime == "production":
            base = "https://api.conninter.com"
        quoted = quote(relative, safe="/")
        path = f"/api/public/visitor-accounts/assets/{quoted}?exp={exp}&sig={sig}"
        if not base:
            return path
        return f"{base}{path}"

    def publish_delivery_pass_png(self, delivery_id: str, content: bytes) -> str | None:
        """Upload a delivery pass and return an HTTPS URL WhatsApp can fetch."""
        return self._publish_png(f"delivery-passes/{delivery_id}/{int(time.time())}.png", content, delivery_id)

    def publish_attendant_pass_png(self, pass_id: str, content: bytes) -> str | None:
        """Upload an attendant pass QR and return an HTTPS URL WhatsApp can fetch."""
        return self._publish_png(f"attendant-passes/{pass_id}/{int(time.time())}.png", content, pass_id)

    def publish_gate_pass_png(self, visit_id: str, content: bytes) -> str | None:
        """Upload a gate-pass QR and return an HTTPS URL WhatsApp can fetch."""
        return self._publish_png(f"gate-passes/{visit_id}/{int(time.time())}.png", content, visit_id)

    def _publish_png(self, key: str, content: bytes, owner_id: str) -> str | None:
        if not content:
            return None
        if not self._client or not self.settings.aws_s3_bucket:
            logger.warning("S3 not configured; cannot publish pass image for %s", owner_id)
            return None
        bucket = self.settings.aws_s3_bucket
        region = self.settings.aws_region or "us-east-1"
        if self.settings.s3_public_acl:
            try:
                self._client.put_object(
                    Bucket=bucket,
                    Key=key,
                    Body=content,
                    ContentType="image/png",
                    ACL="public-read",
                )
                return f"https://{bucket}.s3.{region}.amazonaws.com/{key}"
            except Exception:
                logger.warning("Public gate-pass upload failed; using a time-limited URL", exc_info=True)
        try:
            self._client.put_object(
                Bucket=bucket,
                Key=key,
                Body=content,
                ContentType="image/png",
            )
            return self._client.generate_presigned_url(
                "get_object",
                Params={"Bucket": bucket, "Key": key},
                ExpiresIn=7 * 24 * 3600,
            )
        except Exception:
            logger.warning("S3 pass upload failed for %s", owner_id, exc_info=True)
            return None

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

    def read_bytes(self, storage_key: str) -> bytes | None:
        """Read a visitor photo or other stored object. Keys may be S3 or local:."""
        key = (storage_key or "").strip()
        if not key:
            return None
        if key.startswith(LOCAL_KEY_PREFIX):
            relative = key[len(LOCAL_KEY_PREFIX) :]
            path = (visitor_upload_root() / relative).resolve()
            root = visitor_upload_root().resolve()
            if path != root and root not in path.parents:
                return None
            if path.is_file():
                return path.read_bytes()
            return None
        if not self._client or not self.settings.aws_s3_bucket:
            return None
        try:
            obj = self._client.get_object(Bucket=self.settings.aws_s3_bucket, Key=key)
            return obj["Body"].read()
        except Exception:
            logger.warning("S3 read failed for %s", key, exc_info=True)
            return None

    def get_presigned_url(self, storage_key: str, ttl_seconds: int = 900) -> str | None:
        if storage_key.startswith(LOCAL_KEY_PREFIX):
            return self._local_asset_url(storage_key, ttl_seconds)
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
