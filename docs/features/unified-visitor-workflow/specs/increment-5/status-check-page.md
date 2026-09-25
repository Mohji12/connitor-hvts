# Technical Specification: Status Check Page with Polling

> **Feature**: Unified Visitor Workflow
> **Increment**: 5 - Public Registration UI (Details & Status)
> **Task**: 5.4 - Create status check page with polling - UI/Component
> **Status**: Approved

---

## 1. Overview

Status monitoring interface that polls the visit status endpoint at 30-second intervals, displaying appropriate UI states based on visit status. Automatically transitions to Gate Pass view when approved.

---

## 2. File Path

`frontend/src/app/visitor-registration/status/[visitId]/page.tsx`

---

## 3. Data Models

### 3.1 TypeScript Interfaces

```typescript
import { VisitStatus } from '@/lib/constants/visit-constants';

interface StatusPageProps {
  params: {
    visitId: string;
  };
}

interface VisitStatusResponse {
  success: boolean;
  data: VisitStatusData | null;
  error?: ErrorResponse;
}

interface VisitStatusData {
  visitId: string;
  status: VisitStatus;
  visitor: {
    id: string;
    firstName: string;
    lastName: string;
    fullName: string;
    phone: string;
    photoUrl?: string;
  };
  visitCategory: 'MEETING' | 'DELIVERY' | null;
  submittedAt: string;
  branch: {
    id: string;
    name: string;
    phone?: string;
  };
  meetingDetails?: {
    purpose?: string;
    department?: string;
    staffName?: string;
  };
  deliveryDetails?: {
    platform?: string;
    recipient?: string;
    orderReference?: string;
  };
  approvedAt?: string;
  gatePass?: {
    checkInOtp: string;
    validUntil: string;
    gatePassUrl?: string;
    generatedAt: string;
    sentViaWhatsApp: boolean;
  };
  rejectedAt?: string;
  rejectionReason?: string;
}

interface ErrorResponse {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

interface PollingState {
  status: 'idle' | 'polling' | 'approved' | 'rejected' | 'error';
  data: VisitStatusData | null;
  error: string | null;
  pollCount: number;
  lastPollTime: Date | null;
}
```

### 3.2 Enums

```typescript
enum PollingStatus {
  IDLE = 'idle',
  POLLING = 'polling',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  ERROR = 'error'
}

enum VisitStatus {
  REQUEST_SENT = 'REQUEST_SENT',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  CHECKED_IN = 'CHECKED_IN',
  CHECKED_OUT = 'CHECKED_OUT'
}
```

**Note:** `void` is the correct return type for callback functions that do not return values. This includes event handlers and user action callbacks like `onRetry` and `onContactSecurity`.

---

## 4. Component Interface

### 4.1 Main Component

```typescript
export default function StatusCheckPage({ params }: StatusPageProps): JSX.Element;
```

### 4.2 Child Component

```typescript
interface StatusDisplayProps {
  state: PollingState;
  visitData: VisitStatusData | null;
  onRetry?: () => void;
  onContactSecurity?: () => void;
}

function StatusDisplay({ state, visitData, onRetry, onContactSecurity }: StatusDisplayProps): JSX.Element;
```

---

## 5. Polling Configuration & State Transitions

### 5.1 Polling Constants

```typescript
const POLLING_INTERVAL_MS = 30000;
const MAX_POLL_ATTEMPTS = 60;
const POLLING_ENABLED_STATUS = [VisitStatus.REQUEST_SENT];
const TERMINAL_STATUS = [VisitStatus.APPROVED, VisitStatus.REJECTED, VisitStatus.CHECKED_IN, VisitStatus.CHECKED_OUT];
```

### 5.2 State Transition Flow

```
[INITIAL] → [POLLING] → [APPROVED] → Gate Pass (2s delay)
                      │
                      ├→ [REJECTED] → Rejection UI
                      │
                      └→ [ERROR] → Error UI
```

### 5.3 Lifecycle Requirements

| Phase | Actions |
|-------|---------|
| Mount | Validate UUID, start polling, immediate API call |
| Polling Loop | Check status, handle errors, update display |
| Terminal Status | Stop polling, show appropriate UI, redirect if approved |
| Unmount | Clear interval, abort in-flight requests |

### 5.4 Visibility Handling

- **Page hidden**: Pause polling to save resources
- **Page visible**: Resume polling if in POLLING state

---

## 6. Error Handling

