# Urgent visit passcode — UX design

> Doctor-issued 24-hour passcodes: security verifies at the gate, visitor registers + books (auto-approved), then Entry/Exit QR for check-in/out.

## Goal

When a visitor needs urgent access, the host doctor generates a 6-digit passcode (or reuses an active one) and shares it. At the gate, security verifies the code. The visitor then registers on the platform, books with that doctor (no further doctor approval), receives Entry and Exit QR codes, and security scans those for check-in and checkout timestamps.

## Doctor — My Visitors

### Issue / share passcode dialog

| Field | Required | Notes |
|-------|----------|-------|
| Mode | R | **Generate new** or **Use existing** (active codes only) |
| Visit time / theme / purpose / note | O | Shown to security and visitor |
| Copy code | — | Share with visitor (SMS/email optional) |

Copy explains: security verifies → visitor registers/books on site → auto-approved → Entry/Exit QR.

## Security — Check-in tab

### Step 1 — Verify code

6-digit input → verify → **confirm-verify** marks passcode `VERIFIED`.

### Step 2 — Handoff (no visitor form)

Show host details + **registration URL / QR** (`/visitor/urgent/?token=…`).

Visitor completes register → book on their phone or a kiosk.

### Step 3 — QR check-in / checkout

- Scan **Entry QR** → check-in (`checkInTime`)
- Scan **Exit QR** → checkout (`checkOutTime`)

## Visitor — `/visitor/urgent`

1. Open token link from security handoff
2. Create profile or sign in (`returnTo` back to urgent page)
3. Book ASAP walk-in or pick an open doctor slot
4. Success: show **Entry QR** + **Exit QR**

## Status lifecycle

`ACTIVE` → (security confirm-verify) `VERIFIED` → (visitor book) `REDEEMED`

## Out of scope

- WhatsApp channel for passcode share
- Changing normal (non-urgent) booking approval
