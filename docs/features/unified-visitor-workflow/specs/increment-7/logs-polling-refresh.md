# Spec: Logs Polling Refresh

**Task ID:** 7.3
**Feature:** Unified Visitor Workflow
**Increment:** 7 - Security Dashboard UI (Logs Tab)
**Category:** UI/Component
**Complexity:** Small
**Est. Time:** 2h

---

## 1. File Path

- **Hook:** `frontend/src/components/security/logs-tab/use-logs-polling.ts`
- **Component:** `frontend/src/components/security/logs-tab/logs-refresh-control.tsx`
- **Parent:** `frontend/src/components/security/logs-tab/logs-tab.tsx`

---

## 2. Data Models

### 2.1 Logs Polling State

```typescript
interface LogsPollingState {
  isLoading: boolean;           // True during active poll fetch
  lastRefreshTime: Date | null; // Timestamp of last successful refresh
  error: PollingError | null;   // Error from last poll attempt
  isPollingActive: boolean;     // True when auto-polling is enabled
  pollCount: number;            // Number of successful polls in session
}

interface PollingError {
  code: PollingErrorCode;
  message: string;
  timestamp: Date;
}

enum PollingErrorCode {
  NETWORK_ERROR = 'NETWORK_ERROR',
  SERVER_ERROR = 'SERVER_ERROR',
  TIMEOUT = 'TIMEOUT',
  UNAUTHORIZED = 'UNAUTHORIZED',
}
```

### 2.2 Polling Configuration

```typescript
interface PollingConfig {
  intervalMs: number;           // Polling interval (default: 30000ms)
  enabled: boolean;             // Auto-polling enabled flag
  retryOnFailure: boolean;      // Continue polling after errors
  maxRetries: number;           // Max consecutive failures before stopping
}

const DEFAULT_POLLING_CONFIG: PollingConfig = {
  intervalMs: 30000,           // 30 seconds
  enabled: true,
  retryOnFailure: true,
  maxRetries: 3,
};
```

### 2.3 Refresh Control Props

```typescript
interface LogsRefreshControlProps {
  isLoading: boolean;
  lastRefreshTime: Date | null;
  error: PollingError | null;
  onManualRefresh: () => Promise<void>;
  onTogglePolling: () => void;
  isPollingActive: boolean;
}
```

---

## 3. Function Signatures

### 3.1 Custom Hook: use-logs-polling.ts

```typescript
// Main polling hook for Logs tab
//
// Parameters:
//   fetchVisitors: Callback function to fetch visitor data. Receives filter state,
//                  must return Promise resolving to VisitorListResponse.
//                  The hook will call this on each poll.
//   currentFilters: Current filter state to pass to fetchVisitors on each poll.
//                   Ensures polling respects user's filter selections.
//   config: Optional configuration to override default polling behavior.
//
// Returns: Object containing state and control functions
function useLogsPolling(
  fetchVisitors: (filters: VisitorFilterState) => Promise<VisitorListResponse>,
  currentFilters: VisitorFilterState,
  config?: Partial<PollingConfig>
): {
  state: LogsPollingState;         // Current polling state (read-only)
  refreshNow: () => Promise<void>; // Triggers immediate single poll fetch
  startPolling: () => void;        // Enables auto-polling, triggers state update to isPollingActive=true
  stopPolling: () => void;         // Disables auto-polling, triggers state update to isPollingActive=false
  resetPolling: () => void;        // Resets pollCount, error, and lastRefreshTime to initial values
}

interface VisitorListResponse {
  success: boolean;
  data: {
    visitors: VisitorProfile[];
    totalCount: number;
  };
}

/**
 * External dependency type definition (provided by useVisitorList hook)
 * NOTE: This is the INTERNAL filtering state for the polling mechanism,
 * distinct from the API response structure above.
 */
interface VisitorFilterState {
  status?: 'PENDING' | 'CHECKED_IN' | 'CHECKED_OUT' | 'ALL';
  dateFrom?: Date;
  dateTo?: Date;
  searchQuery?: string;
}
```

### 3.2 Component: logs-refresh-control.tsx

