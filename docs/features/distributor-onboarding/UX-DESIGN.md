# Distributor Onboarding — UX Design

> Self-service distributor registration for Indian hospital delivery partners.

## Goal

A distributor applies with legal, tax, address, and compliance details — not a hospital. Conninter creates a vendor + login. The distributor chooses the hospital (and a slot that hospital allotted) when booking a delivery.

## Wizard (5 steps)

### Step 1 — Account & primary contact

| Field | Required | Notes |
|-------|----------|-------|
| Email | R | Login ID |
| Password / confirm | R | Min 8 chars |
| Primary contact name | R | `contactPerson` |
| Mobile | R | 10-digit India |
| Alternate mobile | O | |
| Designation | O | |
| Preferred language | O | en / hi / kn |

### Step 2 — Business identity

| Field | Required | Notes |
|-------|----------|-------|
| Legal entity name | R | `vendorName` |
| Trade / brand name | O | |
| Entity type | R | Proprietorship, Partnership, LLP, Pvt Ltd, Public Ltd, Others |
| Vendor category | R | PHARMA, MEDICAL_DEVICES, SURGICAL_CONSUMABLES, LAB_REAGENTS, GENERAL_STORES, LINEN_HOUSEKEEPING, CATERING_FSSAI, IT_EQUIPMENT, OTHER |
| GSTIN | R (B2B) | 15-char, unique |
| GST registration type | R | Regular / Composition / Unregistered |
| PAN | R | 10-char |
| CIN | C | If company |
| MSME Udyam | O | |
| Year established | O | |
| Website | O | |

### Step 3 — Address

| Field | Required | Notes |
|-------|----------|-------|
| Registered address L1–L2 | R | |
| City / State / PIN | R | |
| Operating same as registered | R | Checkbox |
| Operating address | C | If different |
| Serviceable states | O | Multi-select |

### Step 4 — Compliance documents (MVP: GST + PAN + bank)

| Document | When |
|----------|------|
| GST certificate | If GSTIN provided |
| PAN card | Always |
| Cancelled cheque / bank proof | Always |
| Drug license Form 20/21 | PHARMA |
| CDSCO / device cert | MEDICAL_DEVICES |
| FSSAI | CATERING_FSSAI |

### Step 5 — Operations (no hospital)

| Field | Required | Notes |
|-------|----------|-------|
| Hospital | — | **Not collected here.** Chosen at `/vendor/deliveries/book` |
| Supply categories | R | Checklist |
| Delivery mode | R | Own fleet / third-party |
| Primary goods description | R | |
| Accounts email / dispatch phone | O | |
| Accept terms + declaration | R | |

## Post-submit states

- `onboardingStatus`: SUBMITTED → UNDER_REVIEW → APPROVED / REJECTED
- `verificationStatus`: PENDING → APPROVED / REJECTED (platform)
- `VendorBranchMapping.approvalStatus`: created/approved when the distributor picks that hospital at booking
- Booking allowed unless the profile is **REJECTED** or inactive; slot must belong to the chosen hospital

## Screens

1. Public `/vendor/register` — multi-step wizard
2. Success — “Application received; hospital will review”
3. Hospital `/dashboard/delivery/vendors` — profile + docs + approve/reject
