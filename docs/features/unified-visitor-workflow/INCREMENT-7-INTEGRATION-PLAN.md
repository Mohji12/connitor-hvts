# Increment 7 Integration Plan

> **Date:** 2026-02-11
> **Feature:** Unified Visitor Workflow
> **Increment:** 7 - Security Dashboard UI (Logs Tab)
> **Status:** In Progress (2/5 tasks done)

---

## 📋 Executive Summary

The Logs Tab for the Security Dashboard is currently **partially implemented**. While individual components from tasks 7.1 and 7.2 have been created and tested, they are **not yet integrated** into a cohesive, working user interface.

This plan outlines the **5 tasks** required to align the implementation with the approved technical specifications. Each task includes context explaining **why it's needed** and the **rationale for the execution order**.

---

## 🔍 Current State Analysis

### What's Working ✅
- **StatusFilterPills.tsx** (Task 7.1) - Fully implemented and tested
  - Horizontal scrollable pills (Pending, Approved, In, Out)
  - Status counts displayed
  - Keyboard navigation and accessibility complete

- **VisitorList.tsx** (Task 7.2) - Fully implemented and tested
  - Search input with 300ms debouncing
  - Compact VisitorProfileCard usage
  - Status-aware action buttons (Approve/Reject, Verify OTP, Check Out)
  - Reject confirmation dialog with reason validation
  - Loading, error, and empty states
  - 61 unit tests passing

- **LogsTab.tsx** - Basic skeleton exists but incomplete
  - Uses StatusFilterPills ✅
  - Uses VisitorProfileCard directly ❌ (should use VisitorList)
  - No polling mechanism ❌
  - No visitor details modal ❌

### What's Missing ❌
1. **Integration:** `LogsTab.tsx` doesn't use `VisitorList` component
2. **Polling:** No 30-second auto-refresh (Task 7.3)
3. **Visitor Details:** No modal to view full visitor information (Task 7.4)
4. **Approve/Reject API:** No service methods for approve/reject endpoints (Task 7.5)
5. **Separation:** Reject dialog is embedded in VisitorList instead of being a standalone component

---

## 📅 Task Execution Plan

### **Task A: Integrate VisitorList into LogsTab**

**Estimated Time:** 1.5 hours
**Priority:** 🔴 High

#### Context: Why are we doing this?

Currently, `LogsTab.tsx` (line 335-358) renders `VisitorProfileCard` components directly, which means:
- **No search functionality** - The search input exists in `VisitorList` but isn't being used
- **No action buttons** - Approve/Reject/Verify OTP/Check Out buttons aren't displayed
- **No reject dialog** - The reject confirmation dialog is part of `VisitorList` but not accessible
- **Code duplication** - `LogsTab` manages its own visitor rendering state, duplicating logic from `VisitorList`

**The Impact:**
- Security users cannot approve/reject visitors from the Logs Tab
- Security users cannot verify OTP for check-in
- Security users cannot check out visitors
- The tab is read-only, making it functionally useless

#### What We'll Do

1. Update `frontend/src/app/security/dashboard/components/LogsTab.tsx`:
   - Import `VisitorList` component from task 7.2
   - Replace the direct `VisitorProfileCard` rendering loop with a single `<VisitorList>` component
   - Pass all required props:
     - `visitors` - The current visitor list
     - `isLoading` - Loading state
     - `error` - Error state
     - `onApprove` - Callback for approve action
     - `onReject` - Callback for reject action
     - `onVerifyOtp` - Callback for OTP verification
     - `onCheckOut` - Callback for check-out action
     - `onViewDetails` - Callback for opening visitor details modal (placeholder for Task C)
   - Remove redundant visitor rendering code
   - Remove redundant search logic (handled by VisitorList)

2. Add state for visitor details modal:
   ```typescript
   const [visitorToViewDetails, setVisitorToViewDetails] = useState<VisitorProfile | null>(null);
   ```

#### Acceptance Criteria
- ✅ `LogsTab.tsx` renders `VisitorList` component instead of direct card rendering
- ✅ Search input appears and functions (300ms debounce)
- ✅ Action buttons (Approve/Reject/Verify OTP/Check Out) appear on visitor cards
- ✅ All callbacks are properly wired
- ✅ Component builds without TypeScript errors
- ✅ Unit tests pass

