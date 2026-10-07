from unittest.mock import MagicMock, patch

from app.config import Settings, is_wapblaster_configured


def test_is_wapblaster_configured_when_base_vendor_token_set() -> None:
    s = Settings(
        WAPBLASTER_API_BASE="https://www.wapblaster.com/api",
        WAPBLASTER_VENDOR_UID="uid",
        WAPBLASTER_ACCESS_TOKEN="tok",
        WHATSAPP_API_URL="https://www.wapblaster.com/api",
    )
    assert is_wapblaster_configured(s) is True


def test_template_param_strips_newlines() -> None:
    from app.services.wapblaster_client import truncate_utility_param

    assert "\n" not in truncate_utility_param("Approved.\n\nVisitor is ready.")
    assert truncate_utility_param("Approved.\n\nVisitor is ready.").startswith("Approved.")


@patch("app.services.wapblaster_client.httpx.post")
def test_send_wapblaster_text_uses_bearer_and_documented_body(mock_post: MagicMock) -> None:
    from app.services.wapblaster_client import send_wapblaster_text

    response = MagicMock()
    response.status_code = 200
    mock_post.return_value = response

    with patch("app.services.wapblaster_client.get_settings") as mock_settings:
        mock_settings.return_value = Settings(
            HVTS_TEST_MODE=False,
            WHATSAPP_PROVIDER="wapblaster",
            WAPBLASTER_API_BASE="https://www.wapblaster.com/api",
            WAPBLASTER_VENDOR_UID="b9e95286-adfd-48d1-a4c4-d24a1e588bd6",
            WAPBLASTER_ACCESS_TOKEN="test-token",
        )
        send_wapblaster_text("+919876543210", "Hello, thanks for contacting us.")

    mock_post.assert_called_once()
    args, kwargs = mock_post.call_args
    assert args[0].endswith("/b9e95286-adfd-48d1-a4c4-d24a1e588bd6/contact/send-message")
    assert kwargs["headers"]["Authorization"] == "Bearer test-token"
    assert kwargs["json"] == {
        "phone_number": "919876543210",
        "message_body": "Hello, thanks for contacting us.",
    }


@patch("app.services.wapblaster_client.httpx.post")
def test_send_wapblaster_template_uses_field_placeholders(mock_post: MagicMock) -> None:
    from app.services.wapblaster_client import send_wapblaster_template

    response = MagicMock()
    response.status_code = 200
    mock_post.return_value = response

    with patch("app.services.wapblaster_client.get_settings") as mock_settings:
        mock_settings.return_value = Settings(
            HVTS_TEST_MODE=False,
            WHATSAPP_PROVIDER="wapblaster",
            WAPBLASTER_API_BASE="https://www.wapblaster.com/api",
            WAPBLASTER_VENDOR_UID="vendor-uid",
            WAPBLASTER_ACCESS_TOKEN="test-token",
        )
        send_wapblaster_template(
            "+918625877312",
            template_name="conninter_notification",
            template_language="en_GB",
            fields=["Connitor", "Visitor", "26 Sep", "10:00", "Approved"],
        )

    mock_post.assert_called_once()
    args, kwargs = mock_post.call_args
    assert args[0].endswith("/vendor-uid/contact/send-template-message")
    assert kwargs["json"]["template_name"] == "conninter_notification"
    assert kwargs["json"]["template_language"] == "en_GB"
    assert kwargs["json"]["field_1"] == "Connitor"
    assert kwargs["json"]["field_5"] == "Approved"


