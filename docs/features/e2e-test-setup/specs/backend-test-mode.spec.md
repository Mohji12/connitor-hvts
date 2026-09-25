# Technical Specification: Backend Configuration & Security (Task 1)

## 1. Overview
The goal of this task is to implement a secure "Test Mode" in the NestJS backend. This mode allows for E2E-specific behaviors (like using a fixed OTP) without compromising production security. The configuration must be strictly enforced to be disabled in production environments.

## 2. File Locations
| Component | Path |
| :--- | :--- |
| Environment Config | `backend/.env` |
| Environment Example | `backend/.env.example` |
| App Config Service | `backend/src/common/services/app-config.service.ts` |
| Common Module | `backend/src/common/common.module.ts` |

## 3. Environment Variables
These variables must be added to `.env` and `.env.example`.

| Name | Type | Constraints | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `NODE_ENV` | `string` | `development` \| `test` \| `production` | `development` | System environment |
| `TEST_MODE` | `boolean` | `true` \| `false` | `false` | Enables test-specific logic |
| `E2E_FIXED_OTP` | `string` | 6 digits (`^[0-9]{6}$`) | `undefined` | Fixed OTP for E2E tests |

## 4. TypeScript Interfaces/Types

### `AppConfig` Interface
```typescript
interface IAppConfig {
  nodeEnv: 'development' | 'test' | 'production';
  testMode: boolean;
  fixedOtp: string | null;
}
```

## 5. Function Signatures

### `AppConfigService`
```typescript
class AppConfigService {
  constructor(private readonly configService: ConfigService) {}

  /**
   * Returns true if TEST_MODE is enabled and environment is NOT production.
   * @returns {boolean}
   */
  isTestModeEnabled(): boolean;

  /**
   * Returns the fixed OTP if test mode is enabled, otherwise null.
   * @returns {string | null}
   */
  getFixedOtp(): string | null;
}
```

## 6. Implementation Logic

### `isTestModeEnabled()` Logic
1.  Retrieve `NODE_ENV` from `ConfigService`.
2.  Retrieve `TEST_MODE` from `ConfigService` (convert string "true" to boolean).
3.  **Strict Check:**
    *   If `NODE_ENV === 'production'`, return `false` regardless of `TEST_MODE` value.
    *   If `TEST_MODE` is `true` AND `NODE_ENV !== 'production'`, return `true`.
    *   Otherwise, return `false`.

### `getFixedOtp()` Logic
1.  Call `this.isTestModeEnabled()`.
2.  If `false`, return `null`.
3.  If `true`, retrieve `E2E_FIXED_OTP` from `ConfigService`.
4.  If `E2E_FIXED_OTP` is missing or invalid format (not 6 digits), return `null`.
5.  Return the OTP string.

## 7. Error Handling

| Scenario | Behavior | Error Shape |
| :--- | :--- | :--- |
| `E2E_FIXED_OTP` is not 6 digits in Test Mode | Log warning, return `null` | N/A (Internal Log) |
| `TEST_MODE` is true in `production` | Log security warning, return `false` | N/A (Internal Log) |

## 8. Security Matrix

| NODE_ENV | TEST_MODE (Env) | isTestModeEnabled() Result | Security Action |
| :--- | :--- | :--- | :--- |
| `production` | `true` | **`false`** | **WARNING:** Log unauthorized test mode attempt |
| `production` | `false` | `false` | None |
| `development` | `true` | `true` | None |
| `test` | `true` | `true` | None |
| `test` | `false` | `false` | None |

## 9. Unit Test Cases

### `AppConfigService.isTestModeEnabled()`
- [ ] Should return `false` when `NODE_ENV=production` and `TEST_MODE=true`.
- [ ] Should return `false` when `NODE_ENV=production` and `TEST_MODE=false`.
- [ ] Should return `true` when `NODE_ENV=development` and `TEST_MODE=true`.
- [ ] Should return `true` when `NODE_ENV=test` and `TEST_MODE=true`.
- [ ] Should return `false` when `NODE_ENV=development` and `TEST_MODE=false`.

### `AppConfigService.getFixedOtp()`
- [ ] Should return `null` if `isTestModeEnabled()` is `false`.
- [ ] Should return the value of `E2E_FIXED_OTP` if `isTestModeEnabled()` is `true` and OTP is valid.
- [ ] Should return `null` if `E2E_FIXED_OTP` is provided but `isTestModeEnabled()` is `false`.
- [ ] Should return `null` if `E2E_FIXED_OTP` is not 6 digits even if `isTestModeEnabled()` is `true`.

## 10. Acceptance Criteria
1.  `AppConfigService` is implemented and registered in `CommonModule`.
2.  `CommonModule` is imported into `AppModule`.
3.  The service correctly identifies when test mode should be active.
4.  Logs are generated when someone attempts to enable `TEST_MODE` in `production`.
5.  Env variables are documented in `.env.example`.
6.  All methods have explicit return types (no `any`).
