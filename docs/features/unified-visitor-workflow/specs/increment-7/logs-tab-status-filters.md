# Technical Specification: Logs Tab with Status Filter Pills

**Task ID:** 7.1
**Feature:** Unified Visitor Workflow
**Increment:** 7 - Security Dashboard UI (Logs Tab)
**Category:** UI/Component
**Complexity:** Medium
**Est. Time:** 4h

---

## 1. File Path

**Frontend Component:** `frontend/src/app/dashboard/security/logs/LogsTab.tsx`

**Supporting Files:**
- `frontend/src/components/visitors/logs/StatusFilterPills.tsx` - Reusable status filter pills component
- `frontend/src/types/visitor.ts` - Extended with filter types

---

## 2. Data Models

### 2.1 Visit Status Enum

```typescript
/**
 * Unified Visit Status Enum
 * Used across all Security Dashboard Logs components (Tasks 7.1-7.5)
 *
 * Status flow:
 * PENDING → REQUEST_SENT (security user pending approval)
 * REQUEST_SENT → APPROVED (approved, OTP generated)
 * APPROVED → CHECKED_IN (visitor arrived, verified OTP)
 * CHECKED_IN → CHECKED_OUT (visitor left)
 * REQUEST_SENT → REJECTED (denied entry)
 */
enum VisitStatus {
  PENDING = 'PENDING',              // Initial state, awaiting security review
  REQUEST_SENT = 'REQUEST_SENT',    // Security user review requested
  APPROVED = 'APPROVED',            // Approved, OTP generated, awaiting arrival
  CHECKED_IN = 'CHECKED_IN',        // Currently on premises
  CHECKED_OUT = 'CHECKED_OUT',      // Left premises
  REJECTED = 'REJECTED'             // Entry denied
}
```

### 2.2 Status Filter Type

```typescript
/**
 * UI-friendly filter names for the status pills.
 * Maps to VisitStatus enum values via visitStatuses field.
 */
type StatusFilter = 'PENDING' | 'APPROVED' | 'IN' | 'OUT';

interface StatusFilterConfig {
  id: StatusFilter;
  label: string;
  visitStatuses: VisitStatus[]; // Maps StatusFilter to actual VisitStatus enum values
  color: 'blue' | 'emerald' | 'purple' | 'gray';
}

/**
 * Mapping between StatusFilter UI labels and VisitStatus enum values:
 * - 'PENDING' → [VisitStatus.PENDING, VisitStatus.REQUEST_SENT]
 * - 'APPROVED' → [VisitStatus.APPROVED]
 * - 'IN' → [VisitStatus.CHECKED_IN]
 * - 'OUT' → [VisitStatus.CHECKED_OUT]
 */
```

### 2.3 Visitor Counts Response

```typescript
interface VisitorCounts {
  pending: number;      // PENDING + REQUEST_SENT count
  approved: number;    // APPROVED count
  checkedIn: number;   // CHECKED_IN count
  checkedOut: number;  // CHECKED_OUT count
  rejected: number;    // REJECTED count (not shown in pills)
}
```

### 2.4 LogsTab Component Props

```typescript
interface LogsTabProps {
  branchId: string;     // Branch context from security dashboard
  authToken: string;    // Security user JWT token from auth context
}
```

### 2.5 StatusFilterPills Component Props

```typescript
interface StatusFilterPillsProps {
  selectedFilter: StatusFilter;
  counts: VisitorCounts;
  onFilterChange: (filter: StatusFilter) => void;
  disabled: boolean;
}
```

### 2.6 API Response Types

```typescript
interface VisitorCountsResponse {
  success: boolean;
  data: VisitorCounts;
}

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

interface ErrorResponse {
  success: false;
  code: string;
  message: string;
}

/**
 * Note: This response format is consistent across all Logs Tab components.
 * The data wrapper with `success` boolean ensures consistent error handling.
 */
```

---

