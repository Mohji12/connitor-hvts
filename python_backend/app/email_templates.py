"""Transactional email templates for Connitor."""

from html import escape


def build_login_otp_email(
    otp: str,
    *,
    company_name: str = "Connitor",
    product_name: str = "Hospital Visitor Tracking System",
    validity_minutes: int = 3,
) -> tuple[str, str, str]:
    """Return (subject, plain_text, html_body) for login OTP emails."""
    safe_otp = escape(otp)
    subject = f"{company_name} — Your sign-in code"

    text_body = (
        f"{company_name}\n"
        f"{product_name}\n\n"
        f"Your one-time sign-in code is: {otp}\n\n"
        f"This code expires in {validity_minutes} minutes.\n"
        "Do not share it with anyone. If you did not request this code, "
        "you can safely ignore this email.\n\n"
        f"— {company_name}"
    )

    html_body = f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>{escape(subject)}</title>
</head>
<body style="margin:0;padding:0;background-color:#f0f4f8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#f0f4f8;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:520px;background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(15,23,42,0.08);">
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#0d9488 0%,#0f766e 100%);padding:28px 32px;text-align:center;">
              <p style="margin:0 0 6px;font-size:11px;font-weight:600;letter-spacing:0.12em;text-transform:uppercase;color:rgba(255,255,255,0.85);">
                Secure sign-in
              </p>
              <h1 style="margin:0;font-size:28px;font-weight:700;color:#ffffff;letter-spacing:-0.02em;">
                {escape(company_name)}
              </h1>
              <p style="margin:10px 0 0;font-size:13px;color:rgba(255,255,255,0.9);">
                {escape(product_name)}
              </p>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:36px 32px 28px;">
              <p style="margin:0 0 8px;font-size:16px;line-height:1.5;color:#334155;">
                Hello,
              </p>
              <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#64748b;">
                Use the verification code below to complete your sign-in. This code is valid for
                <strong style="color:#0f766e;">{validity_minutes} minutes</strong>.
              </p>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td align="center" style="background-color:#f0fdfa;border:2px dashed #99f6e4;border-radius:10px;padding:24px 16px;">
                    <p style="margin:0 0 8px;font-size:12px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:#0d9488;">
                      Your verification code
                    </p>
                    <p style="margin:0;font-size:36px;font-weight:700;letter-spacing:0.35em;color:#0f172a;font-family:'Courier New',Courier,monospace;padding-left:0.35em;">
                      {safe_otp}
                    </p>
                  </td>
                </tr>
              </table>
              <p style="margin:24px 0 0;font-size:13px;line-height:1.6;color:#94a3b8;">
                For your security, never share this code. {escape(company_name)} will never ask for it by phone or chat.
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:20px 32px 28px;background-color:#f8fafc;border-top:1px solid #e2e8f0;">
              <p style="margin:0 0 6px;font-size:12px;line-height:1.5;color:#94a3b8;text-align:center;">
                Didn't request this? You can ignore this email — your account stays secure.
              </p>
              <p style="margin:0;font-size:11px;color:#cbd5e1;text-align:center;">
                &copy; {escape(company_name)} &middot; {escape(product_name)}
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>"""

    return subject, text_body, html_body


def build_registration_otp_email(
    otp: str,
    *,
    company_name: str = "Connitor",
    product_name: str = "Hospital Visitor Tracking System",
    validity_minutes: int = 10,
) -> tuple[str, str, str]:
    """Return (subject, plain_text, html_body) for registration email verification."""
    safe_otp = escape(otp)
    subject = f"{company_name} — Verify your email to complete registration"

    text_body = (
        f"{company_name}\n"
        f"{product_name}\n\n"
        f"Your email verification code is: {otp}\n\n"
        f"This code expires in {validity_minutes} minutes.\n"
        "Enter it on the registration page to activate your account. "
        "After that you can sign in with email OTP.\n\n"
        f"— {company_name}"
    )

    html_body = f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>{escape(subject)}</title>
</head>
<body style="margin:0;padding:0;background-color:#f0f4f8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#f0f4f8;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:520px;background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(15,23,42,0.08);">
          <tr>
            <td style="background:linear-gradient(135deg,#0d9488 0%,#0f766e 100%);padding:28px 32px;text-align:center;">
              <p style="margin:0 0 6px;font-size:11px;font-weight:600;letter-spacing:0.12em;text-transform:uppercase;color:rgba(255,255,255,0.85);">
                Email verification
              </p>
              <h1 style="margin:0;font-size:26px;font-weight:700;color:#ffffff;">{escape(company_name)}</h1>
              <p style="margin:10px 0 0;font-size:13px;color:rgba(255,255,255,0.9);">Complete your registration</p>
            </td>
          </tr>
          <tr>
            <td style="padding:36px 32px 28px;">
              <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#64748b;">
                Enter this code on the registration page to verify your email and activate your account.
                Valid for <strong style="color:#0f766e;">{validity_minutes} minutes</strong>.
              </p>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td align="center" style="background-color:#f0fdfa;border:2px dashed #99f6e4;border-radius:10px;padding:24px 16px;">
                    <p style="margin:0 0 8px;font-size:12px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:#0d9488;">
                      Verification code
                    </p>
                    <p style="margin:0;font-size:36px;font-weight:700;letter-spacing:0.35em;color:#0f172a;font-family:'Courier New',Courier,monospace;padding-left:0.35em;">
                      {safe_otp}
                    </p>
                  </td>
                </tr>
              </table>
              <p style="margin:24px 0 0;font-size:13px;line-height:1.6;color:#94a3b8;">
                For your security, never share this code. {escape(company_name)} will never ask for it by phone or chat.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 32px 28px;background-color:#f8fafc;border-top:1px solid #e2e8f0;">
              <p style="margin:0 0 6px;font-size:12px;line-height:1.5;color:#94a3b8;text-align:center;">
                Didn't request this? You can ignore this email.
              </p>
              <p style="margin:0;font-size:11px;color:#cbd5e1;text-align:center;">
                &copy; {escape(company_name)} &middot; {escape(product_name)}
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>"""

    return subject, text_body, html_body


def build_notification_email(
    title: str,
    message: str,
    *,
    company_name: str = "Connitor",
    product_name: str = "Hospital Visitor Tracking System",
) -> tuple[str, str, str]:
    """Return (subject, plain_text, html_body) for workflow notification emails."""
    safe_title = escape(title)
    safe_message = escape(message)
    subject = f"{company_name} — {title}"

    text_body = f"{company_name}\n{product_name}\n\n{title}\n\n{message}\n\n— {company_name}"

    html_body = f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>{escape(subject)}</title>
