import unittest
from datetime import datetime, timezone
from unittest.mock import MagicMock, patch

from app.services.analytics_service import AnalyticsService


class AnalyticsHelperTests(unittest.TestCase):
    def setUp(self) -> None:
        self.db = MagicMock()
        self.service = AnalyticsService(self.db)

    def test_today_bounds_utc(self) -> None:
        start, end = self.service._today_bounds()
        self.assertEqual(start.hour, 0)
        self.assertEqual(start.minute, 0)
        self.assertEqual(end.hour, 23)
        self.assertEqual(end.minute, 59)
        self.assertLessEqual(start, end)

    def test_duration_summary_empty(self) -> None:
        query = MagicMock()
        query.filter.return_value = query
        query.all.return_value = []
        result = self.service._duration_summary(query)
        self.assertEqual(result["count"], 0)
        self.assertEqual(result["avgMinutes"], 0)

    def test_duration_summary_with_visits(self) -> None:
        query = MagicMock()
        query.filter.return_value = query
        visit_a = MagicMock(totalDurationMinutes=60)
        visit_b = MagicMock(totalDurationMinutes=120)
        query.all.return_value = [visit_a, visit_b]
        result = self.service._duration_summary(query)
        self.assertEqual(result["count"], 2)
        self.assertEqual(result["avgMinutes"], 90)
        self.assertEqual(result["minMinutes"], 60)
        self.assertEqual(result["maxMinutes"], 120)


class AnalyticsDepartmentOverviewTests(unittest.TestCase):
    def setUp(self) -> None:
        self.db = MagicMock()
        self.service = AnalyticsService(self.db)

    @patch.object(AnalyticsService, "_today_bounds")
    @patch.object(AnalyticsService, "_appointment_status_breakdown", return_value={"APPROVED": 2})
    @patch.object(AnalyticsService, "_duration_summary", return_value={"avgMinutes": 45, "minMinutes": 30, "maxMinutes": 60, "count": 1})
    def test_get_department_overview(
        self,
        _mock_duration: MagicMock,
        _mock_breakdown: MagicMock,
        mock_today: MagicMock,
    ) -> None:
        today = datetime(2026, 6, 6, tzinfo=timezone.utc)
        mock_today.return_value = (
            today.replace(hour=0, minute=0, second=0),
            today.replace(hour=23, minute=59, second=59),
        )

        dept = MagicMock()
        dept.name = "Cardiology"
        self.db.get.return_value = dept

        sub_count_query = MagicMock()
        sub_count_query.filter.return_value.count.return_value = 2
        staff_count_query = MagicMock()
        staff_count_query.filter.return_value.count.return_value = 5

        visit_query = MagicMock()
        appt_q = MagicMock()
        visit_query.filter.return_value = appt_q

        today_q = MagicMock()
        today_q.count.return_value = 3
        pending_q = MagicMock()
        pending_q.count.return_value = 1
        active_q = MagicMock()
        active_q.count.return_value = 2
        completed_q = MagicMock()
        completed_q.count.return_value = 4
        appt_q.filter.side_effect = [today_q, pending_q, active_q, completed_q]

        self.db.query.side_effect = [sub_count_query, staff_count_query, visit_query]

        result = self.service.get_department_overview("dept-1")
        self.assertEqual(result["departmentName"], "Cardiology")
        self.assertEqual(result["todayAppointments"], 3)
        self.assertEqual(result["completedAppointments"], 4)
        self.assertIn("statusBreakdown", result)
        self.assertIn("visitDuration", result)


class AnalyticsSubDepartmentOverviewTests(unittest.TestCase):
    def setUp(self) -> None:
        self.db = MagicMock()
        self.service = AnalyticsService(self.db)

    @patch.object(AnalyticsService, "_today_bounds")
    @patch.object(AnalyticsService, "_appointment_status_breakdown", return_value={})
    @patch.object(AnalyticsService, "_duration_summary", return_value={"avgMinutes": 0, "minMinutes": 0, "maxMinutes": 0, "count": 0})
    def test_get_sub_department_overview_excludes_sub_department_admin_from_staff_count(
        self,
        _mock_duration: MagicMock,
        _mock_breakdown: MagicMock,
        mock_today: MagicMock,
    ) -> None:
        today = datetime(2026, 6, 6, tzinfo=timezone.utc)
        mock_today.return_value = (
            today.replace(hour=0, minute=0, second=0),
            today.replace(hour=23, minute=59, second=59),
        )

        sub = MagicMock()
        sub.name = "Critical ICU"
        self.db.get.return_value = sub

        staff_count_query = MagicMock()
        staff_count_query.filter.return_value.count.return_value = 0
        doctor_count_query = MagicMock()
        doctor_count_query.filter.return_value.count.return_value = 0

        visit_query = MagicMock()
        appt_q = MagicMock()
        visit_query.filter.return_value = appt_q

        today_q = MagicMock()
        today_q.count.return_value = 0
        pending_q = MagicMock()
        pending_q.count.return_value = 0
        active_q = MagicMock()
        active_q.count.return_value = 0
        completed_q = MagicMock()
        completed_q.count.return_value = 0
        appt_q.filter.side_effect = [today_q, pending_q, active_q, completed_q]

        self.db.query.side_effect = [staff_count_query, doctor_count_query, visit_query]

        result = self.service.get_sub_department_overview("sub-1")

        self.assertEqual(result["staffCount"], 0)
        self.assertEqual(result["subDepartmentName"], "Critical ICU")
        staff_count_query.filter.assert_called()


if __name__ == "__main__":
    unittest.main()
