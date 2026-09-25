"""Send a one-off WhatsApp test message via PyWhatKit."""
import logging
import sys

from app.config import get_settings
from app.services.messaging_service import SmsService

logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")

TO_PHONE = "6379983352"
MESSAGE = (
    "Connitor test (retry): PyWhatKit WhatsApp delivery check. "
    "Reply OK if you received this."
)


def main() -> None:
    settings = get_settings()
    print(f"Central sender (WhatsApp Web): +91{settings.pywhatkit_central_phone}")
    print(f"Recipient: +91{TO_PHONE}")
    print(f"Wait time: {settings.pywhatkit_wait_time}s | Tab close: {settings.pywhatkit_tab_close}")
    print("Keep Chrome in focus; do not use the PC for ~45 seconds while sending...")
    sys.stdout.flush()
    SmsService().send_message(TO_PHONE, MESSAGE)
    print("Done — check WhatsApp on +916379983352.")


if __name__ == "__main__":
    main()