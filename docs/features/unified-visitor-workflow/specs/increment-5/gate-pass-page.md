# Gate Pass Page Specification

**Task ID:** 5.5
**Title:** Create Gate Pass page (Step 6 - Approved) - UI/Component
**Feature:** Unified Visitor Workflow
**Increment:** 5

---

## 1. Overview

Gate Pass page displays the approved visit details with prominent Check-In OTP. Uses GatePassView component (Task 3.5) to render visitor information, photo, and OTP. Handles loading, error, expired, and success states. Visitors can view their Gate Pass via direct link or after status check page transitions.

### Key Features
- Fetches visit data from GET /public/visits/:visitId/status endpoint
- Displays GatePassView component with visitor photo and OTP
- Shows validity timestamp for Check-In OTP
- Handles expired state when OTP validity has passed
- Supports both Meeting and Delivery visit types
- No polling (static page, requires refresh for status updates)
- Error handling with retry and Contact Security options
- Mobile-first responsive design with emerald/success theming
- WCAG AA compliant with keyboard navigation and screen reader support

---

## 2. File Path

```
frontend/src/app/visitor-registration/gate-pass/[visitId]/page.tsx
```

---

## 3. Data Models

### 3.1 Page State Types

```typescript
type PageState =
  | 'loading'      // Initial fetch in progress
  | 'error'        // API error occurred
  | 'expired'      // Gate pass has expired
  | 'success';     // Valid gate pass displayed
```

### 3.2 API Response Types (from Task 2.4)

```typescript
interface GatePassData {
  checkInOtp: string;
  validUntil: string;           // ISO 8601 timestamp
  gatePassUrl?: string;
  generatedAt: string;
  sentViaWhatsApp: boolean;
  isUsed?: boolean;
}

interface VisitStatusWithGatePass {
  visitId: string;
  status: 'APPROVED' | 'CHECKED_IN' | 'CHECKED_OUT';
  approvedAt: string;
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
    address?: string;
  };
  gatePass: GatePassData;
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
}

interface VisitStatusApiResponse {
  success: true;
  data: VisitStatusWithGatePass | VisitStatusRejected | VisitStatusCheckedIn | VisitStatusCheckedOut;
}
```

### 3.3 Gate Pass Visitor Data (for GatePassView)

```typescript
interface HostInfo {
  name: string;
  department: string;
}

interface DeliveryInfo {
  platform?: string;
  recipient: string;
}

interface GatePassVisitorData {
  id: string;
  visitorName: string;
  visitorPhone: string;
  visitorPhoto?: string;
  visitType: VisitCategory.MEETING | VisitCategory.DELIVERY;
  visitDate: Date;
  visitTime: string;
  purpose?: string;
  host?: HostInfo;
  deliveryInfo?: DeliveryInfo;
}

interface GatePassViewProps {
  visitor: GatePassVisitorData;
  otp: string;
  validityTimestamp: Date;
  loading?: boolean;
  error?: string | null;
  expired?: boolean;
  showQRCode?: boolean;
  className?: string;
}
```

### 3.4 Error Types

```typescript
type ApiError = {
  code: 'VISIT_NOT_FOUND' | 'INVALID_VISIT_ID' | 'NETWORK_ERROR' | 'UNKNOWN_ERROR';
  message: string;
};
```

> **Type Safety Note:** `void` is the correct return type for callback functions that do not return values. This includes event handlers and user action callbacks like `handleRetry` and `handleContactSecurity`.

---

## 4. Function Signatures

### 4.1 Main Page Component

```typescript
interface GatePassPageProps {
  params: {
    visitId: string;
  };
}

export default function GatePassPage({ params }: GatePassPageProps): React.ReactElement;
```

### 4.2 Data Fetching Functions

```typescript
async function fetchGatePassData(visitId: string): Promise<VisitStatusApiResponse>;

function transformToGatePassData(response: VisitStatusWithGatePass): {
  visitor: GatePassVisitorData;
  otp: string;
  validityTimestamp: Date;
};

function isGatePassExpired(validUntil: string): boolean;
```

### 4.3 Event Handlers

```typescript
function handleRetry(): void;
function handleContactSecurity(): void;
```

---

## 5. High-Level Logic

### 5.1 Page Initialization

```
1. Extract visitId from URL params
2. Set state to 'loading'
3. Call fetchGatePassData(visitId)
4. Handle response:
   - Success + APPROVED: Transform data, check expiry, set 'success' or 'expired'
   - Success + other status: Redirect to status check page
   - Error: Set 'error' state with message
```

