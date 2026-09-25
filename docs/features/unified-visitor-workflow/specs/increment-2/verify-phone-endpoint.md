# Technical Specification: POST /public/visitors/verify-phone

> **Task ID:** 2.2
> **Increment:** 2 - Public API Layer
> **Feature:** Unified Visitor Workflow
> **Status:** Approved
> **Dependencies:** Task 1.4 (OTP verification with attempt locking), Task 2.1 (send-otp endpoint)

---

## 1. Overview

This endpoint validates a visitor's phone number using an OTP (One-Time Password) sent via SMS. It is a public endpoint (no authentication required) that serves as the second step in the phone verification flow for visitor registration.

### Primary Purpose
- Validate phone ownership before allowing visitor registration
- Distinguish between existing and new visitors
- Set the `phoneVerified` flag to enable subsequent registration flows

### Key Behaviors
1. Accepts `{ phone, otp, branchId }` and verifies the OTP via `PhoneVerificationService`
2. Returns `{ verified, isExistingVisitor, visitorData }` with appropriate visitor details
3. Handles all error codes from the service layer (`OTP_EXPIRED`, `OTP_LOCKED`, `INVALID_OTP`)
4. On success, updates `phoneVerified = true` and resets `phoneVerificationAttempts`
5. Supports `TEST_MODE` where OTP is fixed as `"123456"`

---

## 2. Endpoint Definition

### Path & Method
```
POST /public/visitors/verify-phone
```

### Controller
- **File:** `backend/src/visitors/public-controller/public-visitors.controller.ts`
- **Class:** `PublicVisitorsController`
- **Decorator:** `@Public()` (no authentication required)
- **Tags:** `Public Visitor`

### HTTP Status Codes

| Status Code | Scenario | Response Body |
|-------------|----------|---------------|
| `200 OK` | OTP verified successfully | `VerifyPhoneResponse` |
| `400 Bad Request` | Invalid OTP, expired OTP, locked OTP, or validation failed | `ErrorResponse` |
| `404 Not Found` | Visitor not found for phone + branchId | `ErrorResponse` |

---

## 3. Data Models

### 3.1 Error Code Enum

```typescript
/**
 * Error codes for phone verification operations
 */
export enum PhoneVerificationError {
  /** OTP locked due to too many failed attempts (3+ attempts within expiry window) */
  OTP_LOCKED = 'OTP_LOCKED',

  /** Failed to send SMS via AWS SNS */
  SMS_SEND_FAILED = 'SMS_SEND_FAILED',

  /** OTP has expired (current time > expiry) */
  OTP_EXPIRED = 'OTP_EXPIRED',

  /** Provided OTP does not match stored value */
  INVALID_OTP = 'INVALID_OTP',

  /** Visitor record not found for phone + branchId combination */
  VISITOR_NOT_FOUND = 'VISITOR_NOT_FOUND',

  /** Phone has not been verified yet */
  PHONE_NOT_VERIFIED = 'PHONE_NOT_VERIFIED',
}
```

### 3.2 Request DTO

**File:** `backend/src/visitors/dto/visitor.dto.ts`

```typescript
import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, Length, Matches } from 'class-validator';

export class VerifyPhoneDto {
  @ApiProperty({
    description: "Visitor's 10-digit phone number",
    example: '9876543210',
  })
  @IsString()
  @IsNotEmpty()
  @Length(10, 10, { message: 'Phone must be exactly 10 digits' })
  @Matches(/^[0-9]{10}$/, { message: 'Phone must contain only digits' })
  phone: string;

  @ApiProperty({
    description: '6-digit OTP received via SMS',
    example: '123456',
  })
  @IsString()
  @IsNotEmpty()
  @Length(6, 6, { message: 'OTP must be exactly 6 digits' })
  @Matches(/^[0-9]{6}$/, { message: 'OTP must contain only digits' })
  otp: string;

  @ApiProperty({
    description: 'Branch ID from QR code (UUID v4 format)',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i, {
    message: 'Branch ID must be a valid UUID v4',
  })
  branchId: string;
}
```

### 3.3 Request Body Example

```json
{
  "phone": "9876543210",
  "otp": "123456",
  "branchId": "550e8400-e29b-41d4-a716-446655440000"
}
```

### 3.4 Response Schema

#### Success Response (200 OK)

