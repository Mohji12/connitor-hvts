# Task 7.5: Implement Approve/Reject Actions with Confirmation

> **Task ID**: 7.5
> **Feature**: Unified Visitor Workflow
> **Increment**: 7 - Security Dashboard UI (Logs Tab)
> **Category**: UI/Component
> **Complexity**: Small
> **Est. Time**: 2h
> **Dependencies**: Task 7.2 (Visitor List)

## 1. File Path

- **Frontend Component**: `frontend/src/components/visitors/security/VisitorActionButtons.tsx`
- **Reject Dialog**: `frontend/src/components/visitors/security/RejectVisitDialog.tsx`
- **API Service**: `frontend/src/services/visit.service.ts` (extend with approve/reject methods)

## 2. Data Models

### 2.1 Approve Visit Request

```typescript
/**
 * Approve Visit Request
 * NOTE: visitId is passed as URL path parameter (:visitId), not in request body.
 * This interface is kept for documentation consistency but request body is empty.
 */
interface ApproveVisitRequest {
  // Request body is empty - visitId is URL parameter
}
```

### 2.2 Reject Visit Request

```typescript
/**
 * Reject Visit Request
 * NOTE: visitId is passed as URL path parameter (:visitId), not in request body.
 * Only the rejection reason is required in the request body.
 */
interface RejectVisitRequest {
  reason: string;           // Rejection reason (min 5 chars, max 500 chars)
}
```

### 2.3 Approve Visit Response

```typescript
interface ApproveVisitResponse {
  success: boolean;
  visit: {
    id: string;
    status: VisitStatus;    // 'APPROVED'
    checkInOtp: string;     // 6-digit OTP (8-hour expiry)
    checkInOtpExpiry: string; // ISO timestamp
  };
}
```

### 2.4 Reject Visit Response

```typescript
interface RejectVisitResponse {
  success: boolean;
  visit: {
    id: string;
    status: VisitStatus;    // 'REJECTED'
  };
}
```

### 2.5 VisitStatus Enum (Unified)

```typescript
/**
 * Reuse VisitStatus enum from Task 7.1
 * All status values defined there are used here for type consistency
 */
type VisitStatus = 'PENDING' | 'REQUEST_SENT' | 'APPROVED' | 'CHECKED_IN' | 'CHECKED_OUT' | 'REJECTED';
```

### 2.6 Component Props

```typescript
interface VisitorActionButtonsProps {
  visitorId: string;
  visitId: string;
  currentStatus: VisitStatus;
  onActionComplete: (visitId: string, newStatus: VisitStatus) => void;
  disabled?: boolean;
  compact?: boolean;        // If true, show icon-only buttons
}

interface RejectVisitDialogProps {
  isOpen: boolean;
  visitId: string;
  visitorName: string;
  onClose: () => void;
  onReject: (reason: string) => Promise<void>;
  isSubmitting?: boolean;
}
```

### 2.7 Component State

```typescript
type ActionState = 'idle' | 'loading' | 'success' | 'error';

interface VisitorActionButtonsState {
  approveState: ActionState;
  rejectState: ActionState;
  errorMessage: string | null;
}

interface RejectVisitDialogState {
  reason: string;
  reasonError: string | null;
  isSubmitting: boolean;
}
```

### 2.8 ActionButton Component Props

```typescript
interface ActionButtonProps {
  label: string;
  variant: 'primary' | 'secondary';
  onClick: () => void;
  loading?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
}
```

## 3. Function Signatures

### 3.1 API Service Methods

```typescript
class VisitService {
  /**
   * Approve a pending visit and generate Check-In OTP
   * @throws {ApiError} 400 VALIDATION_FAILED, 404 VISIT_NOT_FOUND
   * @throws {ApiError} 409 ALREADY_CHECKED_IN, VISIT_ALREADY_APPROVED
   */
  static approveVisit(request: ApproveVisitRequest): Promise<ApproveVisitResponse>;

  /**
   * Reject a pending visit with reason
   * @throws {ApiError} 400 VALIDATION_FAILED (invalid reason), 404 VISIT_NOT_FOUND
   * @throws {ApiError} 409 VISIT_ALREADY_PROCESSED (not in PENDING status)
   */
  static rejectVisit(request: RejectVisitRequest): Promise<RejectVisitResponse>;
}
```

