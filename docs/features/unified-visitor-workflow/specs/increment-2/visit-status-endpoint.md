# Technical Specification: GET /public/visits/:visitId/status

> **Feature**: Unified Visitor Workflow
> **Increment**: 2 - Public API Layer
> **Task**: 2.4 - Create `GET /public/visits/:visitId/status` endpoint
> **Status**: Approved

---

## 1. Overview

This endpoint provides a public, no-authentication method for visitors to check the status of their visit request. Visitors access this endpoint using their visit UUID (high-entropy identifier) from a link or URL. The endpoint returns:

- Current visit status (`REQUEST_SENT`, `APPROVED`, `REJECTED`, `CHECKED_IN`, `CHECKED_OUT`)
- Visitor details (name, photo, etc.) excluding sensitive information
- Gate Pass data when visit is approved (Check-In OTP, validity timestamp)
- Relevant timestamps (createdAt, approvedAt, checkInTime, checkOutTime)

This endpoint is designed for polling (every 30 seconds) by the frontend to provide real-time status updates to visitors.

---

## 2. Endpoint Definition

### 2.1 HTTP Method & Path

```
GET /public/visits/:visitId/status
```

### 2.2 Authentication

**None required.** This is a public endpoint.

**Security Consideration**: Relies on the cryptographic entropy of UUID v4 as the access token. Visit IDs are not enumerable, and a 24-hour expiry window (future Task 9.6) will limit the attack surface.

### 2.3 Request Parameters

| Parameter | Type   | Location | Description                     | Validation                |
|-----------|--------|----------|---------------------------------|---------------------------|
| `visitId` | UUID   | Path     | The unique identifier of visit  | Must be valid UUID v4 format |

### 2.4 Request Headers

| Header          | Value                     | Description                          |
|-----------------|---------------------------|--------------------------------------|
| `Content-Type`  | `application/json`        | Accept header (optional)             |
| `User-Agent`    | Browser/App identifier    | Optional for rate limiting/analytics |

### 2.5 HTTP Status Codes

| Status | Scenario                              |
|--------|---------------------------------------|
| `200`  | Success - Visit found and data returned |
| `400`  | Invalid UUID format                   |
| `404`  | Visit not found                       |
| `410`  | Status link expired (future - Task 9.6) |

---

## 3. Data Models

### 3.1 Visit Status Enum

```typescript
/**
 * Visit status enum - must match Prisma enum values
 */
export enum VisitStatus {
  REQUEST_SENT = 'REQUEST_SENT',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  CHECKED_IN = 'CHECKED_IN',
  CHECKED_OUT = 'CHECKED_OUT',
}
```

### 3.2 Request Schema

No request body required. Path parameter only.

**Path Parameter (TypeScript Interface):**
```typescript
interface GetVisitStatusParams {
  visitId: string; // UUID v4 format
}
```

**Path Parameter Validation:**
- Regex: `/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i`
- Example: `550e8400-e29b-41d4-a716-446655440000`

### 3.3 Response Schema (Success - 200)

#### Status: `REQUEST_SENT` (Pending)

```typescript
interface VisitStatusResponse_Pending {
  success: true;
  data: {
    visitId: string;
    status: VisitStatus.REQUEST_SENT;

    // Visitor Information (Public-safe)
    visitor: {
      id: string;
      firstName: string;
      lastName: string;
      fullName: string; // Computed: firstName + " " + lastName
      phone: string; // Masked? e.g., "+91 999** 9999" for privacy
      photoUrl?: string; // GCP public URL or null
    };

    // Visit Classification
    visitCategory: 'MEETING' | 'DELIVERY' | null;

    // Timing Information
    submittedAt: string; // ISO 8601 datetime

    // Conditional: Meeting-Specific Details
    meetingDetails?: {
      purpose?: string;
      department?: string;
      staffName?: string;
      staffPhone?: string;
    };

    // Conditional: Delivery-Specific Details
    deliveryDetails?: {
      platform?: string;
      recipient?: string;
      orderReference?: string;
    };

    // Branch Information
    branch: {
      id: string;
      name: string;
    };

    // No gate pass data for pending visits
    gatePass: null;
  };
}
```

