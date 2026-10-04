import logging
import smtplib
from email.mime.base import MIMEBase
from email.mime.image import MIMEImage
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email import encoders

import boto3
import httpx

from app.config import (
    check_meta_whatsapp_health,
    get_settings,
    is_aws_sns_configured,
    is_meta_whatsapp_configured,
    is_pywhatkit_configured,
    is_test_mode_enabled,
    is_twilio_configured,
    is_twilio_whatsapp_configured,
    is_wapblaster_configured,
    resolves_to_whatsapp_notifications,
    twilio_whatsapp_from_address,
    whatsapp_provider_order,
)
from app.services.wapblaster_client import (
    message_to_template_fields,
    send_wapblaster_appointment_approval,
    send_wapblaster_meeting_pass,
    send_wapblaster_phone_otp,
    send_wapblaster_template,
    send_wapblaster_text,
)
from app.utils.phone import normalize_phone
from app.email_templates import (
    build_account_credentials_email,
    build_attendant_checkout_qr_email,
    build_attendant_pass_email,
    build_booking_confirmation_email,
    build_check_in_otp_email,
    build_delivery_assignment_email,
    build_delivery_checkout_qr_email,
    build_doctor_approval_request_email,
    build_gate_pass_email,
    build_login_otp_email,
    build_notification_email,
    build_online_appointment_email,
    build_registration_otp_email,
    build_sales_meeting_confirm_email,
    build_sales_meeting_outcome_email,
    build_visit_extension_email,
    build_visit_extended_security_email,
    build_next_visitor_delayed_email,
    build_ward_attendant_approval_request_email,
)

logger = logging.getLogger(__name__)


def meta_template_language() -> dict[str, str]:
    return {"code": get_settings().whatsapp_template_language}


def build_doctor_approval_whatsapp_message(
    *,
    visitor_name: str,
    appointment_label: str,
    purpose: str,
    approval_url: str,
    approval_code: str | None = None,
) -> str:
    """Full doctor WhatsApp text: visitor, datetime, purpose, and one-time approval link."""
    lines = [
        "Connitor: New appointment request",
        "",
        f"Visitor: {visitor_name}",
        f"Date & time: {appointment_label}",
        f"Purpose: {purpose}",
        "",
        "Approve or decline (secure one-time link, no login):",
        approval_url,
    ]
    if approval_code:
        lines.extend(
            [
                "",
                f"Or reply YES {approval_code} / NO {approval_code} on WhatsApp.",
            ]
        )
    return "\n".join(lines)


GATE_PASS_QR_CID = "checkin-qr"
DELIVERY_QR_CID = "delivery-checkin-qr"
DELIVERY_CHECKOUT_QR_CID = "delivery-checkout-qr"
ATTENDANT_PASS_QR_CID = "attendant-pass-qr"
ATTENDANT_CHECKOUT_QR_CID = "attendant-checkout-qr"