## 3. Function Signatures

### 3.1 Component Functions

```typescript
// LogsTab.tsx
function LogsTab(props: LogsTabProps): JSX.Element

// StatusFilterPills.tsx
function StatusFilterPills(props: StatusFilterPillsProps): JSX.Element

// Internal helper functions in LogsTab
function getFilterLabel(filter: StatusFilter): string;
function getStatusConfig(): StatusFilterConfig[];
function getPillVariant(filter: StatusFilter, selected: StatusFilter): 'default' | 'selected' | 'disabled';
```

### 3.2 API Service Functions

```typescript
// API endpoint for fetching visitor counts
async function fetchVisitorCounts(branchId: string, authToken: string): Promise<VisitorCountsResponse>;

// API endpoint for fetching filtered visitor list
async function fetchVisitorsByStatus(
  branchId: string,
  statuses: VisitStatus[],
  authToken: string
): Promise<VisitorListResponse>;
```

---

## 4. Component State Management

### 4.1 LogsTab State

```typescript
interface LogsTabState {
  selectedFilter: StatusFilter;
  counts: VisitorCounts | null;
  isLoadingCounts: boolean;
  countsError: string | null;
  visitors: VisitorProfile[] | null;
  isLoadingVisitors: boolean;
  visitorsError: string | null;
}
```

### 4.2 State Initialization

The component uses React state hooks that correspond to the `LogsTabState` interface:

```typescript
// Initialize state from LogsTabState interface
const [selectedFilter, setSelectedFilter] = useState<LogsTabState['selectedFilter']>('PENDING');
const [counts, setCounts] = useState<LogsTabState['counts']>(null);
const [isLoadingCounts, setIsLoadingCounts] = useState<LogsTabState['isLoadingCounts']>(true);
const [countsError, setCountsError] = useState<LogsTabState['countsError']>(null);
const [visitors, setVisitors] = useState<LogsTabState['visitors']>(null);
const [isLoadingVisitors, setIsLoadingVisitors] = useState<LogsTabState['isLoadingVisitors']>(false);
const [visitorsError, setVisitorsError] = useState<LogsTabState['visitorsError']>(null);
```

---

## 5. Pseudo-Code / High-Level Logic

### 5.1 Status Filter Configuration

```typescript
const STATUS_FILTER_CONFIGS: StatusFilterConfig[] = [
  { id: 'PENDING', label: 'Pending', visitStatuses: [VisitStatus.PENDING, VisitStatus.REQUEST_SENT], color: 'blue' },
  { id: 'APPROVED', label: 'Approved', visitStatuses: [VisitStatus.APPROVED], color: 'emerald' },
  { id: 'IN', label: 'In', visitStatuses: [VisitStatus.CHECKED_IN], color: 'purple' },
  { id: 'OUT', label: 'Out', visitStatuses: [VisitStatus.CHECKED_OUT], color: 'gray' }
];
```

### 5.2 StatusFilterPills Component Logic

```typescript
function StatusFilterPills({ selectedFilter, counts, onFilterChange, disabled }: StatusFilterPillsProps) {
  // Render horizontal scrollable container (role="tablist")
  // For each filter config in STATUS_FILTER_CONFIGS:
    // Get count from counts object (map filter to count property)
    // Determine pill variant based on selected filter and disabled state
    // Render pill button (role="tab") with:
      // Label text
      // Count badge (if count > 0)
      // ARIA attributes (aria-label, aria-selected, aria-pressed)
      // data-testid for E2E testing
      // Click handler calling onFilterChange if not disabled
}
```

### 5.3 LogsTab Component - Initialization