#### Status: `APPROVED`

```typescript
interface VisitStatusResponse_Approved {
  success: true;
  data: {
    visitId: string;
    status: VisitStatus.APPROVED;

    // Visitor Information
    visitor: {
      id: string;
      firstName: string;
      lastName: string;
      fullName: string;
      phone: string; // Masked for privacy
      photoUrl?: string;
    };

    // Visit Classification
    visitCategory: 'MEETING' | 'DELIVERY' | null;

    // Timing Information
    submittedAt: string;    // ISO 8601
    approvedAt: string;     // ISO 8601

    // Conditional Details
    meetingDetails?: {
      purpose?: string;
      department?: string;
      staffName?: string;
      staffPhone?: string;
    };
    deliveryDetails?: {
      platform?: string;
      recipient?: string;
      orderReference?: string;
    };

    // Branch Information
    branch: {
      id: string;
      name: string;
      address?: string;  // Computed from street, city, state, pinCode
    };

    // Gate Pass Data (Available when approved)
    gatePass: {
      checkInOtp: string;              // 6-digit OTP
      validUntil: string;             // ISO 8601 (checkInOtpExpiry)
      gatePassUrl?: string;           // GCP URL to Gate Pass image
      generatedAt: string;             // ISO 8601 (gatePassGeneratedAt)
      sentViaWhatsApp: boolean;       // gatePassSentViaWhatsApp
    };
  };
}
```

#### Status: `REJECTED`

```typescript
interface VisitStatusResponse_Rejected {
  success: true;
  data: {
    visitId: string;
    status: VisitStatus.REJECTED;

    // Visitor Information
    visitor: {
      id: string;
      firstName: string;
      lastName: string;
      fullName: string;
      phone: string; // Masked
      photoUrl?: string;
    };

    // Visit Classification
    visitCategory: 'MEETING' | 'DELIVERY' | null;

    // Timing Information
    submittedAt: string;
    rejectedAt?: string; // May not have exact timestamp

    // Rejection Reason (if provided)
    rejectionReason?: string;

    // Branch Information
    branch: {
      id: string;
      name: string;
      phone?: string; // Contact for support
    };

    // No gate pass
    gatePass: null;
  };
}
```

#### Status: `CHECKED_IN`

```typescript
interface VisitStatusResponse_CheckedIn {
  success: true;
  data: {
    visitId: string;
    status: VisitStatus.CHECKED_IN;

    // Visitor Information
    visitor: {
      id: string;
      firstName: string;
      lastName: string;
      fullName: string;
      phone: string; // Masked
      photoUrl?: string;
    };

    // Visit Classification
    visitCategory: 'MEETING' | 'DELIVERY' | null;

    // Timing Information
    submittedAt: string;
    approvedAt: string;
    checkedInAt: string;          // ISO 8601 (checkInTime)
    checkedInLocation?: string;

    // Conditional Details
    meetingDetails?: {
      purpose?: string;
      department?: string;
      staffName?: string;
      staffPhone?: string;
    };
    deliveryDetails?: {
      platform?: string;
      recipient?: string;
      orderReference?: string;
    };

    // Branch Information
    branch: {
      id: string;
      name: string;
      address?: string;
    };

    // Gate Pass Data (For reference, but OTP may be used)
    gatePass: {
      checkInOtp: string;
      validUntil: string;
      gatePassUrl?: string;
      generatedAt: string;
      sentViaWhatsApp: boolean;
      isUsed: boolean; // Always true when checked in
    };
  };
}
```

#### Status: `CHECKED_OUT`

