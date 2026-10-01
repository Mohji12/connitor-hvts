"""Six clinical departments seeded at every Ovum branch."""

from __future__ import annotations

from typing import TypedDict


class OvumDepartmentTemplate(TypedDict):
    priority: int
    name: str
    code: str
    slug: str
    description: str


OVUM_DEPARTMENTS: tuple[OvumDepartmentTemplate, ...] = (
    {
        "priority": 1,
        "name": "Obstetrics & Gynaecology",
        "code": "OBGYN",
        "slug": "obstetrics-gynaecology",
        "description": "Pregnancy, antenatal care, delivery, C-section, and women's health.",
    },
    {
        "priority": 2,
        "name": "Paediatrics",
        "code": "PAEDS",
        "slug": "paediatrics",
        "description": "General healthcare for infants, children, and adolescents.",
    },
    {
        "priority": 3,
        "name": "Neonatology / NICU",
        "code": "NEONAT",
        "slug": "neonatology-nicu",
        "description": "Care for premature and critically ill newborns.",
    },
    {
        "priority": 4,
        "name": "Fetal Medicine",
        "code": "FETAL",
        "slug": "fetal-medicine",
        "description": "High-risk pregnancy and fetal assessment.",
    },
    {
        "priority": 5,
        "name": "Paediatric Surgery",
        "code": "PAED-SURG",
        "slug": "paediatric-surgery",
        "description": "Surgical treatment for newborns and children.",
    },
    {
        "priority": 6,
        "name": "Fertility & IVF",
        "code": "IVF",
        "slug": "fertility-ivf",
        "description": "Infertility evaluation and assisted reproduction.",
    },
)

OBGYN_CODE = "OBGYN"
