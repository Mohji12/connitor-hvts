# Technical Specification: Auth System (F-001)

## 1. Overview
The Auth System handles secure access to the Hospital Visitor Tracking System. It uses an OTP-based login mechanism (no passwords) and issues JWTs for session management. It supports Role-Based Access Control (RBAC) to differentiate between Super Admins, Chain Admins, Branch Admins, Staff, and Security personnel.

## 2. Architecture

### 2.1 Backend (NestJS)
- **Module:** `AuthModule`
- **Strategy:** Passport-JWT (`jwt.strategy.ts`)
- **Guards:** `JwtAuthGuard`, `RolesGuard`
- **Database:** Prisma (User table)

### 2.2 Frontend (Next.js)
- **Framework:** Next.js App Router
- **UI Library:** ShadCN UI (InputOTP, Form, Toast)
- **State:** `useAuth` hook (Context/LocalStorage)

## 3. Data Model
**User Table (Prisma)**
- `phone` (Unique, Indexed)
- `role` (Enum: SUPER_ADMIN, CHAIN_ADMIN, BRANCH_ADMIN, STAFF, SECURITY)
- `otpHash` (Temporary storage for verification)
- `otpExpiry` (DateTime)

## 4. API Design

### 4.1 Endpoints
| Method | Endpoint | Description | Auth |
| :--- | :--- | :--- | :--- |
| `POST` | `/auth/login` | Request OTP for phone number. | Public |
| `POST` | `/auth/verify-otp` | Verify OTP and return JWT. | Public |
| `GET` | `/auth/me` | Get current user profile. | Bearer Token |

### 4.2 Auth Flow
1. **Request OTP:** User enters phone -> Backend generates 6-digit OTP -> Logs to console (Dev) / Sends SMS (Prod) -> Hashes OTP -> Stores in DB.
2. **Verify OTP:** User enters OTP -> Backend hashes input -> Compares with DB -> If valid, generates JWT.
3. **Session:** Frontend stores JWT in LocalStorage -> Attaches to `Authorization: Bearer <token>` header for subsequent requests.

## 5. Frontend Implementation

### 5.1 Pages
- `/login`: Phone number entry form.
- `/verify-otp`: 6-digit OTP input form.

### 5.2 Components
- `AuthPhoneForm.tsx`: Handles phone submission.
- `AuthOtpForm.tsx`: Handles OTP verification.

### 5.3 Security
- **Token Storage:** LocalStorage (Standard for this MVP).
- **Route Protection:** Middleware checks for token presence on `/dashboard/*` routes.

## 6. Testing Strategy
- **Backend:** Unit tests for `AuthService` (mocking Prisma).
- **Frontend:** Manual testing of Login -> OTP -> Dashboard flow.
