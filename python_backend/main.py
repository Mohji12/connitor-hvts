import logging
import os
import threading
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException
from mangum import Mangum

from app.config import get_settings, is_lambda_runtime, settings_summary, check_meta_whatsapp_health, get_cors_origins
from app.routers import api_router

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(_app: FastAPI):
    settings = get_settings()

    if os.environ.get("TEST_MODE", "").lower() in ("1", "true", "yes"):
        logger.warning(
            "System env TEST_MODE is set; email uses HVTS_TEST_MODE=%s from .env instead",
            settings.hvts_test_mode,
        )

    logger.info(
        "Hospital Visitor Tracking System API started (%s) on http://%s:%s",
        "lambda" if is_lambda_runtime() else "local",
        settings.host if settings.host != "0.0.0.0" else "localhost",
        settings.port,
    )

    meta_health = check_meta_whatsapp_health(settings)
    if meta_health.get("configured") and meta_health.get("valid") is False:
        logger.error(
            "Meta WhatsApp token is invalid or expired: %s. "
            "Update WHATSAPP_ACCESS_TOKEN in .env — notifications will fall back to SMS where possible.",
            meta_health.get("error", "unknown error"),
        )
    elif meta_health.get("valid"):
        logger.info(
            "Meta WhatsApp ready (%s)",
            meta_health.get("display_phone_number") or meta_health.get("verified_name"),
        )

    expire_thread = None
    if not is_lambda_runtime():
        expire_thread = threading.Thread(
            target=_sales_meeting_expire_loop,
            name="sales-meeting-expire",
            daemon=True,
        )
        expire_thread.start()

    yield

    _sales_meeting_stop.set()


_sales_meeting_stop = threading.Event()


def _sales_meeting_expire_loop() -> None:
    from app.services.sales_meeting_dispatch import dispatch_auto_expire_and_notify

    while not _sales_meeting_stop.wait(300):
        try:
            result = dispatch_auto_expire_and_notify()
            expired = result.get("expired") or 0
            if expired:
                logger.info("Sales meeting auto-expire: %s visit(s)", expired)
        except Exception:
            logger.exception("Sales meeting auto-expire loop failed")


app = FastAPI(
    title="Hospital Visitor Tracking System API",
    description="Python FastAPI Backend",
    version="1.0.0",
    lifespan=lifespan,
    redirect_slashes=True,
)

settings = get_settings()

app.add_middleware(
    CORSMiddleware,
    allow_origins=get_cors_origins(settings),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix="/api")


@app.get("/")
def root():
    return {
        "message": "Welcome to the Hospital Visitor Tracking System API",
        "api": "/api",
        "docs": "/docs",
        "openapi": "/openapi.json",
        "config": settings_summary(),
    }


@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(
    _request: Request,
    exc: StarletteHTTPException,
):
    detail = exc.detail
    message = detail if isinstance(detail, str) else str(detail)

    body = {
        "statusCode": exc.status_code,
        "message": message,
    }

    if isinstance(detail, str) and detail.isupper() and "_" in detail:
        body["error"] = detail
        body["message"] = "Error"

    if isinstance(detail, dict):
        body = {**detail, "statusCode": exc.status_code, "message": str(detail.get("message", "Error"))}

    return JSONResponse(
        status_code=exc.status_code,
        content=body,
    )


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(
    _request: Request,
    exc: RequestValidationError,
):
    return JSONResponse(
        status_code=422,
        content={
            "statusCode": 422,
            "message": str(exc.errors()),
            "error": "Validation Error",
        },
    )


# Lambda Handler
_mangum = Mangum(app)


def handler(event, context):
    """Support EventBridge scheduled auto-expire plus HTTP via Mangum."""
    if isinstance(event, dict) and (
        event.get("source") == "aws.events" or event.get("detail-type") == "Scheduled Event"
    ):
        from app.services.sales_meeting_dispatch import dispatch_auto_expire_and_notify

        result = dispatch_auto_expire_and_notify()
        logger.info("EventBridge sales meeting auto-expire: %s", result)
        return {"ok": True, **result}
    return _mangum(event, context)


# Local Development
if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "main:app",
        host=settings.host,
        port=settings.port,
        reload=True,
    )