```typescript
/**
 * Visitor data subset included in verification response
 */
export interface VisitorData {
  id: string;
  firstName: string;
  middleName: string | null;
  lastName: string;
  phone: string;
  email: string | null;
  company: string | null;
  designation: string | null;
  phoneVerified: boolean;
}

/**
 * Successful verification response
 */
export interface VerifyPhoneResponse {
  /** Verification status */
  verified: true;

  /** Indicates if visitor existed before this verification flow */
  isExistingVisitor: boolean;

  /** Visitor details (included for both new and existing visitors) */
  visitorData: VisitorData;
}
```

#### Response Examples

**For Existing Visitor:**
```json
{
  "verified": true,
  "isExistingVisitor": true,
  "visitorData": {
    "id": "visitor-uuid-here",
    "firstName": "John",
    "middleName": "Michael",
    "lastName": "Doe",
    "phone": "9876543210",
    "email": "john.doe@company.com",
    "company": "Acme Corp",
    "designation": "Sales Manager",
    "phoneVerified": true
  }
}
```

**For New Visitor:**
```json
{
  "verified": true,
  "isExistingVisitor": false,
  "visitorData": {
    "id": "new-visitor-uuid-here",
    "firstName": "Guest",
    "middleName": null,
    "lastName": "Visitor",
    "phone": "9876543210",
    "email": null,
    "company": null,
    "designation": null,
    "phoneVerified": true
  }
}
```

### 3.5 Error Response Schema

```typescript
/**
 * Standard error response structure
 */
export interface ErrorResponse {
  statusCode: number;
  message: string | string[];
  error: string; // Error code from PhoneVerificationError or HTTP status text
}
```

#### Error Responses

```json
// 400 Bad Request - OTP Expired
{
  "statusCode": 400,
  "message": "OTP has expired. Please request a new OTP.",
  "error": "OTP_EXPIRED"
}

// 400 Bad Request - OTP Locked
{
  "statusCode": 400,
  "message": "Too many failed attempts. Please wait 10 minutes before trying again.",
  "error": "OTP_LOCKED"
}

// 400 Bad Request - Invalid OTP
{
  "statusCode": 400,
  "message": "Invalid OTP. Please try again.",
  "error": "INVALID_OTP"
}

// 404 Not Found - Visitor Not Found
{
  "statusCode": 404,
  "message": "Visitor not found. Please complete phone verification first.",
  "error": "VISITOR_NOT_FOUND"
}
```

---

## 4. Behavior & Logic

### 4.1 Pseudo-Code Algorithm

```typescript
async verifyPhone(dto: VerifyPhoneDto): Promise<VerifyPhoneResponse> {
  // ==================================================================
  // STEP 1: Input Validation (handled by class-validator decorators)
  // ==================================================================
  // - phone: 10 digits, numeric only, regex: /^[0-9]{10}$/
  // - otp: 6 digits, numeric only, regex: /^[0-9]{6}$/
  // - branchId: valid UUID v4, regex: /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

  // ==================================================================
  // STEP 2: Call PhoneVerificationService.verifyOtp()
  // ==================================================================
  // This method handles:
  // - Visitor lookup by phone + branchId
  // - OTP expiry validation (5 minutes)
  // - Attempt lockout check (max 3 attempts)
  // - OTP comparison
  // - On success: clears OTP fields, sets phoneVerified = true, resets attempts
  // - On failure: increments attempts, locks if needed

  try {
    const verifyResult = await this.phoneVerificationService.verifyOtp(
      dto.phone,
      dto.branchId,
      dto.otp,
    );

    // ==================================================================
    // STEP 3: Fetch visitor details (after successful verification)
    // ==================================================================
    const visitor = await this.prisma.visitor.findUnique({
      where: { id: verifyResult.visitorId },
      select: {
        id: true,
        firstName: true,
        middleName: true,
        lastName: true,
        phone: true,
        email: true,
        company: true,
        designation: true,
        phoneVerified: true,
      },
    });

    if (!visitor) {
      throw new NotFoundException({
        statusCode: 404,
        message: 'Visitor not found. Please complete phone verification first.',
        error: PhoneVerificationError.VISITOR_NOT_FOUND,
      });
    }

    // ==================================================================
    // STEP 4: Determine if visitor is existing or new
    // ==================================================================
    // New visitor: firstName = 'Guest' AND lastName = 'Visitor'
    const isExistingVisitor = !(
      visitor.firstName === 'Guest' && visitor.lastName === 'Visitor'
    );

    // ==================================================================
    // STEP 5: Return response
    // ==================================================================
    // Note: visitorData is ALWAYS included, not omitted for any visitor type
    return {
      verified: true,
      isExistingVisitor,
      visitorData: {
        id: visitor.id,
        firstName: visitor.firstName,
        middleName: visitor.middleName,
        lastName: visitor.lastName,
        phone: visitor.phone,
        email: visitor.email,
        company: visitor.company,
        designation: visitor.designation,
        phoneVerified: visitor.phoneVerified,
      },
    };

  } catch (error) {
    // ==================================================================
    // STEP 6: Handle service errors
    // ==================================================================
    // PhoneVerificationService throws BadRequestException for:
    // - PhoneVerificationError.OTP_EXPIRED
    // - PhoneVerificationError.OTP_LOCKED
    // - PhoneVerificationError.INVALID_OTP
    // Re-throw these as-is with proper error messages

    if (error instanceof BadRequestException) {
      throw error;
    }

    if (error instanceof NotFoundException) {
      throw error;
    }

    // Log unexpected errors and throw generic error
    this.logger.error(
      `Unexpected error in verifyPhone for phone ${dto.phone}: ${error.message}`,
    );
    throw new BadRequestException({
      statusCode: 500,
      message: 'Phone verification failed. Please try again.',
      error: 'INTERNAL_ERROR',
    });
  }
}
```

