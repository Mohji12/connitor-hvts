"""Kauvery Hospital departments and sub-departments (both Bengaluru branches)."""

from __future__ import annotations

import re


def _slug(name: str) -> str:
    text = name.lower()
    text = re.sub(r"[^a-z0-9]+", "-", text)
    return text.strip("-")[:48] or "dept"


def _code(name: str, used: set[str]) -> str:
    words = re.findall(r"[A-Za-z0-9]+", name)
    base = "".join(w[0].upper() for w in words)[:8] or "DEPT"
    code = base
    n = 2
    while code in used:
        code = f"{base}{n}"
        n += 1
    used.add(code)
    return code


# (department name, semicolon-separated sub-department / service names)
_RAW: list[tuple[str, str]] = [
    ("Accident and Emergency Care", "Emergency consultation; trauma stabilisation; accident care"),
    ("Anaesthesiology", "General anaesthesia; regional anaesthesia; perioperative assessment"),
    ("Arthroplasty / Joint Replacement", "Hip replacement; knee replacement; revision joint surgery"),
    ("Arthroscopy", "Knee arthroscopy; shoulder arthroscopy; sports-related joint procedures"),
    ("Bariatric Surgery", "Weight-loss surgery; metabolic surgery; postoperative follow-up"),
    ("Cardiology", "Clinical cardiology; interventional cardiology; cardiac diagnostics; angioplasty"),
    (
        "Cardiothoracic and Vascular Surgery",
        "Heart surgery; valve surgery; thoracic surgery; vascular surgery",
    ),
    ("Critical Care and ICU", "Medical ICU; surgical ICU; cardiac ICU; neurological ICU"),
    ("Dental Care", "General dentistry; oral health; dental and maxillofacial care"),
    ("Dermatology and Cosmetology", "Clinical dermatology; skin disorders; cosmetic dermatology"),
    (
        "Diabetes and Endocrinology",
        "Diabetes management; thyroid disorders; hormonal and metabolic disorders",
    ),
    ("ENT", "Ear disorders; nose and sinus disorders; throat disorders"),
    (
        "Gastrointestinal Robotic Surgery",
        "Robotic gastrointestinal procedures; minimally invasive digestive surgery",
    ),
    (
        "General Surgery",
        "General surgical consultation; abdominal surgery; minor surgical procedures",
    ),
    (
        "Gynaecologic Robotic Surgery",
        "Robotic gynaecological procedures; minimally invasive gynaecological surgery",
    ),
    ("Hand Surgery", "Hand injuries; tendon and nerve conditions; reconstructive hand procedures"),
    ("IVF and Infertility", "Fertility assessment; assisted reproduction; infertility management"),
    ("Infectious Disease", "Infection assessment; complex infections; antimicrobial management"),
    (
        "Internal Medicine",
        "Adult medical consultation; chronic disease management; multisystem disorders",
    ),
    (
        "Interventional Radiology",
        "Image-guided procedures; vascular interventions; minimally invasive procedures",
    ),
    ("Laboratory Medicine", "Clinical pathology; blood tests; diagnostic laboratory services"),
    ("Laparoscopic Surgery", "Minimally invasive abdominal surgery; laparoscopic procedures"),
    (
        "Lifestyle Diseases",
        "Obesity; hypertension; diabetes risk; preventive health management",
    ),
    (
        "Liver Transplantation and Hepatobiliary Surgery",
        "Liver transplantation; liver diseases; bile duct and gallbladder surgery",
    ),
    (
        "Medical Gastroenterology",
        "Digestive disorders; endoscopy; colonoscopy; liver-related digestive assessment",
    ),
    ("Medical Oncology", "Cancer consultation; systemic cancer treatment; chemotherapy"),
    (
        "Neonatal Intensive Care Unit",
        "Critical newborn care; premature infant care; neonatal monitoring",
    ),
    ("Neonatology", "Newborn assessment; premature babies; neonatal disorders"),
    ("Nephrology", "Kidney disease; chronic kidney disease; dialysis; transplant follow-up"),
    ("Neurology", "Stroke assessment; epilepsy; headache; movement and nerve disorders"),
    ("Neurosurgery", "Brain surgery; spine surgery; neurosurgical trauma"),
    ("Nutrition and Dietetics", "Clinical nutrition; therapeutic diets; nutrition counselling"),
    (
        "Obstetrics and Gynaecology",
        "Pregnancy care; delivery; gynaecological disorders; high-risk pregnancy",
    ),
    ("Ophthalmology", "Eye examinations; cataract care; retinal and other eye disorders"),
    ("Orthopaedics", "Bone disorders; fractures; musculoskeletal conditions"),
    ("Pain Medicine", "Acute pain; chronic pain; procedural pain management"),
    (
        "Paediatric Intensive Care Unit",
        "Critical paediatric care; monitoring of seriously ill children",
    ),
    ("Paediatrics", "General child health; paediatric illnesses; growth and development"),
    ("Perinatology / Fetal Medicine", "High-risk pregnancy; fetal assessment; prenatal diagnosis"),
    (
        "Physical Medicine and Rehabilitation",
        "Physiotherapy; functional rehabilitation; postoperative recovery",
    ),
    (
        "Plastic and Cosmetic Surgery",
        "Reconstructive surgery; cosmetic procedures; wound reconstruction",
    ),
    ("Psychiatry", "Mental health consultation; mood disorders; anxiety-related conditions"),
    ("Pulmonology", "Asthma; respiratory disease; lung disorders"),
    ("Radiology", "X-ray; CT; MRI; ultrasound; diagnostic imaging"),
    ("Rheumatology", "Arthritis; autoimmune disorders; inflammatory joint disease"),
    (
        "Robotic ENT – Head and Neck Surgery",
        "Robotic head and neck procedures; selected ENT surgeries",
    ),
    ("Robotic Joint Replacement Surgery", "Robotic-assisted hip and knee replacement"),
    (
        "Robotic Urological Surgery",
        "Robotic prostate and other selected urological procedures",
    ),
    ("Spine Care", "Back pain; spinal disorders; spine surgery assessment"),
    ("Sports Medicine", "Sports injuries; joint injuries; return-to-sport rehabilitation"),
    (
        "Surgical Gastroenterology",
        "Digestive tract surgery; gastrointestinal cancer surgery; abdominal surgery",
    ),
    ("Thoracic Robotic Surgery", "Selected minimally invasive chest and thoracic procedures"),
    ("Trauma Care", "Injury assessment; trauma surgery; fracture and injury management"),
    (
        "Urology",
        "Kidney stones; prostate disorders; urinary tract conditions; urological surgery",
    ),
]


def _build_catalog() -> list[dict]:
    used_codes: set[str] = set()
    rows: list[dict] = []
    for name, services in _RAW:
        code = _code(name, used_codes)
        subs: list[dict] = []
        used_sub: set[str] = set()
        for part in services.split(";"):
            sub_name = part.strip()
            if not sub_name:
                continue
            sub_code = _code(sub_name, used_sub)
            subs.append(
                {
                    "name": sub_name,
                    "code": sub_code,
                    "slug": _slug(sub_name),
                    "description": sub_name,
                }
            )
        rows.append(
            {
                "name": name,
                "code": code,
                "slug": _slug(name),
                "description": name,
                "subDepartments": subs,
            }
        )
    return rows


KAUVERY_DEPARTMENTS: list[dict] = _build_catalog()
