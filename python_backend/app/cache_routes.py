"""APIRoute that caches successful JSON GET responses per caller in Redis."""

import hashlib
from collections.abc import Callable, Coroutine
from typing import Any

from fastapi import Request, Response
from fastapi.routing import APIRoute
from starlette.concurrency import run_in_threadpool

from app.cache import cache_get_json, cache_set_json, is_miss, make_key
from app.cache_invalidation import ANALYTICS_CACHE_TTL_SECONDS


def _caller_fingerprint(request: Request) -> str:
    """Responses are only ever replayed to the exact credentials that produced them."""
    raw = "|".join(
        (
            request.headers.get("authorization", ""),
            request.headers.get("x-demo-user-id", ""),
        )
    )
    return hashlib.sha256(raw.encode()).hexdigest()[:32]


def _request_key(namespace: str, request: Request) -> str:
    query = "&".join(f"{k}={v}" for k, v in sorted(request.query_params.multi_items()))
    path_and_query = hashlib.sha256(f"{request.url.path}?{query}".encode()).hexdigest()[:32]
    return make_key(namespace, _caller_fingerprint(request), path_and_query)


class CachedGetRoute(APIRoute):
    cache_namespace = "analytics"
    cache_ttl_seconds = ANALYTICS_CACHE_TTL_SECONDS

    def get_route_handler(self) -> Callable[[Request], Coroutine[Any, Any, Response]]:
        original = super().get_route_handler()

        async def handler(request: Request) -> Response:
            if request.method != "GET":
                return await original(request)

            key = _request_key(self.cache_namespace, request)
            hit = await run_in_threadpool(cache_get_json, key)
            if not is_miss(hit) and isinstance(hit, dict) and "body" in hit:
                return Response(
                    content=hit["body"],
                    media_type="application/json",
                    headers={"X-Cache": "HIT"},
                )

            response = await original(request)
            content_type = response.headers.get("content-type", "")
            body = getattr(response, "body", None)
            if response.status_code == 200 and content_type.startswith("application/json") and body:
                await run_in_threadpool(
                    cache_set_json, key, {"body": body.decode("utf-8")}, self.cache_ttl_seconds
                )
                response.headers["X-Cache"] = "MISS"
            return response

        return handler
