# Technical Specification: Visitor Details Modal

**Task ID:** 7.4 | **Feature:** Unified Visitor Workflow | **Increment:** 7

---

## 1. File Path

**Location:** `frontend/src/components/visitors/security/VisitorDetailsModal.tsx`

---

## 2. Data Models

### 2.1 Component Props

```typescript
interface VisitorDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  visitId: string;
  onAction?: (visitId: string) => Promise<ActionResult>;
  visitorData?: VisitorDetails | null;
}

interface ActionResult {
  success: boolean;
  error?: string;
}
```

### 2.2 Visitor Details

```typescript
interface VisitorDetails {
  // Visitor's personal identifier (person ID from users table)
  id: string;
  // Visit record identifier (session ID from visits table) - distinct from visitor id
  visitId: string;
  firstName: string;
  lastName: string;
  fullName: string;
  phone: string;
  email?: string | null;
  company?: string | null;
  designation?: string | null;
  photoUrl?: string | null;
  visitType: 'MEETING' | 'DELIVERY';
  status: VisitorStatus;
  purpose?: string | null;
  hostName?: string | null;
  department?: string | null;
  createdAt: string;
  approvedAt?: string | null;
  checkedInAt?: string | null;
  checkedOutAt?: string | null;
  checkInOtp?: string | null;
  checkInOtpExpiry?: string | null;
  gatePassGeneratedAt?: string | null;
}

// Reuse VisitStatus enum from Task 7.1
type VisitStatus = 'PENDING' | 'REQUEST_SENT' | 'APPROVED' | 'CHECKED_IN' | 'CHECKED_OUT' | 'REJECTED';
```

### 2.3 Modal State

```typescript
interface ModalState {
  data: VisitorDetails | null;
  loading: boolean;
  error: string | null;
  actionLoading: boolean;
  photoError: boolean;
}
```

---

## 3. Function Signatures

```typescript
function VisitorDetailsModal(props: VisitorDetailsModalProps): JSX.Element

async function fetchVisitorDetails(visitId: string): Promise<VisitorDetails>

function getActionButtonConfig(status: VisitorStatus): ActionButtonConfig

function handlePhotoError(): void

async function handleAction(): Promise<void>

function formatTimestamp(isoString: string): string
```

**ActionButtonConfig:**
```typescript
interface ActionButtonConfig {
  label: string;
  variant: 'primary' | 'secondary' | 'danger';
  disabled: boolean;
  visible: boolean;
}
```

---

## 4. Pseudo-Code / Logic

### 4.1 Component Lifecycle

**Modal Open Behavior:**
- When modal opens with `visitorData` prop provided: Display the provided visitor data immediately without API fetch
- When modal opens without `visitorData` prop: Display loading state and initiate API fetch for visitor details using the `visitId` prop
- After successful fetch: Display visitor details and dismiss loading state
- After failed fetch: Display error message with retry option

### 4.2 Fetch Visitor Details

**API Interaction:**
- Make GET request to `/visits/{visitId}/details` endpoint
- On HTTP 200 response: Parse and display visitor details
- On HTTP 404 or 500 errors: Display appropriate error message

### 4.3 Photo Rendering

**Avatar Display Logic:**
- When `photoUrl` exists and image loads successfully: Display the visitor's photo
- When photo fails to load or `photoUrl` is absent: Display fallback avatar with visitor initials
- Initials generation: First character of `firstName` combined with first character of `lastName`

### 4.4 Context-Aware Action Button

**Button Configuration by Status:**
- APPROVED status: Display "Check In" button (primary variant, enabled)
- CHECKED_IN status: Display "Check Out" button (danger variant, enabled)
- REQUEST_SENT status: Display "Pending Approval" label (secondary variant, disabled)
- CHECKED_OUT or REJECTED status: No action button displayed

### 4.5 Handle Action Click

**Action Execution Flow:**
- User clicks action button: Display loading state on button
- Invoke `onAction(visitId)` callback function
- On successful action completion: Close modal via `onClose()` callback
- On action failure: Display error message, keep modal open
- Always clear button loading state after action completes

---

## 5. Component Structure

```
┌─────────────────────────────────────┐
│                              [ ✕ ]  │
├─────────────────────────────────────┤
│         [ Avatar: Photo/Initials ]   │
│         John Doe                    │
│         +91 99999 99999             │
│   [Meeting]  [Approved]             │
│   ─────────────────────────────     │
│   Host: Dr. Smith                   │
│   Department: Cardiology            │
│   Purpose: Consultation             │
│   Check-In OTP: 847291              │
│   Valid until: 12:30 PM             │
│   ─────────────────────────────     │
│   Requested: 10:32 AM               │
│   Approved: 10:35 AM                │
│   Checked In: 10:40 AM              │
│   [ Check In ✓ ]                    │
└─────────────────────────────────────┘
```

