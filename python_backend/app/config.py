"""
Application configuration — single source of truth for all credentials and settings.

Loading order (first match wins):
  1. Constructor kwargs (tests)
  2. OS environment variables — used by AWS Lambda (set in Lambda console / IaC)
  3. Local `.env` file — development only (`python_backend/.env`, not deployed)
  4. AWS Secrets Manager JSON — when `HVTS_SECRETS_ARN` is set (optional, Lambda/prod)

All services must use `get_settings()` — never read `os.environ` or `.env` directly.
"""

from __future__ import annotations

import json
import logging
import os
from functools import lru_cache
from pathlib import Path
from typing import Any, Literal
from urllib.parse import quote_plus

from pydantic import AliasChoices, Field, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

logger = logging.getLogger(__name__)

_BACKEND_ROOT = Path(__file__).resolve().parent.parent
_ENV_FILE = _BACKEND_ROOT / ".env"


def is_lambda_runtime() -> bool:
    return bool(os.environ.get("AWS_LAMBDA_FUNCTION_NAME"))


def _load_secrets_manager_into_environ() -> None:
    """Merge JSON secret from AWS Secrets Manager into os.environ (does not override existing keys)."""
    secret_id = os.environ.get("HVTS_SECRETS_ARN") or os.environ.get("AWS_SECRETS_MANAGER_SECRET_ID")
    if not secret_id:
        return
    try:
        import boto3

        region = os.environ.get("AWS_REGION") or os.environ.get("AWS_DEFAULT_REGION") or "ap-south-1"
        client = boto3.client("secretsmanager", region_name=region)
        response = client.get_secret_value(SecretId=secret_id)
        raw = response.get("SecretString") or ""
        if not raw:
            logger.warning("Secrets Manager secret %s is empty", secret_id)
            return
        payload = json.loads(raw)
        if not isinstance(payload, dict):
            logger.warning("Secrets Manager secret %s is not a JSON object", secret_id)
            return
        merged = 0
        for key, value in payload.items():
            if value is None:
                continue
            env_key = str(key)
            if env_key not in os.environ:
                os.environ[env_key] = str(value)
                merged += 1
        logger.info("Loaded %s keys from Secrets Manager (%s)", merged, secret_id)
    except Exception as exc:
        logger.error("Failed to load HVTS secrets from %s: %s", secret_id, exc)
        raise


