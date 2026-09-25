# Technical Specification: POST /public/visitors/send-otp

> **Task ID:** 2.1
> **Increment:** 2 - Public API Layer
> **Status:** Approved
> **Created:** 2026-01-23

---

## 1. Overview

This specification defines the `POST /public/visitors/send-otp` endpoint, which initiates phone verification by sending a one-time password (OTP) via SMS. This is a public (no-auth) endpoint used as the first step in the unified visitor registration workflow.

The endpoint validates the phone number and branch, generates or updates a Visitor record, creates a 6-digit OTP with 5-minute expiry, and sends it via AWS SNS. It supports both existing and new visitors - the OTP is sent regardless of whether the visitor is already registered.

### Key Features
- **Public Access:** No authentication required (uses `@Public()` decorator)
- **Phone Verification:** Validates visitor phone ownership via SMS OTP
- **Existing/New Visitor Handling:** Sends OTP for both existing and new visitors
- **TEST_MODE Support:** Fixed OTP `"123456"` and mocked SMS when `TEST_MODE=true`
- **Rate Limiting:** 3 requests per IP per hour (implemented in Task 2.5)

### Dependencies
- Task 1.3: PhoneVerificationService with OTP generation
- Task 1.1: Prisma schema with phone verification fields
- SmsService: AWS SNS integration for SMS delivery

---

## 2. File Path

**Controller:**
```
backend/src/visitors/public-controller/public-visitors.controller.ts
```

**DTO:**
```
backend/src/visitors/dto/visitor.dto.ts
```

**Service (Existing):**
```
backend/src/visitors/services/phone-verification.service.ts
```

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

```typescript
import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, Matches } from 'class-validator';

/**
 * DTO for sending OTP to visitor phone number
 */
export class SendOtpDto {
  @ApiProperty({
    description: "Visitor's 10-digit phone number",
    example: '9999999999',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{10}$/, {
    message: 'Phone number must be exactly 10 digits',
  })
  phone: string;

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

### 3.3 Response DTO

```typescript
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Response for send-otp endpoint
 */
export class SendOtpResponseDto {
  @ApiProperty({
    description: 'Success flag',
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: 'User-friendly message',
    example: 'A 6-digit code has been sent to your mobile via SMS.',
  })
  message: string;

  @ApiProperty({
    description: 'Indicates if this is a new visitor (first time at this branch)',
    example: false,
  })
  isNewVisitor: boolean;

  @ApiPropertyOptional({
    description: 'Test OTP value (only included when TEST_MODE=true)',
    example: '123456',
  })
  testOtp?: string;
}
```

### 3.4 Internal Response Interface (Service Layer)

```typescript
/**
 * Internal response from PhoneVerificationService.generateOtp()
 * This is NOT exposed to the API client but is used internally
 */
export interface GenerateOtpResponse {
  success: boolean;
  message: string;
  isNewVisitor: boolean;
  testOtp?: string; // Only present when TEST_MODE=true
}
```

### 3.5 Error Response Interface

```typescript
/**
 * Standard error response structure
 */
