"""Send a test Yes/No approval WhatsApp to a doctor phone (Meta Cloud API)."""
from __future__ import annotations

import sys

from app.config import check_meta_whatsapp_health, get_settings
from app.services.messaging_service import WhatsAppService

DOCTOR_PHONE = sys.argv[1] if len(sys.argv) > 1 else "6379983352"


def main() -> None:
    health = check_meta_whatsapp_health()
    print("Meta WhatsApp health:", health)
    if health.get("valid") is False:
        print(
            "\nCannot send — token expired or invalid.\n"
            "1. Open https://developers.facebook.com/ -> your app -> WhatsApp -> API Setup\n"
            "2. Generate a new access token\n"
            "3. Update WHATSAPP_ACCESS_TOKEN in python_backend/.env\n"
            "4. Add doctor phone to test recipient list in Meta\n"
            "5. Create approved template 'appointment_approval_request' (see .env.example)\n"
        )
        raise SystemExit(1)

    settings = get_settings()
    print("Template:", settings.whatsapp_template_appointment_approval)
    print("Sending Yes/No approval test to:", DOCTOR_PHONE)

    WhatsAppService().send_appointment_approval_buttons(
        DOCTOR_PHONE,
        visitor_name="Test Visitor",
        appointment_label="22 Jun 2026 10:00",
        approval_code="999888",
    )
    print("Sent successfully — check WhatsApp on", DOCTOR_PHONE)


if __name__ == "__main__":
    main()