class Settings(BaseSettings):
    """
    Credentials and runtime settings.

    Local dev: copy `.env.example` → `.env` and fill values.
    Lambda: set the same UPPER_SNAKE_CASE names as Lambda environment variables,
    or store them as JSON in Secrets Manager and set `HVTS_SECRETS_ARN`.
    """

    model_config = SettingsConfigDict(
        env_file=str(_ENV_FILE) if _ENV_FILE.is_file() else None,
        env_file_encoding="utf-8",
        extra="ignore",
    )

    port: int = Field(default=8000, validation_alias="PORT")
    host: str = Field(default="0.0.0.0", validation_alias="HOST")

    mysql_host: str = Field(default="localhost", validation_alias="MYSQL_HOST")
    mysql_port: int = Field(default=3306, validation_alias="MYSQL_PORT")
    mysql_user: str = Field(default="root", validation_alias="MYSQL_USER")
    mysql_password: str = Field(default="", validation_alias="MYSQL_PASSWORD")
    mysql_db: str = Field(default="hvts", validation_alias="MYSQL_DB")
    database_url: str | None = Field(default=None, validation_alias="DATABASE_URL")

    jwt_secret: str = Field(default="change-me", validation_alias="JWT_SECRET")
    jwt_expires_in: str = Field(default="1d", validation_alias="JWT_EXPIRES_IN")

    visitor_form_url: str = Field(
        default="http://localhost:3000/visit/on-spot",
        validation_alias="VISITOR_FORM_URL",
    )
    frontend_url: str = Field(default="http://localhost:3000", validation_alias="FRONTEND_URL")
    public_frontend_url: str | None = Field(default=None, validation_alias="PUBLIC_FRONTEND_URL")
    cors_allowed_origins: str | None = Field(
        default=None,
        validation_alias="CORS_ALLOWED_ORIGINS",
        description="Comma-separated extra browser origins allowed for CORS (e.g. Amplify staging URL)",
    )
    public_api_base_url: str | None = Field(default=None, validation_alias="PUBLIC_API_BASE_URL")
    doctor_approval_link_url: str | None = Field(
        default=None, validation_alias="DOCTOR_APPROVAL_LINK_URL"
    )

    gcp_project_id: str | None = Field(default=None, validation_alias="GCP_PROJECT_ID")
    gcp_bucket_name: str | None = Field(default=None, validation_alias="GCP_BUCKET_NAME")
    google_application_credentials: str | None = Field(
        default=None, validation_alias="GOOGLE_APPLICATION_CREDENTIALS"
    )
    gcp_public_url: str | None = Field(default=None, validation_alias="GCP_PUBLIC_URL")
    google_calendar_id: str | None = Field(default=None, validation_alias="GOOGLE_CALENDAR_ID")

    aws_region: str | None = Field(default=None, validation_alias="AWS_REGION")
    aws_access_key_id: str | None = Field(default=None, validation_alias="AWS_ACCESS_KEY_ID")
    aws_secret_access_key: str | None = Field(default=None, validation_alias="AWS_SECRET_ACCESS_KEY")
    aws_s3_bucket: str | None = Field(default=None, validation_alias="AWS_S3_BUCKET")
    visitor_jwt_expiry_hours: int = Field(default=168, validation_alias="VISITOR_JWT_EXPIRY_HOURS")
    email_verification_base_url: str | None = Field(
        default=None, validation_alias="EMAIL_VERIFICATION_BASE_URL"
    )
    google_oauth_client_id: str | None = Field(default=None, validation_alias="GOOGLE_CLIENT_ID")
    google_oauth_client_secret: str | None = Field(default=None, validation_alias="GOOGLE_CLIENT_SECRET")
    linkedin_oauth_client_id: str | None = Field(default=None, validation_alias="LINKEDIN_CLIENT_ID")
    linkedin_oauth_client_secret: str | None = Field(
        default=None, validation_alias="LINKEDIN_CLIENT_SECRET"
    )
    visitor_oauth_redirect_base: str | None = Field(
        default=None, validation_alias="VISITOR_OAUTH_REDIRECT_BASE"
    )

    sms_provider: Literal["auto", "twilio", "aws"] = Field(
        default="auto",
        validation_alias="SMS_PROVIDER",
    )
    notification_channel: Literal["sms", "whatsapp", "auto"] = Field(
        default="whatsapp",
        validation_alias="NOTIFICATION_CHANNEL",
    )
    doctor_approval_whatsapp_enabled: bool = Field(
        default=False,
        validation_alias="DOCTOR_APPROVAL_WHATSAPP_ENABLED",
        description="When false, doctor visit approval is email-only; WapBlaster stays configured for other flows",
    )
    twilio_account_sid: str | None = Field(default=None, validation_alias="TWILIO_ACCOUNT_SID")
    twilio_auth_token: str | None = Field(default=None, validation_alias="TWILIO_AUTH_TOKEN")
    twilio_from_number: str | None = Field(default=None, validation_alias="TWILIO_FROM_NUMBER")
    twilio_whatsapp_from: str | None = Field(default=None, validation_alias="TWILIO_WHATSAPP_FROM")
    twilio_webhook_url: str | None = Field(default=None, validation_alias="TWILIO_WEBHOOK_URL")
    sms_default_country_code: str = Field(default="91", validation_alias="SMS_DEFAULT_COUNTRY_CODE")

    smtp_host: str | None = Field(default=None, validation_alias="SMTP_HOST")
    smtp_port: int = Field(default=587, validation_alias="SMTP_PORT")
    smtp_user: str | None = Field(default=None, validation_alias="SMTP_USER")
    smtp_password: str | None = Field(default=None, validation_alias="SMTP_PASSWORD")
    smtp_from: str | None = Field(default=None, validation_alias="SMTP_FROM")
    email_from_name: str = Field(default="Connitor", validation_alias="EMAIL_FROM_NAME")
    email_product_name: str = Field(
        default="Hospital Visitor Tracking System",
        validation_alias="EMAIL_PRODUCT_NAME",
    )
    smtp_use_tls: bool = Field(default=True, validation_alias="SMTP_USE_TLS")
    smtp_use_ssl: bool = Field(default=False, validation_alias="SMTP_USE_SSL")

    hvts_test_mode: bool = Field(default=False, validation_alias="HVTS_TEST_MODE")
    delivery_module_enabled: bool = Field(default=True, validation_alias="DELIVERY_MODULE_ENABLED")
    delivery_wallet_enabled: bool = Field(default=False, validation_alias="DELIVERY_WALLET_ENABLED")
    delivery_full_unload_minutes: float = Field(
        default=60.0, validation_alias="DELIVERY_FULL_UNLOAD_MINUTES"
    )
    delivery_rate_per_minute: float = Field(
        default=10.0, validation_alias="DELIVERY_RATE_PER_MINUTE"
    )
    zeptomail_api_url: str | None = Field(default=None, validation_alias="ZEPTOMAIL_API_URL")

    whatsapp_api_url: str | None = Field(
        default=None,
        validation_alias=AliasChoices("WHATSAPP_API_URL", "WHATSAPP_API_BASE"),
    )
    whatsapp_phone_number_id: str | None = Field(
        default=None, validation_alias="WHATSAPP_PHONE_NUMBER_ID"
    )
    whatsapp_business_account_id: str | None = Field(
        default=None,
        validation_alias="WHATSAPP_BUSINESS_ACCOUNT_ID",
    )
    whatsapp_access_token: str | None = Field(
        default=None,
        validation_alias=AliasChoices("WHATSAPP_ACCESS_TOKEN", "WHATSAPP_API_KEY"),
    )
    whatsapp_template_gate_pass: str = Field(
        default="gate_pass_approved",
        validation_alias="WHATSAPP_TEMPLATE_GATE_PASS",
    )
    whatsapp_template_notification: str = Field(
        default="connitor_notification",
        validation_alias="WHATSAPP_TEMPLATE_NOTIFICATION",
    )
    whatsapp_template_appointment_approval: str = Field(
        default="confirmation_template",
        validation_alias="WHATSAPP_TEMPLATE_APPOINTMENT_APPROVAL",
    )
    whatsapp_template_language: str = Field(
        default="en_US",
        validation_alias="WHATSAPP_TEMPLATE_LANGUAGE",
    )
    whatsapp_webhook_verify_token: str | None = Field(
        default=None,
        validation_alias="WHATSAPP_WEBHOOK_VERIFY_TOKEN",
    )
    whatsapp_reply_api_key: str | None = Field(
        default=None,
        validation_alias="WHATSAPP_REPLY_API_KEY",
    )
    wapblaster_api_base: str | None = Field(
        default=None,
        validation_alias=AliasChoices("WAPBLASTER_API_BASE", "WAPBLASTER_API_URL"),
    )
    wapblaster_vendor_uid: str | None = Field(
        default=None,
        validation_alias=AliasChoices("WAPBLASTER_VENDOR_UID", "WHATSAPP_VENDOR_UID"),
    )
    wapblaster_access_token: str | None = Field(
        default=None,
        validation_alias="WAPBLASTER_ACCESS_TOKEN",
    )
    wapblaster_template_field_count: int = Field(
        default=5,
        validation_alias="WAPBLASTER_TEMPLATE_FIELD_COUNT",
        description="Body variable count for WapBlaster templates (e.g. confirmation_template uses 5)",
    )
    wapblaster_webhook_secret: str | None = Field(
        default=None,
        validation_alias="WAPBLASTER_WEBHOOK_SECRET",
        description="Shared secret for POST /webhooks/wapblaster/inbound (X-WapBlaster-Webhook-Secret)",
    )
    whatsapp_provider: Literal["pywhatkit", "twilio", "meta", "wapblaster", "auto"] = Field(
        default="pywhatkit",
        validation_alias="WHATSAPP_PROVIDER",
    )
    pywhatkit_central_phone: str = Field(
        default="8625877312",
        validation_alias="PYWHATKIT_CENTRAL_PHONE",
    )
    pywhatkit_wait_time: int = Field(default=20, validation_alias="PYWHATKIT_WAIT_TIME")
    pywhatkit_tab_close: bool = Field(default=True, validation_alias="PYWHATKIT_TAB_CLOSE")
    pywhatkit_close_time: int = Field(default=3, validation_alias="PYWHATKIT_CLOSE_TIME")

    node_env: Literal["development", "test", "production"] = Field(
        default="development",
        validation_alias="NODE_ENV",
    )
    e2e_fixed_otp: str = Field(default="123456", validation_alias="E2E_FIXED_OTP")
    demo_mode: bool = Field(default=False, validation_alias="DEMO_MODE")
    sales_meeting_confirm_window_hours: int = Field(
        default=4,
        validation_alias="SALES_MEETING_CONFIRM_WINDOW_HOURS",
    )
    visit_extend_warn_minutes: int = Field(
        default=1,
        validation_alias="VISIT_EXTEND_WARN_MINUTES",
    )
    cron_job_token: str | None = Field(default=None, validation_alias="CRON_JOB_TOKEN")

    livekit_url: str | None = Field(default=None, validation_alias="LIVEKIT_URL")
    livekit_api_key: str | None = Field(default=None, validation_alias="LIVEKIT_API_KEY")
    livekit_api_secret: str | None = Field(default=None, validation_alias="LIVEKIT_API_SECRET")
    meeting_join_early_minutes: int = Field(default=15, validation_alias="MEETING_JOIN_EARLY_MINUTES")
    meeting_join_grace_minutes: int = Field(default=60, validation_alias="MEETING_JOIN_GRACE_MINUTES")

    rate_limit_sms_per_hour: int = Field(default=3, validation_alias="RATE_LIMIT_SMS_PER_HOUR")
    rate_limit_skip_in_test_mode: bool = Field(
        default=True,
        validation_alias="RATE_LIMIT_SKIP_IN_TEST_MODE",
    )

    @model_validator(mode="after")
    def assemble_database_url(self) -> "Settings":
        """Build DATABASE_URL from MYSQL_* when parts are provided."""
        use_mysql_parts = (
            self.mysql_host not in ("", "localhost")
            or self.mysql_user not in ("", "root")
            or bool(self.mysql_password)
        )
        if use_mysql_parts:
            password = quote_plus(self.mysql_password)
            object.__setattr__(
                self,
                "database_url",
                f"mysql+pymysql://{self.mysql_user}:{password}@{self.mysql_host}:{self.mysql_port}/{self.mysql_db}",
            )
        elif not self.database_url:
            object.__setattr__(
                self,
                "database_url",
                "mysql+pymysql://root:password@localhost:3306/hvts",
            )
        return self

    @property
    def runtime(self) -> str:
        if is_lambda_runtime():
            return "lambda"
        return self.node_env


