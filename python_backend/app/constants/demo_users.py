from typing import TypedDict

from app.constants.demo_entities import (
    APOLLO_CHAIN_ID,
    CARDIOLOGY_DEPARTMENT_ID,
    CHENNAI_BRANCH_ID,
    DEPARTMENT_ADMIN_ID,
    DOCTOR_USER_ID,
    HOSPITAL_ADMIN_ID,
    ICU_CARDIOLOGY_SUB_DEPT_ID,
    SECURITY_USER_ID,
    SUB_DEPARTMENT_ADMIN_ID,
)


class DemoUser(TypedDict):
    id: str
    name: str
    phone: str
    role: str
    hospitalChainId: str | None
    branchId: str | None
    departmentId: str | None
    subDepartmentId: str | None


DEFAULT_DEMO_USER_ID = "11111111-1111-1111-1111-111111111111"

DEMO_USERS_BY_ID: dict[str, DemoUser] = {
    "11111111-1111-1111-1111-111111111111": {
        "id": "11111111-1111-1111-1111-111111111111",
        "name": "Sushobhit Kundra",
        "phone": "6987456321",
        "role": "SUPER_ADMIN",
        "hospitalChainId": None,
        "branchId": None,
        "departmentId": None,
        "subDepartmentId": None,
    },
    DEPARTMENT_ADMIN_ID: {
        "id": DEPARTMENT_ADMIN_ID,
        "name": "Rajesh Kumar",
        "phone": "8482022111",
        "role": "DEPARTMENT_ADMIN",
        "hospitalChainId": APOLLO_CHAIN_ID,
        "branchId": CHENNAI_BRANCH_ID,
        "departmentId": CARDIOLOGY_DEPARTMENT_ID,
        "subDepartmentId": None,
    },
    HOSPITAL_ADMIN_ID: {
        "id": HOSPITAL_ADMIN_ID,
        "name": "Priya Sharma",
        "phone": "9123456780",
        "role": "HOSPITAL_ADMIN",
        "hospitalChainId": APOLLO_CHAIN_ID,
        "branchId": CHENNAI_BRANCH_ID,
        "departmentId": None,
        "subDepartmentId": None,
    },
    SUB_DEPARTMENT_ADMIN_ID: {
        "id": SUB_DEPARTMENT_ADMIN_ID,
        "name": "Anil Patel",
        "phone": "7980427511",
        "role": "SUB_DEPARTMENT_ADMIN",
        "hospitalChainId": APOLLO_CHAIN_ID,
        "branchId": CHENNAI_BRANCH_ID,
        "departmentId": CARDIOLOGY_DEPARTMENT_ID,
        "subDepartmentId": ICU_CARDIOLOGY_SUB_DEPT_ID,
    },
    SECURITY_USER_ID: {
        "id": SECURITY_USER_ID,
        "name": "Rameshwar Tiwari",
        "phone": "9883578111",
        "role": "SECURITY",
        "hospitalChainId": APOLLO_CHAIN_ID,
        "branchId": CHENNAI_BRANCH_ID,
        "departmentId": CARDIOLOGY_DEPARTMENT_ID,
        "subDepartmentId": ICU_CARDIOLOGY_SUB_DEPT_ID,
    },
    DOCTOR_USER_ID: {
        "id": DOCTOR_USER_ID,
        "name": "Dr. Arjun Desai",
        "phone": "7003636111",
        "role": "STAFF",
        "hospitalChainId": APOLLO_CHAIN_ID,
        "branchId": CHENNAI_BRANCH_ID,
        "departmentId": CARDIOLOGY_DEPARTMENT_ID,
        "subDepartmentId": ICU_CARDIOLOGY_SUB_DEPT_ID,
    },
}


def resolve_demo_user(x_demo_user_id: str | None) -> DemoUser:
    if x_demo_user_id and x_demo_user_id in DEMO_USERS_BY_ID:
        return DEMO_USERS_BY_ID[x_demo_user_id]
    return DEMO_USERS_BY_ID[DEFAULT_DEMO_USER_ID]
