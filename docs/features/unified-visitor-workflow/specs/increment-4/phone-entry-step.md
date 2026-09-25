# Technical Specification: Phone Entry Step (Step 1a)

> **Task ID:** 4.1
> **Increment:** 4 - Public Registration UI (Phone Auth Flow)
> **Status:** Approved
> **Created:** 2026-01-27
> **Approved:** 2026-01-27
> **Dependencies:** Task 2.1 (send-otp endpoint)

---

## 1. Overview

First step in public visitor registration wizard. Captures visitor's mobile phone number and initiates SMS OTP verification via `POST /public/visitors/send-otp` API. Serves as entry point for both new and returning visitors.

### Key Features
- Phone input with fixed +91 country code prefix (India)
- Zod schema validation (10-digit numbers only)
- TanStack Query for async OTP sending
- Loading states and inline error handling
- Mobile-optimized, touch-friendly layout

---

## 2. File Path

```
frontend/src/app/visitor-registration/phone-entry-step.tsx
```

---

## 3. Data Models

### 3.1 Component Props

```typescript
export interface PhoneEntryStepProps {
  branchId: string; // Required UUID for send-otp API
  onSuccess: (data: { phone: string; isNewVisitor: boolean }) => void;
  onCancel?: () => void;
  initialPhone?: string;
}

export interface PhoneEntryFormState {
  phone: string;
}
```

### 3.2 Validation Schema

```typescript
const phoneEntrySchema = z.object({
  phone: z
    .string()
    .min(1, 'Phone number is required')
    .regex(/^[0-9]{10}$/, 'Phone must be exactly 10 digits'),
});

export type PhoneEntryFormData = z.infer<typeof phoneEntrySchema>;
```

### 3.3 API Contracts

```typescript
export interface SendOtpRequest {
  phone: string;
  branchId: string;
}

export interface SendOtpResponse {
  success: true;
  message: string;
  isNewVisitor: boolean;
  testOtp?: string; // TEST_MODE only
}

export interface SendOtpErrorResponse {
  statusCode: number;
  message: string | string[];
  error: string;
}

export enum PhoneEntryErrorType {
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
  API_ERROR = 'API_ERROR',
  OTP_LOCKED = 'OTP_LOCKED',
  RATE_LIMITED = 'RATE_LIMITED',
}
```

---

## 4. Component Structure

### 4.1 Main Component

```typescript
/**
 * PhoneEntryStep - Renders phone input form with country code prefix.
 * Validates phone, calls send-otp API, handles loading and errors.
 */
export function PhoneEntryStep(props: PhoneEntryStepProps): JSX.Element
```

### 4.2 Child Components

**PhoneInputField**: Displays +91 prefix with input for 10 digits
**LoadingSpinner**: Button state spinner (sm | md | lg)

---

## 5. Logic Flow

### 5.1 Initialization
```typescript
// 1. Parse branchId from props
// 2. Initialize react-hook-form with zodResolver
// 3. Set up TanStack Query mutation
// 4. Set initial phone if provided
```

### 5.2 Form Validation
```typescript
// Validates against phoneEntrySchema: /^[0-9]{10}$/
// Errors: "Phone number is required" | "Phone must be exactly 10 digits"
// Display inline red error message + red border
```

### 5.3 Form Submission
```typescript
async function onSubmit(data: PhoneEntryFormData): Promise<void> {
  const result = await sendOtpMutation.mutateAsync({
    phone: data.phone,
    branchId: props.branchId,
  });

  if (result.success) {
    if (result.testOtp) localStorage.setItem('test_otp', result.testOtp);
    props.onSuccess({ phone: data.phone, isNewVisitor: result.isNewVisitor });
  }
}
```

### 5.4 Error Handling
```typescript
// Network Error: "Connection lost. Please check your internet and try again."
// 400 OTP_LOCKED: "Too many failed attempts. Please try again in 10 minutes."
// 400 SMS_SEND_FAILED: "Failed to send OTP. Please try again."
// 429 Rate Limit: "Too many requests. Please try again later."
// Generic: "Something went wrong. Please try again."
```

### 5.5 Loading States
```typescript
// Pending: Disable input/button, show spinner, change text to "Sending..."
// Complete: Re-enable controls, remove spinner, restore button text
```

---

## 6. Styling Requirements

### 6.1 Layout & Typography
- Centered container (max-width 480px), mobile-first
- Step indicator: Small gray text "Step 1 of 6"
- Header: Bold 2xl text, conversational tone
- Error messages: Small red text below input

### 6.2 Input Field
- Fixed +91 prefix (gray, medium weight)
- Height 12 units, rounded, gray border
- Focus: Blue ring, transparent border
- Error: Red border and ring
- Disabled: Gray background, reduced opacity
- type="tel" with inputMode="numeric" for mobile

### 6.3 Buttons
- Primary: Blue background, white text, rounded, height 12
- Hover: Darker blue, Disabled: Gray, Loading: Spinner + "Sending..."
- Cancel (optional): Border button, gray text, hover background
- 200ms transitions

---

## 7. Accessibility

### 7.1 ARIA Attributes
```tsx
<input
  type="tel"
  id="phone-input"
  aria-label="Mobile phone number"
  aria-describedby={error ? 'phone-error' : 'phone-hint'}
  aria-invalid={!!error}
  required
/>
{error && <p id="phone-error" role="alert">{error.message}</p>}
```