### 5.1 Responsive Behavior

| Breakpoint | Width | Layout |
|------------|-------|--------|
| Mobile (< 768px) | 90vw max | Bottom sheet |
| Tablet (768-1024px) | 80vw | Centered |
| Desktop (> 1024px) | 600px max | Centered |

---

## 6. Accessibility Requirements

**ARIA Attributes:**
- Modal: `role="dialog"`, `aria-modal="true"`, `aria-labelledby="modal-title"`
- Title: `id="modal-title"`, `role="heading"`, `aria-level="2"`
- Close button: `aria-label="Close visitor details"`
- Avatar: `alt="${fullName}'s photo"`
- Action button: `aria-label="{Check In|Check Out} visitor ${fullName}"`
- Loading: `aria-busy="true"`, `aria-live="polite"`

**Keyboard Navigation:**
- Focus trap on modal open
- ESC key closes modal
- Tab order: Close → Name → Badges → Details → Action button
- Enter/Space activates action button

**Screen Reader Announcements:**
- Loading: "Loading visitor details..."
- Photo error: "Photo not available" (silent fallback)
- Success: "Visitor checked in successfully"
- Error: "Failed to check in. {error message}"

---

## 7. Loading & Error States

**Loading:** Spinner with "Loading visitor details..." text. Close button enabled.

**Error (Fetch Failed):** Error icon, "Unable to load details", [Retry], [Close].

**Action Loading:** Button shows spinner, text "Checking in..." / "Checking out...", disabled.

---

## 8. Content Display Rules

### 8.1 Conditional Rendering

| Field | Meeting | Delivery | Notes |
|-------|---------|----------|-------|
| Host Name | ✅ Always | ❌ Never | Display if present |
| Department | ✅ Always | ❌ Never | Display if present |
| Purpose | ✅ If present | ✅ If present | Optional |
| Platform | ❌ Never | ✅ Always | e.g., Zomato |

### 8.2 Timestamp Display

| Timestamp | Format | Condition |
|-----------|--------|-----------|
| Created | "Requested: h:mm AM/PM" | Always |
| Approved | "Approved: h:mm AM/PM" | If `approvedAt` |
| Checked In | "Checked In: h:mm AM/PM" | If `checkedInAt` |
| Checked Out | "Checked Out: h:mm AM/PM" | If `checkedOutAt` |

### 8.3 OTP Display

| Status | OTP Visible | Expiry Visible |
|--------|-------------|----------------|
| APPROVED | ✅ Yes | ✅ Yes |
| CHECKED_IN | ❌ No | ❌ No |
| Other | ❌ No | ❌ No |

---

## 9. Test Cases

### 9.1 Rendering Tests

| Case | Expected |
|------|----------|
| Opens with data | Display all info, badges, timestamps |
| No photo | Display initials avatar |
| APPROVED status | Show OTP + "Check In" button |
| CHECKED_IN status | Show "Check Out" button, no OTP |
| REQUEST_SENT status | Show disabled "Pending Approval" |
| CHECKED_OUT status | No action button |
| With visitorData prop | Skip fetch, use prop |
| Without visitorData prop | Fetch from API, show loading |

### 9.2 Interaction Tests

| Case | Expected |
|------|----------|
| Click close/overlay/ESC | Call `onClose()` |
| Click "Check In" | Call `onAction()`, show loading, close on success |
| Click "Check Out" | Call `onAction()`, show loading, close on success |
| Action while loading | Button disabled, no action |
| Photo load error | Fallback to initials |

### 9.3 Loading & Error Tests

| Case | Expected |
|------|----------|
| Fetch in progress | Show spinner |
| Fetch 404 | Show error, Retry, Close |
| Fetch network error | Show error, Retry, Close |
| Action fails | Show toast error, keep modal open |

### 9.4 Accessibility Tests

| Case | Expected |
|------|----------|
| Modal opens | Focus trapped |
| Tab navigation | Logical order |
| ESC press | Modal closes, focus returns |
| Screen reader | Announces loading/success/error |

### 9.5 Responsive & Conditional Tests