#### Dependencies
- **Prerequisite:** None (Task 7.2 already complete)
- **Blocking:** Task C (needs `onViewDetails` to be wired)

---

### **Task B: Implement 30-Second Polling**

**Estimated Time:** 2 hours
**Priority:** 🔴 High
**Corresponds to:** Task 7.3 from specification

#### Context: Why are we doing this?

Real-time security operations require **live data**. Without polling:

**Current Problems:**
1. **Stale Data:** Visitor statuses change frequently (PENDING → APPROVED → CHECKED_IN → CHECKED_OUT), but the UI only updates when:
   - User manually refreshes the page
   - User switches tabs and back
   - This is unacceptable for security operations where timely action is critical

2. **Poor UX:** Security users must manually refresh to see new visitor requests or status updates, creating friction and potentially causing missed time-sensitive decisions

3. **Race Conditions:** Multiple security officers working simultaneously won't see each other's actions without refreshing

**The Impact:**
- Delayed approvals (missed time windows)
- Duplicate approvals (two officers approving the same visitor)
- Confusion about visitor status
- Poor user experience for security team

#### What We'll Do

1. Create `frontend/src/components/security/logs-tab/use-logs-polling.ts`:
   - Implement custom React hook for polling logic
   - State management: `isLoading`, `lastRefreshTime`, `error`, `isPollingActive`, `pollCount`
   - Configuration: 30-second interval, max 3 retries on failure
   - Functions:
     - `performPoll()` - Single fetch with current filters
     - `startPolling()` - Enable auto-polling, trigger immediate fetch
     - `stopPolling()` - Disable auto-polling, clear timer
     - `refreshNow()` - Manual refresh, resets failure counter
     - `resetPolling()` - Clear poll metrics for new filter session
   - Cleanup: Clear timer on component unmount
   - Auto-start on mount if enabled

2. Create `frontend/src/components/security/logs-tab/logs-refresh-control.tsx`:
   - Live/Paused indicator (green pulsing dot vs gray dot)
   - "Last refreshed Xm ago" timestamp display
   - Manual refresh button (RefreshCw icon, spins during loading)
   - Toggle polling button (Pause/Play icons)
   - Error message display with retry option
   - Accessibility: Proper ARIA labels, keyboard navigation

3. Update `frontend/src/app/security/dashboard/components/LogsTab.tsx`:
   - Import `useLogsPolling` hook
   - Import `LogsRefreshControl` component
   - Replace manual fetch logic with polling hook
   - Pass current filter state to polling hook
   - Render `LogsRefreshControl` above visitor list
   - Pass polling state and control functions to refresh control component

#### Acceptance Criteria
- ✅ Visitor list auto-refreshes every 30 seconds
- ✅ Live indicator shows green pulsing dot when polling active
- ✅ Paused indicator shows gray dot when polling disabled
- ✅ Manual refresh button triggers immediate fetch
- ✅ Toggle button enables/disables auto-polling
- ✅ Filter state preserved during polling (no reset on auto-refresh)
- ✅ "Last refreshed Xm ago" updates correctly
- ✅ Error messages display with retry option
- ✅ Polling stops after 3 consecutive failures
- ✅ Unit tests for hook pass
- ✅ Unit tests for component pass
- ✅ Integration tests pass

#### Dependencies
- **Prerequisite:** Task A (LogsTab needs VisitorList integrated first)
- **Blocking:** None (can be done in parallel with Task C)

---

### **Task C: Create Visitor Details Modal**

**Estimated Time:** 2 hours
**Priority:** 🟡 Medium
**Corresponds to:** Task 7.4 from specification

#### Context: Why are we doing this?

Security officers need **detailed visitor information** to make informed decisions about approvals, check-ins, and check-outs.

**Current Problems:**
1. **Limited Information in List View:** The compact `VisitorProfileCard` shows only:
   - Name, phone, photo (if available)
   - Status badges
   - Action buttons

   Missing critical information for decision-making:
   - **Purpose of visit** - Why is this person here?
   - **Host name/department** - Who are they meeting?
   - **Timestamps** - When was this requested/approved/checked-in?
   - **Company/designation** - For business visitors
   - **Check-In OTP** - For quick verification at gate
   - **OTP Expiry** - To ensure code is still valid

