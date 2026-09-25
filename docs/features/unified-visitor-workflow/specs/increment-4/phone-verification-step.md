# Technical Specification: Phone Verification Step (Step 1b)

> **Task ID:** 4.2
> **Increment:** 4 - Public Registration UI (Phone Auth Flow)
> **Status:** Approved
> **Created:** 2026-01-27
> **Approved:** 2026-01-27
> **Dependencies:** Task 3.1 (OtpInput component), Task 2.2 (verify-phone endpoint)

---

## 1. Overview

Second step in public visitor registration wizard. Visitors enter the 6-digit OTP sent via SMS to verify phone ownership. Integrates with `POST /public/visitors/verify-phone` API and reuses the `OtpInput` component from Increment 3.

### Key Features
- 6-digit OTP input using `OtpInput` component (Task 3.1)
- 60-second countdown timer for resend functionality
- "Resend OTP" link (disabled during countdown)
- Success animation with green checkmark before transition
- Error display with attempts remaining
- Auto-submit when OTP is complete
- Network error handling with retry capability

---

## 2. File Path

```
frontend/src/app/visitor-registration/phone-verification-step.tsx
```

---

## 3. Data Models

### 3.1 Component Props

```typescript
export interface PhoneVerificationStepProps {
  phone: string; // 10-digit phone number (from Step 1a)
  branchId: string; // UUID for verify-phone API
  isNewVisitor: boolean; // From send-otp response
  onSuccess: (data: VerificationSuccessData) => void;
  onCancel?: () => void;
}

export interface VerificationSuccessData {
  visitorData: VisitorData;
  isExistingVisitor: boolean;
  phone: string;
}
```

### 3.2 Component State

```typescript
export interface VerificationState {
  otp: string;
  countdown: number; // Seconds remaining (0-60)
  canResend: boolean;
  error: string | null;
  attemptsRemaining: number;
  isVerifying: boolean;
  isSuccess: boolean;
}
```

### 3.3 API Contracts

```typescript
export interface VerifyPhoneRequest {
  phone: string;
  otp: string;
  branchId: string;
}

export interface VerifyPhoneResponse {
  verified: true;
  isExistingVisitor: boolean;
  visitorData: VisitorData;
}

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

export interface VerifyPhoneErrorResponse {
  statusCode: number;
  message: string | string[];
  error: string; // PhoneVerificationError enum value
}

export enum PhoneVerificationError {
  OTP_LOCKED = 'OTP_LOCKED',
  SMS_SEND_FAILED = 'SMS_SEND_FAILED',
  OTP_EXPIRED = 'OTP_EXPIRED',
  INVALID_OTP = 'INVALID_OTP',
  VISITOR_NOT_FOUND = 'VISITOR_NOT_FOUND',
  PHONE_NOT_VERIFIED = 'PHONE_NOT_VERIFIED',
}

export interface SendOtpResponse {
  success: true;
  message: string;
  isNewVisitor: boolean;
  testOtp?: string; // TEST_MODE only
}
```

### 3.4 Validation Schema

```typescript
const otpSchema = z.object({
  otp: z
    .string()
    .min(6, 'Please enter all 6 digits')
    .max(6, 'OTP must be exactly 6 digits')
    .regex(/^[0-9]{6}$/, 'OTP must contain only digits'),
});

export type OtpFormData = z.infer<typeof otpSchema>;
```

---

## 4. Component Structure

```typescript
/**
 * PhoneVerificationStep - Renders 6-digit OTP input with countdown timer.
 * Validates OTP via verify-phone API, handles errors and success states.
 */
export function PhoneVerificationStep(props: PhoneVerificationStepProps): JSX.Element
```

**Child Components**:
- **OtpInput**: Reused from `@/components/visitors/shared/OtpInput` (Task 3.1)
- **CountdownTimer**: Displays "Resend in {N}s" or "Didn't receive? Resend"
- **SuccessAnimation**: Green checkmark with fade-in effect
- **LoadingSpinner**: Button state spinner

---

## 5. Logic Flow

### 5.1 Initialization