```typescript
interface VisitStatusResponse_CheckedOut {
  success: true;
  data: {
    visitId: string;
    status: VisitStatus.CHECKED_OUT;

    // Visitor Information
    visitor: {
      id: string;
      firstName: string;
      lastName: string;
      fullName: string;
      phone: string; // Masked
      photoUrl?: string;
    };

    // Visit Classification
    visitCategory: 'MEETING' | 'DELIVERY' | null;

    // Timing Information
    submittedAt: string;
    approvedAt: string;
    checkedInAt: string;
    checkedInLocation?: string;
    checkedOutAt: string;         // ISO 8601 (checkOutTime)
    checkedOutLocation?: string;
    durationMinutes?: number;    // Calculated or stored

    // Conditional Details
    meetingDetails?: {
      purpose?: string;
      department?: string;
      staffName?: string;
      staffPhone?: string;
    };
    deliveryDetails?: {
      platform?: string;
      recipient?: string;
      orderReference?: string;
    };

    // Branch Information
    branch: {
      id: string;
      name: string;
      address?: string;
    };

    // Gate Pass (Historical)
    gatePass: {
      checkInOtp: string;
      validUntil: string;
      gatePassUrl?: string;
      generatedAt: string;
      sentViaWhatsApp: boolean;
      isUsed: boolean;
    };
  };
}
```

### 3.4 Error Response Schema

#### 400 Bad Request (Invalid UUID)

```typescript
interface ErrorResponse_400 {
  success: false;
  error: {
    code: 'INVALID_VISIT_ID';
    message: 'Invalid visit ID format. Please check your link.';
    details?: {
      field: 'visitId';
      constraint: 'uuid';
    };
  };
}
```

#### 404 Not Found (Visit Does Not Exist)

```typescript
interface ErrorResponse_404 {
  success: false;
  error: {
    code: 'VISIT_NOT_FOUND';
    message: 'Visit not found. Please contact security if you believe this is an error.';
    details?: {
      visitId: string;
    };
  };
}
```

#### 410 Gone (Link Expired - Future Task 9.6)

```typescript
interface ErrorResponse_410 {
  success: false;
  error: {
    code: 'LINK_EXPIRED';
    message: 'This status link has expired (24-hour validity). Please contact security for assistance.';
    details?: {
      expiryDate: string;      // ISO 8601
      visitId: string;
    };
  };
}
```

---

## 4. Function Signatures

### 4.1 Controller Method

**File Path**: `backend/src/visitors/public-controller/public-visitors.controller.ts`

```typescript
/**
 * Get visit status by visit ID (public endpoint, no auth required)
 *
 * @param visitId - The UUID of visit to check
 * @returns Visit status with visitor details and gate pass data (if approved)
 *
 * @throws {BadRequestException} Invalid UUID format
 * @throws {NotFoundException} Visit not found
 * @throws {HttpException} 410 Gone if link expired (future implementation)
 */
@Public()
@Get('visits/:visitId/status')
@ApiOperation({
  summary: 'Get visit status by visit ID (public endpoint)',
  description: 'Returns current visit status with visitor details and gate pass data (if approved).',
})
@ApiResponse({ status: 200, description: 'Visit status retrieved successfully' })
@ApiResponse({ status: 400, description: 'Invalid visit ID format' })
@ApiResponse({ status: 404, description: 'Visit not found' })
@ApiResponse({ status: 410, description: 'Status link expired (future)' })
async getVisitStatus(
  @Param('visitId') visitId: string,
): Promise<VisitStatusResponse> {
  return this.visitorsService.getVisitStatusPublic(visitId);
}
```

### 4.2 Service Method

**File Path**: `backend/src/visitors/visitors.service.ts`

```typescript
/**
 * Get visit status for public access
 *
 * @param visitId - The UUID of the visit
 * @returns Visit status with filtered visitor data
 */
async getVisitStatusPublic(
  visitId: string,
): Promise<VisitStatusResponse> {
  // Implementation logic below
}
```

### 4.3 DTOs

**File Path**: `backend/src/visitors/dto/visit-status.dto.ts`

```typescript
// Import class-validator/class-transformer for validation
import { IsUUID } from 'class-validator';

export class GetVisitStatusParams {
  @IsUUID('4', { message: 'Visit ID must be a valid UUID v4' })
  visitId: string;
}
```

---

## 5. Implementation Logic (Pseudo-Code)

### 5.1 Controller Flow

```typescript
async getVisitStatus(@Param('visitId') visitId: string): Promise<VisitStatusResponse> {
  // 1. Validate UUID format
  if (!this.isValidUUID(visitId)) {
    throw new BadRequestException({
      success: false,
      error: {
        code: 'INVALID_VISIT_ID',
        message: 'Invalid visit ID format. Please check your link.',
      },
    });
  }

  // 2. Delegate to service
  return await this.visitorsService.getVisitStatusPublic(visitId);
}
```

