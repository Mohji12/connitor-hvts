# Department Hierarchy — Tasks

## Phase 1 — Schema & Roles
- [x] Department and SubDepartment models
- [x] User/Visit extended fields
- [x] Role enum updates
- [x] Frontend schema and demo personas
- [x] Migration and seed scripts
- [x] Frontend: DepartmentHierarchyFields shared form component
- [x] Frontend: SuperAdminUser with dept/sub-dept roles and hierarchy picks
- [x] Frontend: DepartmentAdminUser and SubDepartmentAdminUser pages
- [x] Frontend: Departments and Sub-Departments CRUD list/create pages
- [x] Frontend: Users page wired for DEPARTMENT_ADMIN / SUB_DEPARTMENT_ADMIN

## Phase 2 — Hierarchy APIs, RBAC & Admin CRUD
- [x] departments_service + router (typed update body, route guards)
- [x] sub_departments_service + router (typed update body, route guards)
- [x] users_service RBAC refactor
- [x] Auth helpers: `require_department_admin`, `require_hierarchy_admin`, etc.
- [x] Unit tests: `tests/test_departments_service.py`, `tests/test_sub_departments_service.py`
- [x] Mock API: `/api/departments`, `/api/sub-departments` with RBAC-scoped filters
- [x] Mock seed: departments, sub-departments, hierarchy users (`departmentId`/`subDepartmentId`)
- [x] Frontend: edit/deactivate on departments & sub-departments pages
- [x] Frontend: edit/deactivate users in DepartmentAdminUser & SubDepartmentAdminUser

## Phase 3 — Appointment Booking
- [x] appointments_service (public catalog, book, status, scoped list)
- [x] public_appointments router (validation, public routes)
- [x] appointments router (role-guarded list for admins/staff/security)
- [x] Doctor approval via staff_service → notify_admins_on_doctor_approval
- [x] Unit tests: `tests/test_appointments_service.py`
- [x] Mock API: public booking flow + `/api/appointments` + approval notifications
- [x] Mock seed: appointment visit with `appointmentDate` + hierarchy fields
- [x] Public booking UI `/book-appointment` (wizard with back nav + validation)
- [x] Booking status UI `/book-appointment/status`
- [x] Dashboard appointments page with status filter
- [x] MyVisitors shows scheduled appointment date for doctor approval

## Phase 4 — Security Flow
- [x] ID proof verification endpoint (`POST /api/security/visits/:id/verify-id-proof`)
- [x] Today's appointments for security (`GET /api/security/appointments/today`)
- [x] Check-in requires ID proof for appointments (`ID_PROOF_NOT_VERIFIED`)
- [x] Doctor notification on appointment check-in (email/SMS via notifications_service)
- [x] Duration tracking on check-out (`totalDurationMinutes`)
- [x] OTP response includes `appointmentDate` + `idProofVerified`
- [x] Unit tests: `tests/test_security_service.py`
- [x] Mock API: verify-id-proof, today appointments, check-in guard, checkout duration
- [x] Frontend: `IdProofVerificationForm` in check-in flow (`VisitorDetailsCard`)
- [x] Frontend: `TodayAppointmentsTab` on security dashboard (mobile tab + desktop panel)
- [x] Frontend: `securityAppointmentService.ts`

## Phase 5 — Dashboards & Analytics
- [x] Department Admin overview (stats, trends, status breakdown, duration)
- [x] Sub Department Admin overview (stats, trends, status breakdown, duration)
- [x] Sidebar navigation updates
- [x] Appointments, departments, sub-departments pages
- [x] Analytics endpoints: dept/sub-dept overview, visitor-trends, visit-duration
- [x] Mock API: hierarchy analytics routes + `totalDepartments`/`totalSubDepartments` in super-admin overview
- [x] Frontend: `HierarchyOverviewCharts`, enhanced dept/sub-dept dashboards
- [x] Frontend: `analyticsService` hierarchy methods
- [x] Public HomePage: Book Appointment CTA → `/book-appointment`
- [x] Unit tests: `tests/test_analytics_service.py`