2. **No Context for Actions:** Before approving/rejecting, security officers want to see:
   - Full visitor history
   - The exact request details
   - Any notes or flags on the visitor
   - Photo in larger size for verification

3. **Poor Mobile UX:** Tapping a visitor card currently does nothing. On mobile devices where space is limited, users expect a tap to show more details.

**The Impact:**
- Security officers make decisions without complete information
- Higher chance of errors (approving wrong visitors, rejecting legitimate ones)
- Need to switch to other tabs/screens to view details
- Frustrating user experience on mobile devices

#### What We'll Do

1. Create `frontend/src/components/visitors/security/VisitorDetailsModal.tsx`:
   - Modal component using Radix UI Dialog
   - Full visitor information display:
     - Large avatar/photo with fallback to initials
     - Full name, phone, email
     - Company, designation (for meeting visits)
     - Platform/recipient (for delivery visits)
     - Host name and department (meeting only)
     - Purpose of visit
     - Status badges (VisitStatus, VisitType)
     - Check-In OTP (for APPROVED status) with expiry time
     - Timestamps: Requested, Approved, Checked In, Checked Out
   - Context-aware action button:
     - APPROVED: "Check In" button
     - CHECKED_IN: "Check Out" button
     - REQUEST_SENT: "Pending Approval" (disabled)
     - Other: No action button
   - Loading state (spinner while fetching details)
   - Error state with retry option
   - Photo error handling (fallback to initials)
   - Responsive design:
     - Mobile: Bottom sheet (90vw max-width)
     - Tablet: Centered modal (80vw)
     - Desktop: Centered modal (600px max-width)
   - Accessibility features:
     - Focus trap when open
     - ESC key to close
     - ARIA attributes (role="dialog", aria-modal="true")
     - Keyboard navigation (Tab, Enter, Space)
     - Screen reader announcements

2. Update `frontend/src/app/security/dashboard/components/LogsTab.tsx`:
   - Import `VisitorDetailsModal` component
   - Add state: `visitorToViewDetails` (already added in Task A)
   - Create `handleViewDetails` callback that sets `visitorToViewDetails`
   - Pass `onViewDetails` to `VisitorList` component
   - Render `VisitorDetailsModal` when `visitorToViewDetails != null`
   - Create `handleModalClose` callback that clears `visitorToViewDetails`
   - Create `handleVisitorAction` callback that:
     - Calls appropriate API (approve/reject/check-in/check-out)
     - Shows loading state
     - Closes modal on success
     - Shows toast notification

#### Acceptance Criteria
- ✅ Tapping a visitor card opens the modal
- ✅ Modal displays all visitor information (photo, name, phone, email, company, designation)
- ✅ Meeting visits show: Host name, department, purpose
- ✅ Delivery visits show: Platform, recipient
- ✅ APPROVED visits display: Check-In OTP and expiry time
- ✅ CHECKED_IN visits show: Check-Out button
- ✅ REQUEST_SENT visits show: "Pending Approval" (disabled button)
- ✅ Loading state shows spinner with "Loading visitor details..."
- ✅ Error state shows "Unable to load details" with retry button
- ✅ Photo loads or shows initials fallback on error
- ✅ Modal is responsive (mobile bottom sheet, desktop centered)
- ✅ Accessibility: Focus trap, keyboard navigation, ARIA attributes
- ✅ ESC key closes modal
- ✅ Unit tests pass
- ✅ E2E tests pass

#### Dependencies
- **Prerequisite:** Task A (VisitorList needs `onViewDetails` callback wired)
- **Blocking:** None (can be done in parallel with Task B and D)

---

### **Task D: Refactor Approve/Reject Actions**

**Estimated Time:** 2 hours
**Priority:** 🟡 Medium
**Corresponds to:** Task 7.5 from specification

#### Context: Why are we doing this?

Currently, approve/reject functionality is **not complete** and **not following specification**.

**Current Problems:**
1. **Missing API Service Methods:**
   - `visit.service.ts` doesn't have `approveVisit(visitId)` method
   - `visit.service.ts` doesn't have `rejectVisit(visitId, reason)` method
   - The approve/reject actions in `VisitorActionButtons` don't have API methods to call
   - This means the buttons exist but **don't actually work**