### 3.2 Component Functions

```typescript
// VisitorActionButtons

// VisitorActionButtons
/**
 * Handle approve button click - initiates approval flow
 * This is the onClick handler for the Approve button
 * It sets loading state and calls handleApproveAction
 */
function handleApproveClick(): Promise<void>;

/**
 * Execute approve action - performs the actual API call
 * Called by handleApproveClick after setting loading state
 */
function handleApproveAction(): Promise<void>;

/**
 * Handle reject button click - opens rejection dialog
 * This is the onClick handler for the Reject button
 * Dialog handles the actual rejection submission
 */
function handleRejectClick(): void;

// RejectVisitDialog
function handleReasonChange(event: React.ChangeEvent<HTMLTextAreaElement>): void;
function handleSubmitReason(): Promise<void>;
function handleCancelReject(): void;
```

## 4. Pseudo-Code / Logic

### 4.1 VisitorActionButtons Component Logic

**Actionability Rule**:
- Component renders Approve and Reject buttons when `currentStatus === VisitStatus.PENDING OR currentStatus === VisitStatus.REQUEST_SENT`
- For all other status values (`APPROVED`, `REJECTED`, `CHECKED_IN`, `CHECKED_OUT`), component renders nothing

**Render Behavior**:
- Display inline action buttons side-by-side with 8px gap
- Approve button: Primary variant (emerald), checkmark icon, "Approve" label
- Reject button: Secondary variant (outline red), X icon, "Reject" label
- When `compact=true`: Display icon-only buttons (hide labels)

**Approve Action Flow**:
1. Set approveState to 'loading' (disables both buttons, shows spinner)
2. Clear any previous errorMessage
3. Call VisitService.approveVisit({ visitId })
4. On success:
   a. Set approveState to 'success'
   b. Call onActionComplete(visitId, 'APPROVED')
   c. Reset state to 'idle' after 1 second
5. On error:
   a. Set approveState to 'error'
   b. Set errorMessage to error.message
   c. Reset state to 'idle' after 3 seconds

### 4.2 RejectVisitDialog Component Logic

**Validation Rules**:
- Empty or whitespace-only reason: "Please provide a reason for rejection"
- Reason length < 5 characters: "Reason must be at least 5 characters"
- Reason length > 500 characters: "Reason must be less than 500 characters"

**Submit Flow**:
1. Validate reason input against validation rules
2. If validation error:
   a. Set reasonError to validation message
   b. Return without submitting
3. Set isSubmitting to true (disables submit button, textarea)
4. Call onReject with trimmed reason string
5. Reset isSubmitting on completion (caller closes dialog)

**Character Count Behavior**:
- Display "X/500" where X is current character count
- Count changes color when approaching limit (e.g., red at 450+ chars)
- Updates in real-time as user types

### 4.3 Parent Component Integration

**State Management Requirements**:
1. Parent component receives status change via `onActionComplete(visitId, newStatus)` callback
2. Parent must update local visit list state with new status immediately
3. Parent must trigger cache invalidation or refetch of visit data after action completes
   - This ensures consistency with polling mechanism from Task 7.3
   - Prevents stale data display due to delayed polling updates
4. Display toast notification:
   - For APPROVED status: "Visit approved. Gate Pass sent."
   - For REJECTED status: "Visit rejected."

**Cache Update Strategy**:
- If using TanStack Query: Call `queryClient.invalidateQueries(['visits'])` or update cache directly
- If using local state: Update visit item in array and optionally trigger refetch

## 5. API Contract

### 5.1 Approve Visit Endpoint

