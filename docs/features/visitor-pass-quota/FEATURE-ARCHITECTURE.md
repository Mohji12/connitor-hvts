# Visitor pass quota — architecture

Hospital admin pre-issues a **daily pool of unique visitor pass IDs per branch**. Those IDs are the premises identity security asks for. Existing 6-digit `visitCode` / QR remain the check-in OTP.

## Scope

- **In-person** doctor approval and urgent auto-approve consume the next unused ID.
- **Walk-in assignment** (admin or security) attaches a specific unused ID and creates an `APPROVED` visit.
- **Online** consultations do not consume a pass.
- Delivery and AMS attendant passes stay separate.

## Data

- `BranchVisitorPassPolicy` — one row per branch (`dailyQuota`, default 50).
- `VisitorPass` — unique `passId` (`ELC-260816-0042`), `passDate` (IST), `UNASSIGNED|ASSIGNED|VOID`, source `HOSPITAL_POOL`.
- `Visit.visitorPassId` — optional human ID on the appointment; not a replacement for QR check-in.

Creating N IDs **uses the day’s allotment even if unused**. Top-up after raising quota creates only the delta.

## Allocation

`VisitorPassService.allocate_for_visit` lock-takes the next `UNASSIGNED` row (`FOR UPDATE SKIP LOCKED` on MySQL/Postgres). Empty pool → 409 “pool has not been issued”. Exhausted → 409 “quota exhausted”.

Reject or recycle **before check-in** returns the ID to `UNASSIGNED`. After check-in, do not recycle.

## APIs

- `GET/PUT /api/branches/{id}/visitor-pass-policy`
- `POST /api/branches/{id}/visitor-passes/issue`
- `GET /api/branches/{id}/visitor-passes?date=&q=`
- `GET /api/security/visitor-passes?date=&q=`
- `POST /api/visitor-passes/{passId}/assign`

Pass ID is included on doctor approve, security appointment cards, QR/OTP visit payload, gate-pass email, and check-in.

## UI

- Hospital Admin / Branch Admin: `/dashboard/visitor-passes`
- Security: dashboard tab `visitor-passes` (10s poll), Pass ID on today’s appointments and check-in details
