# Attendant Management System (AMS)

> Foundation-based expansion of attendant-pass into a full hospital AMS under `/dashboard/ams`.

## Screens

| Route | Purpose |
|-------|---------|
| `/dashboard/ams` | Dashboard KPIs + recent activity |
| `/dashboard/ams/register` | Full register + QR pass |
| `/dashboard/ams/search` | Search / filters / actions |
| `/dashboard/ams/active` | Currently inside |
| `/dashboard/ams/shift-change` | Exit old + issue new |
| `/dashboard/ams/emergency` | Fast emergency pass |
| `/dashboard/ams/reports` | Aggregations + CSV |
| `/dashboard/ams/settings` | PassPolicy |

Legacy `/dashboard/attendant-passes` redirects to AMS dashboard.

## Theme

Primary `#0052CC`, teal `#00A8A8`, rounded cards 12px.

## Backend

- Migration: `python scripts/migrate_ams_register_fields.py --yes`
- New fields on Attendant / Admission / AttendantPass / PassPolicy
- APIs under `/api/attendant-passes/` (dashboard, search, active, shift-change, emergency, policy, reports, extend/suspend/force-exit)
