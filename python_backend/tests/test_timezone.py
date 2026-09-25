import unittest
from datetime import datetime, timezone

from app.utils.timezone import (
    IST,
    naive_ist_to_utc,
    now_ist,
    parse_to_ist_naive,
    today_start_ist,
)


class TimezoneTests(unittest.TestCase):
    def test_parse_utc_iso_to_ist_naive(self) -> None:
        # 14:30 UTC = 20:00 IST
        result = parse_to_ist_naive("2026-06-11T14:30:00.000Z")
        self.assertEqual(result, datetime(2026, 6, 11, 20, 0, 0))

    def test_parse_ist_offset_iso(self) -> None:
        result = parse_to_ist_naive("2026-06-11T20:00:00+05:30")
        self.assertEqual(result, datetime(2026, 6, 11, 20, 0, 0))

    def test_naive_ist_to_utc(self) -> None:
        utc = naive_ist_to_utc(datetime(2026, 6, 11, 20, 0, 0))
        self.assertEqual(utc, datetime(2026, 6, 11, 14, 30, tzinfo=timezone.utc))

    def test_now_ist_is_naive(self) -> None:
        current = now_ist()
        self.assertIsNone(current.tzinfo)

    def test_today_start_ist_midnight(self) -> None:
        start = today_start_ist()
        self.assertEqual(start.hour, 0)
        self.assertEqual(start.minute, 0)
        # Sanity: IST now should be same calendar day as start
        self.assertEqual(start.date(), now_ist().date())


if __name__ == "__main__":
    unittest.main()
