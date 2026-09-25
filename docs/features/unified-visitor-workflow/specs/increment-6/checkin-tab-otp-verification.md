# Check-In Tab with OTP Verification

**Task ID:** 6.3
**Increment:** 6
**Feature:** Unified Visitor Workflow
**Status:** Draft
**File Path:** `frontend/src/app/security/dashboard/components/CheckInTab.tsx`

## 1. File Path

- **Component:** `frontend/src/app/security/dashboard/components/CheckInTab.tsx`
- **Sub-component:** `frontend/src/app/security/dashboard/components/VisitorDetailsCard.tsx`
- **API Client:** `frontend/src/lib/api/visitors-api.ts` (add verify-checkin-otp method)

## 2. Data Models

### 2.1 Component Props

```typescript
interface CheckInTabProps {
  branchId: string;
  onCheckInSuccess?: (visitId: string) => void;
  className?: string;
}
```

### 2.2 Internal State

```typescript
type OtpVerificationState = 'idle' | 'loading' | 'success' | 'error';
type PhoneLookupState = 'idle' | 'loading' | 'found' | 'not_found' | 'error';
type TabViewMode = 'otp' | 'phone' | 'visitor_details';

interface CheckInTabState {
  viewMode: TabViewMode;
  otpValue: string;
  otpState: OtpVerificationState;
  otpError?: string;
  visitorData: VerifyCheckInOtpResponse | null;
}
```

### 2.3 API Request/Response Types

```typescript
interface VerifyCheckInOtpRequest {
  otp: string; // 6-digit string
  branchId: string;
}

interface VerifyCheckInOtpResponse {
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
    visitCategory: 'MEETING' | 'DELIVERY';
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

interface ApiError {
  statusCode: number;
  code: string;
  message: string;
}
```

### 2.4 Visitor Details Card Props

```typescript
interface VisitorDetailsCardProps {
  visitorData: VerifyCheckInOtpResponse;
  onCheckIn: () => void;
  onCancel: () => void;
  isCheckingIn?: boolean;
}
```

## 3. Function Signatures

### 3.1 Main Component

```typescript
export function CheckInTab({
  branchId,
  onCheckInSuccess,
  className,
}: CheckInTabProps): JSX.Element
```

**Responsibilities:**
- Render OTP input view for direct visitor verification
- Provide phone lookup alternative (placeholder for Task 6.4)
- Handle OTP verification API calls
- Display visitor details after successful OTP verification
- Provide "Check In" action button

### 3.2 Sub-Component: Visitor Details Card

```typescript
function VisitorDetailsCard({
  visitorData,
  onCheckIn,
  onCancel,
  isCheckingIn = false,
}: VisitorDetailsCardProps): JSX.Element
```

**Responsibilities:**
- Display visitor photo, name, phone with badges
- Display visit details (purpose, host, department, delivery info)
- Render "Check In" primary button and "Cancel" secondary button

### 3.3 API Client Method

```typescript
export async function verifyCheckInOtp(
  request: VerifyCheckInOtpRequest,
): Promise<VerifyCheckInOtpResponse>
```

**Throws:**
- `ApiError` with code `'INVALID_OTP'`: OTP does not match
- `ApiError` with code `'CHECKIN_OTP_EXPIRED'`: OTP has expired
- `ApiError` with code `'ALREADY_CHECKED_IN'`: Visit is already checked in
- `ApiError` with code `'VISIT_NOT_FOUND'`: No visit found with matching OTP
- `ApiError` with status 401/403: Authentication/Authorization errors

## 4. High-Level Logic Flow

### 4.1 CheckInTab Component

```typescript
function CheckInTab({ branchId, onCheckInSuccess, className }: CheckInTabProps) {
  // State: viewMode, otpValue, otpState, otpError, visitorData

  // OTP completion triggers verification
  async function handleOtpComplete(otp: string): Promise<void> {
    setOtpState('loading');
    try {
      const response = await verifyCheckInOtp({ otp, branchId });
      if (response.success) {
        setVisitorData(response);
        setOtpState('success');
        setViewMode('visitor_details');
        announceStatus('OTP Verified! Ready to check in.');
      }
    } catch (error) {
      setOtpState('error');
      setOtpError(mapErrorCodeToMessage(error.code));
      focusOtpInput();
    }
  }

  // Check-In handler (implemented in Task 6.5)
  async function handleCheckIn(): Promise<void> {
    onCheckInSuccess?.(visitorData.visitId);
  }

  // Cancel resets to OTP input
  function handleCancel(): void {
    setViewMode('otp');
    setOtpValue('');
    setOtpState('idle');
    setOtpError(undefined);
    setVisitorData(null);
  }

  // Phone lookup placeholder (Task 6.4)
  function handlePhoneLookupClick(): void {
    setViewMode('phone');
  }

  // Render: visitor_details → phone → otp (default)
}
```

### 4.2 Visitor Details Card

