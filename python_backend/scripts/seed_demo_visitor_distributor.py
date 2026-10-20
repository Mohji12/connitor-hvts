"""Create dummy visitor + distributor logins for demos and the mobile app.

Password: DEFAULT_USER_PASSWORD from .env, else Conninter123@

Visitor:   /visitor/login     visitor@conninter.demo / 9000000001
Distributor: /delivery/login  distributor@citygen.demo / 9000000102

Both accounts are phone-verified and ACTIVE so password login works immediately.

Usage (from python_backend):
  set PYTHONPATH=.
  python scripts/seed_demo_visitor_distributor.py --yes
"""

from __future__ import annotations

import argparse
from decimal import Decimal

from app.config import get_settings
from app.constants.electronic_city_entities import (
    CONNITOR_CHAIN_ID,
    ELECTRONIC_CITY_BRANCH_ID,
)
from app.database import SessionLocal
from app.delivery.distributor_service import DistributorService
from app.models import Branch, User
from app.models.delivery_entities import Distributor, VendorBranchMapping, VendorWallet
from app.models.enums import ProfileStatus, VisitorAuthProvider
from app.models.visitor_account_entities import VisitorAccount, VisitorAccountAuth
from app.models.visitor_wallet_entities import VisitorWallet
from app.utils.passwords import hash_password

VISITOR_EMAIL = "visitor@conninter.demo"
VISITOR_PHONE = "9000000001"
VISITOR_ACCOUNT_ID = "22000000-0000-4000-8000-000000000001"
VISITOR_AUTH_ID = "22000000-0000-4000-8000-000000000002"
VISITOR_WALLET_ID = "22000000-0000-4000-8000-000000000003"
VISITOR_WALLET_BALANCE = Decimal("1000.00")

DISTRIBUTOR_EMAIL = "distributor@citygen.demo"
DISTRIBUTOR_PHONE = "9000000102"
DISTRIBUTOR_VENDOR_PHONE = "9000000101"
DISTRIBUTOR_USER_ID = "11000000-0000-4000-8000-000000000034"
VENDOR_WALLET_BALANCE = Decimal("50000.00")


def _default_password() -> str:
    value = (get_settings().default_user_password or "").strip()
    return value or "Conninter123@"


PASSWORD = _default_password()


def _pick_branch(db) -> tuple[str | None, str | None]:
    branch = db.get(Branch, ELECTRONIC_CITY_BRANCH_ID)
    if branch:
        return branch.id, branch.hospitalChainId
    first = db.query(Branch).order_by(Branch.name).first()
    if first:
        return first.id, first.hospitalChainId
    return None, None


def ensure_demo_visitor(db) -> VisitorAccount:
    account = (
        db.query(VisitorAccount).filter(VisitorAccount.email == VISITOR_EMAIL).first()
        or db.get(VisitorAccount, VISITOR_ACCOUNT_ID)
        or db.query(VisitorAccount).filter(VisitorAccount.phone == VISITOR_PHONE).first()
    )
    if not account:
        account = VisitorAccount(id=VISITOR_ACCOUNT_ID)
        db.add(account)

    account.firstName = "Demo"
    account.lastName = "Visitor"
    account.phone = VISITOR_PHONE
    account.email = VISITOR_EMAIL
    account.emailType = "PERSONAL"
    account.companyName = "Conninter Demo"
    account.jobTitle = "Visitor"
    account.profileStatus = ProfileStatus.ACTIVE.value
    account.emailVerified = True
    account.phoneVerified = True
    account.phoneVerificationOtpHash = None
    account.phoneVerificationExpiry = None
    account.phoneVerificationAttempts = 0

    auth = (
        db.query(VisitorAccountAuth)
        .filter(
            VisitorAccountAuth.visitorAccountId == account.id,
            VisitorAccountAuth.provider == VisitorAuthProvider.PASSWORD.value,
        )
        .first()
    )
    if not auth:
        auth = VisitorAccountAuth(
            id=VISITOR_AUTH_ID,
            visitorAccountId=account.id,
            provider=VisitorAuthProvider.PASSWORD.value,
        )
        db.add(auth)
    auth.passwordHash = hash_password(PASSWORD)

    wallet = (
        db.query(VisitorWallet)
        .filter(VisitorWallet.visitorAccountId == account.id)
        .first()
    )
    if not wallet:
        try:
            wallet = VisitorWallet(
                id=VISITOR_WALLET_ID,
                visitorAccountId=account.id,
                balance=VISITOR_WALLET_BALANCE,
            )
            db.add(wallet)
        except Exception:
            # Wallet table may not exist on an unmigrated local DB.
            pass
    else:
        if wallet.balance is None or wallet.balance < Decimal("200.00"):
            wallet.balance = VISITOR_WALLET_BALANCE

    return account