| Attribute | Value |
|-----------|-------|
| **URL** | `POST /visits/:visitId/approve` |
| **Auth** | Required (JWT) |
| **Request Body** | Empty (visitId is passed as URL path parameter) |
| **Success Response** | `200 OK` with `ApproveVisitResponse` |
| **Error Codes** | `400 VALIDATION_FAILED`, `404 VISIT_NOT_FOUND`, `409 VISIT_ALREADY_PROCESSED`, `409 ALREADY_CHECKED_IN` |

### 5.2 Reject Visit Endpoint

| Attribute | Value |
|-----------|-------|
| **URL** | `POST /visits/:visitId/reject` |
| **Auth** | Required (JWT) |
| **Request Body** | `{ reason: string }` (visitId is URL path parameter) |
| **Success Response** | `200 OK` with `RejectVisitResponse` |
| **Error Codes** | `400 VALIDATION_FAILED`, `404 VISIT_NOT_FOUND`, `409 VISIT_ALREADY_PROCESSED` |

## 6. UI/UX Specifications

### 6.1 Inline Buttons (Pending Rows)

| Element | Specification |
|---------|--------------|
| **Approve Button** | Primary color (emerald), "Approve" label, checkmark icon |
| **Reject Button** | Secondary style (outline red), "Reject" label, X icon |
| **Loading State** | Button shows spinner, disabled, label unchanged |
| **Error State** | Button shows error border, tooltip with error message |
| **Spacing** | 8px gap between buttons |
| **Touch Target** | Minimum 44x44px for mobile |

### 6.2 Reject Dialog

| Element | Specification |
|---------|--------------|
| **Title** | "Reject Visit Request" |
| **Visitor Info** | Display visitor name (e.g., "for John Doe?") |
| **Reason Textarea** | 4 rows, max 500 chars, placeholder "e.g., Visitor not on approved list..." |
| **Character Count** | Show "X/500" (changes color near limit) |
| **Buttons** | Cancel (secondary), Reject (primary red) |
| **Focus Trap** | Trap focus within dialog when open |
| **Escape Key** | Close dialog on Escape |
| **Backdrop Click** | Close on backdrop click |

### 6.3 Loading States

| Component | Loading Behavior |
|-----------|------------------|
| **Approve Button** | Spinner replaces button content during API call |
| **Reject Dialog Submit** | Spinner on button, textarea disabled during submit |
| **Dialog Backdrop** | Dimmed overlay with spinner in center |

### 6.4 Error States

| Component | Error Display |
|-----------|---------------|
| **Approve Action** | Toast notification on failure, button shows error outline |
| **Reject Action** | Inline error below textarea on validation error |
| **Dialog API Error** | Toast notification on submission failure, dialog stays open |

## 7. Accessibility Requirements

### 7.1 Keyboard Navigation

- **Tab Order**: Logical tab flow through buttons → dialog → textarea → buttons
- **Enter/Space**: Activate buttons when focused
- **Escape**: Close reject dialog
- **Focus Management**: Return focus to triggering button after dialog closes

### 7.2 ARIA Labels

| Element | ARIA Attribute |
|---------|----------------|
| **Approve Button** | `aria-label="Approve visit for [Visitor Name]"` |
| **Reject Button** | `aria-label="Reject visit for [Visitor Name]"` |
| **Reject Dialog** | `role="dialog"`, `aria-modal="true"`, `aria-labelledby="dialog-title"` |
| **Reason Textarea** | `aria-label="Reason for rejection"`, `aria-describedby="error-message"` |
| **Loading Button** | `aria-busy="true"`, `aria-label="Processing approval..."` |

### 7.3 Screen Reader Support

- Live region announcements for success/error states
- Character count for textarea announced when changes
- Button state changes (loading/success/error) announced
- Dialog open/close events announced

## 8. Test Cases

### 8.1 Unit Tests (VisitorActionButtons)

