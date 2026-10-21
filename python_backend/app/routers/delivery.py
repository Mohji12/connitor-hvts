"""Delivery management API routes."""

from typing import Annotated, Any

from fastapi import APIRouter, Depends, File, Query, UploadFile
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies.auth import get_current_user
from app.dependencies.permissions import require_permission
from app.delivery.agent_vehicle_service import AgentVehicleService
from app.delivery.branch_delivery_service import BranchDeliveryService
from app.delivery.delivery_slot_service import DeliverySlotService
from app.delivery.distributor_service import DistributorService
from app.delivery.onboarding_service import DistributorOnboardingService
from app.delivery.gate_service import DeliveryGateService
from app.delivery.inbound_delivery_service import InboundDeliveryService
from app.delivery.receiving_service import ReceivingService
from app.delivery.wallet_service import WalletService
from app.delivery.distributor_visit_service import DistributorVisitService

router = APIRouter()


class DeliveryCreateBody(BaseModel):
    branchId: str | None = None
    vendorId: str | None = None
    vehicleId: str
    agentId: str
    deliveryType: str = "STANDARD"
    poNumber: str | None = None
    invoiceNumber: str | None = None
    totalBoxes: int = 0
    remarks: str | None = None
    items: list[dict] = Field(default_factory=list)


class DistributorCreateBody(BaseModel):
    vendorName: str
    vendorType: str = "MEDICAL"
    gstNumber: str | None = None
    email: str | None = None
    phone: str | None = None
    branchId: str | None = None


class ScanQrBody(BaseModel):
    qrPayload: str
    signature: str


class CourierRegisterBody(BaseModel):
    branchId: str
    agentName: str | None = None
    mobileNumber: str | None = None
    vehicleNumber: str | None = None
    courierCompany: str | None = None
    visitId: str | None = None


class DeliveryBookBody(BaseModel):
    branchId: str
    slotId: str | None = None
    expectedArrivalTime: str | None = None
    poNumber: str | None = None
    goodsType: str | None = None
    totalBoxes: int | None = None
    boxLengthCm: float | None = None
    boxBreadthCm: float | None = None
    boxHeightCm: float | None = None
    packages: list[dict] | None = None
    vehicleCategory: str | None = None
    vehicleType: str | None = None
    vehicleId: str | None = None
    vehicle: dict | None = None
    agentId: str | None = None
    agent: dict | None = None
    remarks: str | None = None
    deliveryType: str = "STANDARD"
    slotMinutes: int | None = None
    vendorId: str | None = None
    # WALLET = require balance; DUMMY = demo pay (credit then debit)
    paymentMethod: str = "WALLET"


class DeliveryQuoteBody(BaseModel):
    totalBoxes: int | None = None
    boxLengthCm: float | None = None
    boxBreadthCm: float | None = None
    boxHeightCm: float | None = None
    packages: list[dict] | None = None
    vehicleCategory: str | None = None
    vehicleType: str | None = None
    vehicleId: str | None = None
    vehicleVolumeCm3: float | None = None
    vehicleLengthCm: float | None = None
    vehicleBreadthCm: float | None = None
    vehicleHeightCm: float | None = None
    vendorId: str | None = None


class VehicleCreateBody(BaseModel):
    registrationNumber: str
    vehicleType: str | None = None
    lengthCm: float | None = None
    breadthCm: float | None = None
    heightCm: float | None = None
    volumeCm3: float | None = None


class AgentCreateBody(BaseModel):
    name: str
    email: str | None = None
    phone: str | None = None
    licenseNumber: str | None = None


class DistributorProfileUpdateBody(BaseModel):
    vendorName: str | None = None
    tradeName: str | None = None
    legalEntityType: str | None = None
    website: str | None = None
    yearEstablished: int | None = None
    contactPerson: str | None = None
    designation: str | None = None
    preferredLanguage: str | None = None
    email: str | None = None
    phone: str | None = None
    alternatePhone: str | None = None
    dispatchPhone: str | None = None
    accountsEmail: str | None = None
    city: str | None = None
    state: str | None = None
    deliveryMode: str | None = None
    goodsDescription: str | None = None
    registeredAddress: dict[str, Any] | None = None
    operatingAddress: dict[str, Any] | None = None
    serviceableStates: list[str] | None = None
    supplyCategories: list[str] | None = None


