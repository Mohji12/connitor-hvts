"""Google Calendar integration for hospital appointments."""

from __future__ import annotations

import base64
import logging
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Literal
from urllib.parse import quote_plus

from app.config import get_settings
from app.utils.timezone import IST_LABEL, naive_ist_to_utc, now_ist

logger = logging.getLogger(__name__)

CalendarStatus = Literal["tentative", "confirmed", "cancelled"]

DEFAULT_APPOINTMENT_MINUTES = 30


@dataclass(frozen=True)
class AppointmentCalendarDetails:
    visit_id: str
    visitor_email: str
    visitor_name: str
    doctor_name: str
    hospital_name: str
    hospital_address: str
    department_name: str | None
    sub_department_name: str | None
    appointment_date: datetime
    purpose: str | None
    status: CalendarStatus
    sequence: int = 0
    appointment_mode: str = "IN_PERSON"
    meeting_join_url: str | None = None


def _ics_escape(value: str) -> str:
    return (
        value.replace("\\", "\\\\")
        .replace(";", "\\;")
        .replace(",", "\\,")
        .replace("\r\n", "\\n")
        .replace("\n", "\\n")
    )


def _to_utc(dt: datetime) -> datetime:
    return naive_ist_to_utc(dt)


def _format_ics_datetime(dt: datetime) -> str:
    return _to_utc(dt).strftime("%Y%m%dT%H%M%SZ")


def _event_summary(details: AppointmentCalendarDetails) -> str:
    return f"Appointment with {details.doctor_name} at {details.hospital_name}"


def _event_description(details: AppointmentCalendarDetails) -> str:
    dept_parts = [
        part
        for part in (details.department_name, details.sub_department_name)
        if part
    ]
    dept_line = ", ".join(dept_parts) if dept_parts else "Hospital visit"
    lines = [
        f"Patient: {details.visitor_name}",
        f"Doctor: {details.doctor_name}",
        f"Department: {dept_line}",
        f"Hospital: {details.hospital_name}",
    ]
    if details.purpose:
        lines.append(f"Purpose: {details.purpose}")
    if details.appointment_mode == "ONLINE":
        lines.append("Visit type: Online video consultation.")
        if details.meeting_join_url:
            lines.append(f"Video consultation: {details.meeting_join_url}")
    if details.status == "tentative":
        lines.append("Status: Awaiting doctor approval.")
    elif details.status == "confirmed":
        lines.append("Status: Confirmed by doctor.")
    elif details.status == "cancelled":
        lines.append("Status: Appointment cancelled.")
    return "\\n".join(_ics_escape(line) for line in lines)


def _ics_status(details: AppointmentCalendarDetails) -> str:
    if details.status == "cancelled":
        return "CANCELLED"
    if details.status == "confirmed":
        return "CONFIRMED"
    return "TENTATIVE"


def _ics_method(details: AppointmentCalendarDetails) -> str:
    return "CANCEL" if details.status == "cancelled" else "REQUEST"


def build_ics_content(details: AppointmentCalendarDetails) -> str:
    settings = get_settings()
    start = _to_utc(details.appointment_date)
    end = start + timedelta(minutes=DEFAULT_APPOINTMENT_MINUTES)
    organizer = settings.smtp_from or "noreply@connitor.app"
    uid = f"{details.visit_id}@connitor.app"
    now = naive_ist_to_utc(now_ist())

    lines = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//Connitor//Hospital Visitor Tracking//EN",
        "CALSCALE:GREGORIAN",
        f"METHOD:{_ics_method(details)}",
        "BEGIN:VEVENT",
        f"UID:{uid}",
        f"SEQUENCE:{details.sequence}",
        f"DTSTAMP:{_format_ics_datetime(now)}",
        f"DTSTART:{_format_ics_datetime(start)}",
        f"DTEND:{_format_ics_datetime(end)}",
        f"SUMMARY:{_ics_escape(_event_summary(details))}",
        f"DESCRIPTION:{_event_description(details)}",
        f"LOCATION:{_ics_escape(details.hospital_address)}",
        f"ORGANIZER;CN={_ics_escape(settings.email_from_name)}:mailto:{organizer}",
        f"ATTENDEE;CUTYPE=INDIVIDUAL;ROLE=REQ-PARTICIPANT;PARTSTAT=NEEDS-ACTION;"
        f"RSVP=TRUE:mailto:{details.visitor_email}",
        f"STATUS:{_ics_status(details)}",
        "TRANSP:OPAQUE",
        "END:VEVENT",
        "END:VCALENDAR",
        "",
    ]
    return "\r\n".join(lines)