### 5.2 Data Transformation

```
Input: VisitStatusWithGatePass
Output: { visitor: GatePassVisitorData, otp: string, validityTimestamp: Date }

1. Parse visitCategory to enum
2. Build visitor object (name, phone, photo, visitType, date/time, id)
3. Conditional props:
   - MEETING: Add purpose, host {name, department}
   - DELIVERY: Add deliveryInfo {platform, recipient}
4. Extract: otp = gatePass.checkInOtp, validity = new Date(gatePass.validUntil)
5. Return transformed object
```

### 5.3 State Display

| State      | Display Content                                            |
|------------|------------------------------------------------------------|
| loading    | GatePassView with loading=true OR spinner                  |
| error      | Error card: icon, message, Retry button, Contact Security  |
| expired    | GatePassView with expired=true + "This pass has expired" + Contact Security button |
| success    | GatePassView with visitor data, OTP, validity timestamp   |

### 5.4 Error Handling

| Error Type        | Message                          | Actions                |
|-------------------|----------------------------------|------------------------|
| Network           | Connection lost. Check internet. | Retry, Contact Security |
| Visit Not Found   | Visit not found.                 | Contact Security       |
| Invalid Visit ID  | Invalid visit ID format.         | Contact Security       |
| Unknown (500)     | Error loading gate pass.         | Retry, Contact Security |

### 5.5 Retry Logic

```
handleRetry():
  1. Reset state to 'loading', clear error
  2. Refetch fetchGatePassData(visitId)
  3. Update state based on response
```

---

## 6. Testing

### 6.1 Component Tests

**File:** `frontend/src/app/visitor-registration/gate-pass/[visitId]/page.spec.tsx`

**Test Scenarios:**

1. **Rendering:** Page renders with visitId param
2. **Loading State:** Shows GatePassView with loading=true or spinner
3. **Success State (MEETING):** Display host info, hide delivery info, show OTP
4. **Success State (DELIVERY):** Show delivery info, hide host info, show OTP
5. **Success State with Photo:** Display visitor photo
6. **Success State without Photo:** Display initials avatar
7. **Expired State:** Show expired UI, hide OTP, display Contact Security button
8. **CHECKED_IN State:** Show gate pass (for check-out context)
9. **CHECKED_OUT State:** Show historical record, no active OTP
10. **Network Error:** Show error message, Retry button, Contact Security button
11. **404 Not Found:** Error message with Contact Security button only
12. **400 Invalid ID:** Error message with Contact Security button only
13. **500 Server Error:** Error message with Retry button, Contact Security button
14. **Retry After Network Error:** Click retry → loading → refetch → success/error
15. **Data Transformation:** Verify API response transforms to GatePassVisitorData correctly
16. **OTP Display:** OTP shown with high contrast (4.5:1 minimum)
17. **Validity Timestamp:** Formatted as "Valid until: [Month] [Day], [Time] AM/PM"
18. **Mobile Rendering:** Full-width card, 44px touch targets, no horizontal scroll
19. **Desktop Rendering:** Centered card with max-width
20. **Keyboard Navigation:** All buttons accessible, logical tab order
21. **Screen Reader:** OTP aria-label announced, error role="alert"
22. **Focus Management:** Error → Retry button, Success → Gate Pass content
23. **PENDING Visit Redirect:** Redirects to status check page
24. **REJECTED Visit Redirect:** Redirects to status check page
25. **Browser Back:** Standard navigation works correctly

### 6.2 Happy Path

- Valid APPROVED visit with photo → Display GatePassView with all data
- Valid APPROVED visit without photo → Display initials avatar
- MEETING visit → Show host info, hide delivery info
- DELIVERY visit → Show delivery info, hide host info

### 6.3 States

- Loading → Show loading state during fetch
- Expired pass (validUntil < now) → Show expired state, hide OTP, Contact Security button
- CHECKED_IN visit → Show success with OTP (for check-out)
- CHECKED_OUT visit → Show historical record

### 6.4 Errors

- Visit not found (404) → Error message + Contact Security button
- Invalid visit ID format (400) → Error message + Contact Security button
- Network error → Error message + Retry button
- Server error (500) → Error message + Retry + Contact Security buttons
- Retry after network error → Loading state → refetch → success/error

### 6.5 Accessibility