```typescript
function LogsTab({ branchId, authToken }: LogsTabProps) {
  // Initialize state with default filter 'PENDING'

  // On mount: Fetch visitor counts + visitors for PENDING filter
}

async function fetchInitialData() {
  setIsLoadingCounts(true);
  setIsLoadingVisitors(true);

  try {
    const countsResponse = await fetchVisitorCounts(branchId, authToken);
    setCounts(countsResponse.success ? countsResponse.data : null);

    const filterConfig = STATUS_FILTER_CONFIGS.find(c => c.id === 'PENDING');
    const visitorsResponse = await fetchVisitorsByStatus(branchId, filterConfig.visitStatuses, authToken);
    setVisitors(visitorsResponse.success ? visitorsResponse.data.visitors : null);
  } catch (error) {
    setCountsError('Network error. Please check connection.');
    setVisitorsError('Network error. Please check connection.');
  } finally {
    setIsLoadingCounts(false);
    setIsLoadingVisitors(false);
  }
}
```

### 5.4 Filter Change Handler

```typescript
function handleFilterChange(newFilter: StatusFilter) {
  setSelectedFilter(newFilter);
  setIsLoadingVisitors(true);
  setVisitorsError(null);

  const filterConfig = STATUS_FILTER_CONFIGS.find(c => c.id === newFilter);

  fetchVisitorsByStatus(branchId, filterConfig.visitStatuses, authToken)
    .then(response => setVisitors(response.success ? response.data.visitors : null))
    .catch(() => setVisitorsError('Network error. Please check connection.'))
    .finally(() => setIsLoadingVisitors(false));
}
```

### 5.5 Count Display Mapping

```typescript
function getCountForFilter(filter: StatusFilter, counts: VisitorCounts): number {
  const mapping: Record<StatusFilter, keyof VisitorCounts> = {
    'PENDING': 'pending', 'APPROVED': 'approved', 'IN': 'checkedIn', 'OUT': 'checkedOut'
  };
  return counts[mapping[filter]];
}
```

---

## 6. API Integration

### 6.1 Fetch Visitor Counts Endpoint

```typescript
// GET /api/security/visitors/counts?branchId=<branchId>
// Headers: Authorization: Bearer <authToken>

Request: Query Parameter: branchId (string), Header: Authorization (JWT token)

Response (200 OK): { "success": true, "data": { "pending": 3, "approved": 5, "checkedIn": 8, "checkedOut": 12, "rejected": 1 } }
Response (401): { "success": false, "code": "UNAUTHORIZED", "message": "Invalid or expired token" }
Response (500): { "success": false, "code": "SERVER_ERROR", "message": "Failed to fetch visitor counts" }
```

### 6.2 Fetch Visitors by Status Endpoint

```typescript
// URL: GET /api/security/visitors
// Query Parameters (all required):
//   - branchId: string (single value)
//   - status: VisitStatus[] (multiple values allowed, repeat parameter)
//
// Example Request URLs:
//   - Single status: /api/security/visitors?branchId=123&status=REQUEST_SENT
//   - Multiple statuses: /api/security/visitors?branchId=123&status=REQUEST_SENT&status=APPROVED
//
// Headers: Authorization: Bearer <authToken>

Request Parameters:
- Query: branchId (string) - The branch ID to filter visitors by
- Query: status (VisitStatus[], repeatable) - Array of status values to filter by
- Header: Authorization (string, JWT token) - Authentication token

Response (200 OK): { "success": true, "data": { "visitors": [VisitorProfile[]], "totalCount": 8 } }
Response (400): { "success": false, "code": "INVALID_STATUS", "message": "Invalid status parameter" }
Response (401): { "success": false, "code": "UNAUTHORIZED", "message": "Invalid or expired token" }
Response (500): { "success": false, "code": "SERVER_ERROR", "message": "Failed to fetch visitors" }
```

---

## 7. Loading & Empty States