### 5.2 Service Flow

```typescript
async getVisitStatusPublic(visitId: string): Promise<VisitStatusResponse> {
  // 1. Query visit from database
  const visit = await this.prisma.visit.findUnique({
    where: { id: visitId },
    include: {
      visitor: true,  // Get visitor data
      branch: true,   // Get branch info
    },
  });

  // 2. Handle not found
  if (!visit) {
    throw new NotFoundException({
      success: false,
      error: {
        code: 'VISIT_NOT_FOUND',
        message: 'Visit not found. Please contact security if you believe this is an error.',
      },
    });
  }

  // 3. Future: Check 24-hour expiry (Task 9.6)
  // const now = new Date();
  // const visitDate = new Date(visit.createdAt);
  // const hoursSinceCreation = (now.getTime() - visitDate.getTime()) / (1000 * 60 * 60);
  // if (hoursSinceCreation > 24) {
  //   throw new HttpException(
  //     {
  //       success: false,
  //       error: {
  //         code: 'LINK_EXPIRED',
  //         message: 'This status link has expired (24-hour validity). Please contact security for assistance.',
  //         details: { expiryDate: visitDate.toISOString(), visitId },
  //       },
  //     },
  //     410,
  //   );
  // }

  // 4. Build response based on status
  const responseData = this.buildVisitStatusResponse(visit);

  return {
    success: true,
    data: responseData,
  };
}

private buildVisitStatusResponse(visit: VisitWithRelations) {
  const { status } = visit;
  const baseData = {
    visitId: visit.id,
    status: visit.status as VisitStatus,
    visitor: {
      id: visit.visitor.id,
      firstName: visit.visitor.firstName,
      lastName: visit.visitor.lastName,
      fullName: `${visit.visitor.firstName} ${visit.visitor.lastName}`,
      phone: this.maskPhone(visit.visitor.phone),
      photoUrl: visit.visitor.photo ? this.getPublicPhotoUrl(visit.visitor.photo) : undefined,
    },
    visitCategory: visit.visitCategory,
    submittedAt: visit.createdAt.toISOString(),
    branch: {
      id: visit.branch.id,
      name: visit.branch.name,
      address: this.formatBranchAddress(visit.branch),
    },
  };

  // Add conditional details based on category
  if (visit.visitCategory === 'MEETING') {
    baseData.meetingDetails = {
      purpose: visit.purpose,
      department: visit.department,
      staffName: visit.staffName,
      staffPhone: visit.staffPhone ? this.maskPhone(visit.staffPhone) : undefined,
    };
  } else if (visit.visitCategory === 'DELIVERY') {
    baseData.deliveryDetails = {
      platform: visit.deliveryPlatform,
      recipient: visit.deliveryRecipient,
      orderReference: visit.orderReference,
    };
  }

  // Add status-specific data
  switch (status) {
    case VisitStatus.REQUEST_SENT:
      // Pending: No additional data
      return {
        ...baseData,
        gatePass: null,
      };

    case VisitStatus.APPROVED:
      return {
        ...baseData,
        approvedAt: this.extractTimestamp(visit, 'approvedAt'),
        gatePass: {
          checkInOtp: visit.checkInOtp!,
          validUntil: visit.checkInOtpExpiry!.toISOString(),
          gatePassUrl: visit.visitQRCode ? this.getGatePassUrl(visit.visitQRCode) : undefined,
          generatedAt: visit.gatePassGeneratedAt!.toISOString(),
          sentViaWhatsApp: visit.gatePassSentViaWhatsApp,
        },
      };

    case VisitStatus.REJECTED:
      return {
        ...baseData,
        rejectedAt: this.extractTimestamp(visit, 'updatedAt'), // Approximate
        rejectionReason: visit.rejectionReason,
        gatePass: null,
      };

    case VisitStatus.CHECKED_IN:
      return {
        ...baseData,
        approvedAt: this.extractTimestamp(visit, 'approvedAt'),
        checkedInAt: visit.checkInTime!.toISOString(),
        checkedInLocation: visit.checkedInLocation,
        gatePass: {
          checkInOtp: visit.checkInOtp!,
          validUntil: visit.checkInOtpExpiry!.toISOString(),
          gatePassUrl: visit.visitQRCode ? this.getGatePassUrl(visit.visitQRCode) : undefined,
          generatedAt: visit.gatePassGeneratedAt!.toISOString(),
          sentViaWhatsApp: visit.gatePassSentViaWhatsApp,
          isUsed: true,
        },
      };

    case VisitStatus.CHECKED_OUT:
      return {
        ...baseData,
        approvedAt: this.extractTimestamp(visit, 'approvedAt'),
        checkedInAt: visit.checkInTime!.toISOString(),
        checkedInLocation: visit.checkedInLocation,
        checkedOutAt: visit.checkOutTime!.toISOString(),
        checkedOutLocation: visit.checkedOutLocation,
        durationMinutes: visit.durationMinutes,
        gatePass: {
          checkInOtp: visit.checkInOtp!,
          validUntil: visit.checkInOtpExpiry!.toISOString(),
          gatePassUrl: visit.visitQRCode ? this.getGatePassUrl(visit.visitQRCode) : undefined,
          generatedAt: visit.gatePassGeneratedAt!.toISOString(),
          sentViaWhatsApp: visit.gatePassSentViaWhatsApp,
          isUsed: true,
        },
      };

    default:
      throw new BadRequestException({
        success: false,
        error: {
          code: 'INVALID_STATUS',
          message: 'Unknown visit status.',
        },
      });
  }
}

// Helper methods
private isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

private maskPhone(phone: string): string {
  // India format: +91 XXXXX XXXXX -> +91 999** 9999
  if (phone.startsWith('+91')) {
    const parts = phone.split(' ');
    if (parts.length >= 3) {
      const masked = parts[1].substring(0, 3) + '**';
      return `${parts[0]} ${masked} ${parts[2]}`;
    }
  }
  // Generic: mask middle 4 digits
  if (phone.length === 10) {
    return phone.substring(0, 3) + '****' + phone.substring(7);
  }
  return phone.substring(0, 2) + '***' + phone.substring(phone.length - 2);
}

private getPublicPhotoUrl(photoIdentifier: string): string {
  // Convert stored identifier to public GCP URL
  // This should use a signed URL or public URL based on your GCP setup
  return `${process.env.GCP_PUBLIC_URL}/photos/${photoIdentifier}`;
}

private getGatePassUrl(gatePassIdentifier: string): string {
  // Convert stored identifier to public GCP URL
  return `${process.env.GCP_PUBLIC_URL}/gate-passes/${gatePassIdentifier}`;
}

private formatBranchAddress(branch: Branch): string {
  // Compose full address
  const parts = [branch.street, branch.city, branch.state, branch.pinCode];
  return parts.filter(Boolean).join(', ');
}

private extractTimestamp(visit: Visit, field: string): string {
  // Extract timestamp or fallback to createdAt
  // Note: We don't have an explicit 'approvedAt' field in schema currently
  // This will be approximated from updatedAt or added later
  return visit.updatedAt.toISOString();
}
```

