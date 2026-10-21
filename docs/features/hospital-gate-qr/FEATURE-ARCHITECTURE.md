# Hospital desk gate QR

Each branch has one printed desk QR. Scanning it opens `/gate/{branchId}/` (no login). The visitor picks **Visitor** (book an in-person visit at that branch), **Delivery** (distributor books a drop to that branch), or **Attendant** (secondary attendant pass apply at `/attendant-pass/{slug}/`, falling back to `?branchId=` when the branch has no slug).

- Stored image: `Branch.qrCode` encodes `{PUBLIC_FRONTEND_URL}/gate/{id}/`
- Generate: `POST /api/chain/{chainId}/branches/{branchId}/generate-qr` — Super Admin, Chain Admin, Hospital Admin, and Branch Admin (own branch only)
- Hospital/Branch Admin UI: `/dashboard/gate-qr`
- Super/Chain Admin: branch details dialog (`BranchGateQr`)
- Security: same card on the desk (view / download / copy / WhatsApp)
- Refresh stored PNGs: `python scripts/regenerate_branch_qrs.py --yes`

Old `/visit/on-spot?branchId=` visitor-only links still work.