### 7.2 Navigation & Focus
- Tab order: Input → Send OTP → Cancel
- Enter submits, Escape cancels (if available)
- Auto-focus input on mount, maintain focus after error

### 7.3 Screen Reader Support
- Live region for loading (aria-live="polite")
- Live region for errors (aria-live="assertive")
- Step indicator aria-label: "Registration progress: Step 1 of 6"

---

## 8. Testing

### 8.1 Component Tests (React Testing Library)
**File:** `frontend/src/app/visitor-registration/phone-entry-step.test.tsx`

**Test Categories:**
1. **Rendering**: Props, step indicator, header, input, button
2. **Validation**: Empty, non-numeric, short, long, valid inputs
3. **Country Code**: +91 read-only prefix
4. **Loading**: Spinner, text change, controls disabled
5. **Errors**: Network, API (400, 429), specific codes (OTP_LOCKED, SMS_SEND_FAILED)
6. **Success**: Callback with correct data
7. **TEST_MODE**: testOtp stored in localStorage
8. **Initial Values**: Prefilled input
9. **Cancel**: Button triggers callback
10. **Keyboard**: Enter submits, Escape cancels

### 8.2 Storybook Stories
**File:** `frontend/src/app/visitor-registration/phone-entry-step.stories.tsx`

Required: Default, ValidationError, Loading, NetworkError, WithCancel

### 8.3 E2E Tests (Playwright)
**File:** `frontend/e2e/visitor-registration/phone-entry.spec.ts`

Required: Complete flow, Validation error, Network error, Keyboard navigation

---

## 9. Example Usage

```tsx
'use client';
import { PhoneEntryStep } from '@/app/visitor-registration/phone-entry-step';
import { useState } from 'react';

export default function RegistrationPage() {
  const [step, setStep] = useState(1);
  const [visitorData, setVisitorData] = useState<VisitorData | null>(null);

  const handlePhoneSuccess = (data: { phone: string; isNewVisitor: boolean }) => {
    setVisitorData({ ...visitorData, phone: data.phone });
    setStep(2);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {step === 1 && (
        <PhoneEntryStep
          branchId="550e8400-e29b-41d4-a716-446655440000"
          onSuccess={handlePhoneSuccess}
        />
      )}
      {step === 2 && <OtpVerificationStep visitorData={visitorData} />}
    </div>
  );
}

// Optional: Initial value or cancel handler
<PhoneEntryStep
  branchId="..."
  initialPhone="9876543210"
  onSuccess={handlePhoneSuccess}
  onCancel={() => router.push('/')}
/>
```

---

## 10. Edge Cases & Recovery

**Key Edge Cases:**
- Invalid branchId: No client validation, API returns 400
- Phone with spaces/special chars: Validation fails
- Leading zeros: Valid (sent to API as-is)
- Concurrent submissions: Button disabled prevents duplicates
- Slow network: Loading persists until response
- Component unmounts during API: Mutation canceled
- LocalStorage full: Silent failure (TEST_MODE only)

**Recovery:**
- Network error: Show error, keep phone value, allow retry
- Validation error: Auto-focus, clear on next change
- API error: User-friendly message, show wait time for locked/rate limited

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
    "clsx": "^2.1.0",
    "tailwind-merge": "^2.2.0",
    "lucide-react": "^0.367.0"
  }
}
```

### 11.2 Integration Patterns
- **TanStack Query**: Mutation for send-otp, no caching
- **React Hook Form**: useForm with zodResolver, controlled input
- **Parent-Child**: Parent passes branchId/callbacks, child triggers onSuccess
- **Global State**: Context/Zustand for cross-step data, localStorage for TEST_MODE

### 11.3 Performance & Compatibility
- Memoize callbacks with useCallback
- Modern browsers only (Chrome 90+, Firefox 88+, Safari 14+, Edge 90+)
- ES6+ required

---

## 12. Acceptance Criteria

1. Phone input displays +91 fixed prefix
2. Accepts exactly 10 digits (numeric only)
3. Form validation rejects invalid formats
4. "Send OTP" triggers `POST /public/visitors/send-otp` with `{ phone, branchId }`
5. Loading state: spinner, disabled controls, "Sending..." text
6. Network error: "Connection lost. Please check your internet and try again."
7. API errors: OTP_LOCKED (10min), SMS_SEND_FAILED, rate limits display correctly
8. onSuccess triggers with `{ phone, isNewVisitor }`
9. testOtp stored in localStorage (TEST_MODE)
10. Layout centered (480px max), mobile-optimized
11. Step indicator and header display correctly
12. Error messages: red text below input, red border
13. ARIA attributes present
14. Keyboard navigation: Tab, Enter, Escape
15. Screen reader announces errors/loading
16. All tests pass (unit, Storybook, E2E)
17. No TypeScript errors or console warnings

---

## 13. Related Tasks

- **Task 2.1:** POST `/public/visitors/send-otp` endpoint (API dependency)
- **Task 2.2:** POST `/public/visitors/verify-phone` endpoint (Next step API)
- **Task 4.2:** Create phone verification step (Next UI step)
- **Task 4.3:** Create visit type selection step (Subsequent step)

---

**End of Specification**