def build_google_calendar_add_url(details: AppointmentCalendarDetails) -> str:
    start = _to_utc(details.appointment_date)
    end = start + timedelta(minutes=DEFAULT_APPOINTMENT_MINUTES)
    dept_parts = [
        part for part in (details.department_name, details.sub_department_name) if part
    ]
    dept_line = ", ".join(dept_parts) if dept_parts else "Hospital visit"
    plain_description = (
        f"Patient: {details.visitor_name}\n"
        f"Doctor: {details.doctor_name}\n"
        f"Department: {dept_line}\n"
        f"Hospital: {details.hospital_name}"
    )
    if details.purpose:
        plain_description += f"\nPurpose: {details.purpose}"
    text = quote_plus(_event_summary(details))
    dates = f"{_format_ics_datetime(start)}/{_format_ics_datetime(end)}"
    details_text = quote_plus(plain_description)
    location = quote_plus(details.hospital_address)
    return (
        "https://calendar.google.com/calendar/render?action=TEMPLATE"
        f"&text={text}&dates={dates}&details={details_text}&location={location}"
    )


class CalendarService:
    def _google_calendar_configured(self) -> bool:
        settings = get_settings()
        return bool(settings.google_calendar_id and settings.google_application_credentials)

    def _google_event_id(self, visit_id: str) -> str:
        return visit_id.replace("-", "")

    def _build_google_event_body(self, details: AppointmentCalendarDetails) -> dict:
        settings = get_settings()
        start = details.appointment_date
        end = start + timedelta(minutes=DEFAULT_APPOINTMENT_MINUTES)
        organizer = settings.smtp_from or "noreply@connitor.app"

        dept_parts = [
            part
            for part in (details.department_name, details.sub_department_name)
            if part
        ]
        dept_line = ", ".join(dept_parts) if dept_parts else "Hospital visit"
        description_lines = [
            f"Patient: {details.visitor_name}",
            f"Doctor: {details.doctor_name}",
            f"Department: {dept_line}",
            f"Hospital: {details.hospital_name}",
        ]
        if details.purpose:
            description_lines.append(f"Purpose: {details.purpose}")
        if details.status == "tentative":
            description_lines.append("Awaiting doctor approval.")
        elif details.status == "confirmed":
            description_lines.append("Confirmed by doctor.")
        elif details.status == "cancelled":
            description_lines.append("Appointment cancelled.")

        status_map = {
            "tentative": "tentative",
            "confirmed": "confirmed",
            "cancelled": "cancelled",
        }

        return {
            "id": self._google_event_id(details.visit_id),
            "summary": _event_summary(details),
            "description": "\n".join(description_lines),
            "location": details.hospital_address,
            "start": {
                "dateTime": start.strftime("%Y-%m-%dT%H:%M:%S"),
                "timeZone": IST_LABEL,
            },
            "end": {
                "dateTime": end.strftime("%Y-%m-%dT%H:%M:%S"),
                "timeZone": IST_LABEL,
            },
            "status": status_map[details.status],
            "attendees": [{"email": details.visitor_email, "responseStatus": "needsAction"}],
            "organizer": {"email": organizer, "displayName": settings.email_from_name},
            "reminders": {
                "useDefault": False,
                "overrides": [
                    {"method": "email", "minutes": 24 * 60},
                    {"method": "popup", "minutes": 60},
                ],
            },
            "extendedProperties": {
                "private": {
                    "connitorVisitId": details.visit_id,
                    "connitorStatus": details.status,
                }
            },
        }

    def _sync_google_calendar(self, details: AppointmentCalendarDetails) -> None:
        if not self._google_calendar_configured() or not details.visitor_email:
            return

        try:
            from google.oauth2 import service_account
            from googleapiclient.discovery import build
            from googleapiclient.errors import HttpError
        except ImportError:
            logger.warning("Google Calendar libraries not installed; skipping API sync.")
            return

        settings = get_settings()
        credentials = service_account.Credentials.from_service_account_file(
            settings.google_application_credentials,
            scopes=["https://www.googleapis.com/auth/calendar"],
        )
        service = build("calendar", "v3", credentials=credentials, cache_discovery=False)
        calendar_id = settings.google_calendar_id
        event_id = self._google_event_id(details.visit_id)
        body = self._build_google_event_body(details)

        try:
            if details.status == "cancelled":
                service.events().delete(
                    calendarId=calendar_id,
                    eventId=event_id,
                    sendUpdates="all",
                ).execute()
                logger.info("Cancelled Google Calendar event for visit %s", details.visit_id)
                return

            try:
                service.events().get(calendarId=calendar_id, eventId=event_id).execute()
                service.events().update(
                    calendarId=calendar_id,
                    eventId=event_id,
                    body=body,
                    sendUpdates="all",
                ).execute()
                logger.info("Updated Google Calendar event for visit %s", details.visit_id)
            except HttpError as exc:
                if exc.resp.status == 404:
                    service.events().insert(
                        calendarId=calendar_id,
                        body=body,
                        sendUpdates="all",
                    ).execute()
                    logger.info("Created Google Calendar event for visit %s", details.visit_id)
                else:
                    raise
        except Exception as exc:
            logger.error(
                "Google Calendar sync failed for visit %s: %s",
                details.visit_id,
                exc,
            )

    def send_appointment_calendar_invite(
        self,
        details: AppointmentCalendarDetails,
        *,
        email_service,
    ) -> None:
        if not details.visitor_email:
            return

        ics_content = build_ics_content(details)
        add_url = build_google_calendar_add_url(details)
        appt = details.appointment_date.strftime("%d %b %Y at %H:%M")
        dept_parts = [
            part
            for part in (details.department_name, details.sub_department_name)
            if part
        ]
        dept_line = ", ".join(dept_parts) if dept_parts else "Hospital"

        if details.status == "cancelled":
            subject = f"Appointment Cancelled — Dr. {details.doctor_name}"
            message = (
                f"Hello {details.visitor_name},\n\n"
                f"Your appointment with Dr. {details.doctor_name} at "
                f"{details.hospital_name} on {appt} has been cancelled.\n\n"
                "The calendar invite has been updated."
            )
        elif details.status == "confirmed":
            subject = f"Appointment Confirmed — Dr. {details.doctor_name} on {appt}"
            message = (
                f"Hello {details.visitor_name},\n\n"
                f"Your appointment with Dr. {details.doctor_name} at "
                f"{details.hospital_name} ({dept_line}) is confirmed for {appt}.\n\n"
                "A Google Calendar invite is attached. Open the email in Gmail and tap "
                '"Add to Calendar", or use this link:\n'
                f"{add_url}\n\n"
                "You will also receive a separate email with your check-in OTP."
            )
        else:
            subject = f"Appointment Booked — Dr. {details.doctor_name} on {appt}"
            message = (
                f"Hello {details.visitor_name},\n\n"
                f"Your appointment request with Dr. {details.doctor_name} at "
                f"{details.hospital_name} ({dept_line}) is scheduled for {appt}.\n\n"
                "A calendar invite is attached — open this email in Gmail and tap "
                '"Add to Calendar" to get a reminder from Google Calendar.\n\n'
                f"You can also add it manually: {add_url}\n\n"
                "You will receive another email once the doctor approves your visit."
            )

        attachment_name = (
            "appointment-cancelled.ics"
            if details.status == "cancelled"
            else "appointment.ics"
        )

        try:
            email_service.send_notification_with_attachment(
                details.visitor_email,
                subject,
                message,
                attachment_name=attachment_name,
                attachment_content=ics_content.encode("utf-8"),
                attachment_mime_type="text/calendar; method=REQUEST; charset=UTF-8",
            )
        except Exception as exc:
            logger.error(
                "Failed to email calendar invite to %s for visit %s: %s",
                details.visitor_email,
                details.visit_id,
                exc,
            )

        try:
            self._sync_google_calendar(details)
        except Exception as exc:
            logger.error(
                "Google Calendar API sync failed for visit %s: %s",
                details.visit_id,
                exc,
            )