### 4.2 State Transition Diagram

```
Visitor State Before OTP Verification:
┌─────────────────────────────────────────┐
│ phoneVerified: false                    │
│ phoneVerificationOtp: "123456"          │
│ phoneVerificationExpiry: (now + 5 min)   │
│ phoneVerificationAttempts: 0-2          │
└─────────────────────────────────────────┘
              │
              ▼
       [OTP Submitted]
              │
              ├─► Invalid OTP ──► Attempts++ ──► If >=3: Lock
              │                                       │
              │                                       └─► Return 400, error: "INVALID_OTP"
              │
              ├─► Expired OTP ────────────────────────► Return 400, error: "OTP_EXPIRED"
              │
              ├─► Locked (attempts >= 3) ─────────────► Return 400, error: "OTP_LOCKED"
              │
              └─► Valid OTP ──────────────────────────► Success
                       │
                       ▼
                Update Visitor:
               ┌─────────────────────────────────────────┐
               │ phoneVerified: true                     │
               │ phoneVerificationOtp: null              │
               │ phoneVerificationExpiry: null           │
               │ phoneVerificationAttempts: 0            │
               └─────────────────────────────────────────┘
                        │
                        ▼
                    Return Response
           ┌────────────────────────────────┐
           │ verified: true              │
           │ isExistingVisitor: bool      │
           │ visitorData: { ... }        │
           └────────────────────────────────┘
```

---

## 5. Error Handling

### 5.1 Error Code Matrix

| Error Code | HTTP Status | Trigger Condition | User Action |
|-----------|-------------|-------------------|-------------|
| `INVALID_OTP` | 400 | OTP does not match stored value (attempts < 3) | Retry with correct OTP |
| `OTP_EXPIRED` | 400 | Current time > `phoneVerificationExpiry` | Request new OTP via send-otp endpoint |
| `OTP_LOCKED` | 400 | `phoneVerificationAttempts` >= 3 AND lock time not expired | Wait 10 minutes, then request new OTP |
| `VISITOR_NOT_FOUND` | 404 | No visitor record found for phone + branchId | Restart flow from send-otp endpoint |

### 5.2 Attempt Locking Behavior

The `PhoneVerificationService.verifyOtp()` method handles attempt locking:

1. **Initial State:** `phoneVerificationAttempts = 0`
2. **After 1st Failed Attempt:** `phoneVerificationAttempts = 1`
3. **After 2nd Failed Attempt:** `phoneVerificationAttempts = 2`
4. **After 3rd Failed Attempt:**
   - `phoneVerificationAttempts = 3`
   - `phoneVerificationExpiry` is set to `now + 10 minutes` (lock duration)
   - Returns `OTP_LOCKED` error
5. **After Lock Expires:** User must call `send-otp` again, which resets attempts to 0

### 5.3 Error Response Format

All errors follow the NestJS standard error format:

```typescript
interface ErrorResponse {
  statusCode: number;
  message: string | string[];
  error: string; // Error code from PhoneVerificationError enum or HTTP status text
}
```

### 5.4 Error Response Examples

```json
// Invalid OTP (attempt 1 or 2)
{
  "statusCode": 400,
  "message": "Invalid OTP. Please try again.",
  "error": "INVALID_OTP"
}

// Invalid OTP (attempt 3, triggers lock)
{
  "statusCode": 400,
  "message": "Too many failed attempts. Please wait 10 minutes before trying again.",
  "error": "OTP_LOCKED"
}

// Expired OTP
{
  "statusCode": 400,
  "message": "OTP has expired. Please request a new OTP.",
  "error": "OTP_EXPIRED"
}

// Visitor not found
{
  "statusCode": 404,
  "message": "Visitor not found. Please complete phone verification first.",
  "error": "VISITOR_NOT_FOUND"
}
```

---

## 6. Test Mode Support

### 6.1 TEST_MODE Environment Variable

When `TEST_MODE=true` is set in the environment:

| Setting | Normal Mode | TEST_MODE |
|---------|-------------|-----------|
| OTP Value | Random 6-digit | Fixed `"123456"` |
| SMS Delivery | AWS SNS | Mocked (logged only) |

### 6.2 Test Mode Behavior in verify-otp

The OTP validation logic remains the same in TEST_MODE:
- OTP must match exactly (`"123456"`)
- Expiry is still enforced (5 minutes)
- Attempt locking still applies

### 6.3 Testing with TEST_MODE

**Example Flow:**
```bash
# 1. Set environment
export TEST_MODE=true

# 2. Send OTP (will return testOtp: "123456" in response)
curl -X POST http://localhost:3000/public/visitors/send-otp \
  -H "Content-Type: application/json" \
  -d '{"phone": "9876543210", "branchId": "..."}'

# Response includes: { "success": true, "testOtp": "123456", ... }

# 3. Verify OTP with test value
curl -X POST http://localhost:3000/public/visitors/verify-phone \
  -H "Content-Type: application/json" \
  -d '{"phone": "9876543210", "otp": "123456", "branchId": "..."}'

# Response: { "verified": true, "isExistingVisitor": true/false, "visitorData": { ... } }
```

---

## 7. Controller Implementation

### 7.1 Controller Method Signature

```typescript
@Public()
@Post('verify-phone')
@ApiOperation({
  summary: 'Verify visitor phone number using OTP',
  description: 'Validates the OTP sent to the visitor phone. Returns visitor data and indicates if visitor is existing or new.',
})
@ApiResponse({ status: 200, description: 'OTP verified successfully' })
@ApiResponse({ status: 400, description: 'Invalid OTP, expired OTP, or locked OTP' })
@ApiResponse({ status: 404, description: 'Visitor not found' })
async verifyPhone(@Body() dto: VerifyPhoneDto): Promise<VerifyPhoneResponse> {
  return this.visitorService.verifyPhone(dto);
}
```

### 7.2 Required Dependencies

The controller requires:
- `PhoneVerificationService` - injected via constructor
- `PrismaService` (via VisitorsService) - for database operations

### 7.3 Service Layer Method

```typescript
// In VisitorsService (or separate method)
async verifyPhone(dto: VerifyPhoneDto): Promise<VerifyPhoneResponse> {
  const verifyResult = await this.phoneVerificationService.verifyOtp(
    dto.phone,
    dto.branchId,
    dto.otp,
  );

  const visitor = await this.prisma.visitor.findUnique({
    where: { id: verifyResult.visitorId },
    select: {
      id: true,
      firstName: true,
      middleName: true,
      lastName: true,
      phone: true,
      email: true,
      company: true,
      designation: true,
      phoneVerified: true,
    },
  });

  if (!visitor) {
    throw new NotFoundException({
      statusCode: 404,
      message: 'Visitor not found. Please complete phone verification first.',
      error: PhoneVerificationError.VISITOR_NOT_FOUND,
    });
  }

  const isExistingVisitor = !(
    visitor.firstName === 'Guest' && visitor.lastName === 'Visitor'
  );

  return {
    verified: true,
    isExistingVisitor,
    visitorData: {
      id: visitor.id,
      firstName: visitor.firstName,
      middleName: visitor.middleName,
      lastName: visitor.lastName,
      phone: visitor.phone,
      email: visitor.email,
      company: visitor.company,
      designation: visitor.designation,
      phoneVerified: visitor.phoneVerified,
    },
  };
}
```