def ensure_demo_distributor(db) -> User | None:
    branch_id, chain_id = _pick_branch(db)
    if not branch_id:
        print("No hospital branch found — visitor created, distributor skipped.")
        return None

    dist = db.query(Distributor).filter(Distributor.email == DISTRIBUTOR_EMAIL).first()
    if not dist:
        row = DistributorService(db).create_distributor(
            {"id": "seed"},
            {
                "vendorName": "CityGen Distributors",
                "vendorType": "MEDICAL",
                "email": DISTRIBUTOR_EMAIL,
                "phone": DISTRIBUTOR_VENDOR_PHONE,
                "branchId": branch_id,
            },
        )
        dist_id = row["id"]
    else:
        dist_id = dist.id

    mapping = (
        db.query(VendorBranchMapping)
        .filter(
            VendorBranchMapping.vendorId == dist_id,
            VendorBranchMapping.branchId == branch_id,
        )
        .first()
    )
    if mapping:
        mapping.approvalStatus = "APPROVED"
    else:
        db.add(
            VendorBranchMapping(
                vendorId=dist_id,
                branchId=branch_id,
                approvalStatus="APPROVED",
            )
        )

    wallet = db.query(VendorWallet).filter(VendorWallet.vendorId == dist_id).first()
    if not wallet:
        db.add(VendorWallet(vendorId=dist_id, balance=VENDOR_WALLET_BALANCE))
    elif wallet.balance is None or wallet.balance < Decimal("500.00"):
        wallet.balance = VENDOR_WALLET_BALANCE

    user = (
        db.query(User).filter(User.email == DISTRIBUTOR_EMAIL).first()
        or db.get(User, DISTRIBUTOR_USER_ID)
    )
    if not user:
        user = User(id=DISTRIBUTOR_USER_ID)
        db.add(user)

    user.name = "Demo Distributor"
    user.email = DISTRIBUTOR_EMAIL
    user.phone = DISTRIBUTOR_PHONE
    user.role = "DISTRIBUTOR"
    user.distributorId = dist_id
    user.branchId = branch_id
    user.hospitalChainId = chain_id or CONNITOR_CHAIN_ID
    user.passwordHash = hash_password(PASSWORD)
    user.isActive = True
    user.phoneVerified = True
    return user


def run() -> None:
    db = SessionLocal()
    try:
        visitor = ensure_demo_visitor(db)
        distributor = ensure_demo_distributor(db)
        db.commit()
        print("=== Dummy logins (password: %s) ===" % PASSWORD)
        print(f"VISITOR       {visitor.email}  /  {visitor.phone}   -> /visitor/login")
        if distributor:
            print(f"DISTRIBUTOR   {distributor.email}  /  {distributor.phone}   -> /delivery/login")
    finally:
        db.close()


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--yes", action="store_true")
    args = parser.parse_args()
    if not args.yes:
        parser.error("Pass --yes to create dummy visitor and distributor logins")
    run()


if __name__ == "__main__":
    main()
