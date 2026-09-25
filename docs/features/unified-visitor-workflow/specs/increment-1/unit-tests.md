# Technical Specification: Unit Test Coverage (Increment 1)

**Feature:** Unified Visitor Workflow  
**Task:** Unit Test Implementation (Tasks 1.3 - 1.5)  
**Status:** Draft  

This specification documents the required unit test coverage for the backend services introduced in Increment 1. The tests utilize `Jest` as the testing framework and strictly follow the NestJS testing module architecture.

---

## 1. Test File Locations

| Component | Source File | Test File |
| :--- | :--- | :--- |
| **PhoneVerification** | `backend/src/visitors/services/phone-verification.service.ts` | `backend/src/visitors/services/phone-verification.service.spec.ts` |
| **GatePass** | `backend/src/visitors/services/gate-pass.service.ts` | `backend/src/visitors/services/gate-pass.service.spec.ts` |
| **TestModeUtil** | `backend/src/common/utils/test-mode.util.ts` | `backend/src/common/utils/test-mode.util.spec.ts` |

---

## 2. Mocking Strategy & Data Fixtures

All external dependencies must be mocked. No actual database connections or SMS API calls should occur during unit tests.

### 2.1 Mocks
- **PrismaService:** Mock `visitor.findUnique`, `visitor.create`, `visitor.update`, `visit.findUnique`, `visit.update`.
- **SmsService:** Mock `sendOtp`.
- **ConfigService:** Mock `get`.
- **Logger:** Mock NestJS `Logger`.

### 2.2 Data Fixtures (Interfaces)

```typescript
// Fixture: Visitor Entity
interface MockVisitor {
  id: number;
  mobileNumber: string;
  registrationStatus: 'DRAFT' | 'REGISTERED';
  phoneVerified: boolean;
  otpCode: string | null;
  otpExpiry: Date | null;
  phoneVerificationAttempts: number;
  branchId: number;
}

// Fixture: Visit Entity
interface MockVisit {
  id: number;
  visitorId: number;
  checkInOtp: string | null;
  checkInOtpExpiry: Date | null;
  gatePassGeneratedAt: Date | null;
}

const MOCK_VISITOR_DEFAULT: MockVisitor = {
  id: 1,
  mobileNumber: '9876543210',
  registrationStatus: 'DRAFT',
  phoneVerified: false,
  otpCode: null,
  otpExpiry: null,
  phoneVerificationAttempts: 0,
  branchId: 1
};

const MOCK_VISIT_DEFAULT: MockVisit = {
  id: 100,
  visitorId: 1,
  checkInOtp: null,
  checkInOtpExpiry: null,
  gatePassGeneratedAt: null
};
```

---

## 3. Test Suites & Function Signatures

### 3.1 `phone-verification.service.spec.ts`

```typescript
describe('PhoneVerificationService', () => {
  let service: PhoneVerificationService;
  let prismaService: PrismaService;
  let smsService: SmsService;
  let configService: ConfigService;

  describe('generateOtp', () => {
    it('should generate 6-digit OTP in production mode', async () => {});
    it('should return "123456" when TEST_MODE=true', async () => {});
    it('should create new Visitor if not exists', async () => {});
    it('should reuse existing Visitor if found', async () => {});
    it('should reset attempts and set expiry', async () => {});
    it('should call SmsService.sendOtp', async () => {});
  });

  describe('verifyOtp', () => {
    it('should return success when OTP matches and is valid', async () => {});
    it('should return OTP_EXPIRED when OTP has expired', async () => {});
    it('should return INVALID_OTP when OTP does not match', async () => {});
    it('should increment attempts on failure', async () => {});
    it('should return OTP_LOCKED after 3 failed attempts', async () => {});
    it('should return VISITOR_NOT_FOUND when visitor missing', async () => {});
  });
});
```

### 3.2 `gate-pass.service.spec.ts`

```typescript
describe('GatePassService', () => {
  let service: GatePassService;
  let prismaService: PrismaService;

  describe('generateCheckInOtp', () => {
    it('should generate 6-digit OTP in production mode', async () => {});
    it('should return "654321" when TEST_MODE=true', async () => {});
    it('should set expiry to 8 hours and generatedAt timestamp', async () => {});
    it('should return VISIT_NOT_FOUND when visit does not exist', async () => {});
  });

  describe('stubs', () => {
    it('generateGatePassImage should throw NotImplemented or return placeholder', async () => {});
    it('sendGatePassViaWhatsApp should log and return true', async () => {});
  });
});
```