export interface ErrorResponse {
  statusCode: number;
  message: string | string[];
  error: string; // Error code from PhoneVerificationError enum or HTTP status text
}
```

---

## 4. Endpoint Definition

```typescript
@Public()
@Post('send-otp')
@ApiOperation({
  summary: 'Send OTP to visitor phone for verification',
  description:
    'Initiates phone verification by sending a 6-digit OTP via SMS. Works for both existing and new visitors.',
})
@ApiResponse({ status: 201, type: SendOtpResponseDto, description: 'OTP sent successfully' })
@ApiResponse({ status: 400, description: 'Bad request - validation failed, OTP locked, or SMS send failed' })
@ApiResponse({ status: 429, description: 'Too many requests - rate limit exceeded' })
async sendOtp(@Body() dto: SendOtpDto): Promise<SendOtpResponseDto>
```

**HTTP Method:** `POST`
**Route:** `/public/visitors/send-otp`
**Authentication:** Not required (Public endpoint)
**Content-Type:** `application/json`

### 4.1 HTTP Status Codes

| Status Code | Scenario | Response Body |
|-------------|----------|---------------|
| `201 Created` | OTP sent successfully | `SendOtpResponseDto` |
| `400 Bad Request` | Invalid phone format, missing branchId, OTP locked, or SMS send failed | `ErrorResponse` with error code |
| `429 Too Many Requests` | Rate limit exceeded (3 requests per IP per hour) | `ErrorResponse` with `Retry-After` header |

---

## 5. Behavior & Logic

### 5.1 Controller Logic

```typescript
async sendOtp(@Body() dto: SendOtpDto): Promise<SendOtpResponseDto> {
  // 1. Validate DTO (handled by class-validator)
  // - Phone: 10 digits, regex: /^\d{10}$/
  // - BranchId: UUID v4 format

  // 2. Branch existence validation (optional - can be validated in service layer)
  // Note: Currently, branch validation is handled implicitly when creating/finding visitor.
  // If branch does not exist, Prisma will throw a foreign key constraint error.
  // Future enhancement: Explicit branch check before OTP generation.

  // 3. Call PhoneVerificationService.generateOtp(phone, branchId)
  const result: GenerateOtpResponse = await this.phoneVerificationService.generateOtp(
    dto.phone,
    dto.branchId,
  );

  // 4. Return success response
  return {
    success: true,
    message: 'A 6-digit code has been sent to your mobile via SMS.',
    isNewVisitor: result.isNewVisitor,
    ...(result.testOtp && { testOtp: result.testOtp }), // Include only if TEST_MODE
  };
}
```

### 5.2 PhoneVerificationService Logic (Reference - Existing Service)

The `generateOtp()` method already implements the core logic:

```typescript
async generateOtp(
  phone: string,
  branchId: string,
): Promise<GenerateOtpResponse> {
  // 1. Input validation
  if (!phone || !branchId) {
    throw new BadRequestException('Phone and branchId are required');
  }

  // 2. Find or Create Visitor
  let visitor = await this.prisma.visitor.findFirst({
    where: { phone, branchId },
  });

  let isNewVisitor = false;

  if (!visitor) {
    // Create new visitor with placeholder names
    visitor = await this.prisma.visitor.create({
      data: {
        phone,
        branchId,
        firstName: 'Guest',
        lastName: 'Visitor',
      },
    });
    isNewVisitor = true;
  }

  // 3. Check Lock Status (if visitor has >3 failed attempts within expiry)
  const now = new Date();
  if (
    visitor.phoneVerificationAttempts >= 3 &&
    visitor.phoneVerificationExpiry &&
    visitor.phoneVerificationExpiry > now
  ) {
    throw new BadRequestException({
      statusCode: 400,
      message: 'Too many failed attempts. Please try again in 10 minutes.',
      error: PhoneVerificationError.OTP_LOCKED,
    });
  }

  // 4. Generate OTP (6 digits)
  const otp = generateOtp(6, '123456'); // Fixed '123456' in TEST_MODE

  // 5. Set Expiry (5 minutes from now)
  const expiry = new Date(now.getTime() + 5 * 60 * 1000);

  // 6. Update Database
  await this.prisma.visitor.update({
    where: { id: visitor.id },
    data: {
      phoneVerificationOtp: otp,
      phoneVerificationExpiry: expiry,
      phoneVerificationAttempts: 0, // Reset attempts on new OTP
    },
  });

  // 7. Send SMS via SmsService
  try {
    await this.smsService.sendOtp(phone, otp);
  } catch (error) {
    // Log error but don't reveal internal details to client
    this.logger.error(`Failed to send OTP to ${phone}: ${error.message}`);
    throw new BadRequestException({
      statusCode: 400,
      message: 'Failed to send OTP. Please try again.',
      error: PhoneVerificationError.SMS_SEND_FAILED,
    });
  }

  // 8. Return response
  const response: GenerateOtpResponse = {
    success: true,
    message: 'OTP sent',
    isNewVisitor,
  };

  // Include test OTP if in TEST_MODE
  if (this.configService.get<string>('TEST_MODE') === 'true') {
    response.testOtp = otp;
  }

  return response;
}
```

### 5.3 SmsService Logic (Reference - Existing Service)

```typescript
async sendOtp(phone: string, otp: string): Promise<void> {
  // Check if test mode is enabled
  if (this.appConfig.isTestModeEnabled()) {
    const message = `Login in HVTS: Your One-Time Password is ${otp}. It is valid for 3 minutes. Do not share it.`;
    this.logger.log(
      `[TEST_MODE] SMS Delivery Mocked. To: ${phone}, Message: ${message}`,
    );
    return;
  }

  // Standard SMS delivery via AWS SNS
  const message = `Login in HVTS: Your One-Time Password is ${otp}. It is valid for 3 minutes. Do not share it.`;
  const sns = this.getSnsClient();

  try {
    await sns.send(
      new PublishCommand({
        Message: message,
        PhoneNumber: phone.startsWith('+') ? phone : `+91${phone}`,
      }),
    );
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : String(error);
    this.logger.error(`Failed to send OTP to ${phone}: ${errorMessage}`);
    throw error; // Re-throw for PhoneVerificationService to handle
  }
}
```

**Note on Discrepancy:** The SMS message says "3 minutes" but the OTP is valid for 5 minutes in the database. This is a known issue in the existing SmsService. Either:
- Update the SMS message to say "5 minutes" (recommended), OR
- Reduce the OTP expiry to 3 minutes (not recommended, less user-friendly)

---

## 6. Error Handling

### 6.1 Error Codes

| Error Code | HTTP Status | Message | Scenario |
|:-----------|:------------|:---------|:----------|
| `BAD_REQUEST` | 400 | Phone number must be exactly 10 digits | Phone validation failed |
| `BAD_REQUEST` | 400 | Branch ID must be a valid UUID v4 | Branch ID validation failed |
| `OTP_LOCKED` | 400 | Too many failed attempts. Please try again in 10 minutes. | Visitor has 3+ failed attempts and lock is active |
| `SMS_SEND_FAILED` | 400 | Failed to send OTP. Please try again. | AWS SNS error or SMS delivery failure |
| `TOO_MANY_REQUESTS` | 429 | Too many requests. Please try again in X minutes. | Rate limit exceeded (Task 2.5) |

### 6.2 Error Response Format

```typescript
// Standard error response shape
interface ErrorResponse {
  statusCode: number;
  message: string | string[];
  error: string; // Error code from PhoneVerificationError or HTTP status text
}
```

### 6.3 Error Response Examples

```typescript
// 400 Bad Request - Invalid Phone
{
  "statusCode": 400,
  "message": ["Phone number must be exactly 10 digits"],
  "error": "Bad Request"
}

