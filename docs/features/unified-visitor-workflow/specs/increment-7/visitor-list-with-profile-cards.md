# Technical Specification: Visitor List with VisitorProfileCard

**Task ID:** 7.2
**Feature:** Unified Visitor Workflow
**Increment:** 7 - Security Dashboard UI (Logs Tab)
**Category:** UI/Component
**Complexity:** Medium
**Est. Time:** 4h

---

## 1. File Path

**Frontend Component:** `frontend/src/app/dashboard/security/logs/VisitorList.tsx`

**Supporting Files:**
- `frontend/src/components/visitors/logs/SearchInput.tsx` - Reusable search input component
- `frontend/src/components/visitors/shared/VisitorProfileCard.tsx` - From Task 3.4
- `frontend/src/components/visitors/logs/VisitorActionButtons.tsx` - Status-aware action buttons

---

## 2. Data Models

### 2.1 TypeScript Interfaces

**Note:** The `VisitorProfile` interface is defined in Task 3.4 and reused here for consistency.

```typescript
interface VisitorProfile {
  id: string;
  visitorName: string;
  visitorPhone: string;
  visitorEmail?: string | null;
  visitorPhoto?: string | null;
  visitType: 'MEETING' | 'DELIVERY';
  // Reuse VisitStatus enum from Task 7.1
  status: VisitStatus;
  personToMeet?: string | null;  // For meeting visits
  department?: string | null;     // Host department for meeting visits
  platform?: string | null;       // For delivery visits (Zomato, Swiggy, Amazon)
  purpose?: string | null;
  checkInTime?: string | null;    // ISO 8601 timestamp
  checkOutTime?: string | null;   // ISO 8601 timestamp
  requestedAt: string;            // ISO 8601 timestamp
  approvedAt?: string | null;     // ISO 8601 timestamp
  checkInOtp?: string | null;     // For approved visits
}

/**
 * VisitorProfileCard Props Interface (from Task 3.4)
 *
 * Note: The VisitorProfileCard component from Task 3.4 is reused here.
 * This spec uses the compact layout variant by passing compact={true}.
 */
interface VisitorProfileCardProps {
  visitor: VisitorProfile;
  compact: boolean;           // Set to true for this component's usage
  onClick: (visitorId: string) => void;
  actions?: React.ReactNode;  // Optional action buttons slot
}

/**
 * Standard visitor list response format (consistent with Task 7.1)
 * Used by fetchVisitorsByStatus API endpoint
 */
interface VisitorListResponse {
  success: boolean;
  data: {
    visitors: VisitorProfile[];
    totalCount: number;
  };
}

interface VisitorListResponseError {
  success: false;
  code: string;
  message: string;
}

---

## 3. Function Signatures

```typescript
// Main component
function VisitorList(props: VisitorListProps): JSX.Element

// Sub-components
function SearchInput(props: SearchInputProps): JSX.Element
function VisitorActionButtons(props: VisitorActionButtonsProps): JSX.Element

// Helper functions
function filterVisitorsByQuery(visitors: VisitorProfile[], query: string): VisitorProfile[];
function getTimeDisplay(visitor: VisitorProfile): string;
function getHostOrPlatform(visitor: VisitorProfile): string;
function getActionsForStatus(visitor: VisitorProfile): ActionButton[];
```

---

## 4. Component State Management

```typescript
interface VisitorListState {
  searchQuery: string;
  debouncedQuery: string;
  processingActions: Set<string>;
  showRejectDialog: boolean;
  rejectDialogVisitor: VisitorProfile | null;
  rejectReason: string;
}
```

### State Initialization Mapping

The component state properties are initialized as follows:

| State Property | Initial Value | Purpose |
|----------------|---------------|---------|
| `searchQuery` | `''` (empty string) | Raw input from search field |
| `debouncedQuery` | `''` (empty string) | Debounced value passed to parent for search |
| `processingActions` | `new Set<string>()` | Set of visitor IDs with actions in progress |
| `showRejectDialog` | `false` | Whether reject confirmation dialog is visible |
| `rejectDialogVisitor` | `null` | Visitor object currently being rejected |
| `rejectReason` | `''` (empty string) | User-provided reason for rejection |

---

## 5. Pseudo-Code / High-Level Logic

### 5.1 Search Debouncing

```typescript
useEffect(() => {
  const timer = setTimeout(() => {
    setDebouncedQuery(searchQuery);
  }, 300);
  return () => clearTimeout(timer);
}, [searchQuery]);