class EmailService:
    def _send_via_zeptomail_api(
        self,
        to_email: str,
        subject: str,
        text_body: str,
        html_body: str,
        *,
        attachments: list[dict[str, str]] | None = None,
        inline_images: list[dict[str, str]] | None = None,
    ) -> None:
        settings = get_settings()
        api_url = settings.zeptomail_api_url
        if not api_url or not settings.smtp_password or not settings.smtp_from:
            raise ValueError("ZeptoMail API not configured")

        payload = {
            "from": {"address": settings.smtp_from, "name": settings.email_from_name},
            "to": [{"email_address": {"address": to_email}}],
            "subject": subject,
            "htmlbody": html_body,
            "textbody": text_body,
        }
        if attachments:
            payload["attachments"] = attachments
        if inline_images:
            payload["inline_images"] = inline_images
        headers = {
            "Accept": "application/json",
            "Content-Type": "application/json",
            "Authorization": f"Zoho-enczapikey {settings.smtp_password}",
        }
        response = httpx.post(api_url, json=payload, headers=headers, timeout=30)
        if response.status_code not in (200, 201):
            logger.error("ZeptoMail API error %s: %s", response.status_code, response.text)
            response.raise_for_status()
        data = response.json()
        logger.info(
            "ZeptoMail API accepted email to %s (request_id=%s)",
            to_email,
            data.get("request_id"),
        )

    def _send_via_smtp(
        self,
        to_email: str,
        subject: str,
        text_body: str,
        html_body: str,
        *,
        attachments: list[tuple[str, bytes, str]] | None = None,
        inline_images: list[tuple[str, bytes, str]] | None = None,
    ) -> None:
        settings = get_settings()
        has_inline = bool(inline_images)
        has_attachments = bool(attachments)

        if has_inline:
            message = MIMEMultipart("mixed" if has_attachments else "related")
            related = MIMEMultipart("related")
            body_part = MIMEMultipart("alternative")
            body_part.attach(MIMEText(text_body, "plain"))
            body_part.attach(MIMEText(html_body, "html"))
            related.attach(body_part)
            for cid, content, mime_type in inline_images or []:
                subtype = mime_type.split("/")[-1].split(";")[0].strip()
                if mime_type.startswith("image/"):
                    part = MIMEImage(content, _subtype=subtype)
                else:
                    maintype, _, sub = mime_type.partition("/")
                    part = MIMEBase(maintype, sub.split(";")[0].strip())
                    part.set_payload(content)
                    encoders.encode_base64(part)
                part.add_header("Content-ID", f"<{cid}>")
                part.add_header("Content-Disposition", "inline", filename=f"{cid}.png")
                related.attach(part)
            if has_attachments:
                message.attach(related)
            else:
                message = related
        else:
            message = MIMEMultipart("mixed" if has_attachments else "alternative")
            body_part = MIMEMultipart("alternative")
            body_part.attach(MIMEText(text_body, "plain"))
            body_part.attach(MIMEText(html_body, "html"))
            message.attach(body_part)

        if has_attachments:
            if has_inline:
                for filename, content, mime_type in attachments or []:
                    self._attach_file_part(message, filename, content, mime_type)
            else:
                for filename, content, mime_type in attachments or []:
                    self._attach_file_part(message, filename, content, mime_type)

        message["From"] = f"{settings.email_from_name} <{settings.smtp_from}>"
        message["To"] = to_email
        message["Subject"] = subject

        if settings.smtp_use_ssl:
            with smtplib.SMTP_SSL(settings.smtp_host, settings.smtp_port, timeout=30) as server:
                if settings.smtp_user and settings.smtp_password:
                    server.login(settings.smtp_user, settings.smtp_password)
                server.sendmail(settings.smtp_from, [to_email], message.as_string())
        else:
            with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=30) as server:
                if settings.smtp_use_tls:
                    server.starttls()
                if settings.smtp_user and settings.smtp_password:
                    server.login(settings.smtp_user, settings.smtp_password)
                server.sendmail(settings.smtp_from, [to_email], message.as_string())
        logger.info("SMTP accepted email to %s", to_email)

    @staticmethod
    def _attach_file_part(
        message: MIMEMultipart,
        filename: str,
        content: bytes,
        mime_type: str,
    ) -> None:
        if mime_type.startswith("text/calendar"):
            part = MIMEBase("text", "calendar")
        else:
            maintype, _, subtype = mime_type.partition("/")
            part = MIMEBase(maintype, subtype.split(";")[0].strip())
        part.set_payload(content)
        encoders.encode_base64(part)
        part.add_header("Content-Disposition", f'attachment; filename="{filename}"')
        if mime_type.startswith("text/calendar"):
            part.add_header("Content-Class", "urn:content-classes:calendarmessage")
        message.attach(part)

    def _deliver_email(
        self,
        to_email: str,
        subject: str,
        text_body: str,
        html_body: str,
        *,
        context: str = "email",
        attachments: list[tuple[str, bytes, str]] | None = None,
        inline_images: list[tuple[str, bytes, str]] | None = None,
        force: bool = False,
    ) -> None:
        settings = get_settings()
        if not force and not settings.email_notifications_enabled:
            logger.info(
                "EMAIL_NOTIFICATIONS_ENABLED=false; skipping %s to %s (WhatsApp/SMS is primary)",
                context,
                to_email,
            )
            return

        if is_test_mode_enabled(settings):
            logger.info("[HVTS_TEST_MODE] Sending %s to %s: %s", context, to_email, subject)

        if not settings.smtp_from:
            logger.warning("SMTP not configured; %s not sent to %s", context, to_email)
            raise RuntimeError("Email is not configured. Set SMTP_FROM and ZeptoMail/SMTP settings.")

        import base64

        zepto_attachments = None
        if attachments and settings.zeptomail_api_url:
            zepto_attachments = [
                {
                    "name": filename,
                    "content": base64.b64encode(content).decode("ascii"),
                    "mime_type": mime_type,
                }
                for filename, content, mime_type in attachments
            ]

        zepto_inline = None
        if inline_images and settings.zeptomail_api_url:
            zepto_inline = [
                {
                    "cid": cid,
                    "content": base64.b64encode(content).decode("ascii"),
                    "mime_type": mime_type,
                }
                for cid, content, mime_type in inline_images
            ]

        if settings.zeptomail_api_url:
            self._send_via_zeptomail_api(
                to_email,
                subject,
                text_body,
                html_body,
                attachments=zepto_attachments,
                inline_images=zepto_inline,
            )
        elif settings.smtp_host:
            self._send_via_smtp(
                to_email,
                subject,
                text_body,
                html_body,
                attachments=attachments,
                inline_images=inline_images,
            )
        else:
            logger.warning("No email transport configured; %s not sent to %s", context, to_email)
            raise RuntimeError("Email transport is not configured.")

    def send_otp(self, to_email: str, otp: str) -> None:
        settings = get_settings()
        subject, text_body, html_body = build_login_otp_email(
            otp,
            company_name=settings.email_from_name,
            product_name=settings.email_product_name,
        )
        try:
            self._deliver_email(
                to_email, subject, text_body, html_body, context="login OTP", force=True
            )
        except Exception as exc:
            logger.error("Failed to send OTP email to %s: %s", to_email, exc)
            raise

    def send_registration_otp(self, to_email: str, otp: str) -> None:
        settings = get_settings()
        subject, text_body, html_body = build_registration_otp_email(
            otp,
            company_name=settings.email_from_name,
            product_name=settings.email_product_name,
            validity_minutes=10,
        )
        try:
            self._deliver_email(
                to_email,
                subject,
                text_body,
                html_body,
                context="registration OTP",
                force=True,
            )
        except Exception as exc:
            logger.error("Failed to send registration OTP to %s: %s", to_email, exc)
            raise

    def send_account_credentials(
        self,
        to_email: str,
        *,
        name: str,
        password: str,
        role: str,
        department_name: str | None = None,
        login_url: str | None = None,
    ) -> None:
        settings = get_settings()
        role_labels = {
            "SUPER_ADMIN": "Super Admin",
            "CHAIN_ADMIN": "Chain Admin",
            "BRANCH_ADMIN": "Branch Admin",
            "HOSPITAL_ADMIN": "Hospital Admin",
            "DEPARTMENT_ADMIN": "Department Admin",
            "SUB_DEPARTMENT_ADMIN": "Sub-Department Admin",
            "STAFF": "Staff",
            "SECURITY": "Security",
            "SECURITY_SUPERVISOR": "Security Supervisor",
            "DELIVERY_AGENT": "Driver",
        }
        role_label = role_labels.get(role, role.replace("_", " ").title())
        resolved_login_url = login_url or f"{settings.frontend_url.rstrip('/')}/auth/login"
        subject, text_body, html_body = build_account_credentials_email(
            name=name,
            email=to_email,
            password=password,
            role_label=role_label,
            login_url=resolved_login_url,
            department_name=department_name,
            company_name=settings.email_from_name,
            product_name=settings.email_product_name,
        )

        if is_test_mode_enabled(settings):
            logger.info(
                "[HVTS_TEST_MODE] Account credentials for %s (%s): sending email",
                to_email,
                role_label,
            )

        try:
            self._deliver_email(
                to_email,
                subject,
                text_body,
                html_body,
                context="account credentials",
                force=True,
            )
        except Exception as exc:
            logger.error("Failed to send account credentials to %s: %s", to_email, exc)
            raise

    def send_notification(self, to_email: str, subject: str, message: str) -> None:
        settings = get_settings()
        title = subject.split("—")[-1].strip() if "—" in subject else subject
        text_subject, text_body, html_body = build_notification_email(
            title,
            message,
            company_name=settings.email_from_name,
            product_name=settings.email_product_name,
        )
        try:
            self._deliver_email(
                to_email,
                text_subject,
                text_body,
                html_body,
                context="notification",
            )
        except Exception as exc:
            logger.error("Failed to send notification email to %s: %s", to_email, exc)
            raise

    def send_doctor_approval_request_email(
        self,
        to_email: str,
        *,
        doctor_name: str,
        visitor_name: str,
        appointment_date: str,
        purpose: str,
        approval_url: str,
        open_slot_request: bool = False,
        meeting_mode: str = "Offline",
    ) -> None:
        """Send doctor a one-tap approval link by email (works when SMS/WhatsApp are down)."""
        settings = get_settings()
        subject, text_body, html_body = build_doctor_approval_request_email(
            doctor_name=doctor_name,
            visitor_name=visitor_name,
            appointment_date=appointment_date,
            purpose=purpose,
            approval_url=approval_url,
            company_name=settings.email_from_name,
            product_name=settings.email_product_name,
            open_slot_request=open_slot_request,
            meeting_mode=meeting_mode,
        )
        try:
            self._deliver_email(
                to_email,
                subject,
                text_body,
                html_body,
                context="doctor approval request",
            )
        except Exception as exc:
            logger.error("Failed to send doctor approval email to %s: %s", to_email, exc)
            raise

    def send_sales_meeting_confirm_email(
        self,
        to_email: str,
        *,
        pass_id: str,
        visitor_name: str,
        doctor_name: str,
        slot_time: str,
        started_url: str,
        not_attended_url: str,
    ) -> None:
        settings = get_settings()
        subject, text_body, html_body = build_sales_meeting_confirm_email(
            visitor_name=visitor_name,
            doctor_name=doctor_name,
            slot_time=slot_time,
            pass_id=pass_id,
            started_url=started_url,
            not_attended_url=not_attended_url,
            company_name=settings.email_from_name,
            product_name=settings.email_product_name,
        )
        try:
            self._deliver_email(
                to_email,
                subject,
                text_body,
                html_body,
                context="sales meeting confirmation",
            )
        except Exception as exc:
            logger.error("Failed to send sales meeting confirm email to %s: %s", to_email, exc)
            raise

    def send_sales_meeting_outcome_email(
        self,
        to_email: str,
        *,
        pass_id: str,
        visitor_name: str,
        doctor_name: str,
        slot_time: str,
        outcome: str,
        company_name: str = "",
    ) -> None:
        settings = get_settings()
        subject, text_body, html_body = build_sales_meeting_outcome_email(
            visitor_name=visitor_name,
            doctor_name=doctor_name,
            slot_time=slot_time,
            pass_id=pass_id,
            outcome=outcome,
            company_contact_name=company_name,
            company_name=settings.email_from_name,
            product_name=settings.email_product_name,
        )
        try:
            self._deliver_email(
                to_email,
                subject,
                text_body,
                html_body,
                context="sales meeting outcome",
            )
        except Exception as exc:
            logger.error("Failed to send sales meeting outcome email to %s: %s", to_email, exc)
            raise

    def send_visit_extension_email(
        self,
        to_email: str,
        *,
        doctor_name: str,
        visitor_name: str,
        expected_end: str,
        extend_url: str,
    ) -> None:
        settings = get_settings()
        subject, text_body, html_body = build_visit_extension_email(
            doctor_name=doctor_name,
            visitor_name=visitor_name,
            expected_end=expected_end,
            extend_url=extend_url,
            company_name=settings.email_from_name,
            product_name=settings.email_product_name,
        )
        self._deliver_email(to_email, subject, text_body, html_body, context="visit extension")

    def send_visit_extended_security_email(
        self,
        to_email: str,
        *,
        doctor_name: str,
        visitor_name: str,
        extra_minutes: int,
        expected_end: str,
    ) -> None:
        settings = get_settings()
        subject, text_body, html_body = build_visit_extended_security_email(
            doctor_name=doctor_name,
            visitor_name=visitor_name,
            extra_minutes=extra_minutes,
            expected_end=expected_end,
            company_name=settings.email_from_name,
            product_name=settings.email_product_name,
        )
        self._deliver_email(to_email, subject, text_body, html_body, context="visit extended security")

    def send_next_visitor_delayed_email(
        self,
        to_email: str,
        *,
        visitor_name: str,
        doctor_name: str,
        extra_minutes: int,
        new_slot: str,
    ) -> None:
        settings = get_settings()
        subject, text_body, html_body = build_next_visitor_delayed_email(
            visitor_name=visitor_name,
            doctor_name=doctor_name,
            extra_minutes=extra_minutes,
            new_slot=new_slot,
            company_name=settings.email_from_name,
            product_name=settings.email_product_name,
        )
        self._deliver_email(to_email, subject, text_body, html_body, context="next visitor delayed")

    def send_ward_attendant_approval_request_email(
        self,
        to_email: str,
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
    ) -> None:
        """Send ward admin a one-tap approval link for a family visit-pass request."""
        settings = get_settings()
        subject, text_body, html_body = build_ward_attendant_approval_request_email(
            ward_name=ward_name,
            attendant_name=attendant_name,
            attendant_phone=attendant_phone,
            attendant_email=attendant_email,
            relationship=relationship,
            patient_name=patient_name,
            patient_mrn=patient_mrn,
            ward_name_label=ward_name_label,
            room_number=room_number,
            hospital_name=hospital_name,
            approval_url=approval_url,
            company_name=settings.email_from_name,
            product_name=settings.email_product_name,
        )
        try:
            self._deliver_email(
                to_email,
                subject,
                text_body,
                html_body,
                context="ward attendant approval request",
            )
        except Exception as exc:
            logger.error("Failed to send ward attendant approval email to %s: %s", to_email, exc)
            raise

    def send_notification_with_attachment(
        self,
        to_email: str,
        subject: str,
        message: str,
        *,
        attachment_name: str,
        attachment_content: bytes,
        attachment_mime_type: str,
    ) -> None:
        settings = get_settings()
        title = subject.split("—")[-1].strip() if "—" in subject else subject
        text_subject, text_body, html_body = build_notification_email(
            title,
            message,
            company_name=settings.email_from_name,
            product_name=settings.email_product_name,
        )
        try:
            self._deliver_email(
                to_email,
                text_subject,
                text_body,
                html_body,
                context="calendar invite",
                attachments=[(attachment_name, attachment_content, attachment_mime_type)],
            )
        except Exception as exc:
            logger.error("Failed to send calendar invite email to %s: %s", to_email, exc)
            raise

    def send_check_in_otp(
        self,
        to_email: str,
        otp: str,
        *,
        visitor_name: str,
        doctor_name: str,
        appointment_date: str,
        doctor_feedback: str | None = None,
    ) -> None:
        settings = get_settings()
        subject, text_body, html_body = build_check_in_otp_email(
            otp,
            visitor_name=visitor_name,
            doctor_name=doctor_name,
            appointment_date=appointment_date,
            doctor_feedback=doctor_feedback,
            company_name=settings.email_from_name,
            product_name=settings.email_product_name,
        )
        try:
            self._deliver_email(
                to_email,
                subject,
                text_body,
                html_body,
                context="check-in OTP",
            )
        except Exception as exc:
            logger.error("Failed to send check-in OTP email to %s: %s", to_email, exc)
            raise

    @staticmethod
    def _decode_qr_image(qr_image: str | None) -> bytes | None:
        """Decode visit QR stored as data URI or raw base64 into PNG bytes."""
        if not qr_image:
            return None
        import base64

        raw = qr_image.strip()
        try:
            if raw.startswith("data:"):
                payload = raw.split(",", 1)[-1]
            elif "," in raw:
                payload = raw.split(",", 1)[-1]
            else:
                payload = raw
            data = base64.b64decode(payload, validate=False)
            return data if data else None
        except Exception:
            logger.warning("Failed to decode QR image for gate pass email")
            return None

    def send_booking_confirmation_email(
        self,
        to_email: str,
        *,
        visitor_name: str,
        doctor_name: str,
        appointment_date: str,
        hospital_name: str,
        booking_id: str,
        department_name: str | None = None,
        purpose: str | None = None,
        appointment_mode: str = "IN_PERSON",
    ) -> None:
        settings = get_settings()
        subject, text_body, html_body = build_booking_confirmation_email(
            visitor_name=visitor_name,
            doctor_name=doctor_name,
            appointment_date=appointment_date,
            hospital_name=hospital_name,
            department_name=department_name,
            purpose=purpose,
            booking_id=booking_id,
            appointment_mode=appointment_mode,
            company_name=settings.email_from_name,
            product_name=settings.email_product_name,
        )
        self._deliver_email(
            to_email,
            subject,
            text_body,
            html_body,
            context="booking confirmation",
        )

    def send_gate_pass_email(
        self,
        to_email: str,
        *,
        visitor_name: str,
        doctor_name: str,
        appointment_date: str,
        check_in_otp: str,
        qr_image_base64: str | None = None,
        doctor_feedback: str | None = None,
        visitor_pass_id: str | None = None,
    ) -> None:
        settings = get_settings()
        qr_bytes = self._decode_qr_image(qr_image_base64)
        qr_cid = GATE_PASS_QR_CID if qr_bytes else None
        subject, text_body, html_body = build_gate_pass_email(
            visitor_name=visitor_name,
            doctor_name=doctor_name,
            appointment_date=appointment_date,
            check_in_otp=check_in_otp,
            doctor_feedback=doctor_feedback,
            qr_cid=qr_cid,
            company_name=settings.email_from_name,
            product_name=settings.email_product_name,
            visitor_pass_id=visitor_pass_id,
        )
        inline_images = None
        if qr_bytes:
            inline_images = [(GATE_PASS_QR_CID, qr_bytes, "image/png")]
        self._deliver_email(
            to_email,
            subject,
            text_body,
            html_body,
            context="gate pass QR",
            inline_images=inline_images,
        )

    @staticmethod
    def _build_delivery_qr_png(qr_payload: str, signature: str) -> bytes | None:
        """Encode the same JSON payload security scans from the driver dashboard QR."""
        import io
        import json

        import qrcode

        try:
            img = qrcode.make(json.dumps({"qrPayload": qr_payload, "signature": signature}))
            buffer = io.BytesIO()
            img.save(buffer, format="PNG")
            return buffer.getvalue()
        except Exception:
            logger.warning("Failed to generate delivery QR PNG for email")
            return None

    def send_delivery_assignment_email(
        self,
        to_email: str,
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
        qr_payload: str | None = None,
        qr_signature: str | None = None,
        qr_expires_at: str | None = None,
    ) -> None:
        settings = get_settings()
        qr_bytes = None
        if qr_payload and qr_signature:
            qr_bytes = self._build_delivery_qr_png(qr_payload, qr_signature)
        qr_cid = DELIVERY_QR_CID if qr_bytes else None
        subject, text_body, html_body = build_delivery_assignment_email(
            driver_name=driver_name,
            delivery_number=delivery_number,
            goods_type=goods_type,
            total_boxes=total_boxes,
            vehicle_number=vehicle_number,
            vendor_name=vendor_name,
            arrival_label=arrival_label,
            hospital_name=hospital_name,
            hospital_address=hospital_address,
            hospital_phone=hospital_phone,
            maps_url=maps_url,
            remarks=remarks,
            qr_cid=qr_cid,
            qr_expires_at=qr_expires_at,
            company_name=settings.email_from_name,
            product_name=settings.email_product_name,
        )
        inline_images = None
        if qr_bytes:
            inline_images = [(DELIVERY_QR_CID, qr_bytes, "image/png")]
        self._deliver_email(
            to_email,
            subject,
            text_body,
            html_body,
            context="delivery assignment",
            inline_images=inline_images,
        )

    def send_attendant_pass_email(
        self,
        to_email: str,
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
        qr_payload: str | None = None,
        qr_signature: str | None = None,
        qr_expires_at: str | None = None,
    ) -> None:
        settings = get_settings()
        qr_bytes = None
        if qr_payload and qr_signature:
            qr_bytes = self._build_delivery_qr_png(qr_payload, qr_signature)
        qr_cid = ATTENDANT_PASS_QR_CID if qr_bytes else None
        subject, text_body, html_body = build_attendant_pass_email(
            attendant_name=attendant_name,
            pass_number=pass_number,
            patient_first_name=patient_first_name,
            hospital_name=hospital_name,
            hospital_address=hospital_address,
            hospital_phone=hospital_phone,
            valid_until=valid_until,
            ward_name=ward_name,
            room_number=room_number,
            qr_cid=qr_cid,
            qr_expires_at=qr_expires_at,
            company_name=settings.email_from_name,
            product_name=settings.email_product_name,
        )
        inline_images = None
        if qr_bytes:
            inline_images = [(ATTENDANT_PASS_QR_CID, qr_bytes, "image/png")]
        self._deliver_email(
            to_email,
            subject,
            text_body,
            html_body,
            context="attendant pass",
            inline_images=inline_images,
        )

    def send_attendant_checkout_qr_email(
        self,
        to_email: str,
        *,
        attendant_name: str,
        pass_number: str,
        patient_first_name: str,
        hospital_name: str,
        entry_label: str,
        ward_name: str | None = None,
        room_number: str | None = None,
        qr_payload: str | None = None,
        qr_signature: str | None = None,
    ) -> None:
        settings = get_settings()
        qr_bytes = None
        if qr_payload and qr_signature:
            qr_bytes = self._build_delivery_qr_png(qr_payload, qr_signature)
        qr_cid = ATTENDANT_CHECKOUT_QR_CID if qr_bytes else None
        subject, text_body, html_body = build_attendant_checkout_qr_email(
            attendant_name=attendant_name,
            pass_number=pass_number,
            patient_first_name=patient_first_name,
            hospital_name=hospital_name,
            entry_label=entry_label,
            ward_name=ward_name,
            room_number=room_number,
            qr_cid=qr_cid,
            company_name=settings.email_from_name,
            product_name=settings.email_product_name,
        )
        inline_images = None
        if qr_bytes:
            inline_images = [(ATTENDANT_CHECKOUT_QR_CID, qr_bytes, "image/png")]
        self._deliver_email(
            to_email,
            subject,
            text_body,
            html_body,
            context="attendant checkout QR",
            inline_images=inline_images,
        )

    def send_delivery_checkout_qr_email(
        self,
        to_email: str,
        *,
        driver_name: str,
        delivery_number: str,
        goods_type: str,
        total_boxes: int,
        vehicle_number: str,
        vendor_name: str,
        hospital_name: str,
        entry_label: str,
        qr_payload: str | None = None,
        qr_signature: str | None = None,
    ) -> None:
        settings = get_settings()
        qr_bytes = None
        if qr_payload and qr_signature:
            qr_bytes = self._build_delivery_qr_png(qr_payload, qr_signature)
        qr_cid = DELIVERY_CHECKOUT_QR_CID if qr_bytes else None
        subject, text_body, html_body = build_delivery_checkout_qr_email(
            driver_name=driver_name,
            delivery_number=delivery_number,
            goods_type=goods_type,
            total_boxes=total_boxes,
            vehicle_number=vehicle_number,
            vendor_name=vendor_name,
            hospital_name=hospital_name,
            entry_label=entry_label,
            qr_cid=qr_cid,
            company_name=settings.email_from_name,
            product_name=settings.email_product_name,
        )
        inline_images = None
        if qr_bytes:
            inline_images = [(DELIVERY_CHECKOUT_QR_CID, qr_bytes, "image/png")]
        self._deliver_email(
            to_email,
            subject,
            text_body,
            html_body,
            context="delivery checkout QR",
            inline_images=inline_images,
        )

    def send_online_appointment_email(
        self,
        to_email: str,
        *,
        recipient_name: str,
        doctor_name: str,
        appointment_date: str,
        meeting_url: str,
        doctor_feedback: str | None = None,
        is_host: bool = False,
    ) -> None:
        settings = get_settings()
        subject, text_body, html_body = build_online_appointment_email(
            recipient_name=recipient_name,
            doctor_name=doctor_name,
            appointment_date=appointment_date,
            meeting_url=meeting_url,
            doctor_feedback=doctor_feedback,
            is_host=is_host,
            company_name=settings.email_from_name,
            product_name=settings.email_product_name,
        )
        self._deliver_email(
            to_email,
            subject,
            text_body,
            html_body,
            context="online appointment video consultation",
        )