| State | Trigger | Display Behavior |
|-------|---------|------------------|
| **Loading Counts** | `isLoadingCounts = true` | 4 skeleton pills, gray background, no badges, pills disabled |
| **Loading Visitors** | `isLoadingVisitors = true` | Pills interactive, 3-4 skeleton cards below pills, aria-busy="true" |
| **Counts Error** | `countsError != null` | Pills without badges, interactive, inline error: "Unable to load visitor counts" |
| **Visitors Error** | `visitorsError != null` | Error banner: "Failed to load visitors. Please check connection.", Retry button |
| **Empty Visitor List** | `visitors.length === 0` | Empty state icon, message: "No visitors in this category", context-aware secondary text |

---

## 8. Accessibility Requirements

Follow `frontend-patterns` skill for general accessibility patterns. Unique requirements for this component:

| Requirement | Implementation |
|-------------|----------------|
| **Tablist Pattern** | Container `role="tablist"`, pills `role="tab"`, visitor list `role="region"` |
| **ARIA Labels** | Each pill: `aria-label="{label} ({count} visitors)"` |
| **State Attributes** | `aria-selected`, `aria-pressed`, `aria-disabled` on pills |
| **Keyboard Navigation** | Tab order follows filter order, Arrow keys (Left/Right) navigate pills, Enter/Space activates |
| **Live Updates** | Visitor list region `aria-live="polite"` announces updates |
| **Focus Management** | Move focus to newly selected pill on change |
| **Color Contrast** | WCAG AA: Selected (high contrast), Default (gray-200 border), Disabled (gray-400) |

---

## 9. Responsive Design

| Breakpoint | Container Layout | Pill Styling | Touch Targets |
|------------|------------------|--------------|---------------|
| **Mobile (<768px)** | `flex row gap-2 overflow-x-auto snap-x snap-mandatory` | Auto width, min 80px | 44px height × 44px min width |
| **Tablet (768-1024px)** | `flex row gap-3 overflow-x-auto` | Auto width, centered | 48px minimum |
| **Desktop (>1024px)** | `flex row gap-3 overflow-hidden` (all fit) | Auto width, left-aligned | No constraints (pointer) |

**Badge Size:** 20x20px (mobile), 24x24px (tablet+). Always visible if count > 0. Positioned top-right of pill.

---

## 10. Component Structure

### 10.1 StatusFilterPills Component Hierarchy

```
StatusFilterPills
└── Navigation Container (role="tablist")
    └── Filter Pills (4 instances, role="tab")
        ├── Pill Label (text: "Pending", "Approved", "In", "Out")
        └── Count Badge (conditional, count > 0)
```

**Component Responsibilities:**
- Render horizontal scrollable container with tablist role
- Iterate through STATUS_FILTER_CONFIGS array
- For each filter config:
  - Determine pill state (selected/default/disabled)
  - Retrieve visitor count from counts object
  - Render button with:
    - Label text
    - Count badge (if applicable)
    - ARIA attributes (aria-label, aria-selected, aria-pressed)
    - Click handler (if enabled)
- Support keyboard navigation and accessibility

**Data Flow:**
- Input: `selectedFilter`, `counts`, `onFilterChange`, `disabled`
- Output: Click events calling `onFilterChange(filterId)`

### 10.2 LogsTab Component Hierarchy

```
LogsTab
├── StatusFilterPills (filter controls)
│   └── Navigation Container (role="tablist")
│       └── Filter Pills (4 pills with counts)
├── Status Feedback Regions (conditional)
│   ├── Counts Error Banner (role="alert", aria-live="polite")
│   ├── Visitors Error Banner (role="alert", aria-live="polite", with Retry)
│   ├── Loading Skeleton (aria-busy="true")
│   └── Empty State (icon + message, aria-live="polite")
└── Visitor List Region (role="region", aria-live="polite")
    └── VisitorProfileCard Components (one per visitor, from Task 7.2)
```

**Component Responsibilities:**
- Manage all state from LogsTabState interface
- Initialize with default filter ('PENDING')
- Fetch visitor counts on mount
- Fetch filtered visitor list on mount and filter change
- Coordinate display of loading, error, and empty states
- Delegate rendering of visitor cards to child components

