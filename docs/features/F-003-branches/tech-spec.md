# Technical Specification: Branches (F-003)

## 1. Overview

Branches are physical locations belonging to a Hospital Chain. This feature allows management of these branches.

- **Super Admin:** Can manage branches for _any_ chain.
- **Chain Admin:** Can manage branches _only_ for their assigned chain.

## 2. API Design

### 2.1 Endpoints

| Method   | Endpoint                                   | Description                | Role              |
| :------- | :----------------------------------------- | :------------------------- | :---------------- |
| `GET`    | `/chain/:chainId/branches`                 | List branches for a chain. | SUPER/CHAIN_ADMIN |
| `POST`   | `/chain/:chainId/branches`                 | Create a branch.           | SUPER/CHAIN_ADMIN |
| `PATCH`  | `/chain/:chainId/branches/:id`             | Update a branch.           | SUPER/CHAIN_ADMIN |
| `DELETE` | `/chain/:chainId/branches/:id`             | Delete a branch.           | SUPER/CHAIN_ADMIN |
| `POST`   | `/chain/:chainId/branches/:id/generate-qr` | Generate/Regenerate QR.    | SUPER/CHAIN_ADMIN |

### 2.2 Security Logic

- **Middleware/Guard:** Checks if `user.role === CHAIN_ADMIN`.
- **Validation:** If Chain Admin, ensure `:chainId` matches `user.hospitalChainId`. If mismatch -> `403 Forbidden`.
- **Strict Scoping:** Ensure `branchId` actually belongs to `chainId`. If not -> `404 Not Found`.

## 3. Frontend Implementation

### 3.1 UI Components

- **Page:** `/dashboard/branches/page.tsx`
- **Component:** `SuperAdminBranches.tsx` (Reused for Chain Admin with restricted view).
- **Features:**
  - Dropdown to select Chain (Super Admin only).
  - Table listing branches.
  - Add/Edit Branch Modal.
  - Generate QR Code Button/Action.

## 4. Database

- **Model:** `Branch`
- **Fields:** `name`, `street`, `city`, `state`, `pinCode`, `country`, `phone`, `email`, `hospitalChainId`, `qrCode`.

## 5. Implementation Notes / Changes

- **Date:** 2025-12-30
- **Change:** Added `generate-qr` endpoint.
- **Change:** Implemented strict scoping for Chain Admins.
  - Chain Admin cannot access branches of another chain even if they guess the ID.
  - Services now verify `branch.hospitalChainId === chainId` and throw `NotFoundException` if mismatched.
- **Change:** Update `Branch` model fields to match actual schema (split address into street, city, etc.).