</head>
<body style="margin:0;padding:0;background-color:#f0f4f8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#f0f4f8;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:520px;background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(15,23,42,0.08);">
          <tr>
            <td style="background:linear-gradient(135deg,#0d9488 0%,#0f766e 100%);padding:24px 32px;text-align:center;">
              <h1 style="margin:0;font-size:22px;font-weight:700;color:#ffffff;">{escape(company_name)}</h1>
              <p style="margin:8px 0 0;font-size:13px;color:rgba(255,255,255,0.9);">{escape(product_name)}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              <h2 style="margin:0 0 16px;font-size:18px;color:#0f172a;">{safe_title}</h2>
              <p style="margin:0;font-size:15px;line-height:1.6;color:#475569;white-space:pre-line;">{safe_message}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>"""

    return subject, text_body, html_body


def build_account_credentials_email(
    *,
    name: str,
    email: str,
    password: str,
    role_label: str,
    login_url: str,
    department_name: str | None = None,
    company_name: str = "Connitor",
    product_name: str = "Hospital Visitor Tracking System",
) -> tuple[str, str, str]:
    """Return (subject, plain_text, html_body) for new staff/admin account credentials."""
    safe_name = escape(name)
    safe_email = escape(email)
    safe_password = escape(password)
    safe_role = escape(role_label)
    safe_login = escape(login_url)
    dept_line = f"\nDepartment: {department_name}" if department_name else ""
    safe_dept = (
        f'<p style="margin:0 0 16px;font-size:14px;color:#64748b;">Department: <strong>{escape(department_name)}</strong></p>'
        if department_name
        else ""
    )

    subject = f"{company_name} — Your {role_label} account is ready"

    text_body = (
        f"{company_name}\n"
        f"{product_name}\n\n"
        f"Hello {name},\n\n"
        f"An administrator created a {role_label} account for you.{dept_line}\n\n"
        f"Login ID (email): {email}\n"
        f"Password: {password}\n\n"
        f"Sign in at: {login_url}\n\n"
        "Change your password after your first sign-in if your organization requires it.\n"
        "Do not share these credentials with anyone.\n\n"
        f"— {company_name}"
    )

    html_body = f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>{escape(subject)}</title>
</head>
<body style="margin:0;padding:0;background-color:#f0f4f8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#f0f4f8;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:520px;background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(15,23,42,0.08);">
          <tr>
            <td style="background:linear-gradient(135deg,#0d9488 0%,#0f766e 100%);padding:28px 32px;text-align:center;">
              <p style="margin:0 0 6px;font-size:11px;font-weight:600;letter-spacing:0.12em;text-transform:uppercase;color:rgba(255,255,255,0.85);">
                Account created
              </p>
              <h1 style="margin:0;font-size:24px;font-weight:700;color:#ffffff;">{escape(company_name)}</h1>
              <p style="margin:10px 0 0;font-size:13px;color:rgba(255,255,255,0.9);">{escape(product_name)}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:36px 32px 28px;">
              <p style="margin:0 0 8px;font-size:16px;color:#334155;">Hello {safe_name},</p>
              <p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#64748b;">
                Your <strong>{safe_role}</strong> account has been set up. Use the credentials below to sign in.
              </p>
              {safe_dept}
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;">
                <tr>
                  <td style="padding:20px;">
                    <p style="margin:0 0 12px;font-size:12px;font-weight:600;letter-spacing:0.06em;text-transform:uppercase;color:#0d9488;">Login credentials</p>
                    <p style="margin:0 0 8px;font-size:14px;color:#475569;"><strong>Login ID:</strong> {safe_email}</p>
                    <p style="margin:0;font-size:14px;color:#475569;"><strong>Password:</strong> <span style="font-family:monospace;font-size:15px;color:#0f172a;">{safe_password}</span></p>
                  </td>
                </tr>
              </table>
              <p style="margin:24px 0 0;text-align:center;">
                <a href="{safe_login}" style="display:inline-block;background:#0d9488;color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;padding:12px 28px;border-radius:8px;">Sign in to Connitor</a>
              </p>
              <p style="margin:20px 0 0;font-size:13px;line-height:1.6;color:#94a3b8;">
                Keep this email private. Contact your hospital administrator if you did not expect this account.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>"""

    return subject, text_body, html_body


def build_check_in_otp_email(
    otp: str,
    *,
    visitor_name: str,
    doctor_name: str,
    appointment_date: str,
    doctor_feedback: str | None = None,
    company_name: str = "Connitor",
    product_name: str = "Hospital Visitor Tracking System",
    validity_hours: int = 8,
) -> tuple[str, str, str]:
    """Email sent to visitors when their appointment is approved — includes check-in OTP."""
    safe_otp = escape(otp)
    feedback_block = ""
    feedback_html = ""
    if doctor_feedback and doctor_feedback.strip():
        feedback_block = f"\n\nMessage from your doctor:\n{doctor_feedback.strip()}\n"
        feedback_html = (
            f'<p style="margin:0 0 20px;color:#475569;line-height:1.6;background:#f8fafc;'
            f'border-left:4px solid #0d9488;padding:12px 16px;border-radius:6px;">'
            f"<strong>Message from your doctor:</strong><br/>{escape(doctor_feedback.strip())}</p>"
        )

    subject = f"{company_name} — Appointment approved — your check-in code"

    text_body = (
        f"{company_name}\n{product_name}\n\n"
        f"Hello {visitor_name},\n\n"
        f"Your appointment with Dr. {doctor_name} on {appointment_date} has been approved.\n"
        f"{feedback_block}\n"
        f"Check-in OTP: {otp}\n"
        f"Show this code at hospital security. Valid for {validity_hours} hours.\n\n"
        f"— {company_name}"
    )

    html_body = f"""<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8" /><title>{escape(subject)}</title></head>
<body style="margin:0;padding:0;background-color:#f0f4f8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#f0f4f8;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" style="max-width:520px;background:#fff;border-radius:12px;overflow:hidden;">
        <tr><td style="background:linear-gradient(135deg,#0d9488,#0f766e);padding:24px;text-align:center;">
          <h1 style="margin:0;color:#fff;font-size:22px;">Appointment Approved</h1>
        </td></tr>
        <tr><td style="padding:32px;">
          <p style="margin:0 0 12px;color:#334155;">Hello {escape(visitor_name)},</p>
          <p style="margin:0 0 20px;color:#64748b;line-height:1.6;">
            Your visit with <strong>Dr. {escape(doctor_name)}</strong> on
            <strong>{escape(appointment_date)}</strong> is confirmed.
          </p>
          {feedback_html}
          <div style="text-align:center;background:#f0fdfa;border:2px dashed #99f6e4;border-radius:10px;padding:20px;">
            <p style="margin:0 0 8px;font-size:12px;color:#0d9488;font-weight:600;text-transform:uppercase;">Check-in OTP</p>
            <p style="margin:0;font-size:34px;font-weight:700;letter-spacing:0.3em;font-family:monospace;color:#0f172a;">{safe_otp}</p>
          </div>
          <p style="margin:20px 0 0;font-size:13px;color:#94a3b8;">Show this code at hospital security. Valid {validity_hours} hours.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>"""
    return subject, text_body, html_body


def build_booking_confirmation_email(
    *,
    visitor_name: str,
    doctor_name: str,
    appointment_date: str,
    hospital_name: str,
    department_name: str | None = None,
    purpose: str | None = None,
    booking_id: str,
    appointment_mode: str = "IN_PERSON",
    company_name: str = "Connitor",
    product_name: str = "Hospital Visitor Tracking System",
) -> tuple[str, str, str]:
    """Email sent when a visitor books an appointment (awaiting doctor approval)."""
    dept_line = f"Department: {department_name}\n" if department_name else ""
    purpose_line = f"Purpose: {purpose}\n" if purpose else ""
    is_online = appointment_mode == "ONLINE"
    mode_line = "Online video consultation\n" if is_online else "In-person hospital visit\n"
    after_approval = (
        "You will receive a video consultation link by email and SMS once the doctor approves."
        if is_online
        else "You will receive a check-in QR code by email and SMS once the doctor approves."
    )
    subject = f"{company_name} — Appointment request received"

    text_body = (
        f"{company_name}\n{product_name}\n\n"
        f"Hello {visitor_name},\n\n"
        f"Your appointment request with Dr. {doctor_name} on {appointment_date} "
        f"at {hospital_name} has been received.\n\n"
        f"Visit type: {mode_line}"
        f"{dept_line}{purpose_line}"
        f"Booking reference: {booking_id}\n\n"
        "Status: Awaiting doctor approval.\n"
        f"{after_approval}\n\n"
        f"— {company_name}"
    )

    dept_html = (
        f"<p style='margin:0 0 8px;color:#64748b;'><strong>Department:</strong> {escape(department_name)}</p>"
        if department_name
        else ""
    )
    purpose_html = (
        f"<p style='margin:0 0 8px;color:#64748b;'><strong>Purpose:</strong> {escape(purpose)}</p>"
        if purpose
        else ""
    )
    mode_label = "Online video consultation" if is_online else "In-person hospital visit"
    mode_html = (
        f"<p style='margin:0 0 8px;color:#64748b;'><strong>Visit type:</strong> {escape(mode_label)}</p>"
    )
    pending_html = (
        "<strong>Pending doctor approval.</strong> You will receive a video consultation link once approved."
        if is_online
        else "<strong>Pending doctor approval.</strong> You will receive a check-in QR code once approved."
    )

    html_body = f"""<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8" /><title>{escape(subject)}</title></head>
<body style="margin:0;padding:0;background:#f0f4f8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table role="presentation" width="100%" style="background:#f0f4f8;padding:32px 16px;"><tr><td align="center">
    <table role="presentation" width="100%" style="max-width:520px;background:#fff;border-radius:12px;">
      <tr><td style="background:linear-gradient(135deg,#0d9488,#0f766e);padding:24px;text-align:center;">
        <h1 style="margin:0;color:#fff;font-size:22px;">Appointment Request Received</h1>
      </td></tr>
      <tr><td style="padding:32px;">
        <p style="margin:0 0 12px;color:#334155;">Hello {escape(visitor_name)},</p>
        <p style="margin:0 0 16px;color:#64748b;line-height:1.6;">
          Your request to visit <strong>Dr. {escape(doctor_name)}</strong> on
          <strong>{escape(appointment_date)}</strong> at <strong>{escape(hospital_name)}</strong>
          has been submitted.
        </p>
        {dept_html}{purpose_html}{mode_html}
        <p style="margin:16px 0 8px;color:#64748b;"><strong>Reference:</strong> {escape(booking_id)}</p>
        <p style="margin:0;padding:12px 16px;background:#fef3c7;border-radius:8px;color:#92400e;font-size:14px;">
          {pending_html}
        </p>
      </td></tr>
    </table>
  </td></tr></table>
</body></html>"""

    return subject, text_body, html_body