| Error Type | Response | Action |
|------------|----------|--------|
| Network Error | Retry once, then ERROR state | Show "Try Again" button |
| 400 Invalid UUID | ERROR state | No retry, show "Contact Security" |
| 404 Not Found | ERROR state | No retry, show "Contact Security" |
| 410 Expired | ERROR state | No retry, show "Contact Security" |
| 429 Rate Limit | Pause 60s, resume | Continue polling |
| 500 Server Error | Retry once, then ERROR | Show "Try Again" |
| Max Attempts (60) | ERROR state | Show "Still waiting? Contact security" |

---

## 7. UI State Requirements

| State | Display Elements | Colors | Actions |
|-------|------------------|--------|---------|
| POLLING | Loading spinner, "Your request is being reviewed", last update time | Blue | Contact Security button |
| APPROVED | Success icon, "Visit Approved!", countdown timer | Emerald | Auto-redirect after 2s |
| REJECTED | Rejection icon, reason text, "Visit request rejected" | Red | Contact Security button |
| ERROR | Error icon, error message, retry button (if retryable) | Orange/Red | Try Again / Contact Security |

---

## 8. Accessibility Requirements

- **WCAG AA**: 4.5:1 contrast ratio, 44px touch targets
- **ARIA Live Regions**: Status changes announced via `aria-live="polite"`
- **Alert Regions**: Errors announced via `aria-live="assertive" role="alert"`
- **Keyboard Navigation**: Tab/Space for all buttons, logical focus order
- **Screen Readers**: Announce countdown timer, poll updates, and error messages
- **Reduced Motion**: Pause animations on `prefers-reduced-motion`

### 8.1 Keyboard Navigation Table

| Interaction | Key Sequence | Expected Behavior |
|-------------|--------------|-------------------|
| Focus First Interactive Element | Tab | Focus moves to Contact Security button (in polling state) |
| Navigate Buttons | Tab | Moves between buttons (Contact Security, Try Again, etc.) |
| Activate Contact Security | Enter / Space (on Contact Security) | Opens contact modal or action |
| Activate Retry | Enter / Space (on Retry button) | Clears error, triggers immediate API call |
| Dismiss / Cancel | Escape | Optional: Closes modal or dismisses alert (if present) |
| Navigate Status Display | Tab (when in approved state) | Focus moves to countdown or gate pass link |
| Activate Gate Pass Link | Enter / Space (on gate pass link) | Navigates to Gate Pass page |
| Focus Management on Error | Auto-focus | Error message receives focus on ERROR state change |
| Focus Management on Approval | Auto-focus | Success content receives focus on APPROVED state change |

---

## 9. Styling Requirements

### 9.1 Color Scheme

| State | Primary | Background |
|-------|---------|------------|
| Pending | `text-blue-600` | `bg-blue-50` |
| Approved | `text-emerald-600` | `bg-emerald-50` |
| Rejected | `text-red-600` | `bg-red-50` |
| Error | `text-orange-600` | `bg-orange-50` |

### 9.2 Layout

- **Mobile**: Full-width, 24px padding
- **Desktop**: Centered max-width 480px card
- **Spacing**: 16px vertical between elements
- **Radius**: 12px corners, `shadow-sm`

---

## 10. Implementation Notes

### 10.1 Dependencies

```json
{
  "dependencies": {
    "react": "^18.3.0",
    "next": "^15.0.0",
    "@tanstack/react-query": "^5.0.0",
    "lucide-react": "^0.367.0",
    "clsx": "^2.1.0",
    "tailwind-merge": "^2.2.0"
  },
  "devDependencies": {
    "@testing-library/react": "^14.2.0",
    "@testing-library/jest-dom": "^6.4.0",
    "@testing-library/user-event": "^14.5.0",
    "@playwright/test": "^1.40.0"
  }
}
```

### 10.2 Integration Patterns

- **Polling**: Use React Query's `useQuery` with `refetchInterval` or custom `useEffect` with `setInterval`
- **Navigation**: Use `next/navigation`'s `useRouter` for redirect to Gate Pass page
- **State Management**: Local React state with `useState` and `useEffect` for polling logic
- **UUID Validation**: Use regex pattern or `uuid` package for validation

### 10.3 Performance

- **Polling Cleanup**: Clear intervals and abort controllers on unmount
- **Visibility API**: Pause polling when tab is hidden (`document.hidden`)
- **Network Optimization**: Abort in-flight requests on state changes
- **Debounce**: Debounce retry button clicks to prevent duplicate requests

### 10.4 Accessibility & Styling

- **ARIA**: Use `aria-live="polite"` for status updates, `aria-live="assertive"` for errors
- **Focus Management**: Use `useRef` and `useEffect` to manage focus on state changes
- **Color Contrast**: Ensure all text meets WCAG AA 4.5:1 contrast ratio
- **Touch Targets**: Minimum 44px height for all interactive elements
- **Reduced Motion**: Check `prefers-reduced-motion` media query and disable animations when true
- **Tailwind**: Use utility classes for responsive design and styling

