import time
import unittest
from unittest.mock import MagicMock, patch

import redis
from fastapi import APIRouter, FastAPI, HTTPException
from fastapi.testclient import TestClient
from jose import jwt
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app import cache
from app.cache_invalidation import REFERENCE_NAMESPACE, user_cache_key
from app.cache_routes import CachedGetRoute
from app.config import get_settings
from app.dependencies.auth import get_current_user
from app.models import Branch, Department, HospitalChain, SubDepartment, User
from app.services.rate_limit_service import RateLimitService


class FakeRedis:
    def __init__(self) -> None:
        self.data: dict[str, str] = {}
        self.ttls: dict[str, int] = {}

    def get(self, key):
        return self.data.get(key)

    def set(self, key, value, ex=None):
        self.data[key] = value
        if ex:
            self.ttls[key] = ex

    def delete(self, *keys):
        for key in keys:
            self.data.pop(key, None)

    def incr(self, key):
        self.data[key] = str(int(self.data.get(key, "0")) + 1)
        return int(self.data[key])

    def ttl(self, key):
        return self.ttls.get(key, -1)

    def expire(self, key, seconds):
        self.ttls[key] = seconds

    def pipeline(self, transaction=True):
        return FakePipeline(self)


class FakePipeline:
    def __init__(self, client: FakeRedis) -> None:
        self.client = client
        self.calls: list = []

    def __getattr__(self, name):
        def queue(*args, **kwargs):
            self.calls.append((name, args, kwargs))
            return self

        return queue

    def execute(self):
        return [getattr(self.client, name)(*args, **kwargs) for name, args, kwargs in self.calls]


class BrokenRedis:
    def get(self, key):
        raise redis.ConnectionError("down")


class CacheTestCase(unittest.TestCase):
    def setUp(self) -> None:
        cache.reset_redis_state()
        self.fake = FakeRedis()
        patcher = patch("app.cache.get_redis", return_value=self.fake)
        patcher.start()
        self.addCleanup(patcher.stop)


class RememberTests(CacheTestCase):
    def test_loader_runs_once_until_namespace_bumped(self) -> None:
        loader = MagicMock(return_value=[{"id": "b1"}])

        first = cache.remember_in_namespace("ref", ("branches",), 60, loader)
        second = cache.remember_in_namespace("ref", ("branches",), 60, loader)
        self.assertEqual(first, second)
        self.assertEqual(loader.call_count, 1)

        cache.bump_namespace("ref")
        cache.remember_in_namespace("ref", ("branches",), 60, loader)
        self.assertEqual(loader.call_count, 2)

    def test_errors_from_loader_are_not_cached(self) -> None:
        loader = MagicMock(side_effect=HTTPException(status_code=404))
        for _ in range(2):
            with self.assertRaises(HTTPException):
                cache.remember("k", 60, loader)
        self.assertEqual(loader.call_count, 2)


class FailOpenTests(unittest.TestCase):
    def tearDown(self) -> None:
        cache.reset_redis_state()

    def test_redis_outage_falls_through_and_backs_off(self) -> None:
        cache.reset_redis_state()
        settings = MagicMock(cache_enabled=True, redis_url="rediss://x", cache_key_prefix="t")
        with patch("app.cache.get_settings", return_value=settings), patch(
            "app.cache.redis.Redis.from_url", return_value=BrokenRedis()
        ) as from_url:
            self.assertEqual(cache.remember("k", 60, lambda: "db"), "db")
            self.assertIsNone(cache.get_redis())
            self.assertEqual(from_url.call_count, 1)


class RateLimitTests(CacheTestCase):
    def test_redis_counter_blocks_after_limit(self) -> None:
        request = MagicMock()
        request.client.host = "1.2.3.4"
        settings = MagicMock(rate_limit_skip_in_test_mode=False, cache_key_prefix="t")
        with patch("app.services.rate_limit_service.get_settings", return_value=settings), patch(
            "app.cache.get_settings", return_value=settings
        ):
            service = RateLimitService()
            service.check_action_rate_limit(request, "act", limit=2, window_seconds=60)
            service.check_action_rate_limit(request, "act", limit=2, window_seconds=60)
            with self.assertRaises(HTTPException) as ctx:
                service.check_action_rate_limit(request, "act", limit=2, window_seconds=60)
        self.assertEqual(ctx.exception.status_code, 429)
        self.assertEqual(self.fake.ttls["t:rl:act:1.2.3.4"], 60)