def build_gate_pass_email(
    *,
    visitor_name: str,
    doctor_name: str,
    appointment_date: str,
    check_in_otp: str,
    doctor_feedback: str | None = None,
    qr_cid: str | None = None,
    company_name: str = "Connitor",
    product_name: str = "Hospital Visitor Tracking System",
    validity_hours: int = 8,
    visitor_pass_id: str | None = None,
) -> tuple[str, str, str]:
    """Email with embedded QR image and OTP after doctor approval."""
    feedback_html = ""
    feedback_text = ""
    if doctor_feedback and doctor_feedback.strip():
        feedback_text = f"\n\nMessage from your doctor:\n{doctor_feedback.strip()}\n"
        feedback_html = (
            f'<p style="margin:0 0 20px;color:#475569;line-height:1.6;background:#f8fafc;'
            f'border-left:4px solid #0d9488;padding:12px 16px;border-radius:6px;">'
            f"<strong>Message from your doctor:</strong><br/>{escape(doctor_feedback.strip())}</p>"
        )

    qr_html = ""
    qr_text = ""
    if qr_cid:
        qr_html = (
            f'<div style="text-align:center;margin:20px 0;">'
            f'<p style="margin:0 0 12px;font-size:12px;color:#0d9488;font-weight:600;text-transform:uppercase;">'
            f"Scan at hospital security</p>"
            f'<img src="cid:{escape(qr_cid)}" alt="Check-in QR code" width="200" height="200" '
            f'style="border:2px solid #99f6e4;border-radius:8px;" />'
            f"</div>"
        )
        qr_text = "\nShow the QR code in this email at the security desk.\n"

    pass_text = f"\nPass ID: {visitor_pass_id}\n" if visitor_pass_id else ""
    pass_html = ""
    if visitor_pass_id:
        pass_html = (
            f'<div style="text-align:center;background:#ecfeff;border:2px solid #67e8f9;border-radius:10px;'
            f'padding:16px;margin:0 0 20px;">'
            f'<p style="margin:0 0 6px;font-size:12px;color:#0e7490;font-weight:600;text-transform:uppercase;">'
            f"Pass ID — show this to security</p>"
            f'<p style="margin:0;font-size:22px;font-weight:700;letter-spacing:0.08em;font-family:monospace;'
            f'color:#0f172a;">{escape(visitor_pass_id)}</p>'
            f"</div>"
        )

    subject = f"{company_name} — Appointment approved — your check-in QR code"
    text_body = (
        f"{company_name}\n{product_name}\n\n"
        f"Hello {visitor_name},\n\n"
        f"Your appointment with Dr. {doctor_name} on {appointment_date} is confirmed."
        f"{feedback_text}{pass_text}{qr_text}\n"
        f"Check-in OTP (backup): {check_in_otp}\n"
        f"Valid for {validity_hours} hours.\n\n"
        f"— {company_name}"
    )

    html_body = f"""<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8" /><title>{escape(subject)}</title></head>
<body style="margin:0;padding:0;background:#f0f4f8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table role="presentation" width="100%" style="background:#f0f4f8;padding:32px 16px;"><tr><td align="center">
    <table role="presentation" width="100%" style="max-width:520px;background:#fff;border-radius:12px;">
      <tr><td style="background:linear-gradient(135deg,#0d9488,#0f766e);padding:24px;text-align:center;">
        <h1 style="margin:0;color:#fff;font-size:22px;">Appointment Approved</h1>
      </td></tr>
      <tr><td style="padding:32px;">
        <p style="margin:0 0 12px;color:#334155;">Hello {escape(visitor_name)},</p>
        <p style="margin:0 0 20px;color:#64748b;line-height:1.6;">
          Your visit with <strong>Dr. {escape(doctor_name)}</strong> on
          <strong>{escape(appointment_date)}</strong> is confirmed.
        </p>
          {feedback_html}
        {pass_html}
        {qr_html}
        <div style="text-align:center;background:#f0fdfa;border:2px dashed #99f6e4;border-radius:10px;padding:20px;">
          <p style="margin:0 0 8px;font-size:12px;color:#0d9488;font-weight:600;text-transform:uppercase;">Backup OTP</p>
          <p style="margin:0;font-size:34px;font-weight:700;letter-spacing:0.3em;font-family:monospace;color:#0f172a;">{escape(check_in_otp)}</p>
        </div>
        <p style="margin:20px 0 0;font-size:13px;color:#94a3b8;">Present QR or OTP at security. Valid {validity_hours} hours.</p>
      </td></tr>
    </table>
  </td></tr></table>
</body></html>"""

    return subject, text_body, html_body


def build_delivery_assignment_email(
    *,
    driver_name: str,
    delivery_number: str,
    goods_type: str,
    total_boxes: int,
    vehicle_number: str,
    vendor_name: str,
    arrival_label: str,
    hospital_name: str,
    hospital_address: str,
    hospital_phone: str,
    maps_url: str | None = None,
    remarks: str | None = None,
    qr_cid: str | None = None,
    qr_expires_at: str | None = None,
    company_name: str = "Connitor",
    product_name: str = "Hospital Visitor Tracking System",
) -> tuple[str, str, str]:
    """Full delivery instructions email for drivers (no login/dashboard)."""
    remarks_text = ""
    remarks_html = ""
    if remarks and remarks.strip():
        remarks_text = f"\nInstructions: {remarks.strip()}\n"
        remarks_html = (
            f'<p style="margin:0 0 16px;color:#475569;line-height:1.6;background:#f8fafc;'
            f'border-left:4px solid #0d9488;padding:12px 16px;border-radius:6px;">'
            f"<strong>Delivery instructions:</strong><br/>{escape(remarks.strip())}</p>"
        )

    qr_html = ""
    qr_text = ""
    if qr_cid:
        expiry_line = f" Valid until {qr_expires_at}." if qr_expires_at else ""
        qr_html = (
            f'<div style="text-align:center;margin:20px 0;">'
            f'<p style="margin:0 0 12px;font-size:12px;color:#0d9488;font-weight:600;text-transform:uppercase;">'
            f"Show at hospital security gate</p>"
            f'<img src="cid:{escape(qr_cid)}" alt="Delivery check-in QR code" width="200" height="200" '
            f'style="border:2px solid #99f6e4;border-radius:8px;" />'
            f'<p style="margin:12px 0 0;font-size:13px;color:#94a3b8;">{escape(expiry_line.strip())}</p>'
            f"</div>"
        )
        qr_text = f"\nShow the QR code in this email at the hospital security gate.{expiry_line}\n"

    maps_text = f"\nMaps: {maps_url}\n" if maps_url else "\n"
    maps_html = ""
    if maps_url:
        maps_html = (
            f'<p style="margin:12px 0 0;text-align:center;">'
            f'<a href="{escape(maps_url)}" style="display:inline-block;background:#0d9488;color:#ffffff;'
            f'text-decoration:none;font-weight:600;font-size:14px;padding:10px 20px;border-radius:8px;">'
            f"Open in Maps</a></p>"
        )

    subject = f"{company_name} — Delivery assignment — {delivery_number}"
    text_body = (
        f"{company_name}\n{product_name}\n\n"
        f"Hello {driver_name},\n\n"
        f"You are assigned to delivery {delivery_number}.\n\n"
        f"Hospital: {hospital_name}\n"
        f"Address: {hospital_address or '—'}\n"
        f"Phone: {hospital_phone or '—'}"
        f"{maps_text}"
        f"Distributor: {vendor_name}\n"
        f"Goods: {goods_type} ({total_boxes} boxes)\n"
        f"Vehicle: {vehicle_number}\n"
        f"Arrival: {arrival_label}\n"
        f"{remarks_text}"
        f"{qr_text}\n"
        f"— {company_name}"
    )

    html_body = f"""<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8" /><title>{escape(subject)}</title></head>
<body style="margin:0;padding:0;background:#f0f4f8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table role="presentation" width="100%" style="background:#f0f4f8;padding:32px 16px;"><tr><td align="center">
    <table role="presentation" width="100%" style="max-width:520px;background:#fff;border-radius:12px;">
      <tr><td style="background:linear-gradient(135deg,#0d9488,#0f766e);padding:24px;text-align:center;">
        <h1 style="margin:0;color:#fff;font-size:22px;">Delivery Assignment</h1>
        <p style="margin:8px 0 0;color:#ccfbf1;font-size:14px;">{escape(delivery_number)}</p>
      </td></tr>
      <tr><td style="padding:32px;">
        <p style="margin:0 0 12px;color:#334155;">Hello {escape(driver_name)},</p>
        <p style="margin:0 0 20px;color:#64748b;line-height:1.6;">
          You are assigned to deliver to <strong>{escape(hospital_name)}</strong>.
          All check-in details are in this email — no app login required.
        </p>
        <table role="presentation" width="100%" style="margin:0 0 20px;border-collapse:collapse;">
          <tr><td style="padding:8px 0;color:#64748b;font-size:13px;width:120px;">Address</td>
              <td style="padding:8px 0;color:#0f172a;font-size:14px;">{escape(hospital_address or "—")}</td></tr>
          <tr><td style="padding:8px 0;color:#64748b;font-size:13px;">Phone</td>
              <td style="padding:8px 0;color:#0f172a;font-size:14px;">{escape(hospital_phone or "—")}</td></tr>
          <tr><td style="padding:8px 0;color:#64748b;font-size:13px;">Distributor</td>
              <td style="padding:8px 0;color:#0f172a;font-size:14px;">{escape(vendor_name)}</td></tr>
          <tr><td style="padding:8px 0;color:#64748b;font-size:13px;">Goods</td>
              <td style="padding:8px 0;color:#0f172a;font-size:14px;">{escape(goods_type)} ({total_boxes} boxes)</td></tr>
          <tr><td style="padding:8px 0;color:#64748b;font-size:13px;">Vehicle</td>
              <td style="padding:8px 0;color:#0f172a;font-size:14px;">{escape(vehicle_number)}</td></tr>
          <tr><td style="padding:8px 0;color:#64748b;font-size:13px;">Arrival</td>
              <td style="padding:8px 0;color:#0f172a;font-size:14px;">{escape(arrival_label)}</td></tr>
        </table>
        {maps_html}
        {remarks_html}
        {qr_html}
        <p style="margin:20px 0 0;font-size:13px;color:#94a3b8;">Present this QR at security when you arrive.</p>
      </td></tr>
    </table>
  </td></tr></table>
</body></html>"""

    return subject, text_body, html_body