### 3.3 `test-mode.util.spec.ts`

```typescript
describe('TestModeUtil', () => {
  describe('isTestMode', () => {
    it('should identify test mode correctly', () => {});
  });

  describe('generateOtp', () => {
    it('should return correct OTP based on mode', () => {});
  });
});
```

---

## 4. Pseudo-Code / Logic & Test Scenarios

### 4.1 TestModeUtil Logic

**Scenario: isTestMode()**
1.  **Test 1:** Mock `process.env.TEST_MODE = 'true'`. Expect `true`.
2.  **Test 2:** Mock `process.env.TEST_MODE = 'false'`. Expect `false`.
3.  **Test 3:** Mock `process.env.TEST_MODE = undefined`. Expect `false`.
4.  **Test 4:** Mock `process.env.TEST_MODE = 'TRUE'`. Expect `false` (Case sensitive strict check).

**Scenario: generateOtp(testValue)**
1.  **Test 1 (Test Mode):** `isTestMode` returns true. Return `testValue`.
2.  **Test 2 (Prod Mode):** `isTestMode` returns false. Return 6-digit random string. Verify regex `/^[0-9]{6}$/`.

---

### 4.2 PhoneVerificationService Logic

**Scenario: generateOtp(mobile, branchId)**
1.  **Setup:** Mock `ConfigService.get('TEST_MODE')` appropriately.
2.  **Test 1 (New Visitor):**
    *   Mock `prisma.visitor.findUnique` returns `null`.
    *   Mock `prisma.visitor.create` returns `MOCK_VISITOR_DEFAULT`.
    *   Call `service.generateOtp`.
    *   **Assert:** `create` called with mobile/branch. `smsService.sendOtp` called.
3.  **Test 2 (Existing Visitor):**
    *   Mock `prisma.visitor.findUnique` returns `MOCK_VISITOR_DEFAULT`.
    *   Call `service.generateOtp`.
    *   **Assert:** `create` NOT called. `update` called with new OTP/Expiry.
4.  **Test 3 (Test Mode):**
    *   Set Env `TEST_MODE=true`.
    *   Call `service.generateOtp`.
    *   **Assert:** Returned OTP is `"123456"`. SMS is still triggered (or mocked).

**Scenario: verifyOtp(mobile, otp)**
1.  **Test 1 (Success):**
    *   Mock visitor with `otpCode="123456"`, `otpExpiry` = future date.
    *   Call `service.verifyOtp("...", "123456")`.
    *   **Assert:** Returns `{ success: true }`. `update` called with `otpCode: null`, `phoneVerified: true`.
2.  **Test 2 (Expired):**
    *   Mock visitor with `otpExpiry` = past date.
    *   Call `service.verifyOtp`.
    *   **Assert:** Returns `{ success: false, code: 'OTP_EXPIRED' }`.
3.  **Test 3 (Locked):**
    *   Mock visitor with `phoneVerificationAttempts = 3`.
    *   Call `service.verifyOtp`.
    *   **Assert:** Returns `{ success: false, code: 'OTP_LOCKED' }`.

---

### 4.3 GatePassService Logic

**Scenario: generateCheckInOtp(visitId)**
1.  **Setup:** Mock `ConfigService` for `TEST_MODE`.
2.  **Test 1 (Prod Mode):**
    *   Set `TEST_MODE=false`.
    *   Mock `prisma.visit.findUnique` returns `MOCK_VISIT_DEFAULT`.
    *   Call `service.generateCheckInOtp`.
    *   **Assert:** `update` called with random 6-digit OTP and `checkInOtpExpiry` ~8h from now.
3.  **Test 2 (Test Mode):**
    *   Set `TEST_MODE=true`.
    *   Call `service.generateCheckInOtp`.
    *   **Assert:** `update` called with OTP `"654321"`.

---

## 5. Coverage Requirements

1.  **Statements:** > 90% (Ideally 100% for these critical logic services).
2.  **Branches:** > 90% (Ensure all if/else paths for validation/modes are covered).
3.  **Functions:** 100%.

## 6. Implementation Notes for Developer

- Use `jest.spyOn(Date, 'now')` or `jest.useFakeTimers()` to test expiration logic reliably.
- Ensure `process.env` changes are restored `afterEach` in `TestModeUtil` tests.
- Do not mock the *System Under Test (SUT)*, only its dependencies.