- Keyboard navigation through all interactive elements
- OTP announced as "Check-in one time password: X X X X X X"
- Expired state announced with aria-live="polite"
- Error messages with role="alert"
- Minimum 4.5:1 contrast ratio for OTP
- All icons have aria-label or aria-hidden

### 6.6 Responsive

- Mobile (<768px): Full-width card, no horizontal scroll, 44px touch targets
- Desktop (≥768px): Centered card with max-width

---

## 7. Accessibility Requirements

### 7.1 General Standards

- **Keyboard:** All interactive elements accessible, logical tab order, no traps
- **Screen Reader:** OTP aria-label, error role="alert", expired aria-live="polite", clear button labels
- **Visual:** 4.5:1 contrast minimum, color + icons for status, 200% text zoom support
- **Focus:** Error → focus message, retry → focus indicator, after retry → focus content/error

### 7.2 Keyboard Navigation

| Interaction | Key Sequence | Expected Behavior |
|-------------|--------------|-------------------|
| Focus First Interactive Element | Tab | Focus moves to Retry button (if error state) |
| Navigate Buttons | Tab | Moves between buttons (Retry, Contact Security) |
| Activate Retry | Enter / Space (on Retry button) | Resets to loading state, triggers refetch |
| Activate Contact Security | Enter / Space (on Contact Security link) | Opens contact modal or shows contact info |
| Navigate Gate Pass Content | Tab (in success state) | Focus moves to gate pass content area |
| Focus OTP Display | Tab | OTP text receives focus for accessibility (read-only) |
| Validity Timestamp | Tab | Timestamp area receives focus for screen readers |
| Dismiss Error | Escape (optional) | Optional: Clears or dismisses error message |
| Focus Management on Error | Auto-focus | Retry button receives focus when transitioning to error state |
| Focus Management on Success | Auto-focus | Gate Pass content receives focus when transitioning to success |

---

## 8. Implementation Notes

### 8.1 Dependencies

```json
{
  "dependencies": {
    "react": "^18.3.0",
    "next": "^15.0.0",
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

### 8.2 Integration Patterns

- **API:** GET /public/visits/:visitId/status (Task 2.4) - includes all visit details
- **State:** React useState/useEffect, no global state, no polling
- **Images:** Avatar with Image/Fallback, onError to initials
- **Dates:** Intl.DateTimeFormat, format as "Valid until: [Month] [Day], [Time] AM/PM"
- **Contact Security:** Combine phone (tel:) and email (mailto:) options

### 8.3 Component Dependencies

- GatePassView (Task 3.5)
- shadcn/ui: Card, Avatar components
- Icons: CheckCircle, XCircle, Clock, AlertCircle (lucide-react)

### 8.4 Performance

- No polling reduces server load and client battery usage
- Static page rendering (SSR) for fast initial load
- Optimized images with proper loading states
- Minimal re-renders using useState with proper dependency management

### 8.5 Accessibility & Styling

- Mobile-first responsive design
- Tailwind CSS emerald theme for success states
- WCAG AA compliance throughout
- 44px minimum touch targets on mobile
- 4.5:1 minimum contrast ratio for text
- Semantic HTML with proper ARIA attributes
- Focus indicators on all interactive elements

---

## 9. Edge Cases

- **PENDING visit:** Redirect to status check page
- **REJECTED visit:** Redirect to status check page
- **Status changes on page:** No polling, requires refresh to update
- **Browser back:** Standard browser navigation
- **Missing photo URL:** Display initials avatar instead
- **Expired OTP:** Hide OTP display, show Contact Security button
- **Network timeout:** Show error message with retry option
- **Invalid visitId format:** Return 400 error with Contact Security option

---

## 10. Acceptance Criteria

- ✅ Uses GatePassView component (Task 3.5)
- ✅ Displays visitor photo or initials
- ✅ Shows OTP with high contrast (4.5:1 minimum)
- ✅ Displays validity timestamp in readable format
- ✅ Handles expired state with Contact Security
- ✅ Handles errors with retry option
- ✅ Shows correct info by visit type (host/delivery)
- ✅ Accessible (WCAG AA, keyboard navigation, ARIA attributes)
- ✅ Mobile-first responsive design
- ✅ No polling (static page)
- ✅ TypeScript strict mode (no `any`)
- ✅ Tailwind CSS emerald theme
- ✅ All unit tests passing
- ✅ Keyboard navigation table implemented
- ✅ Focus management for state transitions
- ✅ Screen reader announcements for OTP and errors