2. **Reject Dialog Not Standalone:**
   - The reject confirmation dialog is **embedded directly** in `VisitorList.tsx` (lines 156-183)
   - Specification requires it to be a **separate component**: `RejectVisitDialog.tsx`
   - This violates the single responsibility principle and makes the dialog difficult to reuse
   - Testing is harder with the dialog embedded

3. **No Error Handling for API Calls:**
   - When approve/reject fails (network error, server error, validation error), there's no:
     - Toast notification to inform the user
     - Retry mechanism
     - Proper error state display
   - Users see nothing happen and don't know if action succeeded

**The Impact:**
- **Security officers cannot actually approve or reject visitors** - buttons are non-functional
- No feedback when actions fail
- Code is harder to maintain and test
- Violates approved specification

#### What We'll Do

1. Create `frontend/src/components/visitors/security/RejectVisitDialog.tsx`:
   - Standalone Radix UI Dialog component
   - Dialog title: "Reject Visit Request"
   - Visitor name display: "for [Visitor Name]?"
   - Reason textarea:
     - 4 rows
     - Max 500 characters
     - Placeholder: "e.g., Visitor not on approved list..."
   - Character count: "X/500" (changes color when approaching limit)
   - Validation:
     - Empty or whitespace-only: "Please provide a reason for rejection"
     - Less than 5 characters: "Reason must be at least 5 characters"
     - More than 500 characters: "Reason must be less than 500 characters"
   - Buttons: Cancel (outline), Reject (destructive/red)
   - Loading state: Spinner on submit button, textarea disabled
   - Accessibility: Focus trap, ARIA attributes, keyboard navigation

2. Create/extend `frontend/src/services/visit.service.ts`:
   - If file doesn't exist, create it
   - Add `approveVisit(visitId: string)` method:
     - Calls `POST /visits/:visitId/approve`
     - Request body: Empty (visitId is URL parameter)
     - Returns: `ApproveVisitResponse` with `status: 'APPROVED'`, `checkInOtp`, `checkInOtpExpiry`
     - Error handling:
       - 400 VALIDATION_FAILED
       - 404 VISIT_NOT_FOUND
       - 409 VISIT_ALREADY_PROCESSED, ALREADY_CHECKED_IN
   - Add `rejectVisit(visitId: string, reason: string)` method:
     - Calls `POST /visits/:visitId/reject`
     - Request body: `{ reason: string }`
     - Returns: `RejectVisitResponse` with `status: 'REJECTED'`
     - Error handling:
       - 400 VALIDATION_FAILED
       - 404 VISIT_NOT_FOUND
       - 409 VISIT_ALREADY_PROCESSED

3. Update `frontend/src/components/visitors/logs/VisitorActionButtons.tsx`:
   - Import `RejectVisitDialog` component
   - Remove inline reject dialog code
   - Add state for reject dialog: `showRejectDialog`, `rejectDialogVisitor`, `rejectReason`
   - Update `handleReject` to set dialog state instead of inline processing
   - Update `handleConfirmReject` to:
     - Validate reason (if applicable)
     - Call `visit.service.rejectVisit(visitId, reason)`
     - Show loading state
     - On success: Call `onActionComplete`, close dialog, clear state
     - On error: Show toast notification, keep dialog open
   - Update `handleApprove` to:
     - Call `visit.service.approveVisit(visitId)`
     - Show loading state
     - On success: Call `onActionComplete`, show success toast
     - On error: Show error toast

4. Update `frontend/src/app/dashboard/security/logs/VisitorList.tsx`:
   - Import `VisitorActionButtons` and `RejectVisitDialog` from separate files
   - Remove inline reject dialog (lines 156-183)
   - Remove inline reject logic
   - Ensure `VisitorActionButtons` is properly integrated with `RejectVisitDialog`

#### Acceptance Criteria
- ✅ `RejectVisitDialog` is a separate, reusable component
- ✅ Dialog shows validation errors for empty or short reason
- ✅ Character count displays correctly ("X/500")
- ✅ `visit.service.ts` has `approveVisit(visitId)` method
- ✅ `visit.service.ts` has `rejectVisit(visitId, reason)` method
- ✅ Approve action calls API and generates Check-In OTP
- ✅ Reject action calls API and saves rejection reason
- ✅ Toast notifications show on success: "Visit approved. Gate Pass sent." / "Visit rejected."
- ✅ Toast notifications show on error: "Failed to approve. [error message]"
- ✅ Button shows loading state during API call
- ✅ Error codes handled correctly (400, 404, 409)
- ✅ Unit tests for `RejectVisitDialog` pass
- ✅ Unit tests for `visit.service.ts` methods pass
- ✅ Integration tests pass