---

## 8. Test Cases

### 8.1 Unit Test Scenarios

| Test Case | Input | Expected Output | Notes |
|-----------|-------|-----------------|-------|
| Valid OTP - New Visitor | phone: "9876543210", otp: "123456", branchId: valid | verified: true, isExistingVisitor: false, visitorData has placeholder names | |
| Valid OTP - Existing Visitor | phone: "9876543210", otp: "123456", branchId: valid | verified: true, isExistingVisitor: true, visitorData has full profile | |
| Invalid OTP (1st attempt) | phone: "9876543210", otp: "000000", branchId: valid | Error: INVALID_OTP, attempts = 1 | |
| Invalid OTP (2nd attempt) | phone: "9876543210", otp: "000000", branchId: valid | Error: INVALID_OTP, attempts = 2 | |
| Invalid OTP (3rd attempt) | phone: "9876543210", otp: "000000", branchId: valid | Error: OTP_LOCKED, attempts = 3, lock expiry set | |
| Expired OTP | phone: "9876543210", otp: "123456", expired OTP | Error: OTP_EXPIRED | OTP expiry < now |
| Locked OTP | phone: "9876543210", otp: "123456", attempts = 3, lock active | Error: OTP_LOCKED | Lock not yet expired |
| Visitor Not Found | phone: "9999999999", otp: "123456", branchId: valid | Error: VISITOR_NOT_FOUND | No visitor record exists |
| Invalid Phone Format | phone: "+91-9876543210" | 400 Bad Request | Validation decorator rejects |
| Invalid OTP Format | otp: "ABCDEF" | 400 Bad Request | Validation decorator rejects |
| Invalid BranchId Format | branchId: "not-a-uuid" | 400 Bad Request | Validation decorator rejects |

### 8.2 Integration Test Scenarios

| Test Case | Precondition | Action | Expected Result |
|-----------|--------------|--------|-----------------|
| Full verification flow - New Visitor | None | send-otp → verify-phone | Creates new visitor with placeholder names, sets phoneVerified = true, returns visitorData |
| Full verification flow - Existing Visitor | Existing visitor record | send-otp → verify-phone | Updates existing visitor, returns full profile in visitorData, sets phoneVerified = true |
| Lockout after 3 failed attempts | OTP sent | verify-phone 3x with wrong OTP | Third attempt returns OTP_LOCKED (400) |
| Successful verify after lock expiry | OTP locked, lock expired | send-otp → verify-phone | Lock resets, verification succeeds (200) |
| TEST_MODE verification | TEST_MODE=true | verify-phone with "123456" | Verification succeeds (uses fixed OTP) |

### 8.3 Edge Cases

| Edge Case | Description | Expected Behavior |
|-----------|-------------|-------------------|
| Phone with non-numeric characters | phone: "+91-9876543210" | Validation error (400 Bad Request) |
| OTP with letters | otp: "ABCDEF" | Validation error (400 Bad Request) |
| Empty branchId | branchId: "" | Validation error (400 Bad Request) |
| Concurrent verify requests | Two requests with same phone, OTP | Both should succeed if OTP is valid (idempotent for same OTP) |
| Verify after successful verification | phone already verified | Should still return success (idempotent) |
| visitorData always included | Any successful verification | visitorData field ALWAYS present, never omitted |

### 8.4 Security Test Scenarios

| Test Case | Description | Expected Result |
|-----------|-------------|-----------------|
| Brute force OTP | Attempt 100 different OTPs | Locks after 3 attempts (rate limiting by visitor, not by IP) |
| Reuse expired OTP | Use OTP that was already used | Returns INVALID_OTP (OTP cleared after success) |
| Verify with different branchId | Correct OTP, wrong branchId | Returns VISITOR_NOT_FOUND (phone+branchId composite unique) |

---

## 9. Notes & Considerations

### 9.1 Implementation Notes

1. **Idempotency:** The endpoint is idempotent - calling verify-phone with a valid OTP multiple times after the first success will return the same result (though OTP will be null after first success).

2. **Visitor Creation Timing:** The visitor record is created during the `send-otp` endpoint (Task 2.1), not during verify-phone. This endpoint only verifies and updates the existing record.

