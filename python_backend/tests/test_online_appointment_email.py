import unittest

from app.email_templates import build_online_appointment_email


class OnlineAppointmentEmailTests(unittest.TestCase):
    def test_visitor_email_contains_join_link(self) -> None:
        join_url = "https://app.example.com/meet/?t=guest-token"
        subject, text_body, html_body = build_online_appointment_email(
            recipient_name="Rahul Mehta",
            doctor_name="Dr. Arjun Desai",
            appointment_date="10 Jun 2026 10:00",
            meeting_url=join_url,
            doctor_feedback="Please join 5 minutes early.",
            is_host=False,
        )

        self.assertIn("video consultation link", subject)
        self.assertIn(join_url, text_body)
        self.assertIn(join_url, html_body)
        self.assertIn("Join Video Consultation", html_body)
        self.assertIn("Please join 5 minutes early.", text_body)
        self.assertNotIn("Start Consultation", html_body)
        self.assertNotIn("Zoom", text_body + html_body)

    def test_doctor_email_contains_host_link(self) -> None:
        start_url = "https://app.example.com/meet/?t=host-token"
        _subject, text_body, html_body = build_online_appointment_email(
            recipient_name="Dr. Arjun Desai",
            doctor_name="Dr. Arjun Desai",
            appointment_date="10 Jun 2026 10:00",
            meeting_url=start_url,
            is_host=True,
        )

        self.assertIn(start_url, text_body)
        self.assertIn(start_url, html_body)
        self.assertIn("Start Consultation", html_body)


if __name__ == "__main__":
    unittest.main()
