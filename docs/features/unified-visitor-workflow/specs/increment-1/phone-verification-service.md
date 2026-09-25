# Phone Verification Service Specification

**Feature:** Unified Visitor Workflow
**Increment:** 1
**File Path:** `backend/src/visitors/services/phone-verification.service.ts`

## 1. Overview

The `PhoneVerificationService` is responsible for handling the OTP-based phone number verification process for visitors. It ensures that a visitor's phone number is valid and owned by them before allowing further actions. This service handles OTP generation, storage (in the database), sending (via `SmsService`), and verification.

## 2. Dependencies

-   **PrismaService** (`DatabaseService`): For accessing and updating `Visitor` records.
-   **SmsService**: For sending OTP SMS messages.
-   **ConfigService**: To check for `TEST_MODE` and other configurations.

## 3. Data Models

### 3.1. Prisma Schema Updates
*Note: The `Visitor` model in `schema.prisma` requires the following fields to be added:*

```prisma
model Visitor {
  // ... existing fields
  phoneVerificationOtp      String?   // Hashed or plain (Plain for Increment 1 MVP if acceptable, else hashed) -> Requirements imply simple string comparison
  phoneVerificationExpiry   DateTime?
  phoneVerificationAttempts Int       @default(0)
  phoneVerified             Boolean   @default(false)
  // ...
}
```

### 3.2. Error Codes (`src/visitors/constants/visitor-error-codes.enum.ts`)

```typescript
export enum PhoneVerificationError {
  OTP_EXPIRED = 'OTP_EXPIRED',
  OTP_LOCKED = 'OTP_LOCKED',
  INVALID_OTP = 'INVALID_OTP',
  VISITOR_NOT_FOUND = 'VISITOR_NOT_FOUND',
  SMS_SEND_FAILED = 'SMS_SEND_FAILED',
}
```

### 3.3. Interfaces

```typescript
export interface GenerateOtpResponse {
  success: boolean;
  message: string;
  isNewVisitor: boolean; // Helpful for frontend flow
  testOtp?: string; // Only returned if TEST_MODE=true
}

export interface VerifyOtpResponse {
  success: boolean;
  visitorId: string;
  isNewVisitor: boolean; // If they need profile completion
  token?: string; // Optional: If we issue a temp token here, otherwise just success
}
```

## 4. Function Signatures

```typescript
@Injectable()
export class PhoneVerificationService {
  constructor(
    private readonly prisma: DatabaseService,
    private readonly smsService: SmsService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Generates an OTP for the given phone number.
   * Finds or creates a Visitor record.
   * Handles Rate Limiting (Service level logic for locking).
   */
  async generateOtp(phone: string, branchId: string): Promise<GenerateOtpResponse>;

  /**
   * Verifies the provided OTP.
   * Updates verification status and clears OTP fields on success.
   * Manages lockouts and attempt counters.
   */
  async verifyOtp(phone: string, branchId: string, otp: string): Promise<VerifyOtpResponse>;
}
```

## 5. Logic & Pseudo-Code

### 5.1. `generateOtp(phone, branchId)`

1.  **Input Validation**: Ensure `phone` and `branchId` are provided.
2.  **Find or Create Visitor**:
    -   Query `Visitor` by `phone` AND `branchId` (Composite Unique).
    -   **IF** found: Use existing record.
    -   **IF** not found: Create a new `Visitor` record with minimum required fields (`phone`, `branchId`, `firstName`="Guest", `lastName`="Visitor"). *Note: Schema requires firstName/lastName, use placeholders if not provided.*
3.  **Check Lock Status**:
    -   **IF** `phoneVerificationAttempts` >= 3 AND `phoneVerificationExpiry` is in the future (meaning the lock is still active):
        -   **THROW** `OTP_LOCKED`.
4.  **Generate OTP**:
    -   Check `TEST_MODE` from env.
    -   **IF** `TEST_MODE=true`: Set `otp = "123456"`.
    -   **ELSE**: Generate random 6-digit numeric string (e.g., `Math.floor(100000 + Math.random() * 900000)`).