def build_attendant_pass_email(
    *,
    attendant_name: str,
    pass_number: str,
    patient_first_name: str,
    hospital_name: str,
    hospital_address: str,
    hospital_phone: str,
    valid_until: str,
    ward_name: str | None = None,
    room_number: str | None = None,
    qr_cid: str | None = None,
    qr_expires_at: str | None = None,
    company_name: str = "Connitor",
    product_name: str = "Hospital Visitor Tracking System",
) -> tuple[str, str, str]:
    """Family visit pass email with embedded QR — bring government ID to security."""
    location_bits = [b for b in (ward_name, f"Room {room_number}" if room_number else None) if b]
    location = ", ".join(location_bits) if location_bits else "as directed by ward staff"

    qr_html = ""
    qr_text = ""
    if qr_cid:
        expiry_line = f" Valid until {qr_expires_at or valid_until}."
        qr_html = (
            f'<div style="text-align:center;margin:20px 0;">'
            f'<p style="margin:0 0 12px;font-size:12px;color:#0d9488;font-weight:600;text-transform:uppercase;">'
            f"Show at hospital security</p>"
            f'<img src="cid:{escape(qr_cid)}" alt="Attendant pass QR code" width="200" height="200" '
            f'style="border:2px solid #99f6e4;border-radius:8px;" />'
            f'<p style="margin:12px 0 0;font-size:13px;color:#94a3b8;">{escape(expiry_line.strip())}</p>'
            f"</div>"
        )
        qr_text = (
            f"\nShow the QR code in this email at hospital security.{expiry_line}\n"
            "Bring a government ID card — security will scan your QR and photograph your ID.\n"
        )

    subject = f"{company_name} — Attendant pass — {pass_number}"
    text_body = (
        f"{company_name}\n{product_name}\n\n"
        f"Hello {attendant_name},\n\n"
        f"Your visit pass {pass_number} to see {patient_first_name} has been issued.\n"
        f"Hospital: {hospital_name}\n"
        f"Address: {hospital_address or '—'}\n"
        f"Phone: {hospital_phone or '—'}\n"
        f"Location: {location}\n"
        f"Valid until: {valid_until}\n"
        f"{qr_text}\n"
        f"— {company_name}"
    )

    html_body = f"""<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8" /><title>{escape(subject)}</title></head>
<body style="margin:0;padding:0;background:#f0f4f8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table role="presentation" width="100%" style="background:#f0f4f8;padding:32px 16px;"><tr><td align="center">
    <table role="presentation" width="100%" style="max-width:520px;background:#fff;border-radius:12px;">
      <tr><td style="background:linear-gradient(135deg,#0d9488,#0f766e);padding:24px;text-align:center;">
        <h1 style="margin:0;color:#fff;font-size:22px;">Attendant Visit Pass</h1>
        <p style="margin:8px 0 0;color:#ccfbf1;font-size:14px;">{escape(pass_number)}</p>
      </td></tr>
      <tr><td style="padding:32px;">
        <p style="margin:0 0 12px;color:#334155;">Hello {escape(attendant_name)},</p>
        <p style="margin:0 0 20px;color:#64748b;line-height:1.6;">
          Your pass to visit <strong>{escape(patient_first_name)}</strong> at
          <strong>{escape(hospital_name)}</strong> is ready.
          Only one visitor may hold an active pass at a time for this patient.
        </p>
        <table role="presentation" width="100%" style="margin:0 0 20px;border-collapse:collapse;">
          <tr><td style="padding:8px 0;color:#64748b;font-size:13px;width:120px;">Location</td>
              <td style="padding:8px 0;color:#0f172a;font-size:14px;">{escape(location)}</td></tr>
          <tr><td style="padding:8px 0;color:#64748b;font-size:13px;">Address</td>
              <td style="padding:8px 0;color:#0f172a;font-size:14px;">{escape(hospital_address or "—")}</td></tr>
          <tr><td style="padding:8px 0;color:#64748b;font-size:13px;">Phone</td>
              <td style="padding:8px 0;color:#0f172a;font-size:14px;">{escape(hospital_phone or "—")}</td></tr>
          <tr><td style="padding:8px 0;color:#64748b;font-size:13px;">Valid until</td>
              <td style="padding:8px 0;color:#0f172a;font-size:14px;">{escape(valid_until)}</td></tr>
        </table>
        {qr_html}
        <p style="margin:16px 0 0;padding:12px 16px;background:#fff7ed;border-radius:8px;color:#9a3412;font-size:14px;line-height:1.5;">
          Bring a government ID card. Security will scan this QR and capture a photo of your ID at the gate.
        </p>
      </td></tr>
    </table>
  </td></tr></table>
</body></html>"""

    return subject, text_body, html_body


