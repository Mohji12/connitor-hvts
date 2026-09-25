# Technical Specification: TEST_MODE Support

> **Feature:** Unified Visitor Workflow
> **Task:** 1.6 - Implement TEST_MODE environment variable support for deterministic behavior
> **Increment:** 1

## 1. File Path

`backend/src/common/utils/test-mode.util.ts`

## 2. Overview

This utility provides a centralized way to detect if the application is running in `TEST_MODE` and to generate deterministic values (specifically OTPs) when this mode is enabled. This is crucial for End-to-End (E2E) testing where random values like OTPs would break automated flows.

## 3. Environment Variables

| Variable | Type | Allowed Values | Description |
| :--- | :--- | :--- | :--- |
| `TEST_MODE` | String | `"true"`, any other value | If set exactly to `"true"`, deterministic behavior is enabled. All other values (including "True", "1", undefined) are treated as false. |

## 4. Function Signatures & Implementation

### 4.1. `isTestMode()`

Determines if the application is currently running in test mode.

```typescript
/**
 * Checks if the application is running in TEST_MODE.
 * Strict check for the string "true".
 *
 * @returns {boolean} true if process.env.TEST_MODE === 'true', else false
 */
export function isTestMode(): boolean {
  return process.env.TEST_MODE === 'true';
}
```

### 4.2. `generateOtp()`

Generates a numeric OTP. If in `TEST_MODE` and a `testValue` is provided, returns the `testValue`. Otherwise, generates a cryptographically strong random OTP.

```typescript
import { randomInt } from 'crypto';

/**
 * Generates a numeric OTP string.
 *
 * @param {number} length - The length of the OTP (default: 6)
 * @param {string} [testValue] - The deterministic value to return if in TEST_MODE
 * @returns {string} The generated OTP
 */
export function generateOtp(length: number = 6, testValue?: string): string {
  // 1. Check for Test Mode
  if (isTestMode() && testValue) {
    return testValue;
  }

  // 2. Generate Random OTP (Production/Default behavior)
  // Generates a number between 0 and 10^length - 1
  const max = Math.pow(10, length);
  const min = 0;
  
  // Use crypto.randomInt for security
  const randomValue = randomInt(min, max);
  
  // Pad with leading zeros to ensure correct length
  return randomValue.toString().padStart(length, '0');
}
```

## 5. Usage Examples

### 5.1. Phone Verification Service (Phone OTP)

```typescript
import { generateOtp } from '@/common/utils/test-mode.util';

// Inside PhoneVerificationService
const otp = generateOtp(6, '123456'); 
// Result in Prod: "829104" (random)
// Result in Test: "123456"
```

### 5.2. Gate Pass Service (Check-In OTP)

```typescript
import { generateOtp } from '@/common/utils/test-mode.util';

// Inside GatePassService
const checkInOtp = generateOtp(6, '654321');
// Result in Prod: "392817" (random)
// Result in Test: "654321"
```

## 6. Security Considerations

- **Production Safety:** `TEST_MODE` must **NEVER** be set to `"true"` in a production environment.
- **Fail-Safe:** The `isTestMode()` function uses a strict equality check (`=== 'true'`). If the variable is missing, empty, or misspelled, it defaults to safe production behavior (random values).
- **Logging:** When `TEST_MODE` is active, the application startup logs should clearly indicate this status (to be handled in `main.ts` or `AppModule`).

## 7. Test Plan

### 7.1. Unit Tests (`backend/src/common/utils/test-mode.util.spec.ts`)

**Test Suite: `isTestMode`**
- `should return true when process.env.TEST_MODE is 'true'`
- `should return false when process.env.TEST_MODE is 'false'`
- `should return false when process.env.TEST_MODE is undefined`
- `should return false when process.env.TEST_MODE is 'True'` (case sensitivity)

**Test Suite: `generateOtp`**
- **Context: TEST_MODE = 'true'**
  - `should return fixed value '123456' when passed as testValue`
  - `should return random value if testValue is not provided` (fallback)
- **Context: TEST_MODE = undefined (Production)**
  - `should return random value even if testValue is provided`
  - `should return string of requested length`
  - `should return string containing only digits`
