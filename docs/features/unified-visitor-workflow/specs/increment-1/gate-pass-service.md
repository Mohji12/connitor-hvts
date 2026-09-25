# Technical Specification: Gate Pass Service

> **Task:** 1.5 - Gate Pass Service (Stubs & OTP)
> **Status:** Draft
> **Increment:** 1
> **Feature:** Unified Visitor Workflow

## 1. File Information

- **Location:** `backend/src/visitors/services/gate-pass.service.ts`
- **Test Location:** `backend/src/visitors/services/gate-pass.service.spec.ts`
- **Module:** `VisitorsModule`
- **Type:** NestJS Service (`@Injectable()`)

## 2. Dependencies

- `PrismaService` (`backend/src/prisma/prisma.service.ts`): For database operations.
- `ConfigService` (`@nestjs/config`): To access environment variables (`TEST_MODE`).

## 3. Data Models

### Input Interfaces

```typescript
// Input is primarily the visitId string
```

### Output Interfaces

```typescript
export interface GatePassResult {
  checkInOtp: string;
  expiresAt: Date;
}
```

## 4. Function Signatures

```typescript
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class GatePassService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Generates a 6-digit Check-In OTP for a visit.
   * Validates the visit exists and is in a valid state.
   * Updates the database with the OTP and expiry.
   * 
   * @param visitId - The UUID of the visit
   * @throws NotFoundException - If visit not found (VISIT_NOT_FOUND)
   * @throws BadRequestException - If visit cannot accept OTP (VISIT_NOT_APPROVABLE)
   */
  async generateCheckInOtp(visitId: string): Promise<GatePassResult>;

  /**
   * STUB (Increment 8): Generates the visual gate pass image.
   * Currently returns a placeholder string.
   */
  async generateGatePassImage(visitId: string): Promise<string>;

  /**
   * STUB (Increment 8): Sends the gate pass via WhatsApp.
   * Currently returns true and logs a message.
   */
  async sendGatePassViaWhatsApp(visitId: string, imageUrl: string): Promise<boolean>;
}
```

## 5. Pseudo-Code / Logic

### Method: `generateCheckInOtp`

1.  **Retrieve Visit:**
    - Query database: `visit = await this.prisma.visit.findUnique({ where: { id: visitId } })`
    - **IF** `!visit` **THEN** Throw `NotFoundException('VISIT_NOT_FOUND')`

2.  **Validate State:**
    - **IF** `visit.status` is `REJECTED`, `CANCELLED`, or `COMPLETED` (or any terminal state that shouldn't receive a new OTP)
    - **THEN** Throw `BadRequestException('VISIT_NOT_APPROVABLE')`
    - *Note: This ensures we don't generate OTPs for dead visits.*

3.  **Determine OTP:**
    - Retrieve `TEST_MODE` from `ConfigService`.
    - **IF** `TEST_MODE === 'true'`
        - `otp = "654321"`
    - **ELSE**
        - Generate random 6-digit number string: `Math.floor(100000 + Math.random() * 900000).toString()`

4.  **Calculate Expiry:**
    - `expiresAt = new Date()`
    - Add 8 hours: `expiresAt.setHours(expiresAt.getHours() + 8)`

5.  **Update Database:**
    - Perform update:
      ```typescript
      await this.prisma.visit.update({
        where: { id: visitId },
        data: {
          checkInOtp: otp,
          checkInOtpExpiry: expiresAt,
          gatePassGeneratedAt: new Date(),
        },
      });
      ```

6.  **Return:**
    - Return object: `{ checkInOtp: otp, expiresAt: expiresAt }`

### Method: `generateGatePassImage` (Stub)

1.  **Log Info:** `Logger.log("STUB: generateGatePassImage called for " + visitId)`
2.  **Return:** `"TODO_IMAGE_URL_INC_8"`

### Method: `sendGatePassViaWhatsApp` (Stub)

1.  **Log Info:** `Logger.log("STUB: sendGatePassViaWhatsApp called for " + visitId)`
2.  **Return:** `true`

## 6. Test Cases

### Suite: `generateCheckInOtp`

1.  **Scenario: Success (Production Mode)**
    - **Setup:** `TEST_MODE` is undefined or false. Visit exists with status `PENDING`.
    - **Action:** Call `generateCheckInOtp(visitId)`.
    - **Expect:**
        - `prisma.visit.update` called with a random 6-digit string (regex `^\d{6}$`).
        - `checkInOtpExpiry` is approx 8 hours from now.
        - Returns `{ checkInOtp: "...", expiresAt: ... }`.

2.  **Scenario: Success (Test Mode)**
    - **Setup:** `TEST_MODE` is 'true'. Visit exists.
    - **Action:** Call `generateCheckInOtp(visitId)`.
    - **Expect:**
        - `prisma.visit.update` called with `checkInOtp: "654321"`.

3.  **Scenario: Visit Not Found**
    - **Setup:** `prisma.visit.findUnique` returns `null`.
    - **Action:** Call `generateCheckInOtp(nonExistentId)`.
    - **Expect:** Throw `NotFoundException` with message `VISIT_NOT_FOUND`.

4.  **Scenario: Invalid Visit State**
    - **Setup:** Visit exists but `status` is `REJECTED`.
    - **Action:** Call `generateCheckInOtp(visitId)`.
    - **Expect:** Throw `BadRequestException` with message `VISIT_NOT_APPROVABLE`.

### Suite: Stubs

5.  **Scenario: Image Generation Stub**
    - **Action:** Call `generateGatePassImage(visitId)`.
    - **Expect:** Return `"TODO_IMAGE_URL_INC_8"`.

6.  **Scenario: WhatsApp Send Stub**
    - **Action:** Call `sendGatePassViaWhatsApp(visitId, url)`.
    - **Expect:** Return `true`.