@patch("app.services.wapblaster_client.httpx.post")
def test_appointment_approval_confirmation_template_body_only(mock_post: MagicMock) -> None:
    from app.services.wapblaster_client import send_wapblaster_appointment_approval

    response = MagicMock()
    response.status_code = 200
    mock_post.return_value = response

    with patch("app.services.wapblaster_client.get_settings") as mock_settings:
        mock_settings.return_value = Settings(
            HVTS_TEST_MODE=False,
            WHATSAPP_PROVIDER="wapblaster",
            WAPBLASTER_API_BASE="https://www.wapblaster.com/api",
            WAPBLASTER_VENDOR_UID="vendor-uid",
            WAPBLASTER_ACCESS_TOKEN="test-token",
        )
        send_wapblaster_appointment_approval(
            "+918625877312",
            template_name="conninter_doctor_visit_approval",
            template_language="en_US",
            doctor_name="Sharma",
            visitor_name="Visitor",
            organization="Acme Pharma",
            visitor_type="Sales Representative",
            purpose="Checkup",
            department="Cardiology",
            requested_date="26 Sep 2026",
            requested_time="10:00 AM",
            items_carrying="Laptop, samples",
            visit_id="482901",
            approval_code="482901",
        )

    payload = mock_post.call_args.kwargs["json"]
    assert payload["template_name"] == "conninter_doctor_visit_approval"
    assert payload["template_language"] == "en_US"
    assert payload["field_1"] == "Sharma"
    assert payload["field_2"] == "Visitor"
    assert payload["field_3"] == "Acme Pharma"
    assert payload["field_4"] == "Sales Representative"
    assert payload["field_5"] == "Checkup"
    assert payload["field_9"] == "Laptop, samples"
    assert payload["field_10"] == "482901"
    assert payload["button_0"] == "confirm_482901"
    assert payload["button_1"] == "no_482901"
    assert "url_button" not in payload


@patch("app.services.wapblaster_client.httpx.post")
def test_meeting_pass_template_sends_header_image_and_six_fields(mock_post: MagicMock) -> None:
    from app.services.wapblaster_client import send_wapblaster_meeting_pass

    response = MagicMock()
    response.status_code = 200
    response.json.return_value = {"result": "success"}
    mock_post.return_value = response

    with patch("app.services.wapblaster_client.get_settings") as mock_settings:
        mock_settings.return_value = Settings(
            HVTS_TEST_MODE=False,
            WHATSAPP_PROVIDER="wapblaster",
            WAPBLASTER_API_BASE="https://www.wapblaster.com/api",
            WAPBLASTER_VENDOR_UID="vendor-uid",
            WAPBLASTER_ACCESS_TOKEN="test-token",
        )
        send_wapblaster_meeting_pass(
            "8625877312",
            template_name="conninter_meeting_pass",
            template_language="en_GB",
            visitor_name="Sushobhit Rao",
            doctor_name="Dr. Rahul Mehta",
            hospital_name="Ovum",
            department="Cardiology",
            requested_date="03 Oct 2026",
            requested_time="10:30 AM",
            purpose="Product discussion",
            items_carrying="Laptop, samples",
            image_url="https://example.com/meeting-pass.png",
        )

    payload = mock_post.call_args.kwargs["json"]
    assert payload["template_name"] == "conninter_meeting_pass"
    assert payload["template_language"] == "en_GB"
    assert payload["field_1"] == "Sushobhit Rao"
    assert payload["field_2"] == "Dr. Rahul Mehta"
    assert payload["field_3"] == "Ovum"
    assert payload["field_4"] == "Cardiology"
    assert payload["field_5"] == "Product discussion"
    assert payload["field_6"] == "Laptop, samples"
    assert payload["field_7"] == "03 Oct 2026"
    assert payload["field_8"] == "10:30 AM"
    assert payload["header_image"] == "https://example.com/meeting-pass.png"


@patch("app.services.wapblaster_client.httpx.post")
def test_delivery_pass_template_field_order(mock_post: MagicMock) -> None:
    from app.services.wapblaster_client import send_wapblaster_delivery_pass

    response = MagicMock()
    response.status_code = 200
    response.json.return_value = {"result": "success"}
    mock_post.return_value = response

    with patch("app.services.wapblaster_client.get_settings") as mock_settings:
        mock_settings.return_value = Settings(
            HVTS_TEST_MODE=False,
            WHATSAPP_PROVIDER="wapblaster",
            WAPBLASTER_API_BASE="https://www.wapblaster.com/api",
            WAPBLASTER_VENDOR_UID="vendor-uid",
            WAPBLASTER_ACCESS_TOKEN="test-token",
        )
        send_wapblaster_delivery_pass(
            "8625877312",
            template_name="conninter_delivery_pass",
            template_language="en_GB",
            driver_name="Sushobhit",
            deliver_to="Central Store",
            po_number="123456",
            item_text="12 Carton (4S, 4M, 4L)",
            vehicle_text="KA 01 AB 1234- Bike",
            date_text="03 Oct 2026",
            time_text="10:30 AM – 10:45 AM",
            image_url="https://example.com/delivery-pass.png",
        )

    payload = mock_post.call_args.kwargs["json"]
    assert payload["template_name"] == "conninter_delivery_pass"
    assert payload["template_language"] == "en_GB"
    assert payload["field_1"] == "Sushobhit"
    assert payload["field_2"] == "Central Store"
    assert payload["field_3"] == "123456"
    assert payload["field_4"] == "12 Carton (4S, 4M, 4L)"
    assert payload["field_5"] == "KA 01 AB 1234- Bike"
    assert payload["field_6"] == "03 Oct 2026"
    assert payload["field_7"] == "10:30 AM – 10:45 AM"
    assert "field_8" not in payload
    assert payload["header_image"] == "https://example.com/delivery-pass.png"


