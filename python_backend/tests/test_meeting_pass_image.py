from datetime import datetime
from types import SimpleNamespace

from app.services.meeting_pass_image import (
    MeetingPassContent,
    assemble_meeting_pass,
    render_meeting_pass,
)


def _visit(*, visitor_type: str, company: str | None) -> SimpleNamespace:
    return SimpleNamespace(
        id="visit-1",
        visitorType=visitor_type,
        companyName=company,
        appointmentDate=datetime(2026, 10, 3, 10, 30),
        expectedEndTime=datetime(2026, 10, 3, 10, 45),
        department="Cardiology",
        departmentId=None,
        subDepartmentId=None,
        branchId="branch-1",
        branch=SimpleNamespace(
            name="Kalyan Nagar",
            hospitalChainId="chain-1",
            hospitalChain=SimpleNamespace(name="Ovum"),
        ),
        visitor=SimpleNamespace(
            firstName="Sushobhit",
            middleName=None,
            lastName="Rao",
            phone="8625877312",
            photo=None,
            company=None,
            visitorAccountId=None,
        ),
        staff=SimpleNamespace(name="Rahul Mehta"),
        staffName="Rahul Mehta",
        purpose="Product discussion",
        visitCode="123456",
        checkInOtp="123456",
        visitorPassId="PASS-1",
        visitQRCode=None,
        bookedSlot=None,
    )


def test_sales_representative_pass_includes_company() -> None:
    content = assemble_meeting_pass(None, _visit(visitor_type="SALES_REPRESENTATIVE", company="Sunrise Pharma"))

    assert content.visitor_name == "Sushobhit Rao"
    assert content.role_label == "Medical Representative"
    assert content.company_name == "Sunrise Pharma"
    assert content.doctor_name == "Dr. Rahul Mehta"
    assert content.hospital_name == "Ovum"
    assert content.department == "Cardiology"
    assert content.date_text == "03 Oct 2026"
    assert "10:30 AM" in content.time_text
    assert "10:45 AM" in content.time_text


def test_general_pass_omits_company() -> None:
    content = assemble_meeting_pass(None, _visit(visitor_type="GENERAL", company="Sunrise Pharma"))

    assert content.role_label == "General"
    assert content.company_name is None


def test_rendered_passes_differ_when_company_is_present() -> None:
    sales = assemble_meeting_pass(None, _visit(visitor_type="SALES_REPRESENTATIVE", company="Sunrise Pharma"))
    general = assemble_meeting_pass(None, _visit(visitor_type="GENERAL", company="Sunrise Pharma"))
    shared_qr = sales.qr_png
    sales_png = render_meeting_pass(
        MeetingPassContent(
            visitor_name=sales.visitor_name,
            role_label=sales.role_label,
            company_name=sales.company_name,
            doctor_name=sales.doctor_name,
            hospital_name=sales.hospital_name,
            department=sales.department,
            date_text=sales.date_text,
            time_text=sales.time_text,
            qr_png=shared_qr,
        )
    )
    general_png = render_meeting_pass(
        MeetingPassContent(
            visitor_name=general.visitor_name,
            role_label=general.role_label,
            company_name=None,
            doctor_name=general.doctor_name,
            hospital_name=general.hospital_name,
            department=general.department,
            date_text=general.date_text,
            time_text=general.time_text,
            qr_png=shared_qr,
        )
    )

    assert sales_png.startswith(b"\x89PNG")
    assert general_png.startswith(b"\x89PNG")
    assert sales_png != general_png