#### Dependencies
- **Prerequisite:** None (can be done independently)
- **Blocking:** Task E (needs approve/reject to work for E2E testing)

---

### **Task E: Final Integration & Testing**

**Estimated Time:** 1.5 hours
**Priority:** 🟢 Low

#### Context: Why are we doing this?

After implementing Tasks A-D, we'll have all the individual pieces, but we need to ensure they **work together seamlessly** as a cohesive user experience.

**Potential Issues:**
1. **Integration Bugs:** Components may not wire together correctly
   - Callbacks not passing data properly
   - State not updating as expected
   - Race conditions between polling and user actions

2. **Missing Error Cases:** Edge cases not covered in unit tests
   - What happens if visitor list is empty?
   - What happens if polling fails?
   - What happens if API returns unexpected data?

3. **Inconsistent UX:** Different components may have different:
   - Loading states (spinners vs skeleton vs text)
   - Error displays (toast vs inline vs banner)
   - Button styles (primary vs secondary colors)

4. **Performance Issues:**
   - Unnecessary re-renders
   - Memory leaks from incomplete cleanup
   - Slow loading due to unoptimized queries

**The Impact:**
- Poor user experience with subtle bugs
- Harder to maintain code
- Potential regressions in future changes
- Failed acceptance criteria

#### What We'll Do

1. **Integration Testing:**
   - Test complete user flow:
     - Open Security Dashboard → Click Logs tab
     - View visitor counts by status
     - Filter visitors by status (Pending → Approved → In → Out)
     - Search for visitor by name/phone
     - Click visitor card → View details modal
     - From modal: Approve/Reject/Check-In/Check-Out
     - Verify 30-second polling updates list
     - Click manual refresh button
     - Toggle auto-refresh on/off
   - Test error scenarios:
     - Network error during polling (retries 3 times then stops)
     - API error during approve/reject
     - Invalid reject reason (validation error)
     - Expired auth token

2. **E2E Test Coverage:**
   - Review existing E2E tests from Task 7.1 (60 tests)
   - Add/update E2E tests for:
     - Search functionality (type, clear, filter results)
     - Approve/Reject actions from modal
     - Check-In/Check-Out actions from modal
     - Polling behavior (verify 30-second interval)
     - Manual refresh button
     - Toggle polling button
     - Visitor details modal (open, close, escape key)
     - Error handling (network, validation, API errors)
   - Ensure tests pass on Chromium, Firefox, WebKit

3. **Code Review & Cleanup:**
   - Remove unused imports
   - Remove duplicate code
   - Ensure TypeScript strict mode passes (no `any` types)
   - Verify all ESLint rules pass
   - Check for console errors/warnings
   - Verify memory leaks (useEffect cleanup, interval clearing)

4. **Manual Testing:**
   - Open application in mobile, tablet, desktop viewports
   - Test touch targets (minimum 44x44px on mobile)
   - Test keyboard navigation (Tab, Enter, Space, Escape)
   - Test screen reader ( announcements for actions)
   - Test with slow network (throttling)
   - Test with no visitors (empty state)
   - Test with many visitors (scrolling, performance)

5. **Documentation Update:**
   - Update `TASKS.md` to mark tasks 7.3, 7.4, 7.5 as ✅ Done
   - Update Increment 7 status to "Done"
   - Add any notes about implementation decisions
   - Update test coverage statistics

#### Acceptance Criteria
- ✅ All integration tests pass
- ✅ All E2E tests pass (increment 7, ~60+ tests)
- ✅ Lint: No errors or warnings
- ✅ Build: Successful production build
- ✅ TypeScript: Strict mode, no type errors
- ✅ Manual testing: All features work end-to-end
- ✅ Performance: No unnecessary re-renders, no memory leaks
- ✅ `TASKS.md` updated with all tasks marked as Done
- ✅ Increment 7 status updated to "Done"

#### Dependencies
- **Prerequisite:** Tasks A, B, C, D (all must be complete)
- **Blocking:** None (final task in increment)

---

## 📊 Rationale for Execution Order

### Why This Order?

