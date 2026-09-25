# POST /visitors/verify-checkin-otp - Technical Specification

> **Task ID:** 6.2
> **Feature:** Unified Visitor Workflow
> **Increment:** 6
> **Status:** Draft

## 1. File Path

- **Controller:** `backend/src/visitors/visitors.controller.ts`
- **Service:** `backend/src/visitors/services/gate-pass.service.ts` (extend)
- **DTO:** `backend/src/visitors/dto/visitor.dto.ts` (add)
- **Error Codes:** `backend/src/visitors/constants/visitor-error-codes.enum.ts` (extend)

## 2. Data Models

### 2.1 Request DTO: VerifyCheckInOtpDto

```typescript
import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, Matches, Length } from 'class-validator';

export class VerifyCheckInOtpDto {
  @ApiProperty({
    description: '6-digit Check-In OTP provided by visitor',
    example: '654321',
    minLength: 6,
    maxLength: 6,
  })
  @IsString()
  @IsNotEmpty()
  @Length(6, 6)
  @Matches(/^\d{6}$/, { message: 'OTP must be exactly 6 digits' })
  otp: string;

  @ApiProperty({
    description: 'Branch ID where the visit is taking place',
    example: 'branch-uuid-123',
  })
  @IsString()
  @IsNotEmpty()
  branchId: string;
}
```

### 2.2 Success Response: VerifyCheckInOtpResponse

```typescript
export interface VerifyCheckInOtpResponse {
  success: boolean;
  visitId: string;
  visitorId: string;
  visitor: {
    id: string;
    firstName: string;
    lastName: string;
    phone: string;
    email?: string | null;
    photo?: string | null;
    company?: string | null;
  };
  visit: {
    id: string;
    visitCategory: string;
    visitSubType?: string | null;
    status: string;
    checkInOtp: string;
    checkInOtpExpiry: Date;
    purpose?: string | null;
    department?: string | null;
    deliveryPlatform?: string | null;
    deliveryRecipient?: string | null;
    orderReference?: string | null;
    staffName?: string | null;
    staffPhone?: string | null;
  };
  canCheckIn: boolean;
}
```

### 2.3 Error Response: StandardErrorResponse

```typescript
export interface StandardErrorResponse {
  statusCode: number;
  error: string;
  message: string;
  code: string;
}
```

## 3. Function Signatures

### 3.1 Controller Method

```typescript
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.SECURITY, Role.SECURITY_SUPERVISOR)
@ApiBearerAuth('access-token')
@Post('verify-checkin-otp')
@ApiOperation({
  summary: 'Verify Check-In OTP for visitor at gate (Security only)',
})
@ApiResponse({ status: 200, description: 'OTP verified successfully' })
@ApiResponse({ status: 400, description: 'Invalid OTP or expired' })
@ApiResponse({ status: 401, description: 'Unauthorized' })
@ApiResponse({ status: 404, description: 'Visit not found' })
async verifyCheckInOtp(
  @Body() dto: VerifyCheckInOtpDto,
  @Req() req: RequestWithUser,
): Promise<VerifyCheckInOtpResponse>
```

### 3.2 Service Method (New in GatePassService)

```typescript
/**
 * Verifies the Check-In OTP for a visit.
 * Matches OTP against approved visits for the given branch.
 * Returns visit details if valid, throws error if invalid/expired.
 *
 * @param otp - 6-digit Check-In OTP
 * @param branchId - Branch ID where the verification is happening
 * @returns Visit and visitor details if OTP is valid
 *
 * @throws BadRequestException - With code 'INVALID_OTP' if OTP does not match
 * @throws BadRequestException - With code 'CHECKIN_OTP_EXPIRED' if OTP has expired
 * @throws BadRequestException - With code 'ALREADY_CHECKED_IN' if visit is already checked in
 * @throws NotFoundException - With code 'VISIT_NOT_FOUND' if no matching visit exists
 */
async verifyCheckInOtp(
  otp: string,
  branchId: string,
): Promise<VerifyCheckInOtpResponse>
```

## 4. Pseudo-Code / Logic

### 4.1 Controller Logic

```typescript
async verifyCheckInOtp(
  @Body() dto: VerifyCheckInOtpDto,
  @Req() req: RequestWithUser,
): Promise<VerifyCheckInOtpResponse> {
  // 1. Validate DTO (handled by class-validator decorators)

  // 2. Call GatePassService.verifyCheckInOtp
  // This method handles all business logic and error cases
  return this.gatePassService.verifyCheckInOtp(dto.otp, dto.branchId);
}
```

