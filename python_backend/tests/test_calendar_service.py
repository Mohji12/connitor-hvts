import unittest
from datetime import datetime, timezone

from app.services.calendar_service import (
    AppointmentCalendarDetails,
    build_google_calendar_add_url,
    build_ics_content,
)


def _sample_details(*, status: str = "tentative", sequence: int = 0) -> AppointmentCalendarDetails:
    return AppointmentCalendarDetails(
        visit_id="visit-12345678-1234-1234-1234-123456789abc",
        visitor_email="visitor@example.com",
        visitor_name="Rahul Mehta",
        doctor_name="Dr. Arjun Desai",
        hospital_name="Apollo Chennai",
        hospital_address="123 Main St, Chennai, TN, 600001, India",
        department_name="Cardiology",
        sub_department_name="ICU Cardiology",
        appointment_date=datetime(2026, 6, 10, 10, 0, tzinfo=timezone.utc),
        purpose="Follow-up consultation",
        status=status,  # type: ignore[arg-type]
        sequence=sequence,
    )


class CalendarServiceTests(unittest.TestCase):
    def test_build_ics_contains_core_fields(self) -> None:
        ics = build_ics_content(_sample_details())
        self.assertIn("BEGIN:VCALENDAR", ics)
        self.assertIn("METHOD:REQUEST", ics)
        self.assertIn("STATUS:TENTATIVE", ics)
        self.assertIn("visitor@example.com", ics)
        self.assertIn("Dr. Arjun Desai", ics)
        self.assertIn("Apollo Chennai", ics)
        self.assertIn("visit-12345678-1234-1234-1234-123456789abc@connitor.app", ics)

    def test_build_ics_confirmed_increments_sequence(self) -> None:
        ics = build_ics_content(_sample_details(status="confirmed", sequence=1))
        self.assertIn("SEQUENCE:1", ics)
        self.assertIn("STATUS:CONFIRMED", ics)

    def test_build_ics_cancelled(self) -> None:
        ics = build_ics_content(_sample_details(status="cancelled", sequence=2))
        self.assertIn("METHOD:CANCEL", ics)
        self.assertIn("STATUS:CANCELLED", ics)

    def test_build_ics_online_includes_meeting_link(self) -> None:
        details = _sample_details(status="confirmed", sequence=1)
        details = AppointmentCalendarDetails(
            **{**details.__dict__, "appointment_mode": "ONLINE", "meeting_join_url": "https://app.example.com/meet/?t=123"}
        )
        ics = build_ics_content(details)
        self.assertIn("Online video consultation", ics)
        self.assertIn("https://app.example.com/meet/?t=123", ics)

    def test_google_calendar_add_url(self) -> None:
        url = build_google_calendar_add_url(_sample_details())
        self.assertIn("calendar.google.com", url)
        self.assertIn("action=TEMPLATE", url)
        self.assertIn("Dr.+Arjun+Desai", url)


if __name__ == "__main__":
    unittest.main()