| Order | Task | Reason |
|--------|-------|--------|
| **1st** | **Task A (Integration)** | Foundation - `LogsTab` must use `VisitorList` before we can add callbacks for other tasks (polling, details, actions) |
| **2nd** | **Task B (Polling)** | Independent - Can be done after Task A, doesn't affect other tasks. Provides live data which improves testing experience |
| **3rd** | **Task C (Visitor Details)** | Independent - Can be done in parallel with Task B. Task A provides the wiring (`onViewDetails` callback) |
| **4th** | **Task D (Approve/Reject)** | Independent - Can be done in parallel with Tasks B and C. Doesn't depend on other integration work |
| **5th** | **Task E (Final Testing)** | Final - Must be last. Requires all previous tasks to be complete before integration testing |

### Parallel Execution Opportunities

Tasks **B, C, and D** can be worked on **in parallel** after Task A is complete:

```
Task A (Integration)
    ↓ (blocking)
┌─────────────────┬─────────────────┬─────────────────┐
│                 │                 │                 │
Task B (Polling)  Task C (Details)  Task D (Actions)
│                 │                 │                 │
└─────────────────┴─────────────────┴─────────────────┘
                                 ↓
                        Task E (Final Testing)
```

This approach allows us to complete the increment faster (~9 hours total vs ~15 hours if done sequentially).

---

## 🎯 Success Criteria

The integration plan is **complete** when:

1. **Functional Requirements:**
   - ✅ Security officers can view all visitors with filters (Pending, Approved, In, Out)
   - ✅ Security officers can search visitors by name/phone/purpose
   - ✅ Security officers can approve pending visitors (generates OTP)
   - ✅ Security officers can reject pending visitors (with reason)
   - ✅ Security officers can verify OTP and check-in approved visitors
   - ✅ Security officers can check-out checked-in visitors
   - ✅ Security officers can view detailed visitor information in modal
   - ✅ Visitor list auto-refreshes every 30 seconds
   - ✅ Security officers can manually refresh the list
   - ✅ Security officers can pause/resume auto-refresh

2. **Non-Functional Requirements:**
   - ✅ All loading states provide clear feedback
   - ✅ All error states provide recovery options
   - ✅ All actions have accessible keyboard navigation
   - ✅ All components are responsive (mobile, tablet, desktop)
   - ✅ All components follow design system (colors, typography, spacing)
   - ✅ Code is maintainable (single responsibility, DRY, typed)

3. **Quality Requirements:**
   - ✅ Unit tests cover all components and services
   - ✅ Integration tests cover user workflows
   - ✅ E2E tests cover happy path and edge cases
   - ✅ Lint passes with no errors or warnings
   - ✅ Build succeeds with no type errors
   - ✅ Manual testing confirms everything works

---

## 📝 Notes

### Implementation Decisions
- **Use TanStack Query or SWR:** Already using SWR in `SecurityVisitorLogs.tsx`, consider standardizing
- **Polling Interval:** 30 seconds is conservative to avoid server load while keeping data fresh
- **Modal Library:** Radix UI Dialog already in project, use it for consistency
- **Error Handling:** Toast notifications (sonner) already in project, use it for consistency

### Potential Risks
- **API Endpoints Missing:** `/visits/:visitId/approve` and `/visits/:visitId/reject` may not exist yet on backend
  - **Mitigation:** Check backend implementation, create if missing
- **Type Definitions:** Some types may need to be added to `/types/visitor.ts`
  - **Mitigation:** Add types as needed during implementation
- **Performance:** Polling every 30s with many visitors could be slow
  - **Mitigation:** Implement pagination or limit visitor count per status

### Future Improvements
- **Visibility API:** Pause polling when browser tab is inactive to save bandwidth
- **Optimistic Updates:** Update UI immediately after action, rollback on error
- **WebSockets:** Replace polling with real-time updates (future enhancement)
- **Sound Notifications:** Alert security officers on new pending visitors

---

## 🚀 Next Steps

**Current Status:** Ready to begin Task A

**Action:** Execute tasks in the recommended order:
1. Task A: Integrate VisitorList into LogsTab
2. Task B: Implement 30-Second Polling
3. Task C: Create Visitor Details Modal
4. Task D: Refactor Approve/Reject Actions
5. Task E: Final Integration & Testing

**Estimated Completion:** ~9 hours of development

---

**End of Integration Plan**
