"""Deterministic IDs for Kauvery Hospital Bengaluru (2 branches)."""

KAUVERY_CHAIN_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa0b"

KAUVERY_CHAIN_ADMIN_ID = "cccccccc-cccc-4ccc-8ccc-cccccccccc0b"

KAUVERY_BRANCH_IDS: tuple[str, ...] = (
    "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbb0b",
    "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbb0c",
)

KAUVERY_HOSPITAL_ADMIN_IDS: tuple[str, ...] = (
    "cccccccc-cccc-4ccc-8ccc-cccccccccc1b",
    "cccccccc-cccc-4ccc-8ccc-cccccccccc1c",
)

KAUVERY_BRANCHES: tuple[dict, ...] = (
    {
        "id": KAUVERY_BRANCH_IDS[0],
        "location": "Electronic City",
        "name": "Kauvery Hospital — Electronic City",
        "slug": "kauvery-electronic-city",
        "email": "electroniccity@kauvery.conninter.com",
        "phone": "08045601001",
        "street": "Electronic City Phase 1, Hosur Road",
        "city": "Bengaluru",
        "state": "Karnataka",
        "pinCode": "560100",
        "country": "India",
    },
    {
        "id": KAUVERY_BRANCH_IDS[1],
        "location": "Marathahalli",
        "name": "Kauvery Hospital — Marathahalli",
        "slug": "kauvery-marathahalli",
        "email": "marathahalli@kauvery.conninter.com",
        "phone": "08045601002",
        "street": "Marathahalli Outer Ring Road",
        "city": "Bengaluru",
        "state": "Karnataka",
        "pinCode": "560037",
        "country": "India",
    },
)