class SlotBulkCreateBody(BaseModel):
    startDate: str
    endDate: str
    slotMinutes: int = 120
    maxDeliveries: int = 999
    windows: list[dict] | None = None
    # windows = one shared pool per time range (default); grid = chop into slotMinutes chunks
    mode: str = "windows"


@router.get("/deliveries")
def list_deliveries(
    user: Annotated[dict, Depends(require_permission("VIEW_DELIVERY"))],
    db: Annotated[Session, Depends(get_db)],
    branchId: str | None = Query(None),
    status: str | None = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
):
    return InboundDeliveryService(db).list_deliveries(user, branch_id=branchId, status=status, skip=skip, limit=limit)


@router.get("/deliveries/dashboard/summary")
def delivery_dashboard(
    user: Annotated[dict, Depends(require_permission("VIEW_DELIVERY"))],
    db: Annotated[Session, Depends(get_db)],
    branchId: str | None = Query(None),
):
    return InboundDeliveryService(db).dashboard_summary(user, branchId)


@router.get("/deliveries/{delivery_id}")
def get_delivery(
    delivery_id: str,
    user: Annotated[dict, Depends(require_permission("VIEW_DELIVERY"))],
    db: Annotated[Session, Depends(get_db)],
):
    return InboundDeliveryService(db).get_delivery(delivery_id, user)


@router.post("/deliveries/book", status_code=201)
def book_delivery(
    body: DeliveryBookBody,
    user: Annotated[dict, Depends(require_permission("CREATE_DELIVERY"))],
    db: Annotated[Session, Depends(get_db)],
):
    return InboundDeliveryService(db).book_delivery(user, body.model_dump())


@router.post("/deliveries/quote")
def quote_delivery(
    body: DeliveryQuoteBody,
    user: Annotated[dict, Depends(require_permission("CREATE_DELIVERY"))],
    db: Annotated[Session, Depends(get_db)],
):
    return InboundDeliveryService(db).quote_delivery(user, body.model_dump())


@router.get("/distributors/me")
def my_distributor_profile(
    user: Annotated[dict, Depends(require_permission("VIEW_DELIVERY"))],
    db: Annotated[Session, Depends(get_db)],
):
    return DistributorOnboardingService(db).get_me(user)


@router.patch("/distributors/me")
def update_my_distributor_profile(
    body: DistributorProfileUpdateBody,
    user: Annotated[dict, Depends(require_permission("CREATE_DELIVERY"))],
    db: Annotated[Session, Depends(get_db)],
):
    return DistributorOnboardingService(db).update_me(
        user, body.model_dump(exclude_unset=True)
    )


@router.get("/distributors/me/branches")
def my_approved_branches(
    user: Annotated[dict, Depends(require_permission("CREATE_DELIVERY"))],
    db: Annotated[Session, Depends(get_db)],
):
    return AgentVehicleService(db).list_approved_branches(user)


@router.post("/distributors/me/branches/{branch_id}/request")
def request_branch_access(
    branch_id: str,
    user: Annotated[dict, Depends(require_permission("CREATE_DELIVERY"))],
    db: Annotated[Session, Depends(get_db)],
):
    return AgentVehicleService(db).request_branch_access(user, branch_id)


@router.get("/agents")
def list_agents(
    user: Annotated[dict, Depends(require_permission("CREATE_DELIVERY"))],
    db: Annotated[Session, Depends(get_db)],
):
    return AgentVehicleService(db).list_agents(user)


@router.post("/agents", status_code=201)
def create_agent(
    body: AgentCreateBody,
    user: Annotated[dict, Depends(require_permission("CREATE_DELIVERY"))],
    db: Annotated[Session, Depends(get_db)],
):
    return AgentVehicleService(db).create_agent(user, body.model_dump())


@router.patch("/agents/{agent_id}")
def update_agent(
    agent_id: str,
    body: AgentCreateBody,
    user: Annotated[dict, Depends(require_permission("CREATE_DELIVERY"))],
    db: Annotated[Session, Depends(get_db)],
):
    return AgentVehicleService(db).update_agent(user, agent_id, body.model_dump(exclude_unset=True))