```typescript
function LogsRefreshControl(props: LogsRefreshControlProps): JSX.Element

// Internal helpers
function formatLastRefreshTime(date: Date | null): string
function getErrorMessage(error: PollingError | null): string | null
```

---

## 4. Pseudo-Code / High-Level Logic

### 4.1 Polling Hook Logic

```typescript
function useLogsPolling(fetchVisitors, currentFilters, partialConfig) {
  // Merge with default config
  const config = { ...DEFAULT_POLLING_CONFIG, ...partialConfig }

  // Initialize React state (triggers re-renders on changes)
  const [state, setState] = useState<LogsPollingState>({
    isLoading: false,
    lastRefreshTime: null,
    error: null,
    isPollingActive: config.enabled,
    pollCount: 0,
  })

  // Internal mutable state for timer management
  let timerId: NodeJS.Timeout | null = null
  let consecutiveFailures = 0

  // State update helper functions
  const setLoading = (isLoading: boolean) => {
    setState(prev => ({ ...prev, isLoading }))
  }

  const updateSuccessState = () => {
    setState(prev => ({
      ...prev,
      isLoading: false,
      lastRefreshTime: new Date(),
      error: null,
      pollCount: prev.pollCount + 1,
    }))
    consecutiveFailures = 0
  }

  const updateErrorState = (error: PollingError) => {
    setState(prev => ({
      ...prev,
      isLoading: false,
      error: error,
    }))
    consecutiveFailures += 1
  }

  const setPollingActive = (active: boolean) => {
    setState(prev => ({ ...prev, isPollingActive: active }))
  }

  // Single poll execution
  async function performPoll(): Promise<void> {
    // Guard against concurrent polls
    if (state.isLoading) return

    setLoading(true)

    try {
      // Fetch visitors with current filters preserved
      // External dependency: fetchVisitors must handle errors appropriately
      await fetchVisitors(currentFilters)

      // Update success state triggers re-render
      updateSuccessState()

    } catch (error) {
      // Map error to PollingError type
      const pollingError = mapErrorToPollingError(error)
      updateErrorState(pollingError)

      // Stop polling if max retries exceeded
      if (consecutiveFailures >= config.maxRetries && config.retryOnFailure) {
        stopPolling()
      }
    }
  }

  // Start automatic polling
  // Returns: void, but triggers state update (isPollingActive = true)
  function startPolling(): void {
    if (timerId !== null) return // Already running

    setPollingActive(true)

    // Immediate fetch on start
    performPoll()

    // Schedule recurring polls
    timerId = setInterval(() => {
      if (state.isPollingActive) {
        performPoll()
      }
    }, config.intervalMs)
  }

  // Stop automatic polling
  // Returns: void, but triggers state update (isPollingActive = false)
  function stopPolling(): void {
    setPollingActive(false)

    if (timerId !== null) {
      clearInterval(timerId)
      timerId = null
    }
  }

  // Manual refresh
  // Returns: Promise that resolves when fetch completes or rejects on error
  // Behavior: Resets consecutiveFailures counter, performs single poll
  async function refreshNow(): Promise<void> {
    consecutiveFailures = 0 // Reset on manual trigger
    await performPoll()
  }

  // Reset polling state
  // Returns: void, but triggers state update (resets count, error, time)
  // Usage: Call on filter changes to provide fresh "session" metrics
  function resetPolling(): void {
    setState(prev => ({
      ...prev,
      lastRefreshTime: null,
      error: null,
      pollCount: 0,
    }))
    consecutiveFailures = 0
  }

  // Cleanup on unmount (prevents memory leaks)
  useEffect(() => {
    return () => {
      stopPolling()
    }
  }, [])

  // Auto-start polling on mount if enabled
  useEffect(() => {
    if (config.enabled && !timerId) {
      startPolling()
    }
  }, [])

  return { state, refreshNow, startPolling, stopPolling, resetPolling }
}
```

### 4.2 Refresh Control Component Structure

