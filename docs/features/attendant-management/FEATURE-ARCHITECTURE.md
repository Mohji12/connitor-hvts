# AMS Feature Architecture

## Stack

- Frontend: Next.js App Router under `frontend/src/app/dashboard/ams/`
- UI kit: `frontend/src/features/attendant-management/ui/`
- Backend: expands `AttendantPassService` + `/api/attendant-passes/*`
- Models: `Patient`, `Admission`, `Attendant`, `AttendantPass`, `PassPolicy`, scans

## Key APIs

| Method | Path | Role |
|--------|------|------|
| GET | `/dashboard/summary` | KPIs + activity |
| GET | `/search` | Filtered pass search |
| GET | `/active` | Inside list |
| POST | `/shift-change` | Atomic exit + new pass |
| POST | `/emergency` | Fast emergency pass |
| GET/PUT | `/policy` | Branch PassPolicy |
| GET | `/reports/summary` | Aggregations |
| POST | `/passes/{id}/extend\|suspend\|force-exit` | Lifecycle |

## Unchanged

- Public apply `/attendant-pass/apply`
- Ward email approval `/approve-attendant`
- Security scan tab