```typescript
// Extract phone, branchId, isNewVisitor from props
// Initialize OTP state to empty string
// Start countdown timer at 60 seconds
// Set canResend = false
// Set up TanStack Query mutations (verifyOtp, resendOtp)
// Focus first OTP input box (via OtpInput ref)
```

### 5.2 OTP Input Handling

```typescript
function handleOtpChange(otp: string): void {
  // Update state, clear error, auto-submit if 6 digits
}
```

### 5.3 OTP Verification

```typescript
async function verifyOtp(otp: string): Promise<void> {
  const result = await verifyOtpMutation.mutateAsync({
    phone: props.phone,
    otp: otp,
    branchId: props.branchId,
  });

  if (result.verified) {
    setTimeout(() => {
      props.onSuccess({
        visitorData: result.visitorData,
        isExistingVisitor: result.isExistingVisitor,
        phone: props.phone,
      });
    }, 1000);
  }
}
```

### 5.4 Countdown Timer

```typescript
useEffect(() => {
  // Decrement every second, set canResend = true at 0, cleanup on unmount
}, [countdown, canResend]);

async function handleResendOtp(): Promise<void> {
  await resendOtpMutation.mutateAsync({
    phone: props.phone,
    branchId: props.branchId,
  });
  setCountdown(60);
  setCanResend(false);
  setOtp('');
  setError(null);
}
```

### 5.5 Error Handling

```typescript
const errorMessages: Record<PhoneVerificationError, string> = {
  INVALID_OTP: 'Invalid code. Please try again.',
  OTP_EXPIRED: 'Code expired. Please request a new code.',
  OTP_LOCKED: 'Too many attempts. Please wait 10 minutes.',
  SMS_SEND_FAILED: 'Failed to send OTP. Please try again.',
  VISITOR_NOT_FOUND: 'Visitor not found. Please start over.',
  PHONE_NOT_VERIFIED: 'Phone not verified. Please try again.',
};

if (error === PhoneVerificationError.INVALID_OTP && attemptsRemaining > 0) {
  return `${errorMessages.INVALID_OTP} ${attemptsRemaining} attempts remaining.`;
}

if (isNetworkError) {
  return 'Connection lost. Please check your internet and try again.';
}
```

### 5.6 Success Animation

```typescript
// Set isSuccess = true, display green checkmark, show message, fade after 1s, trigger onSuccess
```

### 5.7 Change Phone Number

```typescript
function handleChangePhone(): void {
  props.onCancel?.();
}
```

---

## 6. Styling Requirements

### 6.1 Layout & Typography
- Container: Centered, max-width 480px, single column
- Step indicator: Small gray text "Step 1 of 6"
- Header: Conversational "Verify Your Phone Number"
- Sub-header: "We've sent a 6-digit code to +91 XXX**XXXX via SMS"
- Typography: Clean sans-serif (Inter/Geist)

### 6.2 OTP Input
- Reuse `OtpInput` from Task 3.1 with 48px height for mobile touch targets
- Error state: Red border on all boxes with red error text below
- Focus state: Blue ring on active box

### 6.3 Countdown Timer
- Gray color, small font: "Resend in 60s" or "Didn't receive? Resend"
- Link: Blue, underlined, clickable only when canResend = true
- Disabled: Gray, no underline during countdown

### 6.4 Error Messages
- Red color (text-destructive), small font, below OTP input
- Append "X attempts remaining" to message
- Fade in animation on error

### 6.5 Success Animation
- Large green checkmark icon (lucide-react)
- Scale in + fade in (200-300ms)
- "Phone verified successfully!" below checkmark

### 6.6 Buttons
- Primary: Blue background, white text, rounded, height 12
- Loading: Spinner + "Verifying..."
- Change phone link: Gray, small, below countdown
- 200ms transitions for all interactive states

---

## 7. Accessibility

### 7.1 ARIA Attributes