---

## 6. Behavior Specification

### 6.1 Request Validation

| Scenario                              | Expected Behavior                                  |
|---------------------------------------|----------------------------------------------------|
| Valid UUID                            | Proceed to lookup                                  |
| Invalid UUID (non-string format)      | Return 400 with `INVALID_VISIT_ID` error          |
| Empty UUID parameter                  | Return 400 with `INVALID_VISIT_ID` error          |
| Malformed UUID (e.g., truncated)      | Return 400 with `INVALID_VISIT_ID` error          |

### 6.2 Visit Lookup

| Scenario                              | Expected Behavior                                  |
|---------------------------------------|----------------------------------------------------|
| Visit exists                          | Return 200 with appropriate status response        |
| Visit does not exist                  | Return 404 with `VISIT_NOT_FOUND` error            |
| Database error                        | Return 500 with generic error (do not expose DB info) |

### 6.3 Status-Specific Responses

| Visit Status | Data Included in Response                                                                 |
|--------------|-------------------------------------------------------------------------------------------|
| `REQUEST_SENT` | Visitor info, visit type, submittedAt, meeting/delivery details, branch info            |
| `APPROVED`    | All pending data + approvedAt + gatePass (OTP, validity, URL, WhatsApp delivery flag)    |
| `REJECTED`    | All pending data + rejectedAt (approximate) + rejectionReason + branch phone (support)   |
| `CHECKED_IN`  | All approved data + checkedInAt + checkedInLocation + gatePass with isUsed=true         |
| `CHECKED_OUT` | All checked-in data + checkedOutAt + checkedOutLocation + durationMinutes                |