def build_attendant_checkout_qr_email(
    *,
    attendant_name: str,
    pass_number: str,
    patient_first_name: str,
    hospital_name: str,
    entry_label: str,
    ward_name: str | None = None,
    room_number: str | None = None,
    qr_cid: str | None = None,
    company_name: str = "Connitor",
    product_name: str = "Hospital Visitor Tracking System",
) -> tuple[str, str, str]:
    """Checkout QR emailed after attendant check-in — scan at security to exit."""
    location_bits = [b for b in (ward_name, f"Room {room_number}" if room_number else None) if b]
    location = ", ".join(location_bits) if location_bits else "as directed by ward staff"

    qr_html = ""
    qr_text = ""
    if qr_cid:
        qr_html = (
            f'<div style="text-align:center;margin:20px 0;">'
            f'<p style="margin:0 0 12px;font-size:12px;color:#0d9488;font-weight:600;text-transform:uppercase;">'
            f"Show at security to check out</p>"
            f'<img src="cid:{escape(qr_cid)}" alt="Checkout QR code" width="200" height="200" '
            f'style="border:2px solid #99f6e4;border-radius:8px;" />'
            f"</div>"
        )
        qr_text = (
            "\nShow the checkout QR in this email at hospital security when you leave.\n"
            "Do not use your check-in QR for exit.\n"
        )

    subject = f"{company_name} — Checkout QR — {pass_number}"
    text_body = (
        f"{company_name}\n{product_name}\n\n"
        f"Hello {attendant_name},\n\n"
        f"You have checked in to visit {patient_first_name} (pass {pass_number}).\n"
        f"Hospital: {hospital_name}\n"
        f"Location: {location}\n"
        f"Entry time: {entry_label}\n"
        f"{qr_text}\n"
        f"— {company_name}"
    )
    html_body = f"""<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8" /><title>{escape(subject)}</title></head>
<body style="margin:0;padding:0;background:#f0f4f8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table role="presentation" width="100%" style="background:#f0f4f8;padding:32px 16px;"><tr><td align="center">
    <table role="presentation" width="100%" style="max-width:520px;background:#fff;border-radius:12px;">
      <tr><td style="background:linear-gradient(135deg,#0d9488,#0f766e);padding:24px;text-align:center;">
        <h1 style="margin:0;color:#fff;font-size:22px;">Checkout QR</h1>
        <p style="margin:8px 0 0;color:#ccfbf1;font-size:14px;">{escape(pass_number)}</p>
      </td></tr>
      <tr><td style="padding:32px;">
        <p style="margin:0 0 12px;color:#334155;">Hello {escape(attendant_name)},</p>
        <p style="margin:0 0 20px;color:#64748b;line-height:1.6;">
          You are checked in to visit <strong>{escape(patient_first_name)}</strong> at
          <strong>{escape(hospital_name)}</strong>. Use the QR below when you leave.
        </p>
        <table role="presentation" width="100%" style="margin:0 0 20px;border-collapse:collapse;">
          <tr><td style="padding:8px 0;color:#64748b;font-size:13px;width:120px;">Location</td>
              <td style="padding:8px 0;color:#0f172a;font-size:14px;">{escape(location)}</td></tr>
          <tr><td style="padding:8px 0;color:#64748b;font-size:13px;">Entry</td>
              <td style="padding:8px 0;color:#0f172a;font-size:14px;">{escape(entry_label)}</td></tr>
        </table>
        {qr_html}
        <p style="margin:16px 0 0;padding:12px 16px;background:#ecfeff;border-radius:8px;color:#0e7490;font-size:14px;line-height:1.5;">
          Your original check-in QR will not check you out. Present this checkout QR at security.
        </p>
      </td></tr>
    </table>
  </td></tr></table>
</body></html>"""
    return subject, text_body, html_body


def build_delivery_checkout_qr_email(
    *,
    driver_name: str,
    delivery_number: str,
    goods_type: str,
    total_boxes: int,
    vehicle_number: str,
    vendor_name: str,
    hospital_name: str,
    entry_label: str,
    qr_cid: str | None = None,
    company_name: str = "Connitor",
    product_name: str = "Hospital Visitor Tracking System",
) -> tuple[str, str, str]:
    """Checkout QR emailed after delivery gate entry — scan after GRN to exit."""
    qr_html = ""
    qr_text = ""
    if qr_cid:
        qr_html = (
            f'<div style="text-align:center;margin:20px 0;">'
            f'<p style="margin:0 0 12px;font-size:12px;color:#0d9488;font-weight:600;text-transform:uppercase;">'
            f"Show at security to check out</p>"
            f'<img src="cid:{escape(qr_cid)}" alt="Delivery checkout QR" width="200" height="200" '
            f'style="border:2px solid #99f6e4;border-radius:8px;" />'
            f"</div>"
        )
        qr_text = (
            "\nAfter receiving/GRN is complete, show this checkout QR at security to exit.\n"
            "Do not use your check-in QR for exit.\n"
        )

    subject = f"{company_name} — Delivery checkout QR — {delivery_number}"
    text_body = (
        f"{company_name}\n{product_name}\n\n"
        f"Hello {driver_name},\n\n"
        f"Delivery {delivery_number} has entered the hospital gate.\n"
        f"Hospital: {hospital_name}\n"
        f"Distributor: {vendor_name}\n"
        f"Vehicle: {vehicle_number}\n"
        f"Goods: {goods_type} ({total_boxes} boxes)\n"
        f"Entry: {entry_label}\n"
        f"{qr_text}\n"
        f"— {company_name}"
    )
    html_body = f"""<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8" /><title>{escape(subject)}</title></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,Helvetica,sans-serif;color:#0f172a;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f1f5f9;padding:24px 12px;">
    <tr><td align="center">
      <table role="presentation" width="560" cellspacing="0" cellpadding="0" style="background:#ffffff;border-radius:12px;overflow:hidden;">
        <tr><td style="background:#0d9488;padding:20px 24px;color:#ffffff;">
          <p style="margin:0;font-size:12px;letter-spacing:0.08em;text-transform:uppercase;opacity:0.9;">{escape(company_name)}</p>
          <h1 style="margin:6px 0 0;font-size:20px;">Delivery checkout QR</h1>
        </td></tr>
        <tr><td style="padding:24px;">
          <p style="margin:0 0 16px;">Hello {escape(driver_name)},</p>
          <p style="margin:0 0 16px;color:#475569;">
            Delivery <strong>{escape(delivery_number)}</strong> is inside the hospital.
            Complete receiving/GRN, then show the QR below at security to exit.
          </p>
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:0 0 16px;font-size:14px;">
            <tr><td style="padding:8px 0;color:#64748b;">Hospital</td><td style="padding:8px 0;text-align:right;">{escape(hospital_name)}</td></tr>
            <tr><td style="padding:8px 0;color:#64748b;">Distributor</td><td style="padding:8px 0;text-align:right;">{escape(vendor_name)}</td></tr>
            <tr><td style="padding:8px 0;color:#64748b;">Vehicle</td><td style="padding:8px 0;text-align:right;">{escape(vehicle_number)}</td></tr>
            <tr><td style="padding:8px 0;color:#64748b;">Goods</td><td style="padding:8px 0;text-align:right;">{escape(goods_type)} ({total_boxes} boxes)</td></tr>
            <tr><td style="padding:8px 0;color:#64748b;">Entry</td><td style="padding:8px 0;text-align:right;">{escape(entry_label)}</td></tr>
          </table>
          {qr_html}
          <p style="margin:16px 0 0;padding:12px 16px;background:#ecfeff;border-radius:8px;color:#0e7490;font-size:14px;line-height:1.5;">
            Your original check-in QR will not check you out. Use this checkout QR after GRN.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>"""
    return subject, text_body, html_body


def build_online_appointment_email(
    *,
    recipient_name: str,
    doctor_name: str,
    appointment_date: str,
    meeting_url: str,
    doctor_feedback: str | None = None,
    is_host: bool = False,
    company_name: str = "Connitor",
    product_name: str = "Hospital Visitor Tracking System",
) -> tuple[str, str, str]:
    """Email with the video consultation link after online appointment approval."""
    feedback_html = ""
    feedback_text = ""
    if doctor_feedback and doctor_feedback.strip():
        feedback_text = f"\n\nMessage from your doctor:\n{doctor_feedback.strip()}\n"
        feedback_html = (
            f'<p style="margin:0 0 20px;color:#475569;line-height:1.6;background:#f8fafc;'
            f'border-left:4px solid #2563eb;padding:12px 16px;border-radius:6px;">'
            f"<strong>Message from your doctor:</strong><br/>{escape(doctor_feedback.strip())}</p>"
        )

    role_line = "host the online consultation" if is_host else "join your online consultation"
    subject = f"{company_name} — Online appointment approved — video consultation link"
    join_note = (
        "The room opens 15 minutes before the scheduled time. "
        "Open the link in Chrome, Edge, Safari or Firefox and allow camera and microphone access."
    )

    text_body = (
        f"{company_name}\n{product_name}\n\n"
        f"Hello {recipient_name},\n\n"
        f"Your online appointment with Dr. {doctor_name} on {appointment_date} is confirmed."
        f"{feedback_text}\n"
        f"Use this link to {role_line}:\n{meeting_url}\n\n"
        f"{join_note}\n\n"
        f"— {company_name}"
    )

    html_body = f"""<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8" /><title>{escape(subject)}</title></head>
<body style="margin:0;padding:0;background:#f0f4f8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table role="presentation" width="100%" style="background:#f0f4f8;padding:32px 16px;"><tr><td align="center">
    <table role="presentation" width="100%" style="max-width:520px;background:#fff;border-radius:12px;">
      <tr><td style="background:linear-gradient(135deg,#2563eb,#1d4ed8);padding:24px;text-align:center;">
        <h1 style="margin:0;color:#fff;font-size:22px;">Online Appointment Approved</h1>
      </td></tr>
      <tr><td style="padding:32px;">
        <p style="margin:0 0 12px;color:#334155;">Hello {escape(recipient_name)},</p>
        <p style="margin:0 0 20px;color:#64748b;line-height:1.6;">
          Your online visit with <strong>Dr. {escape(doctor_name)}</strong> on
          <strong>{escape(appointment_date)}</strong> is confirmed. No physical check-in is required.
        </p>
        {feedback_html}
        <div style="text-align:center;margin:24px 0;">
          <a href="{escape(meeting_url)}" style="display:inline-block;background:#2563eb;color:#fff;text-decoration:none;padding:14px 28px;border-radius:8px;font-weight:600;">
            {'Start Consultation' if is_host else 'Join Video Consultation'}
          </a>
        </div>
        <p style="margin:12px 0 0;color:#64748b;font-size:13px;line-height:1.5;">{escape(join_note)}</p>
        <p style="margin:20px 0 0;font-size:13px;color:#94a3b8;word-break:break-all;">{escape(meeting_url)}</p>
      </td></tr>
    </table>
  </td></tr></table>
</body></html>"""

    return subject, text_body, html_body