class SmsService:
    def _normalize_phone(self, phone: str) -> str:
        return normalize_phone(phone)

    def _twilio_whatsapp_to(self, phone: str) -> str:
        normalized = self._normalize_phone(phone)
        return normalized if normalized.lower().startswith("whatsapp:") else f"whatsapp:{normalized}"

    def _send_via_twilio(self, phone: str, message: str) -> None:
        settings = get_settings()
        if not is_twilio_configured(settings):
            raise RuntimeError("Twilio is not configured.")

        from twilio.rest import Client
        from twilio.base.exceptions import TwilioRestException

        client = Client(settings.twilio_account_sid, settings.twilio_auth_token)
        try:
            client.messages.create(
                body=message,
                from_=settings.twilio_from_number,
                to=self._normalize_phone(phone),
            )
        except TwilioRestException as exc:
            logger.error("Twilio SMS failed to %s: %s", phone, exc.msg)
            raise RuntimeError(f"Twilio SMS failed: {exc.msg}") from exc

    def _send_via_twilio_whatsapp(self, phone: str, message: str) -> None:
        settings = get_settings()
        whatsapp_from = twilio_whatsapp_from_address(settings)
        if not whatsapp_from:
            raise RuntimeError("Twilio WhatsApp is not configured.")

        from twilio.rest import Client
        from twilio.base.exceptions import TwilioRestException

        client = Client(settings.twilio_account_sid, settings.twilio_auth_token)
        try:
            client.messages.create(
                body=message,
                from_=whatsapp_from,
                to=self._twilio_whatsapp_to(phone),
            )
        except TwilioRestException as exc:
            logger.error("Twilio WhatsApp failed to %s: %s", phone, exc.msg)
            raise RuntimeError(f"Twilio WhatsApp failed: {exc.msg}") from exc

    def _send_via_meta_whatsapp(self, phone: str, message: str) -> None:
        settings = get_settings()
        if not is_meta_whatsapp_configured(settings):
            raise RuntimeError("Meta WhatsApp is not configured.")

        url = (
            f"{settings.whatsapp_api_url.rstrip('/')}/"
            f"{settings.whatsapp_phone_number_id}/messages"
        )
        payload = {
            "messaging_product": "whatsapp",
            "to": self._normalize_phone(phone).lstrip("+"),
            "type": "template",
            "template": {
                "name": settings.whatsapp_template_notification,
                "language": meta_template_language(),
                "components": [
                    {
                        "type": "body",
                        "parameters": [{"type": "text", "text": message[:1024]}],
                    }
                ],
            },
        }
        headers = {"Authorization": f"Bearer {settings.whatsapp_access_token}"}
        response = httpx.post(url, json=payload, headers=headers, timeout=30)
        if response.status_code not in (200, 201):
            logger.error("Meta WhatsApp failed to %s: %s %s", phone, response.status_code, response.text)
            response.raise_for_status()

    def _send_via_pywhatkit(self, phone: str, message: str) -> None:
        """Send via PyWhatKit (WhatsApp Web). Session must be logged in as PYWHATKIT_CENTRAL_PHONE."""
        settings = get_settings()
        if not is_pywhatkit_configured(settings):
            raise RuntimeError("PyWhatKit central phone is not configured.")

        import time
        import webbrowser
        from urllib.parse import quote

        import pyautogui as pg
        from pywhatkit.core import core

        pg.FAILSAFE = False

        recipient = self._normalize_phone(phone)
        central = normalize_phone(settings.pywhatkit_central_phone)
        if recipient == central:
            raise RuntimeError("Cannot send PyWhatKit message to the central sender number.")

        # PyWhatKit requires '+' for validation; WhatsApp Web URL needs digits only (no '+').
        if "+" not in recipient:
            recipient = f"+{recipient.lstrip('+')}"
        phone_digits = recipient.lstrip("+")

        wait_time = max(settings.pywhatkit_wait_time, 30)
        url = f"https://web.whatsapp.com/send?phone={phone_digits}&text={quote(message)}"

        logger.info(
            "PyWhatKit WhatsApp from +%s to +%s (web.whatsapp.com must be logged in as central number)",
            settings.pywhatkit_central_phone,
            phone_digits.removeprefix("91") if phone_digits.startswith("91") else phone_digits,
        )
        logger.info("Opening WhatsApp Web send URL (wait %ss for chat to load)...", wait_time)

        webbrowser.open(url)
        time.sleep(wait_time)
        pg.press("enter")
        time.sleep(2)

        if settings.pywhatkit_tab_close:
            core.close_tab(wait_time=settings.pywhatkit_close_time)

        logger.info("PyWhatKit send completed for +%s", phone_digits)

    def _send_via_aws_sns(self, phone: str, message: str) -> None:
        settings = get_settings()
        if not is_aws_sns_configured(settings):
            raise RuntimeError("AWS SNS is not configured.")

        client = boto3.client(
            "sns",
            region_name=settings.aws_region,
            aws_access_key_id=settings.aws_access_key_id,
            aws_secret_access_key=settings.aws_secret_access_key,
        )
        client.publish(Message=message, PhoneNumber=self._normalize_phone(phone))

    def _resolve_provider(self) -> str | None:
        settings = get_settings()
        twilio_ready = is_twilio_configured(settings)
        aws_ready = is_aws_sns_configured(settings)

        if settings.sms_provider == "twilio":
            return "twilio" if twilio_ready else None
        if settings.sms_provider == "aws":
            return "aws" if aws_ready else None
        if twilio_ready:
            return "twilio"
        if aws_ready:
            return "aws"
        return None

    def _deliver_whatsapp(self, phone: str, message: str, *, require_delivery: bool = False) -> bool:
        settings = get_settings()
        if is_test_mode_enabled(settings):
            logger.info(
                "[HVTS_TEST_MODE] WhatsApp (PyWhatKit central +91%s) to %s: %s",
                settings.pywhatkit_central_phone,
                phone,
                message,
            )
            return True

        errors: list[str] = []
        for provider in whatsapp_provider_order(settings):
            try:
                if provider == "pywhatkit" and is_pywhatkit_configured(settings):
                    self._send_via_pywhatkit(phone, message)
                    return True
                if provider == "twilio" and is_twilio_whatsapp_configured(settings):
                    self._send_via_twilio_whatsapp(phone, message)
                    return True
                if provider == "wapblaster" and is_wapblaster_configured(settings):
                    template = (settings.whatsapp_template_notification or "").strip()
                    if template:
                        send_wapblaster_template(
                            phone,
                            template_name=template,
                            template_language=settings.whatsapp_template_language,
                            fields=message_to_template_fields(
                                message,
                                settings.wapblaster_template_field_count,
                            ),
                        )
                    else:
                        send_wapblaster_text(phone, message)
                    return True
                if provider == "meta" and is_meta_whatsapp_configured(settings):
                    self._send_via_meta_whatsapp(phone, message)
                    return True
            except Exception as exc:
                errors.append(f"{provider}: {exc}")
                logger.warning("WhatsApp provider %s failed: %s", provider, exc)

        detail = "WhatsApp transport is not configured or all providers failed."
        if errors:
            detail = f"{detail} {'; '.join(errors)}"
        if require_delivery:
            raise RuntimeError(detail)
        logger.warning("%s Message: %s", detail, message)
        return False

    def _deliver_sms(self, phone: str, message: str, *, require_delivery: bool = False) -> bool:
        settings = get_settings()
        if is_test_mode_enabled(settings):
            logger.info("[HVTS_TEST_MODE] SMS to %s: %s", phone, message)
            return True

        provider = self._resolve_provider()
        if not provider:
            detail = "SMS transport is not configured (set Twilio or AWS SNS env vars)."
            if require_delivery:
                raise RuntimeError(detail)
            logger.warning("%s Message: %s", detail, message)
            return False

        try:
            if provider == "twilio":
                self._send_via_twilio(phone, message)
            else:
                self._send_via_aws_sns(phone, message)
            return True
        except Exception as exc:
            if require_delivery:
                raise
            logger.warning("SMS delivery failed to %s: %s. Message: %s", phone, exc, message)
            return False

    def _deliver_notification(self, phone: str, message: str, *, require_delivery: bool = False) -> None:
        settings = get_settings()
        if resolves_to_whatsapp_notifications(settings):
            delivered = self._deliver_whatsapp(phone, message, require_delivery=False)
            if delivered:
                return
            if is_twilio_configured(settings) or is_aws_sns_configured(settings):
                logger.warning(
                    "WhatsApp failed for %s; falling back to SMS so the notification is still delivered.",
                    phone,
                )
                if self._deliver_sms(phone, message, require_delivery=require_delivery):
                    return
            if require_delivery:
                raise RuntimeError("WhatsApp delivery failed and no SMS fallback is configured.")
            return
        self._deliver_sms(phone, message, require_delivery=require_delivery)

    def send_message(self, phone: str, message: str) -> None:
        self._deliver_notification(phone, message, require_delivery=False)

    def send_sms_only(self, phone: str, message: str) -> None:
        """Send via Twilio/SNS SMS only (skip WhatsApp), e.g. doctor approval links."""
        self._deliver_sms(phone, message, require_delivery=False)

    def send_profile_phone_otp(self, phone: str, otp: str, *, valid_minutes: int = 5) -> None:
        """Visitor profile phone verification. Uses the OTP template, not the visit template."""
        settings = get_settings()
        template = (settings.whatsapp_template_phone_otp or "").strip()
        if (
            template
            and is_wapblaster_configured(settings)
            and settings.whatsapp_provider == "wapblaster"
        ):
            try:
                send_wapblaster_phone_otp(
                    phone,
                    template_name=template,
                    template_language=settings.whatsapp_template_phone_otp_language,
                    otp=otp,
                    valid_minutes=valid_minutes,
                )
                return
            except Exception:
                logger.warning(
                    "WhatsApp phone OTP template %s failed; falling back to SMS",
                    template,
                    exc_info=True,
                )
        message = (
            f"Conninter: Your verification code is {otp}. "
            f"It is valid for {valid_minutes} minutes. Do not share it."
        )
        self._deliver_sms(phone, message, require_delivery=True)

    def send_otp(self, phone: str, otp: str) -> None:
        message = (
            f"Login in HVTS: Your One-Time Password is {otp}. "
            "It is valid for 3 minutes. Do not share it."
        )
        self._deliver_sms(phone, message, require_delivery=True)


