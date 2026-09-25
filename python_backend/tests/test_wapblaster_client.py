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
            template_name="confirmation_template",
            template_language="en_US",
            fields=["Connitor", "Visitor", "26 Sep", "10:00", "Approved"],
        )

    mock_post.assert_called_once()
    args, kwargs = mock_post.call_args
    assert args[0].endswith("/vendor-uid/contact/send-template-message")
    assert kwargs["json"]["template_name"] == "confirmation_template"
    assert kwargs["json"]["template_language"] == "en_US"
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
            template_name="confirmation_template",
            template_language="en_US",
            visitor_name="Visitor",
            appointment_label="26 Sep 10:00",
            purpose="Checkup",
            approval_code="482901",
        )

    payload = mock_post.call_args.kwargs["json"]
    assert payload["template_name"] == "confirmation_template"
    assert payload["field_5"] == "Reply CONFIRM 482901"
    assert len(payload["field_2"]) <= 30
    assert payload["button_payload"] == "confirm_482901"
    assert "url_button" not in payload