def build_doctor_approval_request_email(
    *,
    doctor_name: str,
    visitor_name: str,
    appointment_date: str,
    purpose: str,
    approval_url: str,
    company_name: str = "Connitor",
    product_name: str = "Hospital Visitor Tracking System",
    open_slot_request: bool = False,
    meeting_mode: str = "Offline",
) -> tuple[str, str, str]:
    """Email to doctor with one-tap approval link (primary channel when SMS/WhatsApp fail)."""
    subject = (
        f"{company_name} — Visitor wants a visiting slot"
        if open_slot_request
        else f"{company_name} — Approve appointment request"
    )
    purpose_line = purpose.strip() or "Not specified"
    intro_text = (
        f"{visitor_name} is requesting a visit slot with you."
        if open_slot_request
        else f"You have a new appointment request from {visitor_name}."
    )
    schedule_text = (
        "Date and time will be decided by you."
        if open_slot_request
        else appointment_date
    )
    when_label = "Schedule" if open_slot_request else "When"
    heading = "Visit slot request" if open_slot_request else "Appointment approval needed"
    mode_line = meeting_mode.strip() or "Offline"

    text_body = (
        f"{company_name}\n{product_name}\n\n"
        f"Hello Dr. {doctor_name},\n\n"
        f"{intro_text}\n"
        f"Visitor: {visitor_name}\n"
        f"{when_label}: {schedule_text}\n"
        f"Meeting mode: {mode_line}\n"
        f"Purpose: {purpose_line}\n\n"
        f"Approve or decline (one-time secure link, no login):\n{approval_url}\n\n"
        f"— {company_name}"
    )

    html_body = f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>{escape(subject)}</title>
</head>
<body style="margin:0;padding:0;background-color:#f0f4f8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#f0f4f8;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:520px;background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(15,23,42,0.08);">
          <tr>
            <td style="background:linear-gradient(135deg,#0d9488 0%,#0f766e 100%);padding:24px 32px;text-align:center;">
              <h1 style="margin:0;font-size:22px;font-weight:700;color:#ffffff;">{escape(heading)}</h1>
              <p style="margin:8px 0 0;font-size:13px;color:rgba(255,255,255,0.9);">{escape(product_name)}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              <p style="margin:0 0 12px;font-size:15px;color:#334155;">Hello Dr. {escape(doctor_name)},</p>
              <p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#64748b;">
                {escape(intro_text)}
              </p>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f8fafc;border-radius:8px;margin:0 0 24px;">
                <tr>
                  <td style="padding:16px 18px;font-size:14px;line-height:1.7;color:#475569;">
                    <strong style="color:#0f172a;">Visitor:</strong> {escape(visitor_name)}<br/>
                    <strong style="color:#0f172a;">{escape(when_label)}:</strong> {escape(schedule_text)}<br/>
                    <strong style="color:#0f172a;">Meeting mode:</strong> {escape(mode_line)}<br/>
                    <strong style="color:#0f172a;">Purpose:</strong> {escape(purpose_line)}
                  </td>
                </tr>
              </table>
              <div style="text-align:center;margin:8px 0 20px;">
                <a href="{escape(approval_url)}" style="display:inline-block;background:#0d9488;color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:8px;font-weight:600;font-size:15px;">
                  Review &amp; approve
                </a>
              </div>
              <p style="margin:0;font-size:12px;line-height:1.6;color:#94a3b8;word-break:break-all;">
                Or open this one-time link:<br/>{escape(approval_url)}
              </p>
              <p style="margin:16px 0 0;font-size:12px;color:#94a3b8;">
                This link does not require login and can be used only once.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>"""

    return subject, text_body, html_body


def build_ward_attendant_approval_request_email(
    *,
    ward_name: str,
    attendant_name: str,
    attendant_phone: str,
    attendant_email: str,
    relationship: str,
    patient_name: str,
    patient_mrn: str,
    ward_name_label: str,
    room_number: str,
    hospital_name: str,
    approval_url: str,
    company_name: str = "Connitor",
    product_name: str = "Hospital Visitor Tracking System",
) -> tuple[str, str, str]:
    """Email to ward admin with one-tap approval link for a family visit-pass request."""
    subject = f"{company_name} — Approve attendant visit pass request"
    relationship_line = relationship.strip() or "Not specified"
    location_bits = [p for p in (ward_name_label, f"Room {room_number}" if room_number else "") if p]
    location_line = " · ".join(location_bits) if location_bits else "Not listed"

    text_body = (
        f"{company_name}\n{product_name}\n\n"
        f"Hello {ward_name},\n\n"
        f"A family member requested an attendant visit pass.\n\n"
        f"Hospital: {hospital_name}\n"
        f"Visitor: {attendant_name}\n"
        f"Phone: {attendant_phone}\n"
        f"Email: {attendant_email}\n"
        f"Relationship: {relationship_line}\n"
        f"Patient: {patient_name} (MRN {patient_mrn})\n"
        f"Location: {location_line}\n\n"
        f"Approve or decline (one-time secure link, no login):\n{approval_url}\n\n"
        f"— {company_name}"
    )

    html_body = f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>{escape(subject)}</title>
</head>
<body style="margin:0;padding:0;background-color:#f0f4f8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#f0f4f8;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:520px;background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(15,23,42,0.08);">
          <tr>
            <td style="background:linear-gradient(135deg,#0d9488 0%,#0f766e 100%);padding:24px 32px;text-align:center;">
              <h1 style="margin:0;font-size:22px;font-weight:700;color:#ffffff;">Attendant pass approval needed</h1>
              <p style="margin:8px 0 0;font-size:13px;color:rgba(255,255,255,0.9);">{escape(product_name)}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              <p style="margin:0 0 12px;font-size:15px;color:#334155;">Hello {escape(ward_name)},</p>
              <p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#64748b;">
                <strong style="color:#0f172a;">{escape(attendant_name)}</strong> requested a family visit pass
                for an admitted patient at <strong style="color:#0f172a;">{escape(hospital_name)}</strong>.
              </p>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f8fafc;border-radius:8px;margin:0 0 24px;">
                <tr>
                  <td style="padding:16px 18px;font-size:14px;line-height:1.7;color:#475569;">
                    <strong style="color:#0f172a;">Visitor:</strong> {escape(attendant_name)}<br/>
                    <strong style="color:#0f172a;">Phone:</strong> {escape(attendant_phone)}<br/>
                    <strong style="color:#0f172a;">Email:</strong> {escape(attendant_email)}<br/>
                    <strong style="color:#0f172a;">Relationship:</strong> {escape(relationship_line)}<br/>
                    <strong style="color:#0f172a;">Patient:</strong> {escape(patient_name)} (MRN {escape(patient_mrn)})<br/>
                    <strong style="color:#0f172a;">Location:</strong> {escape(location_line)}
                  </td>
                </tr>
              </table>
              <div style="text-align:center;margin:8px 0 20px;">
                <a href="{escape(approval_url)}" style="display:inline-block;background:#0d9488;color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:8px;font-weight:600;font-size:15px;">
                  Review &amp; approve
                </a>
              </div>
              <p style="margin:0;font-size:12px;line-height:1.6;color:#94a3b8;word-break:break-all;">
                Or open this one-time link:<br/>{escape(approval_url)}
              </p>
              <p style="margin:16px 0 0;font-size:12px;color:#94a3b8;">
                This link does not require login and can be used only once. Approving issues the visit pass QR to the visitor by email.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>"""

    return subject, text_body, html_body