@patch("app.services.wapblaster_client.httpx.post")
def test_visit_rejected_template_field_order(mock_post: MagicMock) -> None:
    from app.services.wapblaster_client import send_wapblaster_visit_rejected

    response = MagicMock()
    response.status_code = 200
    response.json.return_value = {"result": "success"}
    mock_post.return_value = response

    with patch("app.services.wapblaster_client.get_settings") as mock_settings:
        mock_settings.return_value = Settings(
            HVTS_TEST_MODE=False,
            WHATSAPP_PROVIDER="wapblaster",
            WAPBLASTER_API_BASE="https://www.wapblaster.com/api",
            WAPBLASTER_VENDOR_UID="vendor-uid",
            WAPBLASTER_ACCESS_TOKEN="test-token",
        )
        send_wapblaster_visit_rejected(
            "8625877312",
            template_name="conninter_visit_rejected",
            template_language="en_GB",
            visitor_name="Mohan Gola",
            doctor_name="Sharma",
            hospital_name="Ovum Woman & Child Speciality Hospital",
            department="Fertility & IVF",
            requested_date="05 Oct 2026",
            requested_time="02:30 PM",
            visit_id="604818",
        )

    payload = mock_post.call_args.kwargs["json"]
    assert payload["template_name"] == "conninter_visit_rejected"
    assert payload["template_language"] == "en_GB"
    assert payload["field_1"] == "Mohan Gola"
    assert payload["field_2"] == "Sharma"
    assert payload["field_3"] == "Ovum Woman & Child Speciality Hospital"
    assert payload["field_4"] == "Fertility & IVF"
    assert payload["field_5"] == "05 Oct 2026"
    assert payload["field_6"] == "02:30 PM"
    assert payload["field_7"] == "604818"
    assert "button_0" not in payload


@patch("app.services.wapblaster_client.httpx.post")
def test_order_delivered_template_field_order(mock_post: MagicMock) -> None:
    from app.services.wapblaster_client import send_wapblaster_order_delivered

    response = MagicMock()
    response.status_code = 200
    response.json.return_value = {"result": "success"}
    mock_post.return_value = response

    with patch("app.services.wapblaster_client.get_settings") as mock_settings:
        mock_settings.return_value = Settings(
            HVTS_TEST_MODE=False,
            WHATSAPP_PROVIDER="wapblaster",
            WAPBLASTER_API_BASE="https://www.wapblaster.com/api",
            WAPBLASTER_VENDOR_UID="vendor-uid",
            WAPBLASTER_ACCESS_TOKEN="test-token",
        )
        send_wapblaster_order_delivered(
            "8625877312",
            template_name="conninter_hospital_order_delivered",
            template_language="en_US",
            recipient_name="Stores Team",
            hospital_name="Ovum Hospitals",
            branch_name="Kalyan Nagar",
            branch_address="Kalyan Nagar, Bengaluru",
            receiving_department="Central Store",
            order_id="DLV-2026-000023",
            po_number="PO-19",
            order_date="06 Oct 2026",
            items="12 Carton (4S, 4M, 4L)",
            total_quantity="12",
            delivered_by="Sushobhit",
            vehicle_number="KA 01 AB 1234",
            delivery_date="06 Oct 2026",
            delivery_time="7:40 PM",
            delivery_reference="GRN-23",
        )

    payload = mock_post.call_args.kwargs["json"]
    assert payload["template_name"] == "conninter_hospital_order_delivered"
    assert payload["template_language"] == "en_US"
    assert payload["field_1"] == "Stores Team"
    assert payload["field_2"] == "Ovum Hospitals"
    assert payload["field_3"] == "Kalyan Nagar"
    assert payload["field_4"] == "Kalyan Nagar, Bengaluru"
    assert payload["field_5"] == "Central Store"
    assert payload["field_6"] == "DLV-2026-000023"
    assert payload["field_7"] == "PO-19"
    assert payload["field_8"] == "06 Oct 2026"
    assert payload["field_9"] == "12 Carton (4S, 4M, 4L)"
    assert payload["field_10"] == "12"
    assert payload["field_11"] == "Sushobhit"
    assert payload["field_12"] == "KA 01 AB 1234"
    assert payload["field_13"] == "06 Oct 2026"
    assert payload["field_14"] == "7:40 PM"
    assert payload["field_15"] == "GRN-23"
    assert "field_16" not in payload
    assert "header_image" not in payload


