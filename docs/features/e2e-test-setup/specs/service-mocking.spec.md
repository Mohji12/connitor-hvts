# Technical Specification: Service Mocking - Auth & Messaging (Task 2)

This specification outlines the implementation for bypassing external messaging services and using fixed credentials during End-to-End (E2E) testing. This ensures deterministic test results and prevents unnecessary costs or side effects on external APIs (AWS SNS, Meta WhatsApp).

## 1. Overview
When the system is in **Test Mode** (determined by `isTestModeEnabled()`), the backend must:
1. Use a fixed OTP for authentication instead of generating a random 6-digit number.
2. Intercept SMS delivery and log the content to the console instead of calling AWS SNS.
3. Intercept WhatsApp delivery and log the intent instead of calling the Meta Graph API.

## 2. Affected Files
- `backend/src/auth/auth.service.ts`
- `backend/src/messaging/sms.service.ts`
- `backend/src/messaging/whatsapp.service.ts`

## 3. Shared Utility: `isTestModeEnabled()`
Each affected service must implement or use a shared check to verify if test mode is active. Following the security pattern defined in Task 1, this check ensures test logic is **never** active in production.

### Function Signature
```typescript
private isTestModeEnabled(): boolean
```

### Logic
1. Retrieve `TEST_MODE` from `ConfigService`.
2. Retrieve `NODE_ENV` from `process.env`.
3. If `NODE_ENV === 'production'` AND `TEST_MODE === 'true'`:
   - Log error: `SECURITY: TEST_MODE cannot be enabled in production!`
   - Return `false`.
4. Return `true` if `TEST_MODE === 'true'`, otherwise `false`.

---

## 4. Per-Service Changes

### 4.1 AuthService Modifications
**Path:** `backend/src/auth/auth.service.ts`

#### Current Logic (`login` method)
```typescript
const otp = Math.floor(100000 + Math.random() * 900000).toString();
// ... hash and store ...
await this.smsService.sendOtp(cleanPhone, otp);
```

#### New Logic (`login` method)
1. Call `this.isTestModeEnabled()`.
2. If `true`:
   - Get `otp` from `this.config.get('E2E_FIXED_OTP')`.
   - If `otp` is null/undefined, throw `InternalServerErrorException('E2E_FIXED_OTP is not configured in test mode')`.
   - Log: `[TEST_MODE] Fixed OTP generated for ${cleanPhone}: ${otp}`.
   - Proceed to hash and store OTP in database.
   - **SKIP** `this.smsService.sendOtp()`.
3. If `false`:
   - Proceed with standard random OTP generation and `smsService.sendOtp()` call.

### 4.2 SmsService Modifications
**Path:** `backend/src/messaging/sms.service.ts`

#### Current Logic (`sendOtp` method)
```typescript
async sendOtp(phone: string, otp: string): Promise<void> {
  const message = `...`;
  const sns = this.getSnsClient();
  await sns.send(new PublishCommand({ ... }));
}
```

#### New Logic (`sendOtp` method)
1. Call `this.isTestModeEnabled()`.
2. If `true`:
   - Construct the message string.
   - Log: `[TEST_MODE] SMS Delivery Mocked. To: ${phone}, Message: ${message}`.
   - Return immediately (do not call `getSnsClient()` or `sns.send()`).
3. If `false`:
   - Proceed with standard AWS SNS delivery.

### 4.3 WhatsAppService Modifications
**Path:** `backend/src/messaging/whatsapp.service.ts`

#### Current Logic (`sendGatePass` method)
```typescript
async sendGatePass(to: string, branchName: string, gatePassBase64: string): Promise<boolean> {
  // ... validation ...
  const mediaId = await this.uploadMedia(imageBuffer);
  return this.sendTemplateMessage(phone, branchName, mediaId);
}
```

#### New Logic (`sendGatePass` method)
1. Call `this.isTestModeEnabled()`.
2. If `true`:
   - Log: `[TEST_MODE] WhatsApp Delivery Mocked. To: ${to}, Branch: ${branchName}, Content: [Gate Pass Image]`.
   - Return `true` (success).
3. If `false`:
   - Proceed with standard Meta API upload and delivery.

---

## 5. Log Message Formats
Logs must use the `[TEST_MODE]` prefix for easy filtering in CI/CD environments.

| Event | Format String |
|-------|---------------|
| Auth OTP | `[TEST_MODE] Fixed OTP generated for ${phone}: ${otp}` |
| SMS Mock | `[TEST_MODE] SMS Delivery Mocked. To: ${phone}, Message: ${message}` |
| WhatsApp Mock | `[TEST_MODE] WhatsApp Delivery Mocked. To: ${phone}, Branch: ${branchName}, Content: [Gate Pass Image]` |

---

## 6. Error Handling

- **Missing Config:** If `isTestModeEnabled()` is true but `E2E_FIXED_OTP` is missing in `AuthService.login()`, the application must throw an `InternalServerErrorException`.
- **Production Guard:** If `NODE_ENV=production` and `TEST_MODE=true`, the services must fall back to standard production behavior to prevent security vulnerabilities.

---

## 7. Unit Test Cases

### 7.1 AuthService
- **Scenario:** Test mode enabled, `E2E_FIXED_OTP` present.
  - **Expect:** `otp` matches `E2E_FIXED_OTP`, `smsService.sendOtp` is NOT called.
- **Scenario:** Test mode enabled, `E2E_FIXED_OTP` missing.
  - **Expect:** Throws `InternalServerErrorException`.
- **Scenario:** Test mode disabled.
  - **Expect:** `otp` is a random 6-digit string, `smsService.sendOtp` IS called.

### 7.2 SmsService
- **Scenario:** Test mode enabled.
  - **Expect:** Log contains `[TEST_MODE]`, `SNSClient.send` is NOT called.

### 7.3 WhatsAppService
- **Scenario:** Test mode enabled.
  - **Expect:** Log contains `[TEST_MODE]`, returns `true`, `fetch` (Meta API) is NOT called.

---

## 8. Acceptance Criteria
1. `AuthService` uses `E2E_FIXED_OTP` when `TEST_MODE=true` and `NODE_ENV!=production`.
2. No real SMS is sent via AWS when `TEST_MODE=true`.
3. No real WhatsApp message is sent via Meta when `TEST_MODE=true`.
4. All mocked actions are logged to `stdout` with the `[TEST_MODE]` prefix.
5. Standard behavior is preserved when `TEST_MODE=false`.
6. Security guard prevents `TEST_MODE` from running in `NODE_ENV=production`.