def build_delivery_exit_email(
    *,
    recipient_name: str,
    delivery_number: str,
    vendor_name: str,
    driver_name: str,
    vehicle_number: str,
    goods_type: str,
    total_boxes: int,
    hospital_name: str,
    entry_label: str,
    exit_label: str,
    duration_minutes: int | None,
    company_name: str = "Connitor",
    product_name: str = "Hospital Visitor Tracking System",
) -> tuple[str, str, str]:
    """Completion summary after driver exits the hospital gate."""
    duration_label = (
        f"{duration_minutes} minutes" if duration_minutes is not None else "—"
    )
    subject = f"{company_name} — Delivery completed — {delivery_number}"
    text_body = (
        f"{company_name}\n{product_name}\n\n"
        f"Hello {recipient_name},\n\n"
        f"Delivery {delivery_number} has exited the hospital gate.\n\n"
        f"Hospital: {hospital_name}\n"
        f"Distributor: {vendor_name}\n"
        f"Driver: {driver_name}\n"
        f"Vehicle: {vehicle_number}\n"
        f"Goods: {goods_type} ({total_boxes} boxes)\n"
        f"Entry: {entry_label}\n"
        f"Exit: {exit_label}\n"
        f"Time inside: {duration_label}\n\n"
        f"— {company_name}"
    )
    html_body = f"""<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8" /><title>{escape(subject)}</title></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,Helvetica,sans-serif;color:#0f172a;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f1f5f9;padding:24px 12px;">
    <tr><td align="center">
      <table role="presentation" width="560" cellspacing="0" cellpadding="0" style="background:#ffffff;border-radius:12px;overflow:hidden;">
        <tr><td style="background:#0d9488;padding:20px 24px;color:#ffffff;">
          <p style="margin:0;font-size:12px;letter-spacing:0.08em;text-transform:uppercase;opacity:0.9;">{escape(company_name)}</p>
          <h1 style="margin:6px 0 0;font-size:20px;">Delivery completed</h1>
        </td></tr>
        <tr><td style="padding:24px;">
          <p style="margin:0 0 16px;">Hello {escape(recipient_name)},</p>
          <p style="margin:0 0 16px;color:#475569;">
            Delivery <strong>{escape(delivery_number)}</strong> has exited the hospital gate.
          </p>
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:0 0 16px;font-size:14px;">
            <tr><td style="padding:8px 0;color:#64748b;">Hospital</td><td style="padding:8px 0;text-align:right;">{escape(hospital_name)}</td></tr>
            <tr><td style="padding:8px 0;color:#64748b;">Distributor</td><td style="padding:8px 0;text-align:right;">{escape(vendor_name)}</td></tr>
            <tr><td style="padding:8px 0;color:#64748b;">Driver</td><td style="padding:8px 0;text-align:right;">{escape(driver_name)}</td></tr>
            <tr><td style="padding:8px 0;color:#64748b;">Vehicle</td><td style="padding:8px 0;text-align:right;">{escape(vehicle_number)}</td></tr>
            <tr><td style="padding:8px 0;color:#64748b;">Goods</td><td style="padding:8px 0;text-align:right;">{escape(goods_type)} ({total_boxes} boxes)</td></tr>
            <tr><td style="padding:8px 0;color:#64748b;">Entry</td><td style="padding:8px 0;text-align:right;">{escape(entry_label)}</td></tr>
            <tr><td style="padding:8px 0;color:#64748b;">Exit</td><td style="padding:8px 0;text-align:right;">{escape(exit_label)}</td></tr>
            <tr><td style="padding:8px 0;color:#64748b;">Time inside</td><td style="padding:8px 0;text-align:right;font-weight:700;">{escape(duration_label)}</td></tr>
          </table>
          <p style="margin:0;font-size:12px;color:#94a3b8;">— {escape(company_name)}</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>"""
    return subject, text_body, html_body


def build_attendant_visit_exit_email(
    *,
    recipient_name: str,
    attendant_name: str,
    patient_name: str,
    mrn: str,
    pass_number: str,
    ward_name: str | None,
    room_number: str | None,
    hospital_name: str,
    entry_label: str,
    exit_label: str,
    duration_minutes: int | None,
    company_name: str = "Connitor",
    product_name: str = "Hospital Visitor Tracking System",
) -> tuple[str, str, str]:
    """Summary email when an attendant checks out at security."""
    duration_label = (
        f"{duration_minutes} minutes" if duration_minutes is not None else "—"
    )
    location = " / ".join(p for p in (ward_name, room_number) if p) or "—"
    subject = f"{company_name} — Attendant visit completed — {pass_number}"
    text_body = (
        f"{company_name}\n{product_name}\n\n"
        f"Hello {recipient_name},\n\n"
        f"Attendant {attendant_name} has checked out of {hospital_name}.\n\n"
        f"Pass: {pass_number}\n"
        f"Patient: {patient_name} (MRN {mrn})\n"
        f"Location: {location}\n"
        f"Entry: {entry_label}\n"
        f"Exit: {exit_label}\n"
        f"Time inside: {duration_label}\n\n"
        f"— {company_name}"
    )
    html_body = f"""<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8" /><title>{escape(subject)}</title></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,Helvetica,sans-serif;color:#0f172a;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f1f5f9;padding:24px 12px;">
    <tr><td align="center">
      <table role="presentation" width="560" cellspacing="0" cellpadding="0" style="background:#ffffff;border-radius:12px;overflow:hidden;">
        <tr><td style="background:#0f766e;padding:20px 24px;color:#ffffff;">
          <p style="margin:0;font-size:12px;letter-spacing:0.08em;text-transform:uppercase;opacity:0.9;">{escape(company_name)}</p>
          <h1 style="margin:6px 0 0;font-size:20px;">Attendant visit completed</h1>
        </td></tr>
        <tr><td style="padding:24px;">
          <p style="margin:0 0 16px;">Hello {escape(recipient_name)},</p>
          <p style="margin:0 0 16px;color:#475569;">
            <strong>{escape(attendant_name)}</strong> has checked out at security.
          </p>
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:0 0 16px;font-size:14px;">
            <tr><td style="padding:8px 0;color:#64748b;">Pass</td><td style="padding:8px 0;text-align:right;">{escape(pass_number)}</td></tr>
            <tr><td style="padding:8px 0;color:#64748b;">Patient</td><td style="padding:8px 0;text-align:right;">{escape(patient_name)} (MRN {escape(mrn)})</td></tr>
            <tr><td style="padding:8px 0;color:#64748b;">Location</td><td style="padding:8px 0;text-align:right;">{escape(location)}</td></tr>
            <tr><td style="padding:8px 0;color:#64748b;">Hospital</td><td style="padding:8px 0;text-align:right;">{escape(hospital_name)}</td></tr>
            <tr><td style="padding:8px 0;color:#64748b;">Entry</td><td style="padding:8px 0;text-align:right;">{escape(entry_label)}</td></tr>
            <tr><td style="padding:8px 0;color:#64748b;">Exit</td><td style="padding:8px 0;text-align:right;">{escape(exit_label)}</td></tr>
            <tr><td style="padding:8px 0;color:#64748b;">Time inside</td><td style="padding:8px 0;text-align:right;font-weight:700;">{escape(duration_label)}</td></tr>
          </table>
          <p style="margin:0;font-size:12px;color:#94a3b8;">— {escape(company_name)}</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>"""
    return subject, text_body, html_body


def build_sales_meeting_confirm_email(
    *,
    visitor_name: str,
    doctor_name: str,
    slot_time: str,
    pass_id: str,
    started_url: str,
    not_attended_url: str,
    company_name: str = "Connitor",
    product_name: str = "Hospital Visitor Tracking System",
) -> tuple[str, str, str]:
    """Email to the sales representative after security check-in."""
    subject = f"{company_name} — Confirm your meeting attendance"
    text_body = (
        f"{company_name}\n{product_name}\n\n"
        f"Hello {visitor_name},\n\n"
        f"Security has checked you in. Please confirm whether the meeting started.\n\n"
        f"Pass ID: {pass_id}\n"
        f"Doctor: {doctor_name}\n"
        f"Slot: {slot_time}\n\n"
        f"Meeting started:\n{started_url}\n\n"
        f"Meeting not attended:\n{not_attended_url}\n\n"
        "This one-time link expires after the confirmation window.\n\n"
        f"— {company_name}"
    )
    html_body = f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>{escape(subject)}</title>