useEffect(() => {
  onSearch(debouncedQuery);
}, [debouncedQuery, onSearch]);
```

### 5.2 Search Filtering

```typescript
function filterVisitorsByQuery(visitors: VisitorProfile[], query: string): VisitorProfile[] {
  if (!query.trim()) return visitors;
  const lowerQuery = query.toLowerCase();

  return visitors.filter(visitor =>
    visitor.visitorName.toLowerCase().includes(lowerQuery) ||
    visitor.visitorPhone.includes(lowerQuery) ||
    visitor.personToMeet?.toLowerCase().includes(lowerQuery) ||
    visitor.platform?.toLowerCase().includes(lowerQuery)
  );
}
```

### 5.3 Action Buttons by Status

| Status | Actions | Button Variants |
|--------|---------|-----------------|
| PENDING / REQUEST_SENT | Approve, Reject | default, destructive |
| APPROVED | Verify OTP | default |
| CHECKED_IN | Check Out | outline |
| CHECKED_OUT / REJECTED | None | - |

```typescript
function getActionsForStatus(visitor: VisitorProfile): ActionButton[] {
  switch (visitor.status) {
    case 'PENDING':
    case 'REQUEST_SENT':
      return [
        { label: 'Reject', variant: 'destructive', action: 'reject' },
        { label: 'Approve', variant: 'default', action: 'approve' }
      ];
    case 'APPROVED':
      return [{ label: 'Verify OTP', variant: 'default', action: 'verifyOtp' }];
    case 'CHECKED_IN':
      return [{ label: 'Check Out', variant: 'outline', action: 'checkOut' }];
    default: return [];
  }
}
```

### 5.4 Time Display Formatting

```typescript
function getTimeDisplay(visitor: VisitorProfile): string {
  const timeToDisplay = visitor.checkInTime || visitor.approvedAt || visitor.requestedAt;
  const date = new Date(timeToDisplay);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();

  return isToday
    ? date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
    : date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
```

### 5.5 Action Handlers

```typescript
async function handleApprove(visitorId: string) {
  setProcessingActions(prev => new Set([...prev, visitorId]));
  try { await onApprove(visitorId); }
  finally { setProcessingActions(prev => { const s = new Set(prev); s.delete(visitorId); return s; }); }
}

function handleReject(visitorId: string) {
  const visitor = visitors.find(v => v.id === visitorId);
  setRejectDialogVisitor(visitor);
  setShowRejectDialog(true);
}

async function handleConfirmReject() {
  if (!rejectDialogVisitor || !rejectReason.trim()) return;
  setProcessingActions(prev => new Set([...prev, rejectDialogVisitor.id]));
  try {
    await onReject(rejectDialogVisitor.id, rejectReason);
    setShowRejectDialog(false);
    setRejectDialogVisitor(null);
    setRejectReason('');
  } finally {
    setProcessingActions(prev => { const s = new Set(prev); s.delete(rejectDialogVisitor.id); return s; });
  }
}

function handleVerifyOtp(visitorId: string) { onVerifyOtp(visitorId); }
function handleCheckOut(visitorId: string) { onCheckOut(visitorId); }
function handleViewDetails(visitorId: string) { onViewDetails(visitorId); }
```

---

## 6. Loading & Empty States

| State | Trigger | Display Behavior |
|-------|---------|------------------|
| Loading | `isLoading = true` | 3-4 skeleton cards, spinner in search input |
| Error | `error != null` | Error banner with Retry button |
| No Visitors | `visitors.length === 0 && !searchQuery` | "No visitors in this category" |
| No Search Results | `visitors.length === 0 && searchQuery.length > 0` | "No visitors match your search" with Clear button |
| Processing Action | `processingActions.has(visitorId)` | Spinner on button, button disabled |

---

## 7. Accessibility Requirements

| Requirement | Implementation |
|-------------|----------------|
| Search Input | `role="search"`, `aria-label="Search visitors"`, `aria-describedby` for errors |
| Clear Button | `aria-label="Clear search"` |
| List Container | `role="list"`, `aria-label="Visitor list"` |
| Action Buttons | Unique `aria-label` per action: "Approve {name}", "Reject {name}", etc. |
| Loading | `aria-busy="true"` on list container |
| Reject Dialog | `role="dialog"`, `aria-modal="true"`, focus trap |
| Keyboard | Tab through list, Enter/Space to activate, Escape to close |
| Color Contrast | WCAG AA: All text, buttons, badges meet 4.5:1 ratio |

---

## 8. Responsive Design

| Breakpoint | Layout | Card Type | Touch Targets |
|------------|--------|-----------|---------------|
| Mobile (<768px) | Vertical stack, scrollable | Compact | 44px min |
| Tablet (768-1024px) | Vertical or grid (2 cols) | Compact | 48px min |
| Desktop (>1024px) | Vertical or grid | Compact/Full | No constraints |

---

## 9. Component Structure

### 9.1 VisitorList Component Hierarchy

The VisitorList component renders the following structural hierarchy:

```
VisitorList Container (role="list", aria-label="Visitor list")
├── SearchInput Component
│   ├── Text Input Field (disabled when isLoading)
│   └── Clear Button
│
├── Loading State (conditional: when isLoading = true)
│   └── Skeleton Cards (3-4 placeholders)
│
├── Error State (conditional: when error != null)
│   ├── Error Message Text
│   └── Retry Action Button
│
├── Empty State - No Visitors (conditional: visitors.length === 0 && searchQuery empty)
│   ├── Icon (Users)
│   └── Title/Description Text
│
├── Empty State - No Search Results (conditional: visitors.length === 0 && searchQuery has value)
│   ├── Icon (SearchX)
│   ├── Title/Description Text
│   └── Clear Search Action Button
│
├── Visitor Cards Container (conditional: visitors.length > 0)
│   └── VisitorProfileCard Components (one per visitor, rendered as list)
│       ├── Card Body (compact layout, clickable)
│       │   └── Visitor Information Display
│       └── VisitorActionButtons Component
│           └── Status-Appropriate Action Buttons
│
└── Reject Confirmation Dialog (conditional: showRejectDialog = true)
    ├── Dialog Container (role="dialog", aria-modal="true")
    │   ├── Header
    │   │   ├── Title ("Reject Visit Request")
    │   │   └── Description (Visitor name confirmation)
    │   ├── Form Section
    │   │   ├── Label ("Reason for rejection")
    │   │   └── Text Area Input (required, min 1 character)
    │   └── Action Buttons
    │       ├── Cancel Button (variant: outline)
    │       └── Confirm Reject Button (variant: destructive, disabled without reason)
    └── Focus Trap (for accessibility)
```

### 9.2 Conditional Rendering Logic

The component uses conditional rendering based on the following priority order:

1. **Loading State**: Takes priority, displayed when `isLoading = true`
2. **Error State**: Displayed when `error != null` and not loading
3. **Empty States**:
   - No visitors in category: `visitors.length === 0 && searchQuery === ''`
   - No search results: `visitors.length === 0 && searchQuery.length > 0`
4. **Visitor List**: Displayed when `visitors.length > 0` and not loading/error

### 9.3 VisitorActionButtons Structure

The VisitorActionButtons component renders based on visitor status:

```
ActionButtons Container (role="group", aria-label="Actions for {visitor name}")
└── Action Buttons (count varies by status)
    ├── Button Configuration:
    │   ├── Label: Dynamic (e.g., "Approve", "Reject", "Verify OTP")
    │   ├── Variant: "default", "destructive", or "outline" per action type
    │   ├── Size: Small
    │   └── Disabled: When isProcessing = true
    ├── Processing Indicator:
    │   ├── Spinner/Loader Icon (visible only when isProcessing = true)
    │   └── Positioned before button label
    └── ARIA Label: "{action label} {visitor name}"
```

### 9.4 Reject Dialog Structure

The reject confirmation modal follows this structure:

**Open Trigger:**
- Dialog visibility controlled by `showRejectDialog` state
- Pre-populated with `rejectDialogVisitor` data

**Content Layout:**
- Top: Dialog title ("Reject Visit Request")
- Below Title: Confirmation message with visitor's name
- Middle: Required text input for rejection reason
  - Minimum validation: 1 character required
- Bottom: Action buttons right-aligned
  - Left: Cancel button (dismisses dialog, clears state)
  - Right: Confirm button (submits rejection, shows spinner while processing)

**Close Behavior:**
- Cancel click: Dismiss dialog, reset visitor and reason state
- Confirm success: Dismiss dialog, reset state
- Processing state: Confirm button shows spinner, disabled during async operation

---

## 10. Test Cases

### 10.1 Unit Tests (24 tests)
- **SearchInput (6):** Renders input, clear button, clears on click, disabled state, keyboard nav, ARIA
- **VisitorActionButtons (8):** Correct actions per status (5 statuses), disables when processing, ARIA labels
- **Filter Logic (4):** By name, phone, host, platform
- **Time Display (3):** Today's visits, older visits, null timestamps
- **Host/Platform Display (3):** personToMeet (meetings), platform (deliveries), fallback

### 10.2 Integration Tests (9 tests)
**VisitorList:** Renders list, search input, filters visitors, empty states, loading skeleton, error message, action clicks, reject dialog

### 10.3 E2E Tests (18 tests)
- **Search (4):** Type input, clear button, filter by name, filter by phone
- **Actions (8):** Approve/Reject (Pending), Verify OTP (Approved), Check Out (Checked-In), no actions (CHECKED_OUT/REJECTED)
- **Empty States (3):** No visitors, no search results, clear search button
- **Loading & Error (3):** Skeleton, error banner, processing spinner

### 10.4 Accessibility Tests (8 tests)
Search input ARIA, clear button ARIA, list role, keyboard nav, button ARIA labels, dialog focus trap, color contrast, screen reader

---

## 11. Dependencies

### Component Dependencies
- **Task 3.4**: `VisitorProfileCard` component
  - Props interface: `VisitorProfileCardProps` (defined in Task 3.4)
  - Used with `compact={true}` prop for dense layout
  - Accepts optional `actions` slot for action buttons
- **Task 7.1**: `LogsTab` component (parent)
- **Task 7.4**: Visitor Details modal

### External Dependencies
- **TanStack Query**: Data fetching (parent-managed)
- **Lucide React**: Icons (Search, X, Users, SearchX, AlertCircle, Loader2)
- **Radix UI**: Dialog component
- **Tailwind CSS**: Responsive utilities

### Backend Dependencies
- JWT authentication, Visitor repository, Security API controller

---

## 12. Acceptance Criteria Verification

| Criterion | Implementation |
|-----------|----------------|
| Uses compact VisitorProfileCard | `compact={true}` prop |
| Shows action button per status | `VisitorActionButtons` renders status-specific actions |
| Approve/Reject for Pending | Actions: [Reject (destructive), Approve (default)] |
| Verify OTP for Approved | Action: [Verify OTP (default)] |
| Check Out for Checked-In | Action: [Check Out (outline)] |
| Search input at top | SearchInput rendered first |
| Search debouncing | 300ms debounce |
| Empty states | "No visitors in this category" / "No visitors match your search" |
| Mobile-first | Compact layout, 44px touch targets |
| Accessibility | ARIA labels, keyboard nav, screen reader support |

---

## 13. Edge Cases & Error Handling

| Scenario | System Response |
|----------|-----------------|
| No search results | "No visitors match your search" with Clear button |
| Network error during action | Error banner, button re-enabled |
| Same name visitors | Display phone + host/platform to differentiate |
| Photo fails to load | Avatar shows initials (VisitorProfileCard fallback) |
| Long visitor name | Truncate with ellipsis, full name in modal |
| Empty reject reason | Reject button disabled, validation error |
| Concurrent actions | Disable button, show spinner, prevent duplicates |
| Search changes during action | Preserve action state, complete before new search |
| Status changes during search | Real-time updates from parent polling |

---

## 14. Performance Considerations

- **Debouncing**: 300ms debounce prevents excessive search operations
- **Virtual Scrolling**: Consider if visitor list exceeds 100 items (future)
- **Memoization**: Memoize filtered visitor list to prevent unnecessary re-renders
- **Image Loading**: Visitor photos lazy-loaded by VisitorProfileCard
- **Skeleton Loading**: Display skeleton cards immediately, replace with data when ready

---

**End of Specification**