```tsx
<div role="group" aria-label="Phone verification">
  <p aria-label="Registration progress: Step 1 of 6">Step 1 of 6</p>
  <h1 id="otp-heading">Verify Your Phone Number</h1>
  <p aria-describedby="phone-masked">We've sent a 6-digit code to {maskPhone(props.phone)} via SMS</p>
  <OtpInput aria-label="Enter verification code" aria-invalid={!!error} aria-describedby={error ? 'otp-error' : undefined} />
  {error && <p id="otp-error" role="alert" aria-live="assertive">{error}</p>}
  {isSuccess && <div role="status" aria-live="polite"><CheckIcon aria-label="Verification successful" /><p>Phone verified successfully!</p></div>}
  <p aria-live="polite" aria-atomic="true">{canResend ? <button onClick={handleResendOtp}>Didn't receive? Resend</button> : `Resend in ${countdown}s`}</p>
</div>
```

### 7.2 Keyboard Navigation & Focus Management
- **Tab**: OtpInput → Resend link → Change phone link
- **Enter**: Submits form when OTP complete
- **Backspace/Arrow**: Handled by OtpInput
- **Escape**: Triggers onCancel (if available)
- **Focus**: Auto-focus first OTP box on mount; return focus on error; focus success on success; focus resend after resend
- **Screen Readers**: Announce step progress, OTP sent, errors (assertive), success (polite), countdown changes

---

## 8. Testing

### 8.1 Component Tests (React Testing Library)

**File:** `frontend/src/app/visitor-registration/phone-verification-step.test.tsx`

**Test Categories:**
1. **Rendering**: Step indicator, header, masked phone, OtpInput, countdown, change phone
2. **OTP Input**: handleOtpChange calls, auto-submit, error clearing
3. **Countdown Timer**: Start/decrement, resend enable/disable, countdown reset
4. **Resend OTP**: API call, state reset
5. **Success**: Animation, message, callback data
6. **Error Handling**: All error types with correct messages
7. **Change Phone**: Callback, navigation
8. **Loading States**: Spinner, disabled controls, text
9. **Accessibility**: ARIA attributes, keyboard navigation, screen readers

### 8.2 Storybook Stories

**File:** `frontend/src/app/visitor-registration/phone-verification-step.stories.tsx`

Required Stories: Default, Partial OTP, Full OTP, Can Resend, Loading, Success, Error (Invalid/Expired/Locked), Network Error, With Initial OTP, Long Phone masking

### 8.3 E2E Tests (Playwright)

**File:** `frontend/e2e/visitor-registration/phone-verification.spec.ts`

Required Scenarios: Complete verification (new/existing visitor), Resend OTP, Error handling, Network recovery, Change phone, Keyboard navigation, Success animation/transition

---

## 9. Example Usage

```tsx
'use client';
import { PhoneVerificationStep } from '@/app/visitor-registration/phone-verification-step';
import { useState } from 'react';

export default function RegistrationPage() {
  const [step, setStep] = useState(2);
  const [visitorData, setVisitorData] = useState<VisitorData | null>(null);

  const handleVerificationSuccess = (data: VerificationSuccessData) => {
    setVisitorData(data.visitorData);
    setStep(data.isExistingVisitor ? 4 : 3);
  };

  const handleCancel = () => setStep(1);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      {step === 2 && (
        <PhoneVerificationStep
          phone="9999999999"
          branchId="550e8400-e29b-41d4-a716-446655440000"
          isNewVisitor={false}
          onSuccess={handleVerificationSuccess}
          onCancel={handleCancel}
        />
      )}
      {step === 3 && <VisitTypeSelectionStep visitorData={visitorData} />}
    </div>
  );
}
```

---

## 10. Edge Cases & Recovery

### 10.1 Key Edge Cases
1. **OTP < 6 digits**: No submit, validation error
2. **Non-numeric OTP**: Validation error (rejected by OtpInput)
3. **Concurrent submissions**: Button disabled during mutation
4. **Unmount during API call**: Mutation canceled, no state updates
5. **Network timeout/500 error**: Show error, allow retry
6. **TEST_MODE OTP**: Use testOtp from localStorage if available
7. **Rapid resend clicks**: Button disabled during resend mutation
8. **Countdown reaches 0**: Enable resend link immediately