| ID | Test Case | Expected Behavior |
|----|-----------|-------------------|
| 8.1.1 | Renders Approve and Reject buttons for VisitStatus.PENDING | Both buttons visible |
| 8.1.2 | Does not render for non-PENDING status | Component renders nothing |
| 8.1.3 | Disables both buttons when disabled prop true | Buttons have disabled attribute |
| 8.1.4 | Approve click sets loading state | Spinner shows, button disabled |
| 8.1.5 | Approve success calls onActionComplete with APPROVED | Callback receives correct status |
| 8.1.6 | Approve error sets errorMessage | Error state displayed |
| 8.1.7 | Both buttons disabled during action | Can't click while loading |
| 8.1.8 | Compact mode renders icon-only buttons | Icons visible, labels hidden |

### 8.2 Unit Tests (RejectVisitDialog)

| ID | Test Case | Expected Behavior |
|----|-----------|-------------------|
| 8.2.1 | Renders dialog when isOpen true | Dialog visible in DOM |
| 8.2.2 | Does not render when isOpen false | Dialog not in DOM |
| 8.2.3 | Shows visitor name in title | Visitor name displayed |
| 8.2.4 | Validates empty reason | Shows validation error |
| 8.2.5 | Validates reason < 5 chars | Shows validation error |
| 8.2.6 | Validates reason > 500 chars | Shows validation error |
| 8.2.7 | Shows character count | Displays "X/500" |
| 8.2.8 | Submit button disabled during submit | Button disabled, spinner shows |
| 8.2.9 | Calls onReject with trimmed reason | Callback receives trimmed string |
| 8.2.10 | Cancel calls onClose | Callback invoked |

### 8.3 Integration Tests

| ID | Test Case | Expected Behavior |
|----|-----------|-------------------|
| 8.3.1 | Approve flow from button click → API → success | State updates, toast shows success |
| 8.3.2 | Reject flow: open dialog → submit reason → API → success | Dialog closes, toast shows success |
| 8.3.3 | Approve API failure → retry | Error shown, button reset for retry |
| 8.3.4 | Reject API failure → retry | Dialog stays open, error shown |
| 8.3.5 | Multiple rapid clicks prevent duplicate requests | Only one API call per action |

### 8.4 Accessibility Tests

| ID | Test Case | Expected Behavior |
|----|-----------|-------------------|
| 8.4.1 | Tab order follows logical flow | Focus moves through buttons, dialog controls |
| 8.4.2 | Escape key closes dialog | Dialog closes, focus returns to button |
| 8.4.3 | Enter key activates focused button | Action triggered |
| 8.4.4 | Screen reader announces button states | Loading, success, error announced |
| 8.4.5 | Focus trap works in dialog | Tab cycles within dialog controls only |

### 8.5 E2E Tests

| ID | Test Case | Expected Behavior |
|----|-----------|-------------------|
| 8.5.1 | Security approves pending visitor → OTP generated | Visit status changes to APPROVED, OTP returned |
| 8.5.2 | Security rejects visitor with reason | Visit status changes to REJECTED, reason saved |
| 8.5.3 | Attempt approve non-pending visit | Error response returned |
| 8.5.4 | Attempt approve with invalid visit ID | 404 error returned |

## 9. Error Handling

### 9.1 Validation Errors

| Field | Error Message |
|-------|---------------|
| Empty reason | "Please provide a reason for rejection" |
| Reason < 5 chars | "Reason must be at least 5 characters" |
| Reason > 500 chars | "Reason must be less than 500 characters" |

### 9.2 API Errors

| Error Code | Message | Display |
|------------|---------|---------|
| `VISIT_NOT_FOUND` | "Visit not found" | Toast notification |
| `VISIT_ALREADY_PROCESSED` | "Visit already processed" | Toast notification |
| `ALREADY_CHECKED_IN` | "Visitor already checked in" | Toast notification |
| `NETWORK_ERROR` | "Connection error. Please try again." | Toast with retry option |

### 9.3 Recovery Paths

- **Approve API Error**: Button returns to idle state, user can retry
- **Reject API Error**: Dialog stays open with error toast, user can edit reason and retry
- **Network Error**: Show retry option in toast
- **Validation Error**: Inline error below textarea, user fixes and submits again