class CurrentUserCacheTests(CacheTestCase):
    def test_second_request_skips_database(self) -> None:
        token = jwt.encode({"sub": "u1", "exp": int(time.time()) + 60}, get_settings().jwt_secret, algorithm="HS256")
        credentials = MagicMock(credentials=token)
        user = User(id="u1", name="Asha", phone="9000000001", role="STAFF", isActive=True)
        db = MagicMock()
        db.get.return_value = user

        first = get_current_user(MagicMock(), credentials, db)
        second = get_current_user(MagicMock(), credentials, db)

        self.assertEqual(first, second)
        self.assertEqual(second["name"], "Asha")
        self.assertEqual(db.get.call_count, 1)


class InvalidationTests(CacheTestCase):
    def setUp(self) -> None:
        super().setUp()
        engine = create_engine("sqlite://")
        tables = [m.__table__ for m in (HospitalChain, Branch, Department, SubDepartment, User)]
        User.metadata.create_all(engine, tables=tables)
        self.session = sessionmaker(bind=engine)()
        self.session.add(User(id="u1", name="Asha", phone="9000000001", role="STAFF", isActive=True))
        self.session.commit()
        self.fake.data.clear()
        self.fake.set(user_cache_key("u1"), '{"id": "u1"}')

    def tearDown(self) -> None:
        self.session.close()

    def _ref_version(self) -> str:
        return cache.namespace_version(REFERENCE_NAMESPACE)

    def test_profile_change_clears_user_and_reference_cache(self) -> None:
        self.session.get(User, "u1").isActive = False
        self.session.commit()
        self.assertIsNone(self.fake.get(user_cache_key("u1")))
        self.assertEqual(self._ref_version(), "1")

    def test_otp_only_change_keeps_cache(self) -> None:
        self.session.get(User, "u1").otp = "hash"
        self.session.commit()
        self.assertIsNotNone(self.fake.get(user_cache_key("u1")))
        self.assertEqual(self._ref_version(), "0")

    def test_rollback_discards_pending_invalidation(self) -> None:
        self.session.get(User, "u1").name = "Changed"
        self.session.flush()
        self.session.rollback()
        self.session.commit()
        self.assertIsNotNone(self.fake.get(user_cache_key("u1")))


class CachedGetRouteTests(CacheTestCase):
    def setUp(self) -> None:
        super().setUp()
        self.calls = 0
        router = APIRouter(route_class=CachedGetRoute)

        @router.get("/stats")
        def stats(period: str = "weekly"):
            self.calls += 1
            return {"period": period, "calls": self.calls}

        @router.get("/boom")
        def boom():
            self.calls += 1
            raise HTTPException(status_code=500)

        app = FastAPI()
        app.include_router(router)
        self.client = TestClient(app, raise_server_exceptions=False)

    def test_replays_only_for_same_caller_and_query(self) -> None:
        alice = {"Authorization": "Bearer alice"}
        first = self.client.get("/stats", headers=alice)
        second = self.client.get("/stats", headers=alice)
        self.assertEqual(first.json(), second.json())
        self.assertEqual(second.headers["X-Cache"], "HIT")
        self.assertEqual(self.calls, 1)

        self.client.get("/stats", headers={"Authorization": "Bearer bob"})
        self.client.get("/stats?period=daily", headers=alice)
        self.assertEqual(self.calls, 3)

    def test_errors_are_not_cached(self) -> None:
        self.client.get("/boom")
        self.client.get("/boom")
        self.assertEqual(self.calls, 2)


if __name__ == "__main__":
    unittest.main()