def clear_settings_cache() -> None:
    get_settings.cache_clear()


@lru_cache
def get_settings() -> Settings:
    _load_secrets_manager_into_environ()
    settings = Settings()
    if is_lambda_runtime():
        logger.info(
            "Settings loaded for Lambda (secrets_arn=%s, livekit=%s)",
            bool(os.environ.get("HVTS_SECRETS_ARN") or os.environ.get("AWS_SECRETS_MANAGER_SECRET_ID")),
            is_livekit_configured(settings),
        )
    return settings


def is_test_mode_enabled(settings: Settings) -> bool:
    if settings.node_env == "production" and settings.hvts_test_mode:
        return False
    return settings.hvts_test_mode and settings.node_env != "production"


def is_demo_mode_enabled(settings: Settings) -> bool:
    if settings.node_env == "production" and settings.demo_mode:
        return False
    return settings.demo_mode and settings.node_env != "production"


def get_fixed_otp(settings: Settings) -> str | None:
    if not is_test_mode_enabled(settings):
        return None
    otp = settings.e2e_fixed_otp
    if len(otp) == 6 and otp.isdigit():
        return otp
    return None


def is_twilio_configured(settings: Settings) -> bool:
    return bool(
        settings.twilio_account_sid
        and settings.twilio_auth_token
        and settings.twilio_from_number
    )


