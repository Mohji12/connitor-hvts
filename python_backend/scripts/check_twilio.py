"""Quick Twilio connectivity check (credentials, from-number, recent SMS)."""
from __future__ import annotations

import base64
import json
import urllib.parse
import urllib.request

from app.config import get_settings, is_twilio_configured


def _get(url: str, auth: str) -> dict:
    req = urllib.request.Request(url, headers={"Authorization": f"Basic {auth}"})
    with urllib.request.urlopen(req, timeout=15) as resp:
        return json.loads(resp.read().decode())


def main() -> None:
    s = get_settings()
    print("SMS_PROVIDER:", s.sms_provider)
    print("Twilio configured:", is_twilio_configured(s))
    print("From number:", s.twilio_from_number)

    if not is_twilio_configured(s):
        print("RESULT: Twilio env vars are missing.")
        return

    auth = base64.b64encode(f"{s.twilio_account_sid}:{s.twilio_auth_token}".encode()).decode()
    sid = s.twilio_account_sid

    try:
        account = _get(f"https://api.twilio.com/2010-04-01/Accounts/{sid}.json", auth)
        print("Account status:", account.get("status"))
        print("Account name:", account.get("friendly_name"))
    except urllib.error.HTTPError as exc:
        body = exc.read().decode()
        print("RESULT: Invalid credentials — HTTP", exc.code, body[:200])
        return

    q = urllib.parse.urlencode({"PhoneNumber": s.twilio_from_number})
    nums = _get(
        f"https://api.twilio.com/2010-04-01/Accounts/{sid}/IncomingPhoneNumbers.json?{q}",
        auth,
    ).get("incoming_phone_numbers", [])
    if nums:
        caps = nums[0].get("capabilities", {})
        print("From number on account: yes (SMS:", caps.get("sms"), ")")
    else:
        print("From number on account: NO — check TWILIO_FROM_NUMBER")

    msgs = _get(
        f"https://api.twilio.com/2010-04-01/Accounts/{sid}/Messages.json?PageSize=5",
        auth,
    ).get("messages", [])
    print(f"Recent outbound messages: {len(msgs)}")
    for m in msgs[:3]:
        body_preview = (m.get("body") or "")[:50]
        print(
            f"  {m.get('date_sent')} | to {m.get('to')} | status={m.get('status')} | {body_preview}"
        )

    print("RESULT: Twilio API credentials are valid and account is active.")


if __name__ == "__main__":
    main()