```
LogsRefreshControl
├── Display Section (Left)
│   ├── Live/Paused Indicator
│   │   ├── Dot (green pulsing if active, gray if paused)
│   │   └── Status Text ("Live" or "Paused")
│   ├── Last Refresh Time (if exists)
│   │   └── Formatted: "Updated Xm ago"
│   └── Loading Spinner (if isLoading)
│
└── Controls Section (Right)
    ├── Error Message (if error exists)
    │   └── Text with role="alert"
    ├── Manual Refresh Button
    │   ├── Icon: RefreshCw (spinning if isLoading)
    │   └── Disabled state when isLoading
    └── Toggle Polling Button
        ├── Icon: Pause (if active) or Play (if paused)
        └── aria-label: "Pause auto-refresh" or "Start auto-refresh"
```

**Data Flow:**

```
Parent (logs-tab.tsx)
    ↓ props
LogsRefreshControl
    ↓
Display visual state based on props
    ↓
User interactions (click)
    ↓
Callback functions (onManualRefresh, onTogglePolling)
    ↓
Parent updates polling state
    ↓
Re-render with new props
```

### 4.3 Parent Integration Structure

```
LogsTab
├── Filter State (VisitorFilterState)
│   └── Managed via useState
│
├── Visitor List (from useVisitorList)
│   ├── visitors: Visitor[]
│   └── fetchVisitors: (filters) => Promise<VisitorListResponse>
│
├── Polling Hook (useLogsPolling)
│   ├── Input: fetchVisitors, currentFilters
│   ├── Output: pollingState, control functions
│   └── Trigger: Auto-start on mount
│
├── Refresh Control Component
│   └── Props: pollingState + event handlers
│
└── Visitor List Display
    └── Shows current visitors with filters applied
```

**Interaction Flow:**

```
Filter Change
    ↓
setFilterState(newFilters)
    ↓
Polling hook receives new filters via prop
    ↓
Next poll uses new filters automatically
    ↓ (optional)
resetPolling() to clear poll metrics for new filter session
```

**Reset Polling Behavior:**

| Trigger | Action |
|---------|--------|
| Filter status changed | Call resetPolling() to clear pollCount, lastRefreshTime, error |
| User clicks manual refresh | Poll continues, no reset needed (metrics track session) |
| Polling stopped and restarted | Call resetPolling() to start fresh session |

---

## 5. Behavior Specifications

### 5.1 Auto-Polling Behavior

| Scenario | Behavior |
|----------|----------|
| **Mount** | Polling starts automatically, fetches immediately |
| **Interval** | Every 30 seconds (configurable) |
| **Success** | Updates visitor list, updates "Last refreshed" time |
| **Network Error** | Shows error message, continues polling if retries < maxRetries |
| **Server Error (5xx)** | Shows error message, continues polling |
| **Unauthorized (401)** | Stops polling, redirects to login |
| **Max Retries Exceeded** | Stops polling, shows "Paused" indicator |
| **Tab Switch Away** | Polling continues (optional: use Visibility API to pause) |

### 5.2 Manual Refresh Behavior

| Scenario | Behavior |
|----------|----------|
| **Click Refresh** | Immediate fetch, resets failure counter |
| **During Active Poll** | Queues refresh, no duplicate fetch |
| **Error** | Shows error message, auto-polling continues |
| **Success** | Updates visitor list, "Last refreshed" = now |

### 5.3 Loading Indicator

| Scenario | Behavior |
|----------|----------|
| **Polling In Progress** | Subtle spinner next to "Live" indicator |
| **Manual Refresh** | Spinner on refresh button |
| **Content** | Never replaces/hides visitor list |

### 5.4 Filter Preservation

| Scenario | Behavior |
|----------|----------|
| **Auto-Poll** | Fetches with current filter state (status pill selection) |
| **Manual Refresh** | Fetches with current filter state |
| **Filter Change** | Immediate fetch with new filters, polling interval resets, poll metrics reset |

### 5.5 Polling Reset Behavior

| Scenario | Behavior |
|----------|----------|
| **Filter Status Changed** | Call resetPolling() to clear pollCount, lastRefreshTime, error |
| **Date Filter Changed** | Call resetPolling() to provide fresh session metrics |
| **Search Query Changed** | Polling continues with new query, no reset (metrics track search session) |
| **Manual Refresh** | No reset needed, metrics track continuous session |
| **Toggle Polling** | No reset needed when pausing/resuming |

---

## 6. Accessibility Requirements

