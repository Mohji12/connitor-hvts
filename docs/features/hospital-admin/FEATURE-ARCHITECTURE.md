# Hospital Admin Role — Feature Architecture

## Hierarchy

```
Super Admin (platform-wide)
  └── Hospital Admin (one Branch / hospital site)
        └── Department Admin (one Department)
              └── Sub Department Admin → Staff / Security
```

## Scope

- **Role:** `HOSPITAL_ADMIN`
- **FKs:** `hospitalChainId` + `branchId` (no `departmentId` / `subDepartmentId`)
- **Legacy:** `BRANCH_ADMIN` remains unchanged for backward compatibility

## Permissions

| Area | Hospital Admin |
|------|----------------|
| Departments | CRUD within own branch |
| Sub-departments | CRUD within own branch |
| Users | All users in branch; can create Dept/Sub-Dept Admins, Staff, Security |
| Visitors | Branch-scoped summary (same as Branch Admin) |
| Appointments | All visits at branch |
| Analytics | `/api/analytics/hospital-admin/*` |

## API

- `GET /api/analytics/hospital-admin/overview`
- `GET /api/analytics/hospital-admin/visitor-trends`
- `GET /api/analytics/hospital-admin/departments/stats`

## Demo

- User ID: `55554444-4444-4444-4444-444444444444`
- Email: `hospital.admin@apollochennai.com`
- Branch: Chennai (`dddddddd-dddd-4ddd-8ddd-dddddddddddd`)