// 400 Bad Request - Invalid UUID
{
  "statusCode": 400,
  "message": ["Branch ID must be a valid UUID v4"],
  "error": "Bad Request"
}

// 400 OTP Locked
{
  "statusCode": 400,
  "message": "Too many failed attempts. Please try again in 10 minutes.",
  "error": "OTP_LOCKED"
}

// 400 SMS Send Failed
{
  "statusCode": 400,
  "message": "Failed to send OTP. Please try again.",
  "error": "SMS_SEND_FAILED"
}

// 429 Rate Limited (from Task 2.5)
{
  "statusCode": 429,
  "message": "Too many requests. Please try again in 30 minutes.",
  "error": "Too Many Requests"
}
```

---

## 7. Test Mode Support

### 7.1 Environment Variable

```bash
# .env file
TEST_MODE=true
```

### 7.2 TEST_MODE Behavior

When `TEST_MODE=true`:

| Component | Production Mode | TEST_MODE |
|:-----------|:---------------|:----------|
| OTP Generation | Random 6-digit | Fixed `"123456"` |
| SMS Delivery | AWS SNS API | Mocked (logged only) |
| OTP Expiry | 5 minutes | Still enforced |
| Response Fields | `{ success, message, isNewVisitor }` | `{ success, message, isNewVisitor, testOtp }` |

### 7.3 TEST_MODE Response Example

```json
{
  "success": true,
  "message": "A 6-digit code has been sent to your mobile via SMS.",
  "isNewVisitor": false,
  "testOtp": "123456"
}
```

**Important:** `testOtp` field is **only** included when `TEST_MODE=true`. In production, this field is omitted. Frontend should handle optional `testOtp` field gracefully.

---

## 8. Rate Limiting Constraint

> **Implementation:** Task 2.5 (separate task)

Rate limiting is enforced at the middleware/guard level:

- **Limit:** 3 requests per IP address per hour
- **HTTP Status:** 429 Too Many Requests
- **Headers:** `Retry-After` (seconds until next allowed request)
- **Storage:** In-memory (Map) for MVP; Redis for production scaling

### 8.1 Rate Limit Response Example

```http
HTTP/1.1 429 Too Many Requests
Retry-After: 1800
Content-Type: application/json