```typescript
function VisitorDetailsCard({ visitorData, onCheckIn, onCancel, isCheckingIn }: VisitorDetailsCardProps) {
  // Display visitor photo with initials fallback
  // Show name, phone, company with type/status badges

  // Conditional visit details:
  // - MEETING: purpose, department, staffName
  // - DELIVERY: deliveryPlatform, deliveryRecipient, orderReference

  // Display Check-In OTP and expiry time

  // Action buttons:
  // - Primary: "Check In" (if canCheckIn = true)
  // - Secondary: "Cancel / Verify Another"
}
```

### 4.3 API Client

```typescript
async function verifyCheckInOtp(request: VerifyCheckInOtpRequest): Promise<VerifyCheckInOtpResponse> {
  const response = await fetch('/api/visitors/verify-checkin-otp', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${getAuthToken()}`,
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new ApiError(error);
  }

  return response.json();
}
```

### 4.4 Error Code Mapping

```typescript
function mapErrorCodeToMessage(code: string): string {
  switch (code) {
    case 'INVALID_OTP': return 'Invalid OTP. Please check and try again.';
    case 'CHECKIN_OTP_EXPIRED': return 'This OTP has expired. Please contact staff.';
    case 'ALREADY_CHECKED_IN': return 'Visitor is already checked in.';
    case 'VISIT_NOT_FOUND': return 'Visitor not found. Try phone lookup instead.';
    default: return 'Verification failed. Please try again.';
  }
}
```

## 5. Component States & Transitions

### 5.1 State Diagram

```
[Initial - OTP View]
       |
       | Enter 6-digit OTP
       v
[Loading - Verifying...]
       |
       | API response
       +-------+--------+
       |                 |
[Success]           [Error]
       |                 |
[Visitor Details]   [OTP View] (with error message)
       |
       | Click Check In
       v
[Checking In]        -> [Success toast -> Reset to OTP View]
       |
       | Click Cancel
       v