### 10.2 Recovery Strategies
- **Invalid OTP**: Clear OTP, show error, keep countdown, allow retry
- **Expired OTP**: Prompt to resend, reset countdown on resend
- **Locked**: Show 10-minute wait, disable resend until lock expires
- **Network error**: Show error, keep OTP, enable retry
- **API error**: Show user-friendly message, map error codes

### 10.3 Special Cases
1. **Existing Visitor**: Auto-fill data in subsequent steps
2. **TEST_MODE**: Display testOtp in console for debugging
3. **Multiple tabs**: Only one active verification (API handled)
4. **Browser refresh**: State lost (restart from Step 1a)

---

## 11. Implementation Notes

### 11.1 Dependencies

```json
{
  "dependencies": {
    "react": "^18.3.0",
    "react-hook-form": "^7.51.0",
    "zod": "^3.22.0",
    "@tanstack/react-query": "^5.28.0",
    "lucide-react": "^0.367.0",
    "clsx": "^2.1.0",
    "tailwind-merge": "^2.2.0"
  }
}
```

### 11.2 Integration Patterns
- **TanStack Query**: Two mutations (verifyOtp, resendOtp), no caching
- **React Hook Form**: useForm with zodResolver (optional, OtpInput is controlled)
- **OtpInput Component**: Reused from Task 3.1, controlled via `value` and `onChange`
- **Parent-Child**: Parent passes phone/branchId/callbacks, child triggers onSuccess
- **Global State**: Context/Zustand for cross-step data sharing
- **LocalStorage**: TEST_MODE testOtp retrieval (optional)

### 11.3 TEST_MODE Support

```typescript
const testOtp = typeof window !== 'undefined'
  ? localStorage.getItem('test_otp')
  : null;

if (import.meta.env.DEV && testOtp) {
  console.log(`[TEST_MODE] Test OTP: ${testOtp}`);
  setOtp(testOtp);
}
```

### 11.4 Performance & Security
- **Memoization**: Use useCallback for event handlers
- **Timer**: Use setInterval, cleanup on unmount
- **Browser Support**: Chrome 90+, Firefox 88+, Safari 14+, Edge 90+
- **OTP Masking**: Never log full OTP in production
- **Test Mode**: Only expose testOtp in development/TEST_MODE
- **Rate Limiting/Locking**: Handled by backend (3 requests per IP per hour, 3 failed attempts)
- **XSS Prevention**: React automatically escapes JSX content

---

## 12. Acceptance Criteria

Task 4.2 is complete when:

1. ✅ Renders OtpInput component (6-digit input with auto-focus)
2. ✅ Displays step indicator "Step 1 of 6", header, sub-header with masked phone
3. ✅ Countdown timer starts at 60s, decrements, enables resend at 0
4. ✅ Resend OTP calls `POST /public/visitors/send-otp`, resets countdown, clears OTP/error
5. ✅ Auto-submits when OTP complete (6 digits) to `POST /public/visitors/verify-phone`
6. ✅ Loading state: spinner, disabled controls, "Verifying..." text
7. ✅ Success: green checkmark, message, transitions after 1s
8. ✅ Error display for INVALID_OTP (with attempts), OTP_EXPIRED, OTP_LOCKED, network failures
9. ✅ "Change phone number" link navigates back to Step 1a
10. ✅ Layout centered (480px max), mobile-optimized
11. ✅ All ARIA attributes present, keyboard navigation works, screen reader announcements
12. ✅ Prevents concurrent submissions, handles TEST_MODE testOtp
13. ✅ All component tests, Storybook stories, E2E tests pass
14. ✅ No TypeScript errors or console warnings, responsive on all devices

---

## 13. Related Tasks

- **Task 2.1:** POST `/public/visitors/send-otp` endpoint
- **Task 2.2:** POST `/public/visitors/verify-phone` endpoint
- **Task 3.1:** Create `OtpInput` component
- **Task 4.1:** Create phone entry step
- **Task 4.3:** Create visit type selection step
- **Task 4.4:** Create Delivery registration form
- **Task 4.5:** Create Meeting registration form

---

**End of Specification**