</head>
<body style="margin:0;padding:0;background-color:#f0f4f8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#f0f4f8;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:520px;background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(15,23,42,0.08);">
          <tr>
            <td style="background:linear-gradient(135deg,#0d9488 0%,#0f766e 100%);padding:24px 32px;text-align:center;">
              <h1 style="margin:0;font-size:22px;font-weight:700;color:#ffffff;">Confirm meeting attendance</h1>
              <p style="margin:8px 0 0;font-size:13px;color:rgba(255,255,255,0.9);">{escape(product_name)}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              <p style="margin:0 0 12px;font-size:15px;color:#334155;">Hello {escape(visitor_name)},</p>
              <p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#64748b;">
                Security has completed your check-in. Please confirm whether the meeting with the doctor started.
              </p>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f8fafc;border-radius:8px;margin:0 0 24px;">
                <tr>
                  <td style="padding:16px 18px;font-size:14px;line-height:1.7;color:#475569;">
                    <strong style="color:#0f172a;">Pass ID:</strong> {escape(pass_id)}<br/>
                    <strong style="color:#0f172a;">Doctor:</strong> {escape(doctor_name)}<br/>
                    <strong style="color:#0f172a;">Slot:</strong> {escape(slot_time)}
                  </td>
                </tr>
              </table>
              <div style="text-align:center;margin:8px 0 12px;">
                <a href="{escape(started_url)}" style="display:inline-block;background:#0d9488;color:#ffffff;text-decoration:none;padding:14px 24px;border-radius:8px;font-weight:600;font-size:15px;">
                  Meeting Started
                </a>
              </div>
              <div style="text-align:center;margin:0 0 20px;">
                <a href="{escape(not_attended_url)}" style="display:inline-block;background:#ffffff;color:#b91c1c;text-decoration:none;padding:14px 24px;border-radius:8px;font-weight:600;font-size:15px;border:1px solid #fecaca;">
                  Meeting Not Attended
                </a>
              </div>
              <p style="margin:0;font-size:12px;line-height:1.6;color:#94a3b8;">
                These links are one-time and expire after the confirmation window.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>"""
    return subject, text_body, html_body


def build_sales_meeting_outcome_email(
    *,
    visitor_name: str,
    doctor_name: str,
    slot_time: str,
    pass_id: str,
    outcome: str,
    company_contact_name: str = "",
    company_name: str = "Connitor",
    product_name: str = "Hospital Visitor Tracking System",
) -> tuple[str, str, str]:
    """Final attendance outcome emailed to the sales person's company."""
    subject = f"{company_name} — Sales visit attendance: {outcome}"
    greeting = company_contact_name.strip() or "Team"
    text_body = (
        f"{company_name}\n{product_name}\n\n"
        f"Hello {greeting},\n\n"
        f"Attendance outcome for a sales visit:\n"
        f"Pass ID: {pass_id}\n"
        f"Representative: {visitor_name}\n"
        f"Doctor: {doctor_name}\n"
        f"Date / time: {slot_time}\n"
        f"Outcome: {outcome}\n\n"
        f"— {company_name}"
    )
    html_body = f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>{escape(subject)}</title>
</head>
<body style="margin:0;padding:0;background-color:#f0f4f8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#f0f4f8;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:520px;background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(15,23,42,0.08);">
          <tr>
            <td style="background:linear-gradient(135deg,#0d9488 0%,#0f766e 100%);padding:24px 32px;text-align:center;">
              <h1 style="margin:0;font-size:22px;font-weight:700;color:#ffffff;">Sales visit attendance</h1>
              <p style="margin:8px 0 0;font-size:13px;color:rgba(255,255,255,0.9);">{escape(product_name)}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              <p style="margin:0 0 12px;font-size:15px;color:#334155;">Hello {escape(greeting)},</p>
              <p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#64748b;">
                Attendance has been recorded for a sales representative visit.
              </p>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f8fafc;border-radius:8px;margin:0 0 16px;">
                <tr>
                  <td style="padding:16px 18px;font-size:14px;line-height:1.7;color:#475569;">
                    <strong style="color:#0f172a;">Pass ID:</strong> {escape(pass_id)}<br/>
                    <strong style="color:#0f172a;">Representative:</strong> {escape(visitor_name)}<br/>
                    <strong style="color:#0f172a;">Doctor:</strong> {escape(doctor_name)}<br/>
                    <strong style="color:#0f172a;">Date / time:</strong> {escape(slot_time)}<br/>
                    <strong style="color:#0f172a;">Outcome:</strong> {escape(outcome)}
                  </td>
                </tr>
              </table>
              <p style="margin:0;font-size:12px;color:#94a3b8;">— {escape(company_name)}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>"""
    return subject, text_body, html_body


def build_visit_extension_email(
    *,
    doctor_name: str,
    visitor_name: str,
    expected_end: str,
    extend_url: str,
    company_name: str = "Connitor",
    product_name: str = "Hospital Visitor Tracking System",
) -> tuple[str, str, str]:
    subject = f"{company_name} — Extend this visit?"
    text_body = (
        f"{company_name}\n{product_name}\n\n"
        f"Hello Dr. {doctor_name},\n\n"
        f"Your visit with {visitor_name} is scheduled to end at {expected_end}.\n"
        f"If you need more time, open this one-time link and choose how many minutes to add:\n"
        f"{extend_url}\n\n"
        "Until then, security should hold the next visitor for this slot.\n\n"
        f"— {company_name}"
    )
    html_body = f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>{escape(subject)}</title>
</head>
<body style="margin:0;padding:0;background-color:#f0f4f8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#f0f4f8;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:520px;background-color:#ffffff;border-radius:12px;overflow:hidden;">
          <tr>
            <td style="background:linear-gradient(135deg,#0d9488 0%,#0f766e 100%);padding:24px 32px;text-align:center;">
              <h1 style="margin:0;font-size:22px;font-weight:700;color:#ffffff;">Extend this visit?</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              <p style="margin:0 0 12px;font-size:15px;color:#334155;">Hello Dr. {escape(doctor_name)},</p>
              <p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#64748b;">
                Your visit with <strong>{escape(visitor_name)}</strong> is scheduled to end at
                <strong>{escape(expected_end)}</strong>. If you need more time, confirm an extension.
              </p>
              <div style="text-align:center;margin:8px 0 20px;">
                <a href="{escape(extend_url)}" style="display:inline-block;background:#0d9488;color:#ffffff;text-decoration:none;padding:14px 24px;border-radius:8px;font-weight:600;font-size:15px;">
                  Extend visit
                </a>
              </div>
              <p style="margin:0;font-size:12px;line-height:1.6;color:#94a3b8;">
                This link is one-time. Until you act, security should hold the next visitor.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>"""
    return subject, text_body, html_body


def build_visit_extended_security_email(
    *,
    doctor_name: str,
    visitor_name: str,
    extra_minutes: int,
    expected_end: str,
    company_name: str = "Connitor",
    product_name: str = "Hospital Visitor Tracking System",
) -> tuple[str, str, str]:
    subject = f"{company_name} — Visit extended {extra_minutes} minutes"
    text_body = (
        f"{company_name}\n{product_name}\n\n"
        f"Dr. {doctor_name} extended the visit with {visitor_name} by {extra_minutes} minutes.\n"
        f"New expected end: {expected_end}.\n"
        "Hold the next visitor for this doctor until that time, or until checkout.\n\n"
        f"— {company_name}"
    )
    html_body = f"""<!DOCTYPE html>
<html lang="en"><body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#334155;">
  <p>Dr. {escape(doctor_name)} extended the visit with <strong>{escape(visitor_name)}</strong>
  by <strong>{extra_minutes} minutes</strong>.</p>
  <p>New expected end: <strong>{escape(expected_end)}</strong>.</p>
  <p>Hold the next visitor for this doctor until that time, or until checkout.</p>
  <p style="color:#94a3b8;font-size:12px;">— {escape(company_name)}</p>
</body></html>"""
    return subject, text_body, html_body


def build_next_visitor_delayed_email(
    *,
    visitor_name: str,
    doctor_name: str,
    extra_minutes: int,
    new_slot: str,
    company_name: str = "Connitor",
    product_name: str = "Hospital Visitor Tracking System",
) -> tuple[str, str, str]:
    subject = f"{company_name} — Your appointment has been rescheduled"
    text_body = (
        f"{company_name}\n{product_name}\n\n"
        f"Hello {visitor_name},\n\n"
        f"Your visit with Dr. {doctor_name} has been rescheduled because the ongoing meeting "
        f"was extended by {extra_minutes} minutes.\n"
        f"New time: {new_slot}.\n"
        f"Please arrive for this new time. Security cannot check you in before it starts.\n\n"
        f"— {company_name}"
    )
    html_body = f"""<!DOCTYPE html>
<html lang="en"><body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#334155;">
  <p>Hello {escape(visitor_name)},</p>
  <p>Your visit with Dr. {escape(doctor_name)} has been <strong>rescheduled</strong> because
  the ongoing meeting was extended by <strong>{extra_minutes} minutes</strong>.</p>
  <p>New time: <strong>{escape(new_slot)}</strong>.</p>
  <p>Please arrive for this new time. Security cannot check you in before it starts.</p>
  <p style="color:#94a3b8;font-size:12px;">— {escape(company_name)}</p>
</body></html>"""
    return subject, text_body, html_body


