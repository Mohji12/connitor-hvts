# Distributor visitor visits

Office and warehouse meetings for Conninter visitors. This is a parallel stack to hospital `Visit` — no branch, staff, gate, or ₹200 wallet fee.

## Flow

1. An approved distributor publishes exclusive availability windows.
2. A visitor with a `VisitorAccount` picks the vendor, a slot, and a purpose.
3. Booking creates `DistributorVisit` in `REQUEST_SENT` and marks the slot booked.
4. The distributor approves or rejects. Approve issues a 6-digit code and QR meeting pass. Reject frees the slot.

## Data

- `DistributorAvailabilitySlot` — `distributorId`, `slotStart`, `slotEnd`, `isBooked`, `visitId`
- `DistributorVisit` — `visitorAccountId`, `distributorId`, `slotId`, `appointmentDate`, `purpose`, `status`, `visitCode`, `visitQRCode`

Only distributors with `verificationStatus=APPROVED` and `isActive` appear in the public picker.

## APIs

- Public: `GET /api/public/distributor-visits/distributors`, `.../{id}/slots`, `.../{id}/available-dates`, `POST /api/public/distributor-visits`
- Vendor: `GET/POST/DELETE /api/delivery/distributor-visit-slots`, `GET /api/delivery/distributor-visits`, `POST .../approve|reject`

Visitor dashboard merges these rows into `/api/public/visitor-portal/appointments` with `hostKind: "DISTRIBUTOR"`.

## Desk security

The distributor creates `User` rows with role `DISTRIBUTOR_SECURITY` and the same `distributorId`. Those people sign in at Delivery login and land on `/vendor/desk`. Scan accepts the meeting-pass JSON (`kind=DISTRIBUTOR_VISIT`) or the 6-digit `visitCode`, then check-in / check-out. Hospital security cannot use these routes.