### 6.4 Data Privacy

| Field          | Privacy Handling                                  |
|----------------|---------------------------------------------------|
| Visitor Phone  | Masked: `+91 999** 9999` or `999****9999`        |
| Staff Phone    | Masked (if included)                              |
| Government ID  | **Never included** in response                    |
| Office ID      | **Never included** in response                    |
| Alternate Phone| **Never included** in response                    |
| Alternate Email| **Never included** in response                   |
| Visitor Email  | **Not included** (privacy concern for public view)|
| Address        | **Not included** (privacy concern)               |

### 6.5 Rate Limiting Note

This endpoint is designed for polling (e.g., every 30 seconds) by visitors to check their visit status. Rate limiting may be applied in a future task to prevent abuse:

- **Recommended Limit:** 60 requests per IP per minute (reasonable for polling)
- **Status:** Not implemented in current task
- **Future Task:** Consider adding rate limiting for this endpoint

### 6.6 Future: Link Expiry (Task 9.6)

When Task 9.6 is implemented:

| Time Since Visit Creation | Response                                  |
|---------------------------|-------------------------------------------|
| ≤ 24 hours                | Return visit status normally              |
| > 24 hours                | Return 410 Gone with `LINK_EXPIRED` error|

---

## 7. Error Handling

### 7.1 Error Response Format

All errors follow consistent format:

```typescript
interface ErrorResponse {
  success: false;
  error: {
    code: string;           // Machine-readable error code
    message: string;        // Human-readable message
    details?: Record<string, any>; // Additional context
  };
}
```

### 7.2 Error Codes Reference

| Error Code        | HTTP Status | Description                              |
|-------------------|-------------|------------------------------------------|
| `INVALID_VISIT_ID`| 400         | Visit ID is not a valid UUID v4             |
| `VISIT_NOT_FOUND` | 404         | No visit exists with this ID             |
| `LINK_EXPIRED`    | 410         | Status link has expired (future)         |
| `INTERNAL_ERROR`  | 500         | Server error (generic)                   |

### 7.3 Logging Requirements

| Scenario           | Log Level | Log Details                                                                 |
|--------------------|-----------|-----------------------------------------------------------------------------|
| Invalid UUID       | WARN      | IP address, visitId param, User-Agent                                      |
| Visit not found    | WARN      | IP address, visitId param, potential brute force detection                 |
| Database error     | ERROR     | Stack trace, visitId param, error details                                  |
| Link expired (410) | INFO      | visitId, expiry date, IP address (for analytics)                           |
| Successful request | INFO      | visitId, status, IP address (rate limiting analytics)                     |

---

## 8. Test Mode Support

### 8.1 TEST_MODE Configuration

This endpoint does **not** require special TEST_MODE behavior beyond standard deterministic data handling.

When `TEST_MODE=true`:
- No special OTP mocking (status endpoint is read-only)
- Database should contain test data for consistent responses
- No SMS/WhatsApp delivery checks (read-only endpoint)

### 8.2 Test Data Expectations

For E2E testing with TEST_MODE:

| Test Scenario | Expected Visit State                            |
|---------------|-------------------------------------------------|
| Pending visit | status=`REQUEST_SENT`, no gatePass             |
| Approved visit| status=`APPROVED`, checkInOtp=`654321`       |
| Rejected visit| status=`REJECTED`, rejectionReason present     |
| Checked-in visit| status=`CHECKED_IN`, checkInTime populated    |
| Checked-out visit| status=`CHECKED_OUT`, checkOutTime populated|

---

## 9. Test Cases

