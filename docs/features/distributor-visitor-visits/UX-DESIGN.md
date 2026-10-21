# Distributor visitor visits — UX

## Visitor

- `/book-distributor-visit/` — pick approved vendor (name, city, goods) → profile if not signed in → calendar + slot → purpose.
- After book: `/visitor/dashboard?booked=` with status `REQUEST_SENT`.
- Approved visits show a **Meeting pass** (QR + 6-digit code) on the dashboard row, visit detail, and `/visitor/pass`.
- Host label is the vendor name (no `Dr.` prefix).

## Distributor

- Sidebar **Visitors** (`/vendor/visitors`) — pending / approved / rejected. Approve issues the pass; reject frees the slot.
- Sidebar **Visit slots** (`/vendor/visit-slots`) — add exclusive date + start/end windows. Booked slots cannot be deleted.
- Mobile: both items live under More.

## Desk security

- Distributor: **Desk staff** (`/vendor/security`) — name, email, mobile, password. Disable login later if needed.
- Desk person signs in at `/delivery/login` with those credentials and opens **Desk scan** (`/vendor/desk`).
- Scan the visitor QR or type the 6-digit code → Check in / Check out.

## Out of scope

Hospital gate scan, doctor wallet fee, LiveKit, hospital staff approval.