3. **Placeholder Name Detection:** New visitors are identified by checking if `firstName === 'Guest' && lastName === 'Visitor'`. This convention must be consistent across the system.

4. **Response Data Exclusions:** Sensitive fields are excluded from the response:
   - `photo` (Base64 image data)
   - `governmentIdDocument`
   - `officeIdDocument`
   - `alternatePhone`
   - `alternateEmail`
   - `reportingManagerName`
   - `reportingManagerPhone`
   - `address`

5. **visitorData Always Included:** The `visitorData` field is ALWAYS included in the response, regardless of whether the visitor is new or existing. This is a correction from earlier drafts that suggested omitting it for new visitors.

### 9.2 Frontend Integration Points

The frontend should:
1. Display the OTP input component (Task 3.1: `OtpInput`)
2. Show a countdown timer for OTP expiry (optional, based on 5-minute window)
3. Handle error messages:
   - `INVALID_OTP`: Show "Invalid code. X attempts remaining."
   - `OTP_EXPIRED`: Show "Code expired. Resend code?"
   - `OTP_LOCKED`: Show "Too many attempts. Try again in 10 minutes."
4. On success, store `visitorData` and navigate to appropriate next step based on `isExistingVisitor`

### 9.3 Performance Considerations

- The endpoint performs 2 database operations:
  1. `PhoneVerificationService.verifyOtp()` - reads and updates visitor
  2. `visitorsService.findUnique()` - reads visitor
- These could be optimized into a single transaction if needed
- Consider caching branch validation if branchId lookups become expensive

### 9.4 Logging

The controller/service should log:
- Successful verifications: `INFO` level with visitorId, phone, branchId
- Failed attempts: `WARN` level with phone, branchId, error code
- Locked accounts: `WARN` level with phone, branchId, lock expiry time
- Unexpected errors: `ERROR` level with full error stack

### 9.5 Monitoring Metrics

Recommended metrics to track:
- `verify_phone_success_total` - Counter, successful verifications
- `verify_phone_failure_total` - Counter, failed verifications (by error code)
- `verify_phone_locked_total` - Counter, accounts locked out
- `verify_phone_duration_seconds` - Histogram, request processing time

---

## 10. Related Tasks

| File | Purpose |
|------|---------|
| `backend/src/visitors/public-controller/public-visitors.controller.ts` | Controller endpoint |
| `backend/src/visitors/dto/visitor.dto.ts` | DTO definitions |
| `backend/src/visitors/visitors.service.ts` | Service layer method |
| `backend/src/visitors/services/phone-verification.service.ts` | OTP verification logic |
| `backend/src/visitors/constants/visitor-error-codes.enum.ts` | Error codes (PhoneVerificationError) |

---

## 11. Related Tasks

- **Task 2.1:** Create `POST /public/visitors/send-otp` endpoint (Prerequisite)
- **Task 2.3:** Create `POST /public/visitors` endpoint (Successor - requires phoneVerified=true)
- **Task 4.1:** Create phone entry step (Frontend integration)
- **Task 4.2:** Create phone verification step (Frontend integration)

---

## 12. Acceptance Criteria

Task 2.2 is complete when:

1. ✅ `POST /public/visitors/verify-phone` endpoint exists and is public (no auth)
2. ✅ Accepts `{ phone, otp, branchId }` and validates all fields via regex patterns
3. ✅ Defines `PhoneVerificationError` enum with all error codes
4. ✅ Returns `VerifyPhoneResponse` interface with explicit types
5. ✅ Returns HTTP 200 OK on successful verification
6. ✅ Returns HTTP 400 Bad Request for invalid OTP, expired OTP, and locked OTP
7. ✅ Returns HTTP 404 Not Found for visitor not found
8. ✅ Always includes `visitorData` field in response (for both new and existing visitors)
9. ✅ Correctly identifies existing vs new visitors via placeholder name check
10. ✅ Sets `phoneVerified = true` on successful verification
11. ✅ Resets `phoneVerificationAttempts` to 0 on successful verification
12. ✅ Clears OTP fields (`phoneVerificationOtp`, `phoneVerificationExpiry`) on success
13. ✅ Locks visitor after 3 failed OTP attempts
14. ✅ Handles TEST_MODE with fixed OTP `"123456"`
15. ✅ All unit tests pass
16. ✅ All integration tests pass

---

**End of Specification**