def is_meta_whatsapp_configured(settings: Settings) -> bool:
    if settings.whatsapp_provider == "wapblaster":
        return False
    return bool(
        settings.whatsapp_api_url
        and settings.whatsapp_phone_number_id
        and settings.whatsapp_access_token
        and "wapblaster" not in (settings.whatsapp_api_url or "").lower()
    )


def is_wapblaster_configured(settings: Settings) -> bool:
    base = (settings.wapblaster_api_base or settings.whatsapp_api_url or "").strip()
    token = (settings.wapblaster_access_token or settings.whatsapp_access_token or "").strip()
    uid = (settings.wapblaster_vendor_uid or "").strip()
    return bool(base and uid and token and "wapblaster" in base.lower())


def twilio_whatsapp_from_address(settings: Settings) -> str | None:
    if not is_twilio_configured(settings):
        return None
    raw = settings.twilio_whatsapp_from or settings.twilio_from_number
    if not raw:
        return None
    return raw if raw.lower().startswith("whatsapp:") else f"whatsapp:{raw}"


def is_twilio_whatsapp_configured(settings: Settings) -> bool:
    return twilio_whatsapp_from_address(settings) is not None


def is_pywhatkit_configured(settings: Settings) -> bool:
    return bool(settings.pywhatkit_central_phone.strip())


def whatsapp_provider_order(settings: Settings) -> list[str]:
    """Resolve WhatsApp delivery backends in priority order."""
    if settings.whatsapp_provider == "pywhatkit":
        return ["pywhatkit"]
    if settings.whatsapp_provider == "twilio":
        return ["twilio", "meta"]
    if settings.whatsapp_provider == "meta":
        return ["meta", "twilio"]
    if settings.whatsapp_provider == "wapblaster":
        return ["wapblaster"]
    order: list[str] = []
    if is_pywhatkit_configured(settings):
        order.append("pywhatkit")
    if is_wapblaster_configured(settings):
        order.append("wapblaster")
    if is_twilio_whatsapp_configured(settings):
        order.append("twilio")
    if is_meta_whatsapp_configured(settings):
        order.append("meta")
    return order


