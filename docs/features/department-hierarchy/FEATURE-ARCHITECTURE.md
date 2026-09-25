# Department Hierarchy — Feature Architecture

## Hierarchy

```
Super Admin (platform-wide)
  └── Hospital Admin (one branch / hospital site)
        └── Department Admin (one department per branch)
              └── Sub Department Admin (one section)
                    └── Staff (Doctor, Nurse, Security, etc.)
```

## Data Model

```
HospitalChain → Branch → Department → SubDepartment → User
Visitor → Visit (appointment) scoped to branch + department + subDepartment
```

## Roles

| Role | Scope | Creates |
|------|-------|---------|
| SUPER_ADMIN | All | Hospital Admin, Department Admin, departments |
| HOSPITAL_ADMIN | branchId | Department Admin, departments, sub-departments |
| DEPARTMENT_ADMIN | departmentId | Sub Department Admin, sub-departments |
| SUB_DEPARTMENT_ADMIN | subDepartmentId | Staff, Security |
| STAFF | Own appointments | — |
| SECURITY | Branch check-in | — |

Legacy roles `CHAIN_ADMIN` and `BRANCH_ADMIN` remain for backward compatibility.

## Appointment Flow

1. Visitor books at `/book-appointment` (public API)
2. Doctor approves → notifies Super Admin, Dept Admin, Sub-Dept Admin, Security
3. Security verifies ID proof → scans QR check-in
4. Doctor receives Email + SMS on check-in
5. Security scans QR at exit → duration stored

## API Endpoints

- `GET/POST /api/departments`
- `GET/POST /api/sub-departments`
- `GET/POST /api/public/appointments/*`
- `GET /api/appointments`
- `POST /api/security/visits/:id/verify-id-proof`
- `GET /api/security/appointments/today`

## Demo Seed IDs

- Cardiology Department: `eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee`
- ICU Cardiology: `ffffffff-ffff-4fff-8fff-ffffffffffff`

Run migration: `python scripts/migrate_department_hierarchy.py`
Run seed: `python scripts/seed_department_hierarchy.py`
