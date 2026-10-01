"""Deterministic IDs for Ovum Woman & Child Speciality Hospital (7 Bengaluru branches)."""

OVUM_CHAIN_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa01"

OVUM_BRANCH_IDS: tuple[str, ...] = (
    "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbb01",
    "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbb02",
    "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbb03",
    "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbb04",
    "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbb05",
    "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbb06",
    "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbb07",
)

OVUM_HOSPITAL_ADMIN_IDS: tuple[str, ...] = (
    "cccccccc-cccc-4ccc-8ccc-cccccccccc01",
    "cccccccc-cccc-4ccc-8ccc-cccccccccc02",
    "cccccccc-cccc-4ccc-8ccc-cccccccccc03",
    "cccccccc-cccc-4ccc-8ccc-cccccccccc04",
    "cccccccc-cccc-4ccc-8ccc-cccccccccc05",
    "cccccccc-cccc-4ccc-8ccc-cccccccccc06",
    "cccccccc-cccc-4ccc-8ccc-cccccccccc07",
)

OVUM_DEPARTMENT_IDS: tuple[str, ...] = (
    "dddddddd-dddd-4ddd-8ddd-dddddddddd01",
    "dddddddd-dddd-4ddd-8ddd-dddddddddd02",
    "dddddddd-dddd-4ddd-8ddd-dddddddddd03",
    "dddddddd-dddd-4ddd-8ddd-dddddddddd04",
    "dddddddd-dddd-4ddd-8ddd-dddddddddd05",
    "dddddddd-dddd-4ddd-8ddd-dddddddddd06",
    "dddddddd-dddd-4ddd-8ddd-dddddddddd07",
)

OVUM_SUB_DEPARTMENT_IDS: tuple[str, ...] = (
    "eeeeeeee-eeee-4eee-8eee-eeeeeeeeee01",
    "eeeeeeee-eeee-4eee-8eee-eeeeeeeeee02",
    "eeeeeeee-eeee-4eee-8eee-eeeeeeeeee03",
    "eeeeeeee-eeee-4eee-8eee-eeeeeeeeee04",
    "eeeeeeee-eeee-4eee-8eee-eeeeeeeeee05",
    "eeeeeeee-eeee-4eee-8eee-eeeeeeeeee06",
    "eeeeeeee-eeee-4eee-8eee-eeeeeeeeee07",
)

OVUM_DOCTOR_IDS: tuple[str, ...] = (
    "ffffffff-ffff-4fff-8fff-ffffffffff01",
    "ffffffff-ffff-4fff-8fff-ffffffffff02",
    "ffffffff-ffff-4fff-8fff-ffffffffff03",
    "ffffffff-ffff-4fff-8fff-ffffffffff04",
    "ffffffff-ffff-4fff-8fff-ffffffffff05",
    "ffffffff-ffff-4fff-8fff-ffffffffff06",
    "ffffffff-ffff-4fff-8fff-ffffffffff07",
)

# Chain-wide Ovum login (sees all 7 branches in dashboard)
OVUM_CHAIN_ADMIN_ID = "cccccccc-cccc-4ccc-8ccc-cccccccccc08"

# Backward-compatible aliases (centre 1)
OVUM_BRANCH_ID = OVUM_BRANCH_IDS[0]
OVUM_HOSPITAL_ADMIN_ID = OVUM_HOSPITAL_ADMIN_IDS[0]