---

## 11. Test Cases

### 11.1 Key Scenarios

| Test | Scenario | Expected |
|------|----------|----------|
| 1 | Valid UUID mount | Polling starts, immediate API call |
| 2 | Invalid UUID | ERROR state, no polling |
| 3 | Status: REQUEST_SENT | POLLING state, continue polling |
| 4 | Status: APPROVED | APPROVED state, redirect to Gate Pass after 2s |
| 5 | Status: REJECTED | REJECTED state, stop polling, show reason |
| 6 | Network error | Retry once, then ERROR with retry button |
| 7 | 404 error | ERROR state, no retry option |
| 8 | 410 expired | ERROR state, no retry option |
| 9 | Max attempts reached | ERROR state, "Still waiting? Contact security" |
| 10 | Click retry button | Clear error, immediate API call |
| 11 | Page hidden during polling | Pause polling |
| 12 | Page visible during polling | Resume polling if not terminal |
| 13 | Component unmount | Clear interval, abort requests |
| 14 | Approved without gatePass data | Still redirect to Gate Pass page |

### 11.2 Comprehensive Unit Test Scenarios

**File:** `frontend/src/app/visitor-registration/status/[visitId]/page.spec.tsx`

**Test Scenarios:**

1. **Rendering**: Page renders with UUID param, StatusDisplay component
2. **UUID Validation**: Invalid UUID shows ERROR state immediately
3. **Polling Start**: Polling starts on mount with valid UUID
4. **Immediate API Call**: First API call happens immediately (before interval)
5. **Polling Interval**: Subsequent calls happen every 30 seconds
6. **Status Update**: Polling updates state when status changes
7. **APPROVED State**: Transition to APPROVED, stop polling, redirect after 2s
8. **REJECTED State**: Transition to REJECTED, stop polling, show reason
9. **ERROR State**: Network error, retry once, then ERROR
10. **HTTP 400 Error**: Invalid UUID, ERROR state, no retry
11. **HTTP 404 Error**: Visit not found, ERROR state, no retry
12. **HTTP 410 Error**: Expired visit, ERROR state, no retry
13. **HTTP 429 Error**: Rate limit, pause 60s, resume
14. **HTTP 500 Error**: Server error, retry once, then ERROR
15. **Max Attempts**: After 60 attempts, ERROR state with specific message
16. **Retry Button**: Click retry, clear error, immediate API call
17. **Visibility Change**: Page hidden pauses polling, page visible resumes
18. **Unmount**: Clear interval, abort in-flight requests
19. **Gate Pass Data Transfer**: Approved state passes data to redirect
20. **Reduced Motion**: Honors prefers-reduced-motion media query

---

## 12. Acceptance Criteria

1. ✅ Page exists at `/status/[visitId]` with UUID validation
2. ✅ Polls status endpoint every 30 seconds (max 60 attempts)
3. ✅ Stops polling on APPROVED and redirects to Gate Pass after 2s
4. ✅ Stops polling on REJECTED and shows rejection UI
5. ✅ Displays pending state with loading spinner and "Please wait"
6. ✅ Displays approved state with success animation and countdown
7. ✅ Displays rejected state with reason and "Contact Security" option
8. ✅ Displays error state with retry option for network errors
9. ✅ Handles HTTP errors: 400, 404, 410, 429, 500
10. ✅ Pauses/resumes polling on visibility change
11. ✅ Cleans up on unmount (clear interval, abort requests)
12. ✅ Passes gatePassData to Gate Pass page on redirect
13. ✅ WCAG AA compliant with ARIA live regions
14. ✅ Keyboard navigation works for all buttons
15. ✅ Mobile-first responsive design with Tailwind CSS
16. ✅ Unit tests cover all state transitions
17. ✅ E2E tests verify full polling cycle

---

## 13. Related Tasks

### Implementation Files

| Path | Description |
|------|-------------|
| `frontend/src/app/visitor-registration/status/[visitId]/page.tsx` | Main page component |
| `frontend/src/components/visitors/status/StatusDisplay.tsx` | Status display component |

### Test Files

| Path | Description |
|------|-------------|
| `frontend/src/app/visitor-registration/status/[visitId]/page.spec.tsx` | Unit tests |
| `frontend/e2e/visitor-registration/status-check.spec.ts` | E2E tests |

### Task Dependencies

- **Task 2.4**: GET /public/visits/:visitId/status endpoint
- **Task 5.3**: Confirmation page (entry point)
- **Task 5.5**: Gate Pass page (redirect destination)

---

**End of Specification**
