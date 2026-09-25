import logging
import re
import time
from io import BytesIO
from typing import BinaryIO

from fastapi import HTTPException, UploadFile

from app.config import get_settings

logger = logging.getLogger(__name__)

ALLOWED_MIME = {
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/gif",
    "image/webp",
    "application/pdf",
}


class GcpStorageService:
    def __init__(self) -> None:
        settings = get_settings()
        self.bucket_name = settings.gcp_bucket_name
        self._client = None
        if settings.gcp_project_id and settings.gcp_bucket_name:
            try:
                from google.cloud import storage

                self._client = storage.Client(project=settings.gcp_project_id)
            except Exception as exc:
                logger.warning("GCP client init failed: %s", exc)

    def _validate_file(self, file: UploadFile) -> None:
        if not file.content_type or file.content_type not in ALLOWED_MIME:
            raise HTTPException(status_code=400, detail="Invalid file type")

    async def upload_visitor_document(
        self, file: UploadFile, visitor_id: str, document_type: str
    ) -> str:
        self._validate_file(file)
        content = await file.read()
        ext = ".jpg"
        if file.content_type == "application/pdf":
            ext = ".pdf"
        elif file.content_type and "png" in file.content_type:
            ext = ".png"

        path = f"visitors/{visitor_id}/{document_type}/{int(time.time())}-{visitor_id}-{document_type}{ext}"

        if self._client and self.bucket_name:
            bucket = self._client.bucket(self.bucket_name)
            blob = bucket.blob(path)
            blob.upload_from_string(content, content_type=file.content_type or "application/octet-stream")
            try:
                blob.make_public()
            except Exception:
                pass
            return f"https://storage.googleapis.com/{self.bucket_name}/{path}"

        return f"local://{path}"

    def extract_file_path_from_url(self, url: str) -> str:
        if url.startswith("local://"):
            return url.replace("local://", "")
        match = re.search(r"storage\.googleapis\.com/[^/]+/(.+)", url)
        if match:
            return match.group(1)
        return url

    def download_file(self, file_path: str) -> bytes:
        if self._client and self.bucket_name:
            bucket = self._client.bucket(self.bucket_name)
            blob = bucket.blob(file_path)
            return blob.download_as_bytes()
        raise HTTPException(status_code=404, detail="File not found")

    def delete_file(self, file_path: str) -> None:
        if self._client and self.bucket_name:
            bucket = self._client.bucket(self.bucket_name)
            bucket.blob(file_path).delete()

    def upload_gate_pass_buffer(self, visit_id: str, image_bytes: bytes) -> tuple[str, str]:
        path = f"gate-passes/{visit_id}/{int(time.time())}.png"
        if self._client and self.bucket_name:
            bucket = self._client.bucket(self.bucket_name)
            blob = bucket.blob(path)
            blob.upload_from_string(image_bytes, content_type="image/png")
            url = f"https://storage.googleapis.com/{self.bucket_name}/{path}"
            return url, url
        return f"data:image/png;base64,{image_bytes.hex()[:32]}...", path