| Element | Requirement |
|---------|-------------|
| **Refresh Button** | `aria-label="Refresh logs"` |
| **Toggle Button** | `aria-label={isPollingActive ? "Pause auto-refresh" : "Start auto-refresh"}` |
| **Error Message** | `role="alert"` |
| **Live Indicator** | `aria-hidden="true"` (decorative) |
| **Spinner** | `aria-hidden="true"` |
| **Keyboard Navigation** | Tab order: Filters → Refresh Control → Visitor List |

---

## 7. Test Cases

### 7.1 Unit Tests (use-logs-polling.ts)

| Test Case | Description |
|-----------|-------------|
| **Initial State** | On mount, `isPollingActive = true`, `pollCount = 0`, immediate fetch triggered |
| **30-Second Interval** | Polling triggers every 30 seconds after initial fetch |
| **Manual Refresh** | `refreshNow()` fetches immediately and resets timer |
| **Error Handling** | Network error sets `error` state, continues polling |
| **Max Retries** | After 3 consecutive failures, polling stops |
| **Filter Preservation** | Fetch is called with current filter state on every poll |
| **Cleanup** | `stopPolling()` clears interval on unmount |
| **Reset Polling** | `resetPolling()` clears pollCount, error, lastRefreshTime |
| **State Immutability** | State updates trigger re-renders, direct mutations don't work |

### 7.2 Component Tests (logs-refresh-control.tsx)

| Test Case | Description |
|-----------|-------------|
| **Render Live Indicator** | Shows green pulsing dot when `isPollingActive = true` |
| **Render Paused Indicator** | Shows gray dot when `isPollingActive = false` |
| **Loading Spinner** | Shows spinning icon during `isLoading = true` |
| **Error Display** | Shows error message with `role="alert"` |
| **Refresh Button** | Calls `onManualRefresh` on click, disabled during loading |
| **Toggle Button** | Calls `onTogglePolling` on click |
| **Time Display** | Shows "Updated Xm ago" when `lastRefreshTime` exists |
| **Aria Labels** | All buttons have proper `aria-label` attributes |

### 7.3 Integration Tests (logs-tab.tsx)

| Test Case | Description |
|-----------|-------------|
| **Auto-Poll on Mount** | Visitor list updates every 30 seconds |
| **Filter Change During Poll** | Changing status pill triggers immediate fetch, polling continues with new filter |
| **Filter Change Resets Metrics** | pollCount and lastRefreshTime cleared on filter change |
| **Manual Refresh** | Clicking refresh button updates list immediately |
| **Pause/Resume** | Toggle button stops/starts polling |
| **Error Recovery** | Network error shows message, polling continues on next interval |
| **Content Preservation** | Visitor list remains visible during loading |

---

## 8. Edge Cases

| Edge Case | Handling |
|-----------|----------|
| **Component Unmount During Poll** | `useEffect` cleanup clears interval |
| **Rapid Filter Changes** | Debounce filter changes, or let latest filter win |
| **Very Slow Network** | Timeout after 10 seconds, show error, continue polling |
| **Empty Visitor List** | Show empty state, polling continues |
| **Browser Tab Inactive** | (Optional) Pause polling using Page Visibility API |
| **Concurrent Refresh Calls** | Guard prevents duplicate fetches during active poll |
| **Reset During Active Poll** | Reset clears state metrics, active poll continues to completion |

---

## 9. Dependencies

| Dependency | Version | Purpose |
|------------|---------|---------|
| `react` | ^18+ | Hooks (`useState`, `useEffect`) |
| `lucide-react` | Latest | Icons (`RefreshCw`, `Pause`, `Play`) |
| `date-fns` | Latest | Time formatting (`formatDistanceToNow`) |

---

## 10. Notes

- Polling interval is intentionally conservative (30s) to avoid server load
- Subtle loading spinner ensures UX is not disrupted by refreshes
- Filter state is passed to polling hook, ensuring consistency
- Error messages are non-intrusive (inline, not toast/modals)
- ResetPolling should be called on filter changes to provide clean metrics for new filter sessions
- State management uses React patterns (useState) to trigger re-renders; direct mutations will not work
- fetchVisitors callback is an external dependency provided by parent component; hook does not manage visitor data, only polling logic