{
  "statusCode": 429,
  "message": "Too many requests. Please try again in 30 minutes.",
  "error": "Too Many Requests"
}
```

---

## 9. Test Cases

### 9.1 Unit Tests

**File:** `backend/src/visitors/public-controller/public-visitors.controller.spec.ts`

| Test Case | Input | Expected Output | Description |
|:----------|:-------|:----------------|:------------|
| **TC-1: Valid request (new visitor)** | `{ phone: "9876543210", branchId: "valid-uuid" }` | `success: true, isNewVisitor: true, message: "...", testOtp? (if TEST_MODE)` | Creates new visitor with placeholder names, sends OTP |
| **TC-2: Valid request (existing visitor)** | `{ phone: "9876543210", branchId: "valid-uuid" }` (phone exists) | `success: true, isNewVisitor: false` | Updates existing visitor, sends new OTP |
| **TC-3: Invalid phone format** | `{ phone: "123", branchId: "valid-uuid" }` | 400 Bad Request | Validation decorator rejects |
| **TC-4: Invalid phone format (non-numeric)** | `{ phone: "abcdefghij", branchId: "valid-uuid" }` | 400 Bad Request | Validation decorator rejects |
| **TC-5: Missing branchId** | `{ phone: "9876543210" }` | 400 Bad Request | Validation decorator rejects |
| **TC-6: Invalid branchId (non-UUID)** | `{ phone: "9876543210", branchId: "not-a-uuid" }` | 400 Bad Request | Validation decorator rejects |
| **TC-7: OTP locked visitor** | `{ phone: "9876543210", branchId: "valid-uuid" }` (visitor has 3 failed attempts, lock active) | 400 with `error: "OTP_LOCKED"` | Service rejects request |
| **TC-8: SMS send failure** | Mock SmsService to throw | 400 with `error: "SMS_SEND_FAILED"` | Handles AWS SNS failure gracefully |
| **TC-9: TEST_MODE enabled** | Set `TEST_MODE=true` | Response includes `testOtp: "123456"` | Returns fixed OTP for testing |
| **TC-10: TEST_MODE disabled** | Set `TEST_MODE=false` or unset | No `testOtp` field in response | Production behavior |

### 9.2 Integration Tests

**File:** `backend/src/visitors/public-controller/public-visitors.controller.e2e-spec.ts`

| Test Case | Steps | Expected Output |
|:----------|:-------|:----------------|
| **IT-1: Full new visitor flow** | 1. POST `/public/visitors/send-otp` with new phone <br> 2. Verify Visitor created in DB with placeholder names <br> 3. Verify OTP and expiry set correctly <br> 4. Verify SMS sent (check logs or mock) | Visitor record created, OTP stored, SMS sent |
| **IT-2: Existing visitor flow** | 1. Create visitor in DB <br> 2. POST `/public/visitors/send-otp` with same phone/branch <br> 3. Verify OTP updated (not new visitor created) | Same visitor record updated, OTP regenerated |
| **IT-3: OTP lockout flow** | 1. Create visitor with 3 failed attempts and active lock <br> 2. POST `/public/visitors/send-otp` <br> 3. Verify rejection | 400 error with `error: "OTP_LOCKED"` |
| **IT-4: Branch validation** | 1. POST with invalid branchId <br> 2. Verify branch lookup fails | 400 error (foreign key constraint) |
| **IT-5: Rate limiting** (Task 2.5) | 1. Make 4 rapid requests from same IP <br> 2. Verify first 3 succeed, 4th fails with 429 | Rate limit enforced |

### 9.3 E2E Tests (with TEST_MODE)

**File:** `backend/src/visitors/public-controller/public-visitors.controller.e2e-spec.ts`

```typescript
describe('POST /public/visitors/send-otp (E2E)', () => {
  it('should send OTP to new visitor in TEST_MODE', async () => {
    // Given
    process.env.TEST_MODE = 'true';
    const dto = {
      phone: '9999999999',
      branchId: '550e8400-e29b-41d4-a716-446655440000',
    };

    // When
    const response = await request(app.getHttpServer())
      .post('/public/visitors/send-otp')
      .send(dto)
      .expect(201);

    // Then
    expect(response.body).toMatchObject({
      success: true,
      message: expect.any(String),
      isNewVisitor: true,
      testOtp: '123456', // Only in TEST_MODE
    });

    // Verify DB
    const visitor = await prisma.visitor.findFirst({
      where: { phone: dto.phone, branchId: dto.branchId },
    });
    expect(visitor).toBeDefined();
    expect(visitor?.firstName).toBe('Guest');
    expect(visitor?.lastName).toBe('Visitor');
    expect(visitor?.phoneVerificationOtp).toBe('123456');
  });

  it('should handle existing visitor correctly', async () => {
    // Given
    const existingVisitor = await createTestVisitor({
      phone: '8888888888',
      firstName: 'John',
      lastName: 'Doe',
    });

    // When
    const response = await request(app.getHttpServer())
      .post('/public/visitors/send-otp')
      .send({
        phone: '8888888888',
        branchId: existingVisitor.branchId,
      })
      .expect(201);

    // Then
    expect(response.body.isNewVisitor).toBe(false);

    // Verify OTP was updated (no new visitor created)
    const visitors = await prisma.visitor.findMany({
      where: { phone: '8888888888' },
    });
    expect(visitors).toHaveLength(1);
  });
});
```

---

## 10. API Examples

### 10.1 Success Response (Production)

**Request:**
```http
POST /public/visitors/send-otp
Content-Type: application/json