**Conditional Rendering Logic:**
1. Always render StatusFilterPills (disabled during counts loading)
2. Render Counts Error Banner if `countsError != null`
3. Render Visitor Loading Skeleton if `isLoadingVisitors = true`
4. Render Empty State if `visitors?.length === 0` and not loading/error
5. Render Visitors Error Banner if `visitorsError != null`
6. Render Visitor List Region if `visitors?.length > 0`

**Data Flow:**
- Input: `branchId`, `authToken`
- Internal State: LogsTabState
- API Calls: fetchVisitorCounts(), fetchVisitorsByStatus()
- Output: Rendered UI with filtered visitor data

---

## 11. Test Cases

### 11.1 Unit Tests (20 tests)
**StatusFilterPills (8):** Renders 4 pills, displays counts, shows selected/disabled states, handles clicks, ARIA attributes, skeleton loading, hides zero count badges
**LogsTab (12):** Default PENDING filter, fetches counts/visitors on mount, updates filter, refetches on change, loading states, error messages, empty state, preserves state

### 11.2 Integration Tests (9 tests)
**Visitor Counts API:** Correct counts, 401 on invalid token, 500 on server error
**Visitors by Status API:** Returns visitors for single/multiple statuses, empty array when none, 401 on invalid token, 400 on invalid status, 500 on error

### 11.3 E2E Tests (13 tests)
Default Pending selection, display counts, switch filters (Pending/Approved/In/Out), show visitor list, empty state, keyboard navigation (Arrows, Enter, Space), loading skeleton, error message, horizontal scroll (mobile)

### 11.4 Accessibility Tests (9 tests)
Tablist/tab roles, aria-label with count, aria-pressed/selected on active pill, aria-disabled when disabled, keyboard navigable, color contrast, screen reader announcements

---

## 12. Dependencies

### 12.1 Component Dependencies
- **Task 3.4**: `VisitorProfileCard` component (Task 7.2)
- **Task 6.1**: Security Dashboard Layout (parent container)
- **Task 7.2**: Visitor List with `VisitorProfileCard` (renders below pills)

### 12.2 External Dependencies
- **TanStack Query**: Data fetching, caching, state management
- **Lucide React**: Loading/empty state icons
- **Tailwind CSS**: Responsive utilities

### 12.3 Backend API Dependencies
- JWT authentication middleware (existing)
- Visitor repository/service (existing)
- Security API controller (extended with counts endpoint)

---

## 13. Acceptance Criteria Verification

| Criterion | Implementation |
|-----------|----------------|
| Horizontal scrollable pills | `overflow-x-auto`, `snap-x`, hide scrollbar |
| Pills: Pending, Approved, In, Out | STATUS_FILTER_CONFIGS array with 4 items |
| Shows count per status | Count badge on each pill, fetched from `/counts` endpoint |
| Default to 'Pending' | Initial state `selectedFilter = 'PENDING'` |
| Mobile-first design | Touch targets ≥44px, horizontal scroll on mobile |
| Accessibility | ARIA attributes, keyboard navigation, screen reader support |
| Loading states | Skeleton loaders for counts and visitors |
| Empty states | "No visitors in this category" with context-aware messages |

---

## 14. Edge Cases & Error Handling

| Scenario | System Response |
|----------|-----------------|
| **Network Error (counts)** | Pills interactive, no badges, error: "Unable to load visitor counts. Filter still available." |
| **Network Error (visitors)** | Error: "Failed to load visitors. Please check connection.", Retry button, preserve filter |
| **Zero Counts All Filters** | Pills with count=0 (no badges), empty state: "No visitors recorded today" |
| **Invalid Branch ID** | API returns 400/404, error: "Invalid branch selected", redirect or alert |
| **Expired Auth Token** | API returns 401, clear auth state, redirect to login, session expired notification |

---

**End of Specification**