### 9.1 Unit Tests (Service Layer)

| Test ID | Test Case                                          | Expected Result                            |
|---------|---------------------------------------------------|-------------------------------------------|
| 1.1     | Valid UUID, visit exists (REQUEST_SENT)           | Return status with pending data          |
| 1.2     | Valid UUID, visit exists (APPROVED)               | Return status with gate pass data        |
| 1.3     | Valid UUID, visit exists (REJECTED)               | Return status with rejection reason      |
| 1.4     | Valid UUID, visit exists (CHECKED_IN)             | Return status with check-in time         |
| 1.5     | Valid UUID, visit exists (CHECKED_OUT)            | Return status with check-out time        |
| 1.6     | Valid UUID, visit does not exist                  | Throw `NotFoundException` (404)         |
| 1.7     | Invalid UUID format                                | Throw `BadRequestException` (400)      |
| 1.8     | Empty UUID string                                  | Throw `BadRequestException` (400)      |
| 1.9     | Meeting visit includes staffName                   | `meetingDetails.staffName` present       |
| 1.10    | Delivery visit includes platform                   | `deliveryDetails.platform` present       |
| 1.11    | Phone number masking works correctly                | Masked format returned                    |
| 1.12    | Sensitive fields excluded (governmentId, officeId)  | Not present in response                  |
| 1.13    | Photo URL generation works for existing photo      | `visitor.photoUrl` is valid URL          |
| 1.14    | Photo URL is null when photo missing               | `visitor.photoUrl` is undefined          |
| 1.15    | Branch address formatted correctly                 | `branch.address` is formatted string     |

### 9.2 E2E Tests (API Layer)

| Test ID | Test Case                                          | Expected Result                            |
|---------|---------------------------------------------------|-------------------------------------------|
| 2.1     | GET `/public/visits/:visitId/status` with valid ID | Return 200 with success response          |
| 2.2     | GET with invalid UUID format                       | Return 400 with `INVALID_VISIT_ID`        |
| 2.3     | GET with non-existent UUID                         | Return 404 with `VISIT_NOT_FOUND`        |
| 2.4     | Response includes all required fields for pending  | 200, structure matches schema            |
| 2.5     | Response includes gatePass for approved            | 200, gatePass.checkInOtp present         |
| 2.6     | Response includes timestamps for all statuses      | All datetime fields are ISO 8601 format  |
| 2.7     | Response conforms to content-type `application/json`| Correct Content-Type header              |
| 2.8     | Multiple concurrent requests (polling simulation)  | All return consistent data              |
| 2.9     | Future: Link expiry after 24 hours                 | Return 410 with `LINK_EXPIRED`            |

### 9.3 Integration Tests

| Test ID | Test Case                                          | Expected Result                            |
|---------|---------------------------------------------------|-------------------------------------------|
| 3.1     | Database connection failure handling              | Return 500 with generic error            |
| 3.2     | GCP URL generation with missing env vars           | Graceful degradation (URL may be null)   |
| 3.3     | Performance: Response time < 200ms                | Meets SLA                                 |

---

## 10. Implementation Notes

### 10.1 Database Queries

- Use Prisma `findUnique` with `include` to fetch related data in a single query
- Consider adding `approvedAt` field to Visit schema for more accurate approval timestamps (not in current schema, can be derived from `updatedAt` for now)

### 10.2 Phone Number Masking

- Implement robust phone masking that handles multiple formats
- Consider visitor's country code for international support (future enhancement)

### 10.3 GCP URL Generation

- Use environment variables for base URLs: `GCP_PUBLIC_URL`
- Handle cases where photos/gate passes may be private (need signed URLs vs public URLs)
- Consider CDN integration for future performance optimization

### 10.4 Performance Considerations

- This endpoint will be polled every 30 seconds by visitors
- Consider caching strategy if traffic is high:
  - In-memory cache with TTL (e.g., Redis)
  - Cache key: `visit-status:${visitId}`
  - Cache TTL: 30 seconds (aligned with polling interval)
- Monitor for polling abuse and implement rate limiting per IP (future task)

### 10.5 Security Considerations