{
  "phone": "9876543210",
  "branchId": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Response:**
```http
HTTP/1.1 201 Created
Content-Type: application/json

{
  "success": true,
  "message": "A 6-digit code has been sent to your mobile via SMS.",
  "isNewVisitor": false
}
```

### 10.2 Success Response (TEST_MODE)

**Request:**
```http
POST /public/visitors/send-otp
Content-Type: application/json

{
  "phone": "9876543210",
  "branchId": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Response:**
```http
HTTP/1.1 201 Created
Content-Type: application/json

{
  "success": true,
  "message": "A 6-digit code has been sent to your mobile via SMS.",
  "isNewVisitor": true,
  "testOtp": "123456"
}
```

### 10.3 Error Response - Invalid Phone

**Request:**
```http
POST /public/visitors/send-otp
Content-Type: application/json

{
  "phone": "123",
  "branchId": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Response:**
```http
HTTP/1.1 400 Bad Request
Content-Type: application/json

{
  "statusCode": 400,
  "message": ["Phone number must be exactly 10 digits"],
  "error": "Bad Request"
}
```

### 10.4 Error Response - Invalid Branch ID

**Request:**
```http
POST /public/visitors/send-otp
Content-Type: application/json

{
  "phone": "9876543210",
  "branchId": "not-a-uuid"
}
```

**Response:**
```http
HTTP/1.1 400 Bad Request
Content-Type: application/json

{
  "statusCode": 400,
  "message": ["Branch ID must be a valid UUID v4"],
  "error": "Bad Request"
}
```

### 10.5 Error Response - OTP Locked

**Request:**
```http
POST /public/visitors/send-otp
Content-Type: application/json

{
  "phone": "9876543210",
  "branchId": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Response:**
```http
HTTP/1.1 400 Bad Request
Content-Type: application/json

{
  "statusCode": 400,
  "message": "Too many failed attempts. Please try again in 10 minutes.",
  "error": "OTP_LOCKED"
}
```

### 10.6 Error Response - SMS Send Failed

**Request:**
```http
POST /public/visitors/send-otp
Content-Type: application/json

{
  "phone": "9876543210",
  "branchId": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Response:**
```http
HTTP/1.1 400 Bad Request
Content-Type: application/json

{
  "statusCode": 400,
  "message": "Failed to send OTP. Please try again.",
  "error": "SMS_SEND_FAILED"
}
```

---

## 11. Notes & Considerations

### 11.1 Phone Format

- **Validation:** Phone must be exactly 10 digits (India format assumed)
- **Regex:** `/^\d{10}$/`
- **Storage:** Stored as-is in database (no country code prefix)
- **SMS Delivery:** SmsService adds `+91` prefix if missing

### 11.2 Branch ID Validation

- **Format:** Must be valid UUID v4
- **Regex:** `/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i`
- **Validation:** Currently validated by class-validator decorator
- **Note:** Explicit branch existence check is not performed at the controller level. If branch does not exist, Prisma will throw a foreign key constraint error. Future enhancement could include explicit branch validation before OTP generation.

### 11.3 Visitor State

- **New Visitors:** Created with placeholder names (`firstName: 'Guest'`, `lastName: 'Visitor'`)
- **Existing Visitors:** OTP is regenerated (attempts reset to 0)
- **Phone Verified:** Always `false` until `POST /public/visitors/verify-phone` is called

### 11.4 SMS Content

```
Login in HVTS: Your One-Time Password is {OTP}. It is valid for 3 minutes. Do not share it.
```

**Known Issue:** The message says "3 minutes" but OTP is valid for 5 minutes in the database. This discrepancy exists in the existing SmsService and should be addressed in a future update by either:
1. Updating the SMS message to say "5 minutes" (recommended), OR
2. Reducing the OTP expiry to 3 minutes (not recommended, less user-friendly)

### 11.5 Security Considerations

1. **Public Endpoint:** No authentication required - rate limiting is critical (Task 2.5)
2. **OTP Exposure:** OTP is only logged in TEST_MODE, never in production
3. **Visitor Enumeration:** `isNewVisitor` flag reveals if phone is registered - this is intentional for UX (prefill vs new registration)
4. **Lockout Period:** 10-minute lockout after 3 failed attempts prevents brute force attacks
5. **OTP Reset:** New OTP resets attempt counter to 0

### 11.6 Future Enhancements (Out of Scope)

- **Phone Format Internationalization:** Support international phone formats
- **OTP Length Configuration:** Make OTP length configurable via environment
- **SMS Template Localization:** Support multiple languages for SMS messages
- **Alternative Verification:** WhatsApp OTP as backup (already implemented for Gate Pass delivery)
- **Explicit Branch Validation:** Validate branch existence before OTP generation

### 11.7 Testing Recommendations

- Always test with `TEST_MODE=true` for E2E tests to avoid SMS costs
- Mock AWS SNS in unit tests to avoid external dependencies
- Verify OTP expiry by checking database timestamp
- Test concurrent requests to ensure no race conditions

---

## 12. Related Tasks

- **Task 1.3:** PhoneVerificationService with OTP generation (Dependency)
- **Task 1.1:** Prisma schema for phone verification fields (Dependency)
- **Task 2.2:** Create `POST /public/visitors/verify-phone` endpoint (Next step)
- **Task 2.5:** Implement rate limiting for public OTP endpoints (Security)
- **Task 4.1:** Create phone entry step (Frontend integration)
- **Task 4.2:** Create phone verification step (Frontend integration)

---

## 13. Acceptance Criteria

Task 2.1 is complete when:

1. ✅ `POST /public/visitors/send-otp` endpoint exists and is public (no auth)
2. ✅ Accepts `{ phone, branchId }` and validates phone format (10 digits) via regex `/^\d{10}$/`
3. ✅ Validates branchId format (UUID v4) via regex `/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i`
4. ✅ Creates new visitor with placeholder names if phone doesn't exist for branch
5. ✅ Updates existing visitor with new OTP if phone exists for branch
6. ✅ Generates 6-digit OTP with 5-minute expiry
7. ✅ Sends OTP via SmsService
8. ✅ Returns `{ success, message, isNewVisitor, testOtp? }` response
9. ✅ Handles locked visitors (3+ failed attempts) with `error: "OTP_LOCKED"`
10. ✅ Handles SMS send failure with `error: "SMS_SEND_FAILED"`
11. ✅ Returns `testOtp: "123456"` when `TEST_MODE=true`
12. ✅ Omits `testOtp` field when `TEST_MODE=false` or unset
13. ✅ Defines `PhoneVerificationError` enum with all error codes
14. ✅ Defines `GenerateOtpResponse` interface for service layer
15. ✅ Returns HTTP 201 Created on success
16. ✅ All unit tests pass
17. ✅ All integration tests pass
18. ✅ E2E test with TEST_MODE passes

---

**End of Specification**