def resolves_to_whatsapp_notifications(settings: Settings) -> bool:
    if settings.notification_channel == "sms":
        return False
    return bool(whatsapp_provider_order(settings))


def is_aws_sns_configured(settings: Settings) -> bool:
    return bool(settings.aws_region and settings.aws_access_key_id and settings.aws_secret_access_key)


def is_livekit_configured(settings: Settings) -> bool:
    return bool(settings.livekit_url and settings.livekit_api_key and settings.livekit_api_secret)


def check_meta_whatsapp_health(settings: Settings | None = None) -> dict[str, Any]:
    """Verify Meta Cloud API token and phone number (no secrets returned)."""
    s = settings or get_settings()
    if not is_meta_whatsapp_configured(s):
        return {"configured": False, "valid": None}

    import httpx

    url = f"{s.whatsapp_api_url.rstrip('/')}/{s.whatsapp_phone_number_id}"
    try:
        response = httpx.get(
            url,
            params={"fields": "display_phone_number,verified_name"},
            headers={"Authorization": f"Bearer {s.whatsapp_access_token}"},
            timeout=15,
        )
    except httpx.HTTPError as exc:
        return {"configured": True, "valid": False, "error": str(exc)}

    if response.status_code == 200:
        data = response.json()
        return {
            "configured": True,
            "valid": True,
            "display_phone_number": data.get("display_phone_number"),
            "verified_name": data.get("verified_name"),
        }

    error_msg = response.text
    try:
        error_msg = response.json().get("error", {}).get("message", error_msg)
    except ValueError:
        pass
    return {"configured": True, "valid": False, "error": error_msg}


def get_public_frontend_url(settings: Settings | None = None) -> str:
    """Public URL for links in emails (falls back to FRONTEND_URL)."""
    s = settings or get_settings()
    return (s.public_frontend_url or s.frontend_url).rstrip("/")


def get_cors_origins(settings: Settings | None = None) -> list[str]:
    """Browser origins permitted for cross-origin API requests."""
    s = settings or get_settings()
    origins: list[str] = [
        s.frontend_url.rstrip("/"),
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]
    if s.public_frontend_url:
        origins.append(s.public_frontend_url.rstrip("/"))
    if s.cors_allowed_origins:
        for origin in s.cors_allowed_origins.split(","):
            cleaned = origin.strip().rstrip("/")
            if cleaned:
                origins.append(cleaned)
    seen: set[str] = set()
    unique: list[str] = []
    for origin in origins:
        if origin not in seen:
            seen.add(origin)
            unique.append(origin)
    return unique


def get_public_api_base_url(settings: Settings | None = None) -> str | None:
    s = settings or get_settings()
    if not s.public_api_base_url:
        return None
    return s.public_api_base_url.rstrip("/")


def get_doctor_approval_link_url(settings: Settings | None = None) -> str:
    """Base URL for one-click doctor approval links (defaults to FRONTEND_URL for local dev)."""
    s = settings or get_settings()
    return (s.doctor_approval_link_url or s.frontend_url).rstrip("/")


def settings_summary(settings: Settings | None = None) -> dict[str, object]:
    """Non-secret snapshot for health/debug endpoints."""
    s = settings or get_settings()
    return {
        "runtime": s.runtime,
        "node_env": s.node_env,
        "demo_mode": s.demo_mode,
        "hvts_test_mode": s.hvts_test_mode,
        "mysql_host": s.mysql_host,
        "mysql_db": s.mysql_db,
        "frontend_url": s.frontend_url,
        "twilio_configured": is_twilio_configured(s),
        "notification_channel": s.notification_channel,
        "whatsapp_provider": s.whatsapp_provider,
        "meta_whatsapp_configured": is_meta_whatsapp_configured(s),
        "meta_whatsapp_valid": check_meta_whatsapp_health(s).get("valid"),
        "wapblaster_configured": is_wapblaster_configured(s),
        "pywhatkit_central_phone": s.pywhatkit_central_phone,
        "whatsapp_notifications": resolves_to_whatsapp_notifications(s),
        "livekit_configured": is_livekit_configured(s),
        "delivery_module_enabled": s.delivery_module_enabled,
        "env_file_used": _ENV_FILE.is_file() and not is_lambda_runtime(),
    }