5.  **Set Expiry**:
    -   `expiry = now() + 5 minutes`.
6.  **Update Database**:
    -   Update `Visitor` record:
        -   `phoneVerificationOtp` = `otp`
        -   `phoneVerificationExpiry` = `expiry`
        -   `phoneVerificationAttempts` = 0
7.  **Send SMS**:
    -   Call `this.smsService.sendOtp(phone, otp)`.
    -   **IF** fails: **THROW** `SMS_SEND_FAILED` (and maybe rollback DB update or leave as is).
8.  **Return**:
    -   `{ success: true, message: 'OTP sent', isNewVisitor: <was_created>, testOtp: <otp_if_test_mode> }`

### 5.2. `verifyOtp(phone, branchId, otp)`

1.  **Find Visitor**:
    -   Query `Visitor` by `phone` + `branchId`.
    -   **IF** not found: **THROW** `VISITOR_NOT_FOUND`.
2.  **Check Lockout**:
    -   **IF** `phoneVerificationAttempts` >= 3:
        -   **IF** `phoneVerificationExpiry` > now():
            -   **THROW** `OTP_LOCKED`.
        -   **ELSE** (Lock expired):
            -   Reset `phoneVerificationAttempts` = 0 (Allow retry or require new OTP? Usually require new OTP).
            -   **THROW** `OTP_EXPIRED` (User must request new OTP).
3.  **Check Expiry**:
    -   **IF** `phoneVerificationExpiry` < now():
        -   **THROW** `OTP_EXPIRED`.
4.  **Validate OTP**:
    -   **IF** `input_otp` != `stored_otp`:
        -   Increment `phoneVerificationAttempts` by 1.
        -   Update `Visitor` record.
        -   **IF** new `attempts` >= 3:
            -   Set `phoneVerificationExpiry` = now() + 10 minutes (Lock duration).
            -   **THROW** `OTP_LOCKED`.
        -   **THROW** `INVALID_OTP`.
5.  **Success**:
    -   Update `Visitor`:
        -   `phoneVerified` = `true`
        -   `phoneVerificationOtp` = `null`
        -   `phoneVerificationExpiry` = `null`
        -   `phoneVerificationAttempts` = 0
    -   **Return**: `{ success: true, visitorId: visitor.id, ... }`

## 6. Test Cases

### 6.1. Unit Tests

1.  **Generate OTP - Success (New Visitor)**
    -   Input: New phone number.
    -   Expect: Create Visitor, set OTP, return success.
2.  **Generate OTP - Success (Existing Visitor)**
    -   Input: Existing phone.
    -   Expect: Update Visitor, set OTP, return success.
3.  **Generate OTP - Test Mode**
    -   Env: `TEST_MODE=true`.
    -   Expect: OTP is "123456".
4.  **Generate OTP - Locked**
    -   Setup: Visitor has 3 attempts and valid lock time.
    -   Expect: Throw `OTP_LOCKED`.
5.  **Verify OTP - Success**
    -   Setup: Valid OTP, not expired.
    -   Expect: `phoneVerified=true`, OTP cleared.
6.  **Verify OTP - Invalid**
    -   Setup: Wrong OTP.
    -   Expect: Throw `INVALID_OTP`, increment attempts.
7.  **Verify OTP - Expired**
    -   Setup: Expiry time < now.
    -   Expect: Throw `OTP_EXPIRED`.
8.  **Verify OTP - Lockout Trigger**
    -   Setup: 2 failed attempts. Send 3rd wrong OTP.
    -   Expect: Throw `OTP_LOCKED`, expiry set to +10 mins.

### 6.2. Edge Cases

-   **Visitor Not Found (Verify)**: Should throw specific error.
-   **SMS Failure**: Should handle gracefully (throw error to user so they can retry).
-   **Concurrent Requests**: Database consistency ensured by Prisma `update`.

## 7. Configuration & Constants

-   `OTP_EXPIRY_MINUTES` = 5
-   `OTP_LOCK_THRESHOLD` = 3
-   `OTP_LOCK_DURATION_MINUTES` = 10
-   `TEST_OTP` = "123456"
