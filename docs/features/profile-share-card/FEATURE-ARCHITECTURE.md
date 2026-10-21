# Profile QR to vCard

Every dashboard profile can show a QR that encodes only `/card/{token}/`. Scanning opens a public page and downloads a `.vcf` contact. No login is required on the scanner side.

- Token column: `User.profileShareToken`, `VisitorAccount.profileShareToken` (lazy UUID)
- Public JSON: `GET /api/public/profile-cards/{token}`
- Public file: `GET /api/public/profile-cards/{token}/vcard`
- Owner APIs attach `profileShareToken` + `profileCardUrl` on `/api/auth/me` and visitor `/me`
- Migrate: `python scripts/migrate_profile_share_token.py --yes`