| Case | Expected |
|------|----------|
| Mobile (< 768px) | Bottom sheet, full-width button |
| Tablet (768px) | Centered, 80vw |
| Desktop (> 1024px) | Centered, 600px max |
| Meeting visit | Show Host + Department |
| Delivery visit | Hide Host + Department |
| No purpose | Hide Purpose section |

---

## 10. API Integration

**Endpoint:** `GET /visits/:visitId/details`

**Response (200 OK):**
```typescript
{ success: true, data: VisitorDetails }
```

```typescript
interface VisitorDetailsErrorResponse {
  success: false;
  code: string;
  message: string;
}
```

**Error Responses:**
| Status | Code | Description |
|--------|------|-------------|
| 404 | VISIT_NOT_FOUND | Visit ID does not exist (returns VisitorDetailsErrorResponse) |
| 500 | INTERNAL_ERROR | Server error (returns VisitorDetailsErrorResponse) |

---

## 11. Dependencies

### Required Components

| Component | Task | Purpose |
|-----------|------|---------|
| VisitorProfileCard | 3.4 | Reference visitor display |
| StatusBadge | 3.2 | Display visit status |
| VisitTypeBadge | 3.3 | Display visit type |
| GatePassView | 3.5 | Reference OTP styling |

#### Component Interface Definitions

```typescript
// From Task 3.4: VisitorProfileCard
interface VisitorProfileCardProps {
  visitor: {
    id: string;
    visitorName: string;
    visitorPhone: string;
    visitorEmail?: string | null;
    visitorPhoto?: string | null;
    visitType?: 'MEETING' | 'DELIVERY';
    status: 'PENDING' | 'REQUEST_SENT' | 'APPROVED' | 'CHECKED_IN' | 'CHECKED_OUT' | 'REJECTED';
    personToMeet?: string;
    purpose?: string;
    checkInTime?: string | null;
    checkOutTime?: string | null;
  };
  compact?: boolean;
  actions?: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

// From Task 3.2: StatusBadge
type StatusBadgeVariant = 'pending' | 'approved' | 'rejected' | 'checked-in' | 'checked-out';

interface StatusBadgeProps {
  variant: StatusBadgeVariant;
  children?: React.ReactNode;
  className?: string;
}

// From Task 3.3: VisitTypeBadge
interface VisitTypeBadgeProps {
  visitType: 'MEETING' | 'DELIVERY';
  className?: string;
}

// From Task 3.5: GatePassView
interface GatePassViewProps {
  visitor: {
    id: string;
    visitorName: string;
    visitorPhone: string;
    visitorPhoto?: string;
    visitType: 'MEETING' | 'DELIVERY';
    visitDate: Date;
    visitTime: string;
    purpose?: string;
    host?: {
      name: string;
      department: string;
    };
    deliveryInfo?: {
      platform?: string;
      recipient: string;
    };
  };
  otp: string;
  validityTimestamp: Date;
  loading?: boolean;
  error?: string | null;
  expired?: boolean;
  showQRCode?: boolean;
  className?: string;
}
```

### External Libraries

| Library | Purpose |
|---------|---------|
| Radix UI Dialog | Modal base |
| Lucide React | Icons |
| TanStack Query | Fetch data |

---

## 12. Design System Integration

### Color Tokens

| Element | Tailwind |
|---------|----------|
| Modal background | `bg-white` or `bg-surface` |
| Overlay | `bg-black/50` |
| Primary (Check In) | `bg-emerald-500 hover:bg-emerald-600` |
| Danger (Check Out) | `bg-red-500 hover:bg-red-600` |
| Disabled | `bg-gray-300 text-gray-500 cursor-not-allowed` |
| Separator | `border-gray-200` |

### Typography

| Element | Size | Weight |
|---------|------|--------|
| Name | `text-xl` | `font-bold` |
| Phone | `text-sm` | `text-gray-500` |
| Labels | `text-sm` | `font-medium` |
| Values | `text-sm` | `font-normal` |
| Timestamps | `text-xs` | `text-gray-400` |
| OTP | `text-3xl` | `font-bold text-gray-900` |

---

## 13. Notes & Edge Cases

1. **Photo Fallback:** Implement `onError` handler to show initials on photo load failure.
2. **Timezone:** All timestamps are ISO 8601. Format using local timezone.
3. **OTP Expiry:** If current time > `checkInOtpExpiry`, display "Expired" in red.
4. **Empty Fields:** Use "—" for missing optional fields.
5. **Performance:** Cache data in parent or TanStack Query to avoid refetch.
6. **Scroll:** Content scrolls vertically, action button stays visible at bottom.
