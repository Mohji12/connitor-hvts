# Technical Specification: Prisma Schema Updates (Verification & Gate Pass)

> **Feature:** Unified Visitor Workflow
> **Increment:** 1
> **Task:** 1.1 (Visitor Phone Verification) & 1.2 (Visit Gate Pass Fields)

## 1. File Path
`backend/prisma/schema.prisma`

## 2. Description
This specification outlines the changes required to the Prisma schema to support:
1.  **Visitor Phone Verification:** Tracking OTPs, expiry, and verification status for visitors.
2.  **Gate Pass OTPs:** Adding check-in OTPs to the Visit model to replace the legacy `visitCode` for authentication at the gate.

## 3. Data Models (Schema Changes)

### 3.1 Visitor Model Updates
**Goal:** Add fields to manage phone verification state.

```prisma
model Visitor {
  // ... existing fields ...

  // -- New Fields: Phone Verification --
  phoneVerificationOtp      String?   // 6-digit numeric string
  phoneVerificationExpiry   DateTime? // Timestamp when OTP expires (5 mins TTL)
  phoneVerified             Boolean   @default(false)
  phoneVerificationAttempts Int       @default(0) // For rate limiting/locking (Max 3)

  // ... existing relations ...
}
```

### 3.2 Visit Model Updates
**Goal:** Add fields to support the new Gate Pass workflow (OTP-based check-in).

```prisma
model Visit {
  // ... existing fields ...

  // -- New Fields: Gate Pass & Check-In --
  checkInOtp            String?   // 6-digit numeric OTP for Gate Pass
  checkInOtpExpiry      DateTime? // Timestamp when Gate Pass expires (8 hours TTL)
  gatePassGeneratedAt   DateTime? // When the pass was issued
  gatePassSentViaWhatsApp Boolean @default(false)

  // Note: 'visitCode' is DEPRECATED but kept for backward compatibility until Migration Phase 2.
  // It should be nullable if not already, or maintained as legacy.
  // visitCode String? @unique 
  
  // ... existing relations ...
}
```

## 4. Migration Strategy

### 4.1 Migration Name
`add_visitor_verification_and_visit_otp`

### 4.2 Execution Command
```bash
npx prisma migrate dev --name add_visitor_verification_and_visit_otp
```

### 4.3 Data Integrity & Defaults
- **Existing Rows:**
  - `phoneVerified`: Will default to `false` for existing visitors.
  - `phoneVerificationAttempts`: Will default to `0`.
  - `gatePassSentViaWhatsApp`: Will default to `false`.
  - Nullable fields (`checkInOtp`, etc.) will be `NULL` for existing records.

## 5. Logic & Behavior Rules

### 5.1 Visitor Phone Verification
- **`phoneVerificationOtp`**: Generated server-side using a crypto-secure RNG (random 6 digits).
- **`phoneVerificationExpiry`**: Set to `Date.now() + 5 * 60 * 1000` (5 minutes).
- **`phoneVerificationAttempts`**: Incremented on every failed verify attempt. Reset to 0 on successful verification or new OTP generation request.

### 5.2 Visit Gate Pass
- **`checkInOtp`**: Generated upon Visit Approval. Uniqueness is not strictly enforced at DB level (unlike `visitCode`) but collision probability is low for active passes. Application logic should handle collision checks if strict uniqueness is required for active passes.
- **`visitCode` Deprecation**: The application will write to both `checkInOtp` and `visitCode` (if strictly required) for now, but read primarily from `checkInOtp` for new flows. Future cleanup will remove `visitCode`.

## 6. Verification Plan

### 6.1 Database Verification
Run the following SQL (or use Prisma Studio) after migration:

```sql
DESCRIBE "Visitor";
-- Verify columns: phoneVerificationOtp, phoneVerificationExpiry, phoneVerified, phoneVerificationAttempts exist.

DESCRIBE "Visit";
-- Verify columns: checkInOtp, checkInOtpExpiry, gatePassGeneratedAt, gatePassSentViaWhatsApp exist.
```

### 6.2 Prisma Client Generation
Ensure the client is regenerated to expose new types:
```bash
npx prisma generate
```

### 6.3 Type Check
Create a temporary test file to verify Type Definitions:
```typescript
// temp_test.ts
import { PrismaClient, Visitor, Visit } from '@prisma/client';

const visitor: Partial<Visitor> = {
  phoneVerified: true,
  phoneVerificationAttempts: 0
};

const visit: Partial<Visit> = {
  checkInOtp: "123456",
  gatePassSentViaWhatsApp: false
};
```
*Run `npx tsc --noEmit` to ensure no errors.*
