# Distributor Onboarding — UX Design

> Self-service distributor registration for Indian hospital delivery partners.

## Goal

A distributor applies with legal, tax, address, and compliance details — not a hospital. Conninter creates a vendor + login. The distributor chooses the hospital (and a slot that hospital allotted) when booking a delivery.

## Wizard (6 steps)

### Step 1 — Account & primary contact

| Field | Required | Notes |
|-------|----------|-------|
| Email | R | Login ID |
| Password / confirm | R | Min 8 chars |
| Primary contact name | R | `contactPerson` |
| Mobile | R | 10-digit India |

### Step 2 — Business identity

| Field | Required | Notes |
|-------|----------|-------|
| Legal entity name | R | `vendorName` |
| Entity type | R | Proprietorship, Partnership, LLP, Pvt Ltd, Public Ltd, Others |
| Vendor category | R | PHARMA, MEDICAL_DEVICES, SURGICAL_CONSUMABLES, LAB_REAGENTS, GENERAL_STORES, LINEN_HOUSEKEEPING, CATERING_FSSAI, IT_EQUIPMENT, OTHER |
| GSTIN | R (B2B) | 15-char, unique |
| GST registration type | R | Regular / Composition / Unregistered |
| PAN | R | 10-char |
| Primary goods | R | Collected with GSTIN on this step |
| CIN | C | If company |

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

### Step 5 — Terms

| Field | Required | Notes |
|-------|----------|-------|
| Accept terms + declaration | R | Then continue to payment |

### Step 6 — Onboarding fee

| Field | Required | Notes |
|-------|----------|-------|
| Dummy UPI or Card | R | ₹150 one-time fee. `paymentMethod: DUMMY` — no real charge yet |
| Hospital approval | — | **Not required.** Profile is `APPROVED` after payment |

## Post-submit states

- `onboardingStatus` / `verificationStatus`: **APPROVED** on apply after dummy ₹150 fee
- `VendorBranchMapping.approvalStatus`: created/approved when the distributor picks that hospital at booking
- Booking allowed unless the profile is **REJECTED** or inactive; slot must belong to the chosen hospital

## Screens

1. Public `/vendor/register` — 6-step wizard (details + dummy onboarding fee)
2. Success — verify WhatsApp code, then sign in (no hospital review)
3. Hospital `/dashboard/delivery/vendors` — view profiles and documents (no approve/reject)
