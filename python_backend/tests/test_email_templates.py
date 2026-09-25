import unittest

from app.email_templates import (
    build_attendant_pass_email,
    build_booking_confirmation_email,
    build_check_in_otp_email,
    build_delivery_assignment_email,
    build_gate_pass_email,
    build_notification_email,
    build_sales_meeting_confirm_email,
    build_sales_meeting_outcome_email,
    build_visit_extension_email,
)


class EmailTemplateTests(unittest.TestCase):
    def test_notification_email_includes_title_and_message(self) -> None:
        subject, text, html = build_notification_email("New Request", "Patient John booked.")
        self.assertIn("New Request", subject)
        self.assertIn("Patient John booked.", text)
        self.assertIn("Patient John booked.", html)

    def test_check_in_otp_email_includes_code(self) -> None:
        subject, text, html = build_check_in_otp_email(
            "123456",
            visitor_name="Jane Doe",
            doctor_name="Dr. Smith",
            appointment_date="10 Jun 2026 14:00",
        )
        self.assertIn("123456", text)
        self.assertIn("123456", html)
        self.assertIn("Dr. Smith", text)

    def test_booking_confirmation_email_includes_status(self) -> None:
        subject, text, html = build_booking_confirmation_email(
            visitor_name="Jane Doe",
            doctor_name="Dr. Smith",
            appointment_date="10 Jun 2026 14:00",
            hospital_name="Apollo Chennai",
            booking_id="visit-123",
            department_name="Cardiology",
        )
        self.assertIn("Appointment request received", subject)
        self.assertIn("Awaiting doctor approval", text)
        self.assertIn("visit-123", text)
        self.assertIn("Cardiology", html)

    def test_gate_pass_email_includes_qr_and_otp(self) -> None:
        subject, text, html = build_gate_pass_email(
            visitor_name="Jane Doe",
            doctor_name="Dr. Smith",
            appointment_date="10 Jun 2026 14:00",
            check_in_otp="654321",
            qr_cid="checkin-qr",
        )
        self.assertIn("654321", text)
        self.assertIn("654321", html)
        self.assertIn('src="cid:checkin-qr"', html)

    def test_gate_pass_email_includes_pass_id(self) -> None:
        _subject, text, html = build_gate_pass_email(
            visitor_name="Jane Doe",
            doctor_name="Dr. Smith",
            appointment_date="10 Jun 2026 14:00",
            check_in_otp="654321",
            visitor_pass_id="ELC-260816-0042",
        )
        self.assertIn("Pass ID: ELC-260816-0042", text)
        self.assertIn("ELC-260816-0042", html)
        self.assertIn("show this to security", html.lower())

    def test_delivery_assignment_email_includes_address_and_qr(self) -> None:
        subject, text, html = build_delivery_assignment_email(
            driver_name="Ravi",
            delivery_number="DEL-0001",
            goods_type="Medical supplies",
            total_boxes=4,
            vehicle_number="KA01AB1234",
            vendor_name="City Pharma",
            arrival_label="16 Jul 2026 10:00",
            hospital_name="Apollo Chennai",
            hospital_address="100 Mount Road, Chennai, TN, 600002",
            hospital_phone="0441234567",
            maps_url="https://www.google.com/maps/search/?api=1&query=Apollo",
            remarks="Call security on arrival",
            qr_cid="delivery-checkin-qr",
            qr_expires_at="18 Jul 2026 10:00",
        )
        self.assertIn("DEL-0001", subject)
        self.assertIn("100 Mount Road", text)
        self.assertIn("Call security on arrival", text)
        self.assertIn("no app login required", html.lower())
        self.assertIn('src="cid:delivery-checkin-qr"', html)
        self.assertNotIn("driver dashboard", text.lower())
        self.assertNotIn("driver dashboard", html.lower())

    def test_attendant_pass_email_includes_govt_id_instruction(self) -> None:
        subject, text, html = build_attendant_pass_email(
            attendant_name="Anita",
            pass_number="AP-9",
            patient_first_name="Ravi",
            hospital_name="Apollo",
            hospital_address="Mount Road",
            hospital_phone="044",
            valid_until="17 Jul 2026 12:00",
            qr_cid="attendant-pass-qr",
        )
        self.assertIn("AP-9", subject)
        self.assertIn("government id", text.lower())
        self.assertIn('src="cid:attendant-pass-qr"', html)

    def test_sales_meeting_confirm_email_has_action_buttons(self) -> None:
        subject, text, html = build_sales_meeting_confirm_email(
            visitor_name="Priya Shah",
            doctor_name="Dr. Arjun",
            slot_time="16 Aug 2026 10:00",
            pass_id="visit-1",
            started_url="http://localhost:3000/confirm-meeting?status=started",
            not_attended_url="http://localhost:3000/confirm-meeting?status=not_attended",
        )
        self.assertIn("Confirm your meeting attendance", subject)
        self.assertIn("Meeting started", text)
        self.assertIn("Meeting Started", html)
        self.assertIn("Meeting Not Attended", html)
        self.assertIn("visit-1", html)

    def test_sales_meeting_outcome_email_includes_result(self) -> None:
        subject, text, html = build_sales_meeting_outcome_email(
            visitor_name="Priya Shah",
            doctor_name="Dr. Arjun",
            slot_time="16 Aug 2026 10:00",
            pass_id="visit-1",
            outcome="Meeting started",
        )
        self.assertIn("Sales visit attendance", subject)
        self.assertIn("Meeting started", text)
        self.assertIn("visit-1", html)

    def test_visit_extension_email_includes_link(self) -> None:
        _subject, text, html = build_visit_extension_email(
            doctor_name="Priya",
            visitor_name="Rahul",
            expected_end="16 Aug 2026 10:29",
            extend_url="https://app.example/extend-visit?visitId=v1&token=abc",
        )
        self.assertIn("one-time link", text)
        self.assertIn("Rahul", text)
        self.assertIn("extend-visit", html)


if __name__ == "__main__":
    unittest.main()