### 4.2 Service Logic

```typescript
async verifyCheckInOtp(
  otp: string,
  branchId: string,
): Promise<VerifyCheckInOtpResponse> {
  const now = new Date();

  // 1. Find visit by OTP and branchId
  const visit = await this.prisma.visit.findFirst({
    where: {
      checkInOtp: otp,
      branchId: branchId,
      checkInOtpExpiry: { gte: now },
      status: { in: ['APPROVED', 'CHECKED_IN'] },
    },
    include: {
      visitor: true,
    },
  });

  // 2. Handle visit not found
  if (!visit) {
    // Check if OTP exists but is expired
    const expiredVisit = await this.prisma.visit.findFirst({
      where: {
        checkInOtp: otp,
        branchId: branchId,
        checkInOtpExpiry: { lt: now },
      },
    });

    if (expiredVisit) {
      throw new BadRequestException(CheckInOtpError.CHECKIN_OTP_EXPIRED);
    }

    // Check if OTP exists but visit is in wrong state
    const wrongStateVisit = await this.prisma.visit.findFirst({
      where: {
        checkInOtp: otp,
        branchId: branchId,
      },
    });

    if (wrongStateVisit && wrongStateVisit.status === 'CHECKED_IN') {
      throw new BadRequestException(CheckInOtpError.ALREADY_CHECKED_IN);
    }

    throw new NotFoundException(CheckInOtpError.VISIT_NOT_FOUND);
  }

  // 3. Handle already checked in
  if (visit.status === 'CHECKED_IN') {
    throw new BadRequestException(CheckInOtpError.ALREADY_CHECKED_IN);
  }

  // 4. Return visit details
  return {
    success: true,
    visitId: visit.id,
    visitorId: visit.visitor.id,
    visitor: {
      id: visit.visitor.id,
      firstName: visit.visitor.firstName,
      lastName: visit.visitor.lastName,
      phone: visit.visitor.phone,
      email: visit.visitor.email,
      photo: visit.visitor.photo,
      company: visit.visitor.company,
    },
    visit: {
      id: visit.id,
      visitCategory: visit.visitCategory,
      visitSubType: visit.visitSubType,
      status: visit.status,
      checkInOtp: visit.checkInOtp,
      checkInOtpExpiry: visit.checkInOtpExpiry,
      purpose: visit.purpose,
      department: visit.department,
      deliveryPlatform: visit.deliveryPlatform,
      deliveryRecipient: visit.deliveryRecipient,
      orderReference: visit.orderReference,
      staffName: visit.staffName,
      staffPhone: visit.staffPhone,
    },
    canCheckIn: visit.status === 'APPROVED',
  };
}
```

## 5. Test Cases

### 5.1 Happy Path

| Test Case | Description | Expected Result |
|-----------|-------------|-----------------|
| Valid OTP - Approved Visit | Submit valid OTP for approved visit | Returns visit details, `canCheckIn: true` |
| Valid OTP - TEST_MODE | Submit "654321" when TEST_MODE=true | Returns visit details |
| Valid OTP - Matching Branch | OTP matches visit for the correct branch | Returns visit details |

### 5.2 Error Cases

| Test Case | Description | Expected Result |
|-----------|-------------|-----------------|
| Invalid OTP - Wrong Code | Submit wrong 6-digit OTP | 400, `code: 'INVALID_OTP'` |
| Expired OTP | Submit expired OTP | 400, `code: 'CHECKIN_OTP_EXPIRED'` |
| Already Checked In | Submit OTP for visit that is CHECKED_IN | 400, `code: 'ALREADY_CHECKED_IN'` |
| Visit Not Found | OTP doesn't match any visit | 404, `code: 'VISIT_NOT_FOUND'` |
| Wrong Branch | OTP matches visit but for different branch | 404, `code: 'VISIT_NOT_FOUND'` |

### 5.3 Validation Cases

| Test Case | Description | Expected Result |
|-----------|-------------|-----------------|
| OTP Not 6 Digits - Short | Submit "12345" | 400, validation error |
| OTP Not 6 Digits - Long | Submit "1234567" | 400, validation error |
| OTP Contains Letters | Submit "ABC123" | 400, validation error |
| Empty OTP | Submit "" | 400, validation error |
| Empty branchId | Submit branchId: "" | 400, validation error |

### 5.4 Security Cases