class WhatsAppService:
    def _meta_messages_url(self) -> str:
        settings = get_settings()
        return (
            f"{settings.whatsapp_api_url.rstrip('/')}/"
            f"{settings.whatsapp_phone_number_id}/messages"
        )

    def _meta_auth_headers(self) -> dict[str, str]:
        settings = get_settings()
        return {"Authorization": f"Bearer {settings.whatsapp_access_token}"}

    def _meta_to_digits(self, phone: str) -> str:
        return normalize_phone(phone).lstrip("+")

    def send_doctor_approval_details(self, phone: str, message: str) -> None:
        """Send full appointment details + approval link."""
        settings = get_settings()
        if is_wapblaster_configured(settings) and settings.whatsapp_provider == "wapblaster":
            template = (settings.whatsapp_template_notification or "").strip()
            if template:
                send_wapblaster_template(
                    phone,
                    template_name=template,
                    template_language=settings.whatsapp_template_language,
                    fields=message_to_template_fields(
                        message,
                        settings.wapblaster_template_field_count,
                    ),
                )
            else:
                send_wapblaster_text(phone, message)
            return
        if not is_meta_whatsapp_configured(settings):
            raise RuntimeError("Meta WhatsApp is not configured.")
        if is_test_mode_enabled(settings):
            logger.info(
                "[HVTS_TEST_MODE] Doctor approval details to %s: %s",
                phone,
                message[:240],
            )
            return
        health = check_meta_whatsapp_health(settings)
        if health.get("valid") is False:
            raise RuntimeError(
                "Meta WhatsApp access token is invalid or expired. "
                f"Update WHATSAPP_ACCESS_TOKEN in .env. ({health.get('error', 'unknown')})"
            )
        self._send_via_meta_whatsapp(phone, message)

    def send_appointment_approval_buttons(
        self,
        phone: str,
        *,
        visitor_name: str,
        appointment_label: str,
        approval_code: str,
        purpose: str | None = None,
        approval_url: str | None = None,
        reschedule_url: str | None = None,
        doctor_name: str = "Doctor",
        organization: str = "—",
        visitor_type: str = "General",
        department: str = "—",
        requested_date: str = "",
        requested_time: str = "",
        items_carrying: str = "",
        visit_id: str = "",
    ) -> None:
        """Send Confirm Visit / Reject Visit on conninter_doctor_visit_approval."""
        settings = get_settings()
        if is_wapblaster_configured(settings) and settings.whatsapp_provider == "wapblaster":
            if is_test_mode_enabled(settings):
                logger.info(
                    "[HVTS_TEST_MODE] WapBlaster approval to %s: confirm_%s reschedule=%s",
                    phone,
                    approval_code,
                    reschedule_url,
                )
                return
            purpose_line = purpose or "Appointment"
            template = (settings.whatsapp_template_appointment_approval or "").strip()
            if template:
                date_text = requested_date or appointment_label
                time_text = requested_time or "—"
                send_wapblaster_appointment_approval(
                    phone,
                    template_name=template,
                    template_language=(
                        settings.whatsapp_template_appointment_approval_language
                        or settings.whatsapp_template_language
                    ),
                    doctor_name=doctor_name,
                    visitor_name=visitor_name,
                    organization=organization or "—",
                    visitor_type=visitor_type,
                    purpose=purpose_line,
                    department=department or "—",
                    requested_date=date_text,
                    requested_time=time_text,
                    items_carrying=items_carrying or "—",
                    visit_id=visit_id or (approval_code or ""),
                    approval_code=approval_code,
                )
            else:
                code = (approval_code or "").strip()
                text = (
                    f"Connitor appointment request\n"
                    f"Visitor: {visitor_name}\n"
                    f"When: {appointment_label}\n"
                    f"Purpose: {purpose_line}\n"
                    f"Reply CONFIRM {code} to approve now."
                )
                send_wapblaster_text(phone, text)
            return

        if not is_meta_whatsapp_configured(settings):
            raise RuntimeError("Meta WhatsApp is not configured.")

        if is_test_mode_enabled(settings):
            logger.info(
                "[HVTS_TEST_MODE] WhatsApp approval buttons to %s: yes_%s / no_%s",
                phone,
                approval_code,
                approval_code,
            )
            return

        health = check_meta_whatsapp_health(settings)
        if health.get("valid") is False:
            raise RuntimeError(
                "Meta WhatsApp access token is invalid or expired. "
                f"Update WHATSAPP_ACCESS_TOKEN in .env. ({health.get('error', 'unknown')})"
            )

        template_name = (settings.whatsapp_template_appointment_approval or "").strip()
        if template_name:
            try:
                self._send_appointment_approval_template(
                    phone,
                    template_name=template_name,
                    visitor_name=visitor_name,
                    appointment_label=appointment_label,
                    approval_code=approval_code,
                    purpose=purpose,
                )
                return
            except Exception as exc:
                logger.warning(
                    "Meta appointment approval template %s failed, trying interactive: %s",
                    template_name,
                    exc,
                )

        self._send_appointment_approval_interactive(
            phone,
            visitor_name=visitor_name,
            appointment_label=appointment_label,
            approval_code=approval_code,
            purpose=purpose,
            approval_url=approval_url,
        )

    def _send_appointment_approval_template(
        self,
        phone: str,
        *,
        template_name: str,
        visitor_name: str,
        appointment_label: str,
        approval_code: str,
        purpose: str | None = None,
    ) -> None:
        """Business-initiated template with Yes/No quick-reply buttons (dynamic payloads)."""
        body_params: list[dict[str, str]] = [
            {"type": "text", "text": visitor_name[:256]},
            {"type": "text", "text": appointment_label[:256]},
            {"type": "text", "text": approval_code},
        ]
        if purpose:
            body_params.insert(2, {"type": "text", "text": purpose[:256]})
        payload = {
            "messaging_product": "whatsapp",
            "to": self._meta_to_digits(phone),
            "type": "template",
            "template": {
                "name": template_name,
                "language": meta_template_language(),
                "components": [
                    {
                        "type": "body",
                        "parameters": body_params,
                    },
                    {
                        "type": "button",
                        "sub_type": "quick_reply",
                        "index": "0",
                        "parameters": [
                            {"type": "payload", "payload": f"yes_{approval_code}"},
                        ],
                    },
                    {
                        "type": "button",
                        "sub_type": "quick_reply",
                        "index": "1",
                        "parameters": [
                            {"type": "payload", "payload": f"no_{approval_code}"},
                        ],
                    },
                ],
            },
        }
        response = httpx.post(
            self._meta_messages_url(),
            json=payload,
            headers=self._meta_auth_headers(),
            timeout=30,
        )
        if response.status_code not in (200, 201):
            raise RuntimeError(
                f"Meta WhatsApp approval template failed ({response.status_code}): {response.text}"
            )

    def _send_appointment_approval_interactive(
        self,
        phone: str,
        *,
        visitor_name: str,
        appointment_label: str,
        approval_code: str,
        purpose: str | None = None,
        approval_url: str | None = None,
    ) -> None:
        """Session interactive Yes/No buttons (requires open 24-hour messaging window)."""
        purpose_line = f"\nPurpose: {purpose}" if purpose else ""
        link_line = (
            f"\n\nSecure one-time link:\n{approval_url}\n\nOpen the link to approve or decline."
            if approval_url
            else ""
        )
        body = (
            f"New appointment request\n"
            f"Visitor: {visitor_name}\n"
            f"Date & time: {appointment_label}{purpose_line}{link_line}\n\n"
            "Or tap Yes to approve / No to decline."
        )
        payload = {
            "messaging_product": "whatsapp",
            "to": self._meta_to_digits(phone),
            "type": "interactive",
            "interactive": {
                "type": "button",
                "body": {"text": body[:1024]},
                "action": {
                    "buttons": [
                        {
                            "type": "reply",
                            "reply": {"id": f"yes_{approval_code}", "title": "Yes"},
                        },
                        {
                            "type": "reply",
                            "reply": {"id": f"no_{approval_code}", "title": "No"},
                        },
                    ]
                },
            },
        }
        response = httpx.post(
            self._meta_messages_url(),
            json=payload,
            headers=self._meta_auth_headers(),
            timeout=30,
        )
        if response.status_code not in (200, 201):
            raise RuntimeError(
                f"Meta WhatsApp interactive message failed ({response.status_code}): {response.text}"
            )

    def send_meeting_pass(
        self,
        phone: str,
        *,
        visitor_name: str,
        doctor_name: str,
        hospital_name: str,
        department: str,
        requested_date: str,
        requested_time: str,
        purpose: str,
        items_carrying: str,
        image_url: str,
    ) -> bool:
        """Send conninter_meeting_pass with the composed pass as the header image."""
        settings = get_settings()
        template = (settings.whatsapp_template_gate_pass or "").strip()
        if not template:
            return False
        if not (is_wapblaster_configured(settings) and settings.whatsapp_provider == "wapblaster"):
            logger.warning("Meeting pass template is set but WapBlaster is not the WhatsApp provider")
            return False
        if is_test_mode_enabled(settings):
            logger.info(
                "[HVTS_TEST_MODE] Meeting pass %s to %s for %s",
                template,
                phone,
                visitor_name,
            )
            return True
        send_wapblaster_meeting_pass(
            phone,
            template_name=template,
            template_language=settings.whatsapp_template_gate_pass_language or "en_GB",
            visitor_name=visitor_name,
            doctor_name=doctor_name,
            hospital_name=hospital_name,
            department=department,
            requested_date=requested_date,
            requested_time=requested_time,
            purpose=purpose or "Visit",
            items_carrying=items_carrying or "—",
            image_url=image_url,
        )
        return True

    def send_gate_pass(
        self,
        phone: str,
        visitor_name: str,
        gate_pass_url: str,
        *,
        image_url: str | None = None,
    ) -> bool:
        settings = get_settings()
        if is_wapblaster_configured(settings) and settings.whatsapp_provider == "wapblaster":
            template = (settings.whatsapp_template_gate_pass or "").strip()
            if template:
                link = (gate_pass_url or "").strip()
                media = (image_url or "").strip()
                if not media.startswith("http"):
                    media = link if link.startswith("http") else ""
                if link.startswith("data:") or len(link) > 1000:
                    link = "Scan the QR image"
                extra = None
                if media:
                    extra = {
                        "header_image": media,
                        "header_image_url": media,
                        "header_media_url": media,
                        "media_url": media,
                    }
                fields = [
                    "Connitor",
                    visitor_name,
                    "Gate pass",
                    link or "Scan the QR image",
                    "Show this QR at security",
                ]
                try:
                    send_wapblaster_template(
                        phone,
                        template_name=template,
                        template_language=settings.whatsapp_template_gate_pass_language,
                        fields=fields,
                        extra=extra,
                    )
                except Exception:
                    if not extra:
                        raise
                    logger.warning(
                        "Gate-pass template with QR image failed for %s; retrying without header image",
                        phone,
                    )
                    send_wapblaster_template(
                        phone,
                        template_name=template,
                        template_language=settings.whatsapp_template_gate_pass_language,
                        fields=fields,
                    )
            else:
                send_wapblaster_text(
                    phone,
                    f"Connitor gate pass for {visitor_name}.\nView / check-in: {gate_pass_url}",
                )
            return True

        if not settings.whatsapp_api_url or not settings.whatsapp_access_token:
            logger.warning("WhatsApp not configured; gate pass URL: %s", gate_pass_url)
            return False

        url = (
            f"{settings.whatsapp_api_url.rstrip('/')}/"
            f"{settings.whatsapp_phone_number_id}/messages"
        )
        payload = {
            "messaging_product": "whatsapp",
            "to": phone,
            "type": "template",
            "template": {
                "name": settings.whatsapp_template_gate_pass,
                "language": {"code": settings.whatsapp_template_gate_pass_language},
                "components": [
                    {
                        "type": "body",
                        "parameters": [
                            {"type": "text", "text": visitor_name},
                            {"type": "text", "text": gate_pass_url},
                        ],
                    }
                ],
            },
        }
        headers = {"Authorization": f"Bearer {settings.whatsapp_access_token}"}
        response = httpx.post(url, json=payload, headers=headers, timeout=30)
        return response.status_code in (200, 201)
