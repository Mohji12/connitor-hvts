"""Generate Conninter data-collection workflow PDF from live product flows."""

from __future__ import annotations

from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_JUSTIFY, TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import (
    KeepTogether,
    ListFlowable,
    ListItem,
    PageBreak,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

NAVY = colors.HexColor("#001B71")
BLUE = colors.HexColor("#4A90E2")
CANVAS = colors.HexColor("#F7F9FC")
SLATE = colors.HexColor("#334155")
MUTED = colors.HexColor("#64748B")
LINE = colors.HexColor("#CBD5E1")
GREEN = colors.HexColor("#047857")
AMBER = colors.HexColor("#B45309")

OUT = Path(__file__).with_name("CONNINTER-DATA-COLLECTION-WORKFLOWS.pdf")


def styles() -> dict[str, ParagraphStyle]:
    base = getSampleStyleSheet()
    return {
        "cover_kicker": ParagraphStyle(
            "cover_kicker",
            parent=base["Normal"],
            fontName="Helvetica",
            fontSize=10,
            textColor=BLUE,
            alignment=TA_CENTER,
            letterSpacing=1.2,
            spaceAfter=8,
        ),
        "cover_title": ParagraphStyle(
            "cover_title",
            parent=base["Title"],
            fontName="Helvetica-Bold",
            fontSize=26,
            leading=32,
            textColor=NAVY,
            alignment=TA_CENTER,
            spaceAfter=10,
        ),
        "cover_sub": ParagraphStyle(
            "cover_sub",
            parent=base["Normal"],
            fontName="Helvetica",
            fontSize=11,
            leading=16,
            textColor=SLATE,
            alignment=TA_CENTER,
            spaceAfter=6,
        ),
        "h1": ParagraphStyle(
            "h1",
            parent=base["Heading1"],
            fontName="Helvetica-Bold",
            fontSize=16,
            leading=20,
            textColor=NAVY,
            spaceBefore=4,
            spaceAfter=8,
        ),
        "h2": ParagraphStyle(
            "h2",
            parent=base["Heading2"],
            fontName="Helvetica-Bold",
            fontSize=12,
            leading=16,
            textColor=NAVY,
            spaceBefore=10,
            spaceAfter=4,
        ),
        "body": ParagraphStyle(
            "body",
            parent=base["Normal"],
            fontName="Helvetica",
            fontSize=9.5,
            leading=13,
            textColor=SLATE,
            alignment=TA_JUSTIFY,
            spaceAfter=6,
        ),
        "note": ParagraphStyle(
            "note",
            parent=base["Normal"],
            fontName="Helvetica-Oblique",
            fontSize=8.5,
            leading=12,
            textColor=MUTED,
            spaceAfter=8,
        ),
        "cell": ParagraphStyle(
            "cell",
            parent=base["Normal"],
            fontName="Helvetica",
            fontSize=8,
            leading=11,
            textColor=SLATE,
        ),
        "cell_head": ParagraphStyle(
            "cell_head",
            parent=base["Normal"],
            fontName="Helvetica-Bold",
            fontSize=8,
            leading=11,
            textColor=colors.white,
        ),
        "toc": ParagraphStyle(
            "toc",
            parent=base["Normal"],
            fontName="Helvetica",
            fontSize=11,
            leading=18,
            textColor=NAVY,
        ),
        "footer": ParagraphStyle(
            "footer",
            parent=base["Normal"],
            fontName="Helvetica",
            fontSize=8,
            textColor=MUTED,
            alignment=TA_CENTER,
        ),
        "bullet": ParagraphStyle(
            "bullet",
            parent=base["Normal"],
            fontName="Helvetica",
            fontSize=9.5,
            leading=13,
            textColor=SLATE,
            leftIndent=8,
        ),
    }


def header_footer(canvas, doc) -> None:
    canvas.saveState()
    canvas.setFillColor(NAVY)
    canvas.rect(0, A4[1] - 14 * mm, A4[0], 14 * mm, fill=1, stroke=0)
    canvas.setFillColor(colors.white)
    canvas.setFont("Helvetica-Bold", 9)
    canvas.drawString(18 * mm, A4[1] - 8.5 * mm, "CONNINTER")
    canvas.setFont("Helvetica", 8)
    canvas.drawRightString(A4[0] - 18 * mm, A4[1] - 8.5 * mm, "Data collection workflows")
    canvas.setFillColor(BLUE)
    canvas.rect(0, 0, A4[0], 10 * mm, fill=1, stroke=0)
    canvas.setFillColor(colors.white)
    canvas.setFont("Helvetica", 8)
    canvas.drawString(18 * mm, 4 * mm, "Confidential — product specification")
    canvas.drawRightString(A4[0] - 18 * mm, 4 * mm, f"Page {doc.page}")
    canvas.restoreState()


def field_table(s, rows: list[tuple[str, str, str]]) -> Table:
    head = [
        Paragraph("Parameter", s["cell_head"]),
        Paragraph("Required?", s["cell_head"]),
        Paragraph("Notes / allowed values", s["cell_head"]),
    ]
    data = [head]
    for name, req, notes in rows:
        data.append(
            [
                Paragraph(name, s["cell"]),
                Paragraph(req, s["cell"]),
                Paragraph(notes, s["cell"]),
            ]
        )
    table = Table(data, colWidths=[52 * mm, 24 * mm, 98 * mm], repeatRows=1)
    style_cmds = [
        ("BACKGROUND", (0, 0), (-1, 0), NAVY),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 5),
        ("RIGHTPADDING", (0, 0), (-1, -1), 5),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("GRID", (0, 0), (-1, -1), 0.3, LINE),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
    ]
    for i, (_, req, _) in enumerate(rows, start=1):
        bg = CANVAS if i % 2 else colors.white
        style_cmds.append(("BACKGROUND", (0, i), (-1, i), bg))
        if req.startswith("Yes"):
            style_cmds.append(("TEXTCOLOR", (1, i), (1, i), GREEN))
        elif req.startswith("Conditional"):
            style_cmds.append(("TEXTCOLOR", (1, i), (1, i), AMBER))
        else:
            style_cmds.append(("TEXTCOLOR", (1, i), (1, i), MUTED))
    table.setStyle(TableStyle(style_cmds))
    return table