| Test Case | Description | Expected Result |
|-----------|-------------|-----------------|
| No Auth Token | Request without JWT | 401 Unauthorized |
| Invalid Auth Token | Request with invalid JWT | 401 Unauthorized |
| Non-Security Role | Request from STAFF role | 403 Forbidden |

## 6. Error Codes

### 6.1 New Error Codes (extend existing enum)

```typescript
export enum CheckInOtpError {
  INVALID_OTP = 'INVALID_OTP',
  CHECKIN_OTP_EXPIRED = 'CHECKIN_OTP_EXPIRED',
  ALREADY_CHECKED_IN = 'ALREADY_CHECKED_IN',
  VISIT_NOT_FOUND = 'VISIT_NOT_FOUND',
}
```

### 6.2 HTTP Status Codes

| Status | Error Code | Description |
|--------|------------|-------------|
| 200 | - | Success - OTP verified |
| 400 | INVALID_OTP | OTP does not match any visit |
| 400 | CHECKIN_OTP_EXPIRED | OTP has expired (beyond 8-hour validity) |
| 400 | ALREADY_CHECKED_IN | Visit is already checked in |
| 404 | VISIT_NOT_FOUND | No visit found with matching OTP |
| 401 | - | Unauthorized (missing/invalid JWT) |
| 403 | - | Forbidden (user not SECURITY/SECURITY_SUPERVISOR) |

## 7. TEST_MODE Behavior

When `TEST_MODE=true`:

1. **Fixed OTP Value:** Check-In OTP is always `"654321"` (set by GatePassService during generation)
2. **Validation Still Applies:** OTP must still be exactly 6 digits
3. **Expiry Still Enforced:** OTP expiry (8 hours) is still validated

**Test Flow:**
1. Approve a visit → Check-In OTP = `"654321"` generated
2. Call `POST /visitors/verify-checkin-otp` with `{ otp: "654321", branchId: "..." }`
3. Should return visit details successfully

## 8. Security Considerations

### 8.1 Authentication
- **Required:** JWT token in `Authorization` header
- **Valid Roles:** `SECURITY`, `SECURITY_SUPERVISOR`
- **Guard:** `JwtAuthGuard` + `RolesGuard`

### 8.2 Rate Limiting (Recommended)
- **Threshold:** 10 requests per minute per IP
- **Action:** Return `429 Too Many Requests` with `Retry-After` header
- **Implementation:** Use existing rate limiting patterns from Increment 2

### 8.3 Data Privacy
- **Visitor Photo:** Returned as Base64 string (already stored in DB)
- **Phone Number:** Only last 4 digits could be masked for audit logs
- **Sensitive Data:** Government IDs are not included in response

### 8.4 Audit Logging (Recommended)
- Log each verification attempt with:
  - Timestamp
  - Security user ID
  - Branch ID
  - Result (success/failure)
  - Failure reason (if applicable)

## 9. Dependencies

| Service/Module | Purpose |
|--------------|---------|
| `GatePassService` | Core OTP verification logic |
| `JwtAuthGuard` | JWT token validation |
| `RolesGuard` | Role-based access control |
| `Prisma` | Database access |
| `ConfigService` | TEST_MODE flag access |

## 10. Edge Cases

| Edge Case | Handling |
|-----------|----------|
| Multiple visits with same OTP | Should not happen (OTP is unique), first match wins |
| OTP matches but status is REJECTED | Return VISIT_NOT_FOUND (treat as not found) |
| OTP matches but status is COMPLETED | Return ALREADY_CHECKED_IN (or new code if needed) |
| OTP matches but status is CANCELLED | Return VISIT_NOT_FOUND |
| Check-in Otp is null | Return VISIT_NOT_FOUND |
| Check-in Otp Expiry is null | Return VISIT_NOT_FOUND |
| Visitor has no photo | Return null for photo field |
| Visit has no staff info | Return null for staff fields |

## 11. Integration Notes

### 11.1 Preceding Task
- **Task 1.5:** `GatePassService.generateCheckInOtp` - Must be implemented first
- OTP is generated on visit approval with 8-hour expiry

### 11.2 Following Task
- **Task 6.3:** Check-In tab UI - Will call this endpoint
- **Task 6.5:** One-click check-in action - Uses returned `visitId` to call `POST /visitors/checkin/:visitId`

### 11.3 Related Endpoints
- `POST /visitors/checkin/:visitId` - Performs the actual check-in after OTP verification
- `POST /visitors/verify-code` - Legacy endpoint for visitCode (different OTP type)