@router.post("/agents/{agent_id}/photo")
async def upload_agent_photo(
    agent_id: str,
    user: Annotated[dict, Depends(require_permission("CREATE_DELIVERY"))],
    db: Annotated[Session, Depends(get_db)],
    file: UploadFile = File(...),
):
    content = await file.read()
    return AgentVehicleService(db).save_agent_photo(
        user, agent_id, content, file.content_type or "image/jpeg"
    )


@router.get("/vehicles")
def list_vehicles(
    user: Annotated[dict, Depends(require_permission("CREATE_DELIVERY"))],
    db: Annotated[Session, Depends(get_db)],
):
    return AgentVehicleService(db).list_vehicles(user)


@router.post("/vehicles", status_code=201)
def create_vehicle(
    body: VehicleCreateBody,
    user: Annotated[dict, Depends(require_permission("CREATE_DELIVERY"))],
    db: Annotated[Session, Depends(get_db)],
):
    return AgentVehicleService(db).create_vehicle(user, body.model_dump())


@router.patch("/vehicles/{vehicle_id}")
def update_vehicle(
    vehicle_id: str,
    body: VehicleCreateBody,
    user: Annotated[dict, Depends(require_permission("CREATE_DELIVERY"))],
    db: Annotated[Session, Depends(get_db)],
):
    return AgentVehicleService(db).update_vehicle(user, vehicle_id, body.model_dump(exclude_unset=True))


