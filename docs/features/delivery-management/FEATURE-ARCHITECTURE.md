# Delivery Management — Feature Architecture

## Overview

Integrates the Hospital Inbound Delivery Management System (from `E:\Connitor_delivery`) into connitor-main as a modular monolith.

## Domain boundaries

| Domain | Scope | API prefix |
|--------|-------|------------|
| Walk-in courier | Existing `Visit` + `VisitCategory.DELIVERY` gate wizard | `/api/public/visitors` |
| Vendor inbound | PO scheduling, QR, gate, receiving, GRN, billing | `/api/delivery/*` |
| Attendant passes | Patients, admissions, pass allocation/approval | `/api/attendant-passes/*` |

## Site scope

**`Branch`** is the delivery site. All delivery tables use `branchId` FK → `Branch.id` (replaces Connitor_delivery `hospital_id`).

## Auth

- Single `User` table with extended `Role` enum (`RECEIVING`, `PURCHASE`, `DISTRIBUTOR`, `WARD_ADMIN`).
- Fine-grained checks via `Permission` + `RolePermission` tables keyed by `User.role`.
- Vendor portal users: `role=DISTRIBUTOR`, `distributorId` on `User`.

## Bridge

`VisitDeliveryLink` connects walk-in `Visit` records to `InboundDelivery` or `DeliveryVisitorLog` for unified security queue.

## Feature flag

`DELIVERY_MODULE_ENABLED=true` in `python_backend/.env` gates new routers.
