# Distributor Onboarding — Tasks

## Increment 1 (MVP)

### Backend

- [x] Extend `Distributor` with onboarding profile fields
- [x] Add `DistributorDocument` table + migration
- [x] `POST /api/public/distributor-onboarding/apply`
- [x] `GET /api/public/distributor-onboarding/branches`
- [x] Hospital: get distributor detail, set verificationStatus, approve mapping (existing)
- [x] Block distributor booking when not fully approved

### Frontend

- [x] `/vendor/register` multi-step wizard
- [x] Link from home footer / distributor portal
- [x] Extend `/dashboard/delivery/vendors` for profile review + platform verify

## Increment 2 (later)

- [ ] Draft save
- [ ] Document expiry reminders
- [ ] Full compliance matrix UI by vendorType

## Increment 3 (later)

- [ ] External GSTIN / MSME validation
- [ ] Wallet unlock only after bank verified