@router.get("/branches/{branch_id}/slots")
def list_branch_slots(
    branch_id: str,
    user: Annotated[dict, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
    date: str | None = Query(None),
    neededMinutes: int | None = Query(
        None,
        description="Only return windows with at least this many minutes remaining",
    ),
    includeFull: bool = Query(False),
):
    from datetime import date as date_type

    slot_date = date_type.fromisoformat(date) if date else None
    return DeliverySlotService(db).list_slots(
        branch_id,
        user,
        slot_date=slot_date,
        needed_minutes=neededMinutes,
        include_full=includeFull,
    )


@router.post("/branches/{branch_id}/slots", status_code=201)
def bulk_create_slots(
    branch_id: str,
    body: SlotBulkCreateBody,
    user: Annotated[dict, Depends(require_permission("MANAGE_DELIVERY_SLOTS"))],
    db: Annotated[Session, Depends(get_db)],
):
    return DeliverySlotService(db).bulk_create_slots(branch_id, user, body.model_dump())


@router.patch("/slots/{slot_id}")
def update_slot(
    slot_id: str,
    body: dict,
    user: Annotated[dict, Depends(require_permission("MANAGE_DELIVERY_SLOTS"))],
    db: Annotated[Session, Depends(get_db)],
):
    return DeliverySlotService(db).update_slot(slot_id, user, body)


@router.delete("/slots/{slot_id}")
def delete_slot(
    slot_id: str,
    user: Annotated[dict, Depends(require_permission("MANAGE_DELIVERY_SLOTS"))],
    db: Annotated[Session, Depends(get_db)],
):
    return DeliverySlotService(db).delete_slot(slot_id, user)


@router.post("/deliveries", status_code=201)
def create_delivery(
    body: DeliveryCreateBody,
    user: Annotated[dict, Depends(require_permission("CREATE_DELIVERY"))],
    db: Annotated[Session, Depends(get_db)],
):
    return InboundDeliveryService(db).create_delivery(user, body.model_dump())


@router.post("/deliveries/{delivery_id}/schedule")
def schedule_delivery(
    delivery_id: str,
    user: Annotated[dict, Depends(require_permission("CREATE_DELIVERY"))],
    db: Annotated[Session, Depends(get_db)],
):
    return InboundDeliveryService(db).schedule_delivery(delivery_id, user)


@router.get("/distributors")
def list_distributors(
    user: Annotated[dict, Depends(require_permission("VIEW_VENDOR"))],
    db: Annotated[Session, Depends(get_db)],
    branchId: str | None = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
):
    return DistributorService(db).list_distributors(branchId, skip, limit)


@router.post("/distributors", status_code=201)
def create_distributor(
    body: DistributorCreateBody,
    user: Annotated[dict, Depends(require_permission("CREATE_VENDOR"))],
    db: Annotated[Session, Depends(get_db)],
):
    return DistributorService(db).create_distributor(user, body.model_dump())


@router.get("/distributors/{distributor_id}")
def get_distributor(
    distributor_id: str,
    user: Annotated[dict, Depends(require_permission("VIEW_VENDOR"))],
    db: Annotated[Session, Depends(get_db)],
):
    return DistributorService(db).get_distributor(distributor_id)


class DistributorVerificationBody(BaseModel):
    status: str
    rejectionReason: str | None = None


@router.post("/distributors/{distributor_id}/verification")
def set_distributor_verification(
    distributor_id: str,
    body: DistributorVerificationBody,
    user: Annotated[dict, Depends(require_permission("CREATE_VENDOR"))],
    db: Annotated[Session, Depends(get_db)],
):
    return DistributorService(db).set_verification(
        user,
        distributor_id,
        status=body.status,
        rejection_reason=body.rejectionReason,
    )


@router.post("/security/scan-qr")
def scan_qr(
    body: ScanQrBody,
    user: Annotated[dict, Depends(require_permission("SCAN_QR"))],
    db: Annotated[Session, Depends(get_db)],
):
    return DeliveryGateService(db).scan_qr(user, body.qrPayload, body.signature)


@router.post("/security/process-qr")
def process_qr(
    body: ScanQrBody,
    user: Annotated[dict, Depends(require_permission("SCAN_QR"))],
    db: Annotated[Session, Depends(get_db)],
):
    """Validate QR and auto-complete exit when delivery is RECEIVED (same QR for exit)."""
    return DeliveryGateService(db).process_scanned_qr(
        user, body.qrPayload, body.signature, auto_exit=True
    )


@router.post("/security/allow-entry/{delivery_id}")
def allow_entry(
    delivery_id: str,
    user: Annotated[dict, Depends(require_permission("ALLOW_ENTRY"))],
    db: Annotated[Session, Depends(get_db)],
    gateId: str | None = Query(None),
):
    return DeliveryGateService(db).allow_entry(user, delivery_id, gateId)


class DeliveryHoldBody(BaseModel):
    reason: str
    holdUntil: str | None = None


@router.post("/security/hold/{delivery_id}")
def hold_delivery(
    delivery_id: str,
    body: DeliveryHoldBody,
    user: Annotated[dict, Depends(require_permission("ALLOW_ENTRY"))],
    db: Annotated[Session, Depends(get_db)],
):
    return InboundDeliveryService(db).hold_delivery(
        delivery_id, user, body.reason, body.holdUntil
    )


@router.post("/security/release-hold/{delivery_id}")
def release_hold(
    delivery_id: str,
    user: Annotated[dict, Depends(require_permission("ALLOW_ENTRY"))],
    db: Annotated[Session, Depends(get_db)],
):
    return InboundDeliveryService(db).release_hold(delivery_id, user)


@router.post("/security/mark-exit/{delivery_id}")
def mark_exit(
    delivery_id: str,
    user: Annotated[dict, Depends(require_permission("MARK_EXIT"))],
    db: Annotated[Session, Depends(get_db)],
):
    return DeliveryGateService(db).mark_exit(user, delivery_id)


@router.post("/security/courier/register", status_code=201)
def register_courier(
    body: CourierRegisterBody,
    user: Annotated[dict, Depends(require_permission("ALLOW_ENTRY"))],
    db: Annotated[Session, Depends(get_db)],
):
    return DeliveryGateService(db).register_courier(user, body.model_dump())


@router.get("/security/queue")
def unified_queue(
    user: Annotated[dict, Depends(require_permission("VIEW_SECURITY_DASHBOARD"))],
    db: Annotated[Session, Depends(get_db)],
    branchId: str = Query(...),
):
    return DeliveryGateService(db).unified_queue(user, branchId)


@router.get("/branch-settings/{branch_id}")
def get_branch_settings(
    branch_id: str,
    user: Annotated[dict, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    return BranchDeliveryService(db).get_settings(branch_id)


@router.put("/branch-settings/{branch_id}")
def update_branch_settings(
    branch_id: str,
    body: dict,
    user: Annotated[dict, Depends(require_permission("VIEW_DELIVERY"))],
    db: Annotated[Session, Depends(get_db)],
):
    return BranchDeliveryService(db).update_settings(branch_id, body)


@router.get("/docks")
def list_docks(
    user: Annotated[dict, Depends(require_permission("VIEW_RECEIVING"))],
    db: Annotated[Session, Depends(get_db)],
    branchId: str = Query(...),
):
    return ReceivingService(db).list_docks(branchId)


@router.post("/receiving/assign-dock")
def assign_dock(
    body: dict,
    user: Annotated[dict, Depends(require_permission("ASSIGN_DOCK"))],
    db: Annotated[Session, Depends(get_db)],
):
    return ReceivingService(db).assign_dock(user, body["deliveryId"], body["dockId"])


@router.post("/receiving/start")
def start_receiving(
    body: dict,
    user: Annotated[dict, Depends(require_permission("START_RECEIVING"))],
    db: Annotated[Session, Depends(get_db)],
):
    return ReceivingService(db).start_receiving(user, body["deliveryId"])


@router.post("/grn/generate")
def generate_grn(
    body: dict,
    user: Annotated[dict, Depends(require_permission("GENERATE_GRN"))],
    db: Annotated[Session, Depends(get_db)],
):
    return ReceivingService(db).generate_grn(user, body["deliveryId"])


@router.get("/wallets/{vendor_id}")
def get_wallet(
    vendor_id: str,
    user: Annotated[dict, Depends(require_permission("VIEW_WALLET"))],
    db: Annotated[Session, Depends(get_db)],
):
    return WalletService(db).get_wallet(vendor_id)


@router.post("/wallets/recharge")
def recharge_wallet(
    body: dict,
    user: Annotated[dict, Depends(require_permission("CREATE_PAYMENT"))],
    db: Annotated[Session, Depends(get_db)],
):
    return WalletService(db).recharge(user, body["vendorId"], float(body["amount"]))


@router.get("/wallets/{vendor_id}/transactions")
def list_wallet_transactions(
    vendor_id: str,
    user: Annotated[dict, Depends(require_permission("VIEW_WALLET"))],
    db: Annotated[Session, Depends(get_db)],
    limit: int = Query(50, ge=1, le=200),
):
    return {"items": WalletService(db).list_transactions(vendor_id, limit)}


@router.get("/receiving/queue")
def receiving_queue(
    user: Annotated[dict, Depends(require_permission("VIEW_RECEIVING"))],
    db: Annotated[Session, Depends(get_db)],
    branchId: str = Query(...),
):
    return ReceivingService(db).receiving_queue(branchId)


@router.get("/vendor-mappings")
def list_vendor_mappings(
    user: Annotated[dict, Depends(require_permission("VIEW_VENDOR"))],
    db: Annotated[Session, Depends(get_db)],
    branchId: str = Query(...),
):
    return DistributorService(db).list_branch_mappings(branchId)


@router.post("/vendor-mappings/{mapping_id}/approve")
def approve_vendor_mapping(
    mapping_id: str,
    user: Annotated[dict, Depends(require_permission("APPROVE_VENDOR"))],
    db: Annotated[Session, Depends(get_db)],
):
    return DistributorService(db).approve_vendor_branch(mapping_id, user)


class DistributorVisitSlotBody(BaseModel):
    date: str
    startTime: str
    endTime: str
    slotMinutes: int | None = None


class DistributorVisitRejectBody(BaseModel):
    reason: str | None = None


@router.get("/distributor-visit-slots")
def list_distributor_visit_slots(
    user: Annotated[dict, Depends(require_permission("VIEW_DELIVERY"))],
    db: Annotated[Session, Depends(get_db)],
    from_date: str = Query(..., alias="from"),
    to_date: str = Query(..., alias="to"),
):
    return DistributorVisitService(db).list_vendor_slots(user, from_date, to_date)


@router.post("/distributor-visit-slots", status_code=201)
def create_distributor_visit_slots(
    body: DistributorVisitSlotBody,
    user: Annotated[dict, Depends(require_permission("CREATE_DELIVERY"))],
    db: Annotated[Session, Depends(get_db)],
):
    minutes = body.slotMinutes
    if minutes is None:
        start_h, start_m = DistributorVisitService(db)._parse_time(body.startTime)
        end_h, end_m = DistributorVisitService(db)._parse_time(body.endTime)
        minutes = max((end_h * 60 + end_m) - (start_h * 60 + start_m), 5)
    return DistributorVisitService(db).create_slots(
        user,
        date=body.date,
        start_time=body.startTime,
        end_time=body.endTime,
        slot_minutes=minutes,
    )


@router.delete("/distributor-visit-slots/{slot_id}")
def delete_distributor_visit_slot(
    slot_id: str,
    user: Annotated[dict, Depends(require_permission("CREATE_DELIVERY"))],
    db: Annotated[Session, Depends(get_db)],
):
    return DistributorVisitService(db).delete_slot(user, slot_id)


@router.get("/distributor-visits")
def list_distributor_visits(
    user: Annotated[dict, Depends(require_permission("VIEW_DELIVERY"))],
    db: Annotated[Session, Depends(get_db)],
    status: str | None = Query(default=None),
):
    return DistributorVisitService(db).list_vendor_visits(user, status)


@router.get("/distributor-visits/{visit_id}")
def get_distributor_visit(
    visit_id: str,
    user: Annotated[dict, Depends(require_permission("VIEW_DELIVERY"))],
    db: Annotated[Session, Depends(get_db)],
):
    return DistributorVisitService(db).get_vendor_visit(user, visit_id)


@router.post("/distributor-visits/{visit_id}/approve")
def approve_distributor_visit(
    visit_id: str,
    user: Annotated[dict, Depends(require_permission("CREATE_DELIVERY"))],
    db: Annotated[Session, Depends(get_db)],
):
    return DistributorVisitService(db).approve(user, visit_id)


@router.post("/distributor-visits/{visit_id}/reject")
def reject_distributor_visit(
    visit_id: str,
    body: DistributorVisitRejectBody,
    user: Annotated[dict, Depends(require_permission("CREATE_DELIVERY"))],
    db: Annotated[Session, Depends(get_db)],
):
    return DistributorVisitService(db).reject(user, visit_id, body.reason)


class DistributorDeskScanBody(BaseModel):
    payload: str = Field(min_length=1)


class DistributorSecurityStaffBody(BaseModel):
    name: str
    email: str
    phone: str
    password: str


class DistributorSecurityActiveBody(BaseModel):
    isActive: bool


@router.get("/distributor-security")
def list_distributor_security(
    user: Annotated[dict, Depends(require_permission("CREATE_DELIVERY"))],
    db: Annotated[Session, Depends(get_db)],
):
    return DistributorVisitService(db).list_security_staff(user)


@router.post("/distributor-security", status_code=201)
def create_distributor_security(
    body: DistributorSecurityStaffBody,
    user: Annotated[dict, Depends(require_permission("CREATE_DELIVERY"))],
    db: Annotated[Session, Depends(get_db)],
):
    return DistributorVisitService(db).create_security_staff(user, body.model_dump())


@router.post("/distributor-security/{staff_id}/active")
def set_distributor_security_active(
    staff_id: str,
    body: DistributorSecurityActiveBody,
    user: Annotated[dict, Depends(require_permission("CREATE_DELIVERY"))],
    db: Annotated[Session, Depends(get_db)],
):
    return DistributorVisitService(db).set_security_staff_active(user, staff_id, body.isActive)


@router.post("/distributor-visits/scan")
def scan_distributor_visit(
    body: DistributorDeskScanBody,
    user: Annotated[dict, Depends(require_permission("SCAN_QR", "VIEW_DELIVERY"))],
    db: Annotated[Session, Depends(get_db)],
):
    return DistributorVisitService(db).scan_pass(user, body.payload)


@router.post("/distributor-visits/{visit_id}/check-in")
def check_in_distributor_visit(
    visit_id: str,
    user: Annotated[dict, Depends(require_permission("SCAN_QR", "VIEW_DELIVERY"))],
    db: Annotated[Session, Depends(get_db)],
):
    return DistributorVisitService(db).check_in(user, visit_id)


@router.post("/distributor-visits/{visit_id}/check-out")
def check_out_distributor_visit(
    visit_id: str,
    user: Annotated[dict, Depends(require_permission("SCAN_QR", "VIEW_DELIVERY"))],
    db: Annotated[Session, Depends(get_db)],
):
    return DistributorVisitService(db).check_out(user, visit_id)
