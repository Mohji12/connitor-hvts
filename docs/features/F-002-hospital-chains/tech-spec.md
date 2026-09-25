# Technical Specification: Hospital Chains (F-002)

## 1. Overview
This feature allows **Super Admins** to manage Hospital Chains. A Hospital Chain is the top-level entity (e.g., "Apollo Hospitals") that contains multiple branches.

## 2. Requirements
- Only `SUPER_ADMIN` can Create, Read, Update, Delete (CRUD) Hospital Chains.
- When a Chain is created, the creating Super Admin is *not* restricted to it (Super Admins see all).
- Chain Admins are linked to a specific `hospitalChainId`.

## 3. API Design

### 3.1 Endpoints
| Method | Endpoint | Description | Role |
| :--- | :--- | :--- | :--- |
| `GET` | `/hospital-chains` | List all chains. | SUPER_ADMIN |
| `POST` | `/hospital-chains` | Create a new chain. | SUPER_ADMIN |
| `GET` | `/hospital-chains/:id` | Get details of a chain. | SUPER_ADMIN |
| `PATCH` | `/hospital-chains/:id` | Update chain details. | SUPER_ADMIN |
| `DELETE` | `/hospital-chains/:id` | Delete a chain. | SUPER_ADMIN |

## 4. Frontend Implementation

### 4.1 UI Components
- **Page:** `/dashboard/hospital-chains/page.tsx`
- **Component:** `SuperAdminHospitalChain.tsx`
- **Features:**
    - Data Table (ShadCN) listing chains.
    - "Add Chain" Modal (React Hook Form + Zod).
    - Search/Filter by name.

### 4.2 State Management
- **SWR:** `useHospitalChains` hook for fetching and caching.

## 5. Database
- **Model:** `HospitalChain`
- **Relations:** Has many `Branch`s, Has many `User`s.