[Reset to OTP View]
```

### 5.2 State Visual Indicators

| State | OTP Input | Button | Visitor Card | Error Message |
|-------|-----------|--------|--------------|---------------|
| Idle | Enabled | Disabled "Verify OTP" | Hidden | None |
| Loading | Disabled | Spinner "Verifying..." | Hidden | None |
| Success | Disabled | Hidden | Visible with "Check In" | None |
| Error | Enabled, red border | "Verify OTP" | Hidden | Red text below input |

### 5.3 Transition Logic

1. **Idle → Loading**: User completes 6-digit OTP or clicks Verify button
2. **Loading → Success**: API returns `success: true`, transition to visitor details
3. **Loading → Error**: API returns error, display message, focus OTP input
4. **Visitor Details → Checking In**: User clicks "Check In" button
5. **Checking In → Idle**: Check-in completes, show success toast, reset to OTP
6. **Visitor Details → Idle**: User clicks Cancel, clear state, return to OTP

## 6. Key Test Cases

### 6.1 Happy Path

| Test Case | Expected Behavior |
|-----------|-------------------|
| Valid OTP - Approved Visit | Show visitor details, "Check In" enabled |
| Valid OTP - TEST_MODE ("654321") | Show visitor details |
| Complete OTP successfully | Smooth transition to visitor details |
| Click Check In | Triggers check-in flow (Task 6.5) |
| Click Cancel | Resets to fresh OTP input view |

### 6.2 Error Scenarios

| Test Case | Expected Behavior |
|-----------|-------------------|
| Invalid OTP | "Invalid OTP" error, red border, focus OTP |
| Expired OTP | "This OTP has expired" error, suggest phone lookup |
| Already Checked In | "Already checked in" error |
| Visit Not Found | "Visitor not found" error |
| Network Error | "Verification failed" error, allow retry |
| Empty OTP + click Verify | Button disabled, no action |

### 6.3 Visitor Details Display

| Test Case | Expected Behavior |
|-----------|-------------------|
| Meeting visit | Shows purpose, department, host info |
| Delivery visit | Shows platform, recipient, order ID |
| With photo | Displays visitor image |
| Without photo | Shows initials fallback |
| canCheckIn = false | Shows alert instead of "Check In" button |

### 6.4 Accessibility

| Test Case | Expected Behavior |
|-----------|-------------------|
| Tab navigation | Logical order: OTP → Verify → Phone lookup |
| Screen reader error | Announces error message (aria-live) |
| Screen reader success | Announces "OTP Verified! Ready to check in." |
| Keyboard | Enter triggers Verify, Escape cancels details |
| Focus management | Focus moves to visitor details on success, back to OTP on cancel |

## 7. Accessibility Requirements

### 7.1 Keyboard & Focus

- Logical tab order: OTP input → Verify button → Phone lookup button
- Enter key triggers Verify button
- Escape key cancels visitor details view
- Focus first OTP slot on mount
- Focus visitor details card on successful verification
- Focus OTP input after cancel

### 7.2 ARIA Attributes

- **OTP Input:** `aria-label="Visitor Check-In OTP"`, `aria-describedby` to error
- **Verify Button:** `aria-label="Verify visitor OTP"`, `aria-busy` during loading
- **Error Message:** `role="alert"`, `aria-live="polite"`
- **Visitor Details:** `role="dialog"` or landmark, `aria-label="Visitor details"`

### 7.3 Screen Reader Announcements

- "OTP Verified! Ready to check in." on successful verification
- Error messages announced as they appear
- "Loading..." during verification
- "Checking In..." during check-in action

### 7.4 Visual Accessibility

- Error message: Red text on light background (WCAG AA 4.5:1)
- Button disabled state: Visibly muted but legible
- Touch targets: Minimum 44px height for mobile

## 8. Visual Language & Microcopy

### 8.1 Key Design Tokens

| Element | Primary Colors |
|---------|---------------|
| Primary Button | Emerald-600 (`bg-emerald-600 hover:bg-emerald-700`) |
| Secondary Button | Slate/Gray (`bg-white border-gray-300 text-gray-700`) |
| Error State | Red-600 (`text-red-600 border-red-300`) |
| Success Indicator | Green-500 (`text-green-500`) |

### 8.2 Typography Scale

| Element | Size | Weight |
|---------|------|--------|
| Section Heading | text-lg | Semibold |
| Visitor Name | text-base | Semibold |
| Button Text | text-sm | Medium |
| Detail Labels/Values | text-sm | Normal/Medium |

### 8.3 Microcopy

| Context | Text |
|---------|-------|
| Section Heading | "Quick Check-In" |
| OTP Input Label | "Visitor OTP" |
| Verify Button | "Verify OTP" |
| Phone Lookup Button | "Check Visitor" |
| OTP Success | "OTP Verified! Ready to check in." |
| OTP Error | "Invalid OTP. Please check and try again." |
| Expired OTP | "This OTP has expired. Please contact staff." |
| Already Checked In | "Visitor is already checked in." |
| Not Found | "Visitor not found. Try phone lookup instead." |
| Check In Button | "Check In" |
| Cancel Button | "Cancel / Verify Another" |
| Visitor Details Header | "Visitor Verified" |

## 9. Dependencies

### 9.1 Internal Components

- `OtpInput` (Task 3.1): 6-digit OTP input with auto-focus, paste support
- `StatusBadge` (Task 3.2): Visitor status badges
- `VisitTypeBadge` (Task 3.3): Meeting/Delivery type badges

### 9.2 UI Components (shadcn/ui)

- `Button`, `Card`, `Avatar`, `Alert`

### 9.3 External Libraries

- `lucide-react`: Icons (`ClipboardCheck`, `Phone`, `X`, `Loader2`, `AlertCircle`)

### 9.4 API Endpoints

- `POST /api/visitors/verify-checkin-otp` (Task 6.2): OTP verification
- `POST /api/visitors/checkin/:visitId` (Task 6.5): Check-in action

## 10. Error Handling Strategy

### 10.1 API Error Handling

| Error Code | User Message | Action |
|------------|-------------|--------|
| INVALID_OTP | "Invalid OTP. Please check and try again." | Focus OTP input, allow retry |
| CHECKIN_OTP_EXPIRED | "This OTP has expired. Please contact staff." | Suggest phone lookup |
| ALREADY_CHECKED_IN | "Visitor is already checked in." | Show visitor details |
| VISIT_NOT_FOUND | "Visitor not found. Try phone lookup instead." | Suggest phone lookup |
| Network Error | "Connection lost. Please try again." | Show retry option |
| Auth Error | "Session expired. Please log in again." | Redirect to login |

### 10.2 Client-Side Validation

- OTP must be exactly 6 digits (enforced by OtpInput)
- branchId must be provided
- Verify button disabled when OTP incomplete

### 10.3 Graceful Degradation

- Show fallback input if OtpInput fails
- Preserve input on API error
- Show initials fallback if photo fails to load
- Cancel pending API calls on unmount

## 11. Integration Notes

### 11.1 Preceding Tasks

- **Task 3.1 (OtpInput)**: Provides 6-digit input component
- **Task 6.1 (Security Dashboard)**: Provides container layout
- **Task 6.2 (verify-checkin-otp endpoint)**: Provides OTP verification API

### 11.2 Following Tasks

- **Task 6.4 (Phone lookup)**: Will add phone input view and lookup API
- **Task 6.5 (One-click check-in)**: Will implement actual check-in API call

### 11.3 File Structure

```
frontend/src/app/security/dashboard/components/
├── CheckInTab.tsx              # Main component (this task)
└── VisitorDetailsCard.tsx      # Visitor details sub-component

frontend/src/lib/api/
└── visitors-api.ts             # Add verifyCheckInOtp method
```

## 12. Performance Considerations

- Cancel pending API calls on new submission
- Lazy load visitor photos with error boundaries
- Use React.memo for sub-components if needed
- Stable callback functions with useCallback