def bullets(s, items: list[str]) -> ListFlowable:
    return ListFlowable(
        [ListItem(Paragraph(item, s["bullet"]), leftIndent=12) for item in items],
        bulletType="1",
        start="1",
        leftIndent=18,
        spaceBefore=2,
        spaceAfter=8,
    )


def build() -> None:
    s = styles()
    story: list = []

    story.append(Spacer(1, 38 * mm))
    story.append(Paragraph("CONNINTER  ·  HOSPITAL VISITOR TRACKING", s["cover_kicker"]))
    story.append(Paragraph("What we ask users,<br/>in each workflow", s["cover_title"]))
    story.append(
        Paragraph(
            "Distributor onboarding · Attendant visit pass · Visitor profile · "
            "Offline and online visit booking",
            s["cover_sub"],
        )
    )
    story.append(Paragraph("Source of truth: live Conninter product forms (October 2026)", s["cover_sub"]))
    story.append(Spacer(1, 16 * mm))
    story.append(
        Paragraph(
            "This document lists every parameter collected from the public, in the order the "
            "product asks for it. Required vs optional matches the current UI. Conditional "
            "fields appear only when an earlier answer requires them.",
            s["body"],
        )
    )
    story.append(PageBreak())

    story.append(Paragraph("Contents", s["h1"]))
    story.append(
        Paragraph(
            "1.&nbsp;&nbsp;Distributor onboarding — /vendor/register<br/>"
            "2.&nbsp;&nbsp;Attendant visit pass — scan hospital QR → /attendant-pass/&lt;slug&gt;/<br/>"
            "3.&nbsp;&nbsp;Visitor profile — created during first booking (step 5)<br/>"
            "4.&nbsp;&nbsp;Visit booking — offline (in-person) and online (video)<br/>"
            "5.&nbsp;&nbsp;What happens after submit (system, not asked from the user)",
            s["toc"],
        )
    )
    story.append(Spacer(1, 6 * mm))
    story.append(Paragraph("How to read the tables", s["h2"]))
    story.append(
        Paragraph(
            "<b>Yes</b> — the form blocks continue if empty. "
            "<b>Optional</b> — shown but can be skipped. "
            "<b>Conditional</b> — shown only after another answer. "
            "Hospital is never chosen during distributor apply; it is chosen later when booking a delivery.",
            s["body"],
        )
    )

    # --- 1 Distributor ---
    story.append(PageBreak())
    story.append(Paragraph("1. Distributor onboarding", s["h1"]))
    story.append(
        Paragraph(
            "Entry: Welcome → Distributor → Sign in → <b>Apply to onboard</b> "
            "(/vendor/register). Five steps, then a WhatsApp OTP on the mobile number.",
            s["body"],
        )
    )
    story.append(Paragraph("Workflow", s["h2"]))
    story.append(
        bullets(
            s,
            [
                "Open /vendor/register (or tap Apply to onboard from /delivery/login).",
                "Step 1 — Account &amp; contact.",
                "Step 2 — Business identity (GST / PAN / legal entity).",
                "Step 3 — Registered address (and operating address if different).",
                "Step 4 — Upload compliance documents.",
                "Step 5 — Operations, supply categories, and two declarations.",
                "Submit. Conninter sends a 6-digit WhatsApp code to the mobile.",
                "Enter the WhatsApp code. Account can then sign in at /delivery/login.",
                "Hospital access is requested later, when booking the first delivery — not on this form.",
            ],
        )
    )

    story.append(Paragraph("Step 1 — Account &amp; contact", s["h2"]))
    story.append(
        field_table(
            s,
            [
                ("Email (login)", "Yes", "Becomes the distributor sign-in ID."),
                ("Password", "Yes", "Confirmed on the next field."),
                ("Confirm password", "Yes", "Must match password."),
                ("Primary contact name", "Yes", "Person we reach for onboarding."),
                ("Mobile", "Yes", "10-digit Indian mobile. WhatsApp OTP is sent here after submit."),
                ("Alternate mobile", "Optional", "10-digit."),
                ("Designation", "Optional", "Job title of the primary contact."),
            ],
        )
    )

    story.append(Paragraph("Step 2 — Business identity", s["h2"]))
    story.append(
        field_table(
            s,
            [
                ("Legal entity name", "Yes", "Registered company / firm name."),
                ("Trade / brand name", "Optional", "If different from legal name."),
                (
                    "Entity type",
                    "Yes",
                    "Proprietorship · Partnership · LLP · Pvt Ltd · Public Ltd · Others.",
                ),
                (
                    "Vendor category",
                    "Yes",
                    "Pharma / medicines · Medical devices · Surgical consumables · Lab reagents · "
                    "General stores · Linen / housekeeping · Catering (FSSAI) · IT equipment · Other.",
                ),
                ("GST registration type", "Yes", "Regular · Composition · Unregistered."),
                ("GSTIN", "Conditional", "Required unless GST type is Unregistered. 15 characters."),
                ("PAN", "Yes", "10-character PAN."),
                ("CIN", "Conditional", "Required when entity type is Pvt Ltd or Public Ltd."),
                ("MSME Udyam number", "Optional", "If registered under Udyam."),
                ("Year established", "Optional", "4-digit year."),
                ("Website", "Optional", "Company URL."),
            ],
        )
    )

    story.append(Paragraph("Step 3 — Registered address", s["h2"]))
    story.append(
        field_table(
            s,
            [
                ("Address line 1", "Yes", "Registered office street address."),
                ("Address line 2", "Optional", "Building, floor, landmark."),
                ("City", "Yes", ""),
                ("State / UT", "Yes", "Indian states list, plus Other."),
                ("PIN code", "Yes", "6 digits."),
                (
                    "Operating address same as registered",
                    "Yes",
                    "Checkbox. If unchecked, operating fields appear.",
                ),
                ("Operating address line 1", "Conditional", "Warehouse / dispatch address."),
                ("Operating city", "Conditional", ""),
                ("Operating PIN", "Conditional", "6 digits."),
            ],
        )
    )

    story.append(Paragraph("Step 4 — Compliance documents", s["h2"]))
    story.append(
        field_table(
            s,
            [
                (
                    "GST registration certificate",
                    "Conditional",
                    "Image or PDF. Hidden when GST type is Unregistered.",
                ),
                ("PAN card", "Yes", "Image or PDF."),
                ("Cancelled cheque / bank proof", "Yes", "Image or PDF."),
                (
                    "Drug license number",
                    "Conditional",
                    "Optional extra. Shown only when vendor category is Pharma / medicines.",
                ),
                (
                    "Drug license document",
                    "Conditional",
                    "Optional image or PDF. Pharma category only.",
                ),
            ],
        )
    )

    story.append(Paragraph("Step 5 — Operations &amp; terms", s["h2"]))
    story.append(
        field_table(
            s,
            [
                (
                    "Supply categories",
                    "Yes",
                    "One or more: medicines · implants · consumables · equipment · food · linen · lab · other.",
                ),
                ("Delivery mode", "Yes", "Own fleet · Third-party courier."),
                ("Primary goods description", "Yes", "Free text, e.g. injectable antibiotics."),
                ("Accounts email", "Optional", "For invoices."),
                ("Dispatch phone", "Optional", "10-digit."),
                (
                    "Accept platform terms",
                    "Yes",
                    "Checkbox: Conninter terms and hospital vendor policies.",
                ),
                (
                    "Declaration of truth",
                    "Yes",
                    "Checkbox: information and documents are true.",
                ),
            ],
        )
    )

    story.append(Paragraph("After submit — WhatsApp verification", s["h2"]))
    story.append(
        field_table(
            s,
            [
                (
                    "WhatsApp code",
                    "Yes",
                    "6-digit OTP sent to the mobile from Step 1. Password login stays closed until this is entered.",
                ),
            ],
        )
    )
    story.append(
        Paragraph(
            "Not asked on apply: hospital / branch. After approval, the distributor chooses "
            "or requests a hospital from the delivery booking screen.",
            s["note"],
        )
    )

    # --- 2 Attendant ---
    story.append(PageBreak())
    story.append(Paragraph("2. Attendant visit pass", s["h1"]))
    story.append(
        Paragraph(
            "Entry: Welcome → <b>Attendant</b> → camera opens on /attendant/scan. "
            "The person scans the hospital QR at reception or the gate. "
            "That QR opens /attendant-pass/&lt;branch-slug&gt;/. "
            "There is no public “book attendant” button on the website.",
            s["body"],
        )
    )
    story.append(Paragraph("Workflow", s["h2"]))
    story.append(
        bullets(
            s,
            [
                "Scan the hospital QR (or enter the branch code on the scan screen).",
                "Hospital / branch is already known from the QR. Confirm if the link was wrong.",
                "Find the admitted patient — search by name (2+ letters) or look up by MRN.",
                "Select the matching patient (name, MRN, ward / room shown).",
                "Enter the attendant’s own details and optional companion.",
                "Submit <b>Book pass</b> (blocked if another attendant is already checked in).",
                "Primary (FIXED) attendant confirms on WhatsApp. Then today’s pass + QR is sent on WhatsApp.",
                "Security scans that QR at the gate for entry and exit.",
            ],
        )
    )

    story.append(Paragraph("Step 1 — Find the patient", s["h2"]))
    story.append(
        field_table(
            s,
            [
                (
                    "Hospital / branch",
                    "Yes",
                    "Usually pre-filled from the QR slug. Dropdown if the link does not match.",
                ),
                (
                    "Search mode",
                    "Yes",
                    "Search by name · Search by MRN.",
                ),
                (
                    "Patient name",
                    "Conditional",
                    "At least 2 letters. Then pick the patient from results.",
                ),
                (
                    "Patient MRN",
                    "Conditional",
                    "From the admission document. Used with Look up patient.",
                ),
                (
                    "Selected admission",
                    "Yes",
                    "Chosen from search results. System stores admission ID, not typed by the user.",
                ),
            ],
        )
    )

    story.append(Paragraph("Step 2 — Attendant details", s["h2"]))
    story.append(
        field_table(
            s,
            [
                ("Photo", "Optional", "Live camera or upload. Printed on the WhatsApp pass."),
                ("Full name", "Yes", "Attendant applying for the visit."),
                ("Email", "Yes", "Used for visit-complete notices."),
                ("Phone", "Yes", "WhatsApp destination for the pass / approval request."),
                ("Relationship to patient", "Yes", "Free text, e.g. Daughter, Spouse."),
                (
                    "Add one person on this pass",
                    "Optional",
                    "Checkbox. Companion is metadata only — not a second pass.",
                ),
                ("Extra person name", "Conditional", "If companion is added."),
                ("Extra person phone", "Conditional", "If companion is added."),
                ("Companion relationship", "Conditional", "Relationship of the extra person to the patient."),
            ],
        )
    )
    story.append(
        Paragraph(
            "Not asked from the family: ward, bed, visiting-window times, or pass number. "
            "Those come from the hospital admission and policy. Booking is refused outside "
            "the branch visiting window, or while another visitor is already checked in.",
            s["note"],
        )
    )

    # --- 3 Visitor profile ---
    story.append(PageBreak())
    story.append(Paragraph("3. Visitor profile (create account)", s["h1"]))
    story.append(
        Paragraph(
            "A visitor profile is created the first time someone books a doctor and is not signed in. "
            "It is <b>Step 5</b> of the booking wizard (BookingProfileStep). "
            "The same fields are used on /visitor/register. "
            "Signed-in visitors skip this step.",
            s["body"],
        )
    )
    story.append(Paragraph("Workflow", s["h2"]))
    story.append(
        bullets(
            s,
            [
                "Start booking (Visitor pass or Online session). Steps 1–4 pick hospital, department, section, doctor.",
                "If no visitor token: Step 5 — create profile (this section).",
                "Upload photo and government ID (live camera or file).",
                "Set password and accept terms.",
                "Tap <b>Verify phone and continue</b>. Conninter sends a 6-digit WhatsApp OTP.",
                "Enter the code. The account becomes ACTIVE and the visitor is signed in.",
                "Continue to visit details (next chapter). Profile is reused for later bookings.",
            ],
        )
    )
    story.append(
        field_table(
            s,
            [
                ("First name", "Yes", ""),
                ("Last name", "Yes", ""),
                ("Mobile number (WhatsApp)", "Yes", "10-digit. OTP is sent here. This is also a login ID."),
                ("Email", "Yes", "Login ID. Email OTP is not required to activate."),
                ("Email type", "Yes", "Personal · Work."),
                ("Company", "Optional", "Shown on the profile preview."),
                ("Job title", "Optional", ""),
                ("Your photo", "Yes", "Live selfie (front camera) or JPEG/PNG/WebP upload."),
                (
                    "Government ID type",
                    "Yes",
                    "Aadhaar · PAN · Passport · Driving licence · Voter ID · Other.",
                ),
                ("Other ID type", "Conditional", "Free text when type is Other."),
                (
                    "Government ID image / PDF",
                    "Yes",
                    "Live photo of the ID (rear camera) or JPEG/PNG/WebP/PDF upload.",
                ),
                (
                    "Password",
                    "Yes",
                    "At least 8 characters with upper case, lower case and a digit.",
                ),
                ("Confirm password", "Yes", "Must match."),
                ("Accept terms &amp; privacy", "Yes", "Checkbox."),
                (
                    "WhatsApp code",
                    "Yes",
                    "6-digit. Account activates when this is verified. Email verify is optional later.",
                ),
            ],
        )
    )

    # --- 4 Booking ---
    story.append(PageBreak())
    story.append(Paragraph("4. Visit booking — offline and online", s["h1"]))
    story.append(
        Paragraph(
            "Same wizard: /book-appointment/. "
            "<b>Visitor pass</b> locks the visit as Offline (in-person). "
            "<b>Online session</b> locks it as Online (video). "
            "If opened without a lock, the visitor chooses Offline or Online on the details step. "
            "Signed-in visitors go from the doctor straight to visit details (step 5A).",
            s["body"],
        )
    )
    story.append(Paragraph("Shared workflow (both modes)", s["h2"]))
    story.append(
        bullets(
            s,
            [
                "Step 1 — Choose hospital (Ovum / Kauvery), then the centre / branch.",
                "Step 2 — Select department (search from 3 letters).",
                "Step 3 — Select section / sub-department.",
                "Step 4 — Select doctor (name, department, location, qualification shown).",
                "Step 5 — Create profile (only if not signed in) — see chapter 3.",
                "Step 5A — Visit details: date, slot or custom request, purpose, carrying, visitor type, visit mode.",
                "Step 6 — Pay the visit fee (wallet, Razorpay, or dummy pay in demo).",
                "Doctor confirms or rejects. Offline: WhatsApp meeting pass + gate QR. Online: WhatsApp join links for doctor and visitor.",
            ],
        )
    )

    story.append(Paragraph("Steps 1–4 — Who they are visiting", s["h2"]))
    story.append(
        field_table(
            s,
            [
                ("Hospital chain", "Yes", "Partner cards, e.g. Ovum · Kauvery."),
                ("Hospital centre / branch", "Yes", "Centres of the chosen hospital only."),
                ("Department", "Yes", "Searchable list, minimum 3 letters to filter."),
                ("Section (sub-department)", "Yes", "Searchable list."),
                ("Doctor", "Yes", "Searchable list."),
            ],
        )
    )

    story.append(Paragraph("Step 5A — Visit details (asked every booking)", s["h2"]))
    story.append(
        field_table(
            s,
            [
                (
                    "Appointment date",
                    "Yes",
                    "Calendar. Green days have published slots.",
                ),
                (
                    "Available time slot",
                    "Yes*",
                    "Pick a published slot, or switch to a custom request. *Not charged if requesting a slot.",
                ),
                (
                    "Request a visit slot",
                    "Optional",
                    "If no slot fits: send a time to the doctor. No payment yet.",
                ),
                (
                    "Requested time",
                    "Conditional",
                    "Clock time, only when “Request a visit slot” is selected.",
                ),
                (
                    "Purpose of the visit",
                    "Yes",
                    "3–191 characters. Shown to the doctor on WhatsApp.",
                ),
                (
                    "What are you carrying?",
                    "Yes",
                    "Required for a paid booking (not for a slot request). Write “Nothing” if empty-handed. 2–500 characters.",
                ),
                (
                    "Visitor type",
                    "Yes",
                    "General · Sales Representative · Vendor.",
                ),
                (
                    "Company name",
                    "Conditional",
                    "Required when visitor type is Sales Representative.",
                ),
                (
                    "Company email",
                    "Conditional",
                    "Sales Representative only. Attendance updates go here.",
                ),
                (
                    "Visit type (mode)",
                    "Yes",
                    "Offline (in-person) · Online (video). Locked if the visitor opened Visitor pass or Online session.",
                ),
                (
                    "First / last name, phone, email",
                    "Conditional",
                    "Only if the signed-in profile is missing contact fields. Otherwise shown as “booking as …”.",
                ),
            ],
        )
    )

    story.append(Paragraph("Step 6 — Payment (paid booking only)", s["h2"]))
    story.append(
        field_table(
            s,
            [
                (
                    "Payment method",
                    "Yes",
                    "Wallet (if balance ≥ fee, default ₹200) · Online (Razorpay) · Dummy payment (demo / testing).",
                ),
                (
                    "Wallet recharge",
                    "Optional",
                    "If wallet is low: leave the wizard, recharge, return to payment.",
                ),
            ],
        )
    )

    story.append(Paragraph("Offline vs online — same form, different outcome", s["h2"]))
    compare = [
        [
            Paragraph("Topic", s["cell_head"]),
            Paragraph("Offline (in-person)", s["cell_head"]),
            Paragraph("Online (video)", s["cell_head"]),
        ],
        [
            Paragraph("How the visitor starts", s["cell"]),
            Paragraph("Visitor pass → /book-appointment/?mode=offline", s["cell"]),
            Paragraph("Online session → /book-appointment/?mode=online", s["cell"]),
        ],
        [
            Paragraph("Extra fields asked", s["cell"]),
            Paragraph("None beyond the shared list. Carrying is still required (security at the gate).", s["cell"]),
            Paragraph("None beyond the shared list. Mode is locked to Online.", s["cell"]),
        ],
        [
            Paragraph("After doctor approves", s["cell"]),
            Paragraph(
                "WhatsApp meeting pass with photo, doctor, date/time, check-in QR. Visitor shows QR at the gate.",
                s["cell"],
            ),
            Paragraph(
                "WhatsApp join links to both doctor and visitor. In-app LiveKit room (/meet). No gate QR.",
                s["cell"],
            ),
        ],
        [
            Paragraph("Check-in / check-out", s["cell"]),
            Paragraph("Security scans the same QR for entry and exit. Slot clock starts at check-in.", s["cell"]),
            Paragraph("Join / leave the video room. Webhook records check-in / check-out.", s["cell"]),
        ],
        [
            Paragraph("If there are no slots", s["cell"]),
            Paragraph("Exit and notify me (WhatsApp when slots open), or request a visit slot.", s["cell"]),
            Paragraph("Same waitlist / request options.", s["cell"]),
        ],
    ]
    cmp_table = Table(compare, colWidths=[38 * mm, 68 * mm, 68 * mm], repeatRows=1)
    cmp_table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), NAVY),
                ("BACKGROUND", (0, 1), (0, -1), CANVAS),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("GRID", (0, 0), (-1, -1), 0.3, LINE),
                ("LEFTPADDING", (0, 0), (-1, -1), 5),
                ("RIGHTPADDING", (0, 0), (-1, -1), 5),
                ("TOPPADDING", (0, 0), (-1, -1), 5),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
            ]
        )
    )
    story.append(cmp_table)

    # --- 5 After ---
    story.append(PageBreak())
    story.append(Paragraph("5. After submit — not asked from the user", s["h1"]))
    story.append(
        Paragraph(
            "These values are created by Conninter or the hospital. They are not form fields, "
            "but they complete the workflow.",
            s["body"],
        )
    )
    story.append(
        field_table(
            s,
            [
                (
                    "Distributor vendor code",
                    "System",
                    "VEN-######. Wallet created at ₹0 until hospital / demo credit.",
                ),
                (
                    "Hospital approval of vendor",
                    "Hospital",
                    "Branch mapping APPROVED before the distributor can book that site.",
                ),
                (
                    "Attendant pass number &amp; validity",
                    "System",
                    "Issued after primary WhatsApp Confirm. Valid for today’s visiting window.",
                ),
                (
                    "Visit booking ID",
                    "System",
                    "Shown on confirmation. Fee held on wallet until the doctor confirms.",
                ),
                (
                    "Meeting / delivery pass images",
                    "System",
                    "Composed and sent on WhatsApp. QR payload is signed by the server.",
                ),
                (
                    "Online meeting room",
                    "System",
                    "Room visit-{id} and signed /meet links after online approval.",
                ),
            ],
        )
    )

    story.append(Paragraph("Quick map of public URLs", s["h2"]))
    story.append(
        field_table(
            s,
            [
                ("Distributor apply", "—", "/vendor/register"),
                ("Distributor sign in", "—", "/delivery/login"),
                ("Attendant scan (app)", "—", "/attendant/scan"),
                ("Attendant apply", "—", "/attendant-pass/&lt;branch-slug&gt;/"),
                ("Visitor profile + booking", "—", "/book-appointment/  (or ?mode=offline|online)"),
                ("Visitor sign in", "—", "/visitor/login"),
                ("Visitor dashboard / wallet", "—", "/visitor/dashboard  ·  /visitor/wallet"),
            ],
        )
    )
    story.append(Spacer(1, 8 * mm))
    story.append(
        Paragraph(
            "Generated from the live Conninter forms in this repository. "
            "Regenerate with: python docs/generate_data_collection_pdf.py",
            s["note"],
        )
    )

    doc = SimpleDocTemplate(
        str(OUT),
        pagesize=A4,
        leftMargin=16 * mm,
        rightMargin=16 * mm,
        topMargin=20 * mm,
        bottomMargin=16 * mm,
        title="Conninter — Data collection workflows",
        author="Conninter",
        subject="Parameters collected from distributor, attendant, and visitor",
    )
    doc.build(story, onFirstPage=header_footer, onLaterPages=header_footer)
    print(f"Wrote {OUT}")


if __name__ == "__main__":
    build()