@patch("app.services.wapblaster_client.httpx.post")
def test_attendant_pass_template_field_order(mock_post: MagicMock) -> None:
    from app.services.wapblaster_client import send_wapblaster_attendant_pass

    response = MagicMock()
    response.status_code = 200
    response.json.return_value = {"result": "success"}
    mock_post.return_value = response

    with patch("app.services.wapblaster_client.get_settings") as mock_settings:
        mock_settings.return_value = Settings(
            HVTS_TEST_MODE=False,
            WHATSAPP_PROVIDER="wapblaster",
            WAPBLASTER_API_BASE="https://www.wapblaster.com/api",
            WAPBLASTER_VENDOR_UID="vendor-uid",
            WAPBLASTER_ACCESS_TOKEN="test-token",
        )
        send_wapblaster_attendant_pass(
            "8625877312",
            template_name="conninter_patient_attendant_pass",
            template_language="en_US",
            attendant_name="Anita Rao",
            patient_name="Ravi Kumar",
            patient_id="MRN-1001",
            relationship="Sister",
            issued_on="07 Oct 2026",
            validity="07 Oct 2026 11:00-16:00",
            image_url="https://example.com/attendant-pass.png",
        )

    payload = mock_post.call_args.kwargs["json"]
    assert payload["template_name"] == "conninter_patient_attendant_pass"
    assert payload["template_language"] == "en_US"
    assert payload["field_1"] == "Anita Rao"
    assert payload["field_2"] == "Ravi Kumar"
    assert payload["field_3"] == "MRN-1001"
    assert payload["field_4"] == "Sister"
    assert payload["field_5"] == "07 Oct 2026"
    assert payload["field_6"] == "07 Oct 2026 11:00-16:00"
    assert "field_7" not in payload
    assert payload["header_image"] == "https://example.com/attendant-pass.png"


@patch("app.services.wapblaster_client.httpx.post")
def test_phone_otp_template_sends_full_code_without_buttons(mock_post: MagicMock) -> None:
    from app.services.wapblaster_client import send_wapblaster_phone_otp

    response = MagicMock()
    response.status_code = 200
    mock_post.return_value = response

    with patch("app.services.wapblaster_client.get_settings") as mock_settings:
        mock_settings.return_value = Settings(
            HVTS_TEST_MODE=False,
            WHATSAPP_PROVIDER="wapblaster",
            WAPBLASTER_API_BASE="https://www.wapblaster.com/api",
            WAPBLASTER_VENDOR_UID="vendor-uid",
            WAPBLASTER_ACCESS_TOKEN="test-token",
        )
        send_wapblaster_phone_otp(
            "+919876543210",
            template_name="conninter_phone_otp",
            template_language="en_GB",
            otp="395221",
            valid_minutes=5,
        )

    payload = mock_post.call_args.kwargs["json"]
    assert payload["template_name"] == "conninter_phone_otp"
    assert payload["template_language"] == "en_GB"
    assert payload["field_1"] == "395221"
    assert payload["button_0"] == "395221"
    assert "field_2" not in payload
    assert "button_payload" not in payload