- **No authentication**: Relies solely on UUID entropy
- **No PII leakage**: Exclude sensitive visitor data
- **CORS**: Configure appropriate CORS headers for public access
- **Logging**: Log all access attempts for security auditing

### 10.6 Frontend Integration

The frontend status check page (Task 5.4) will:
1. Poll this endpoint every 30 seconds using `setInterval`
2. Display appropriate UI based on returned status:
   - `REQUEST_SENT`: Show "Waiting for approval" spinner/message
   - `APPROVED`: Show Gate Pass with OTP
   - `REJECTED`: Show rejection message with contact support link
   - `CHECKED_IN`: Show "You are checked in" message
   - `CHECKED_OUT`: Show visit summary with check-out time
3. Handle error states gracefully (404, 410, network errors)

---

## 11. Open Questions & Future Enhancements

| Question/Enhancement                            | Priority | Notes                                           |
|-------------------------------------------------|----------|-------------------------------------------------|
| Add `approvedAt` timestamp field to Visit schema | Medium    | Currently approximating with `updatedAt`       |
| Implement 24-hour link expiry (Task 9.6)        | High      | Will return 410 Gone for expired links         |
| Add rate limiting per IP address                 | Medium    | Prevent abuse of polling endpoint              |
| Implement Redis caching for performance         | Low       | Only needed under high load                    |
| Support international phone number formats      | Low       | Current masking assumes India format           |
| Add signed URLs for private GCP objects         | Medium    | If photos/gate passes are stored privately    |
| Add analytics tracking for status page usage     | Low       | Useful for product improvement                |

---

## 12. Acceptance Criteria

Task 2.4 is considered complete when:

1. ✅ `GET /public/visits/:visitId/status` endpoint exists and is publicly accessible (no auth)
2. ✅ Endpoint validates UUID format and returns 400 for invalid formats
3. ✅ Endpoint returns 404 for non-existent visits
4. ✅ Defines `VisitStatus` enum matching Prisma schema values
5. ✅ All visit statuses (`REQUEST_SENT`, `APPROVED`, `REJECTED`, `CHECKED_IN`, `CHECKED_OUT`) return appropriate data
6. ✅ Approved visits include gate pass data (Check-In OTP, validity, URL, WhatsApp flag)
7. ✅ Visitor phone numbers are masked in responses
8. ✅ Sensitive fields (governmentId, officeId, alternatePhone, alternateEmail, visitor email) are excluded
9. ✅ All timestamps are returned in ISO 8601 format
10. ✅ Returns HTTP 200 OK on success
11. ✅ Unit tests cover all status scenarios and error cases
12. ✅ E2E tests verify correct API behavior
13. ✅ Documentation is updated (API docs, swagger/openapi spec)
14. ✅ Code follows NestJS conventions and passes linting

---

## 13. Related Tasks

| Task ID | Description                               | Dependency Direction |
|----------|-------------------------------------------|----------------------|
| 1.2      | Update Prisma schema for Visit gate pass fields | Predecessor         |
| 2.5      | Implement rate limiting for public endpoints | Parallel           |
| 5.4      | Create status check page with polling     | Successor           |
| 9.6      | Validate status link 24-hour expiry        | Future enhancement   |

---

## 14. File Locations

### Implementation Files

| File                                      | Description                              |
|-------------------------------------------|------------------------------------------|
| `backend/src/visitors/public-controller/public-visitors.controller.ts` | Add `GET /public/visits/:visitId/status` route |
| `backend/src/visitors/visitors.service.ts`    | Add `getVisitStatusPublic()` method     |
| `backend/src/visitors/dto/visit-status.dto.ts`| Create response DTOs                      |
| `backend/src/visitors/visitors.module.ts`    | Ensure controller is exported          |

### Test Files

| File                                           | Description                              |
|------------------------------------------------|------------------------------------------|
| `backend/src/visitors/visitors.service.spec.ts`| Unit tests for service logic             |
| `backend/src/visitors/visitors.e2e-spec.ts`    | E2E API tests                            |

### Documentation Files

| File                                           | Description                              |
|------------------------------------------------|------------------------------------------|
| `backend/docs/api/visit-status-endpoint.md`     | API documentation (optional)             |

---

**End of Specification**
