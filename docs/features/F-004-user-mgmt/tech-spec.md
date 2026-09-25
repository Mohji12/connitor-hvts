# Technical Specification: User Management (F-004)

## 1. Overview
Manages the lifecycle of system users (Staff, Security, Admins). It enforces a strict hierarchy:
- **Super Admin:** Manages everyone.
- **Chain Admin:** Manages users in their chain.
- **Branch Admin:** Manages users in their branch.

## 2. User Roles & Types
- **Roles:** `SUPER_ADMIN`, `CHAIN_ADMIN`, `BRANCH_ADMIN`, `STAFF`, `SECURITY`, `SECURITY_SUPERVISOR`.
- **User Types:** `DOCTOR`, `NURSE`, `ADMIN`, `SECURITY_GUARD` (Used for Staff categorization).

## 3. API Design

### 3.1 Endpoints
| Method | Endpoint | Description | Role |
| :--- | :--- | :--- | :--- |
| `GET` | `/users` | List users (scoped). | ALL ADMINS |
| `POST` | `/users` | Create user. | ALL ADMINS |
| `PATCH` | `/users/:id` | Update user. | ALL ADMINS |
| `DELETE` | `/users/:id` | Soft delete user. | ALL ADMINS |

### 3.2 Scoping Logic
- **Service Layer:**
    - `findAll(user)`:
        - If Super Admin -> Return all.
        - If Chain Admin -> `where: { hospitalChainId: user.hospitalChainId }`
        - If Branch Admin -> `where: { branchId: user.branchId }`

## 4. Frontend Implementation
- **Page:** `/dashboard/users/page.tsx`
- **Forms:** Dynamic forms based on selected Role (e.g., "Doctor" needs "Department", "Security" does not).
