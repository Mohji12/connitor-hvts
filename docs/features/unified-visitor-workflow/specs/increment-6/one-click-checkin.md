# POST /visitors/checkin/:visitId - Technical Specification

> **Task ID:** 6.5
> **Feature:** Unified Visitor Workflow
> **Increment:** 6
> **Status:** Draft

## 1. File Path

- **Controller:** `backend/src/visitors/visitors.controller.ts` (extend)
- **Service:** `backend/src/visitors/visitors.service.ts` (extend)
- **DTO:** `backend/src/visitors/dto/visitor.dto.ts` (add CheckInResponseDto)
- **Frontend Component:** `frontend/src/app/security/dashboard/components/CheckInTab.tsx` (update)
- **API Client:** `frontend/src/lib/services/visitorService.ts` (add checkInVisit method)

## 2. Data Models

### 2.1 Request

**Path Parameter:** `visitId` (string, UUID format)

**No Request Body Required** - OTP is already verified in Task 6.2

### 2.2 Success Response: CheckInSuccessResponse

```typescript
export interface CheckInSuccessResponse {
  success: true;
  message: string;
  visitId: string;
  checkInTime: Date;
  visitor: {
    id: string;
    firstName: string;
    lastName: string;
  };
}
```

### 2.3 Error Response: CheckInErrorResponse

```typescript
export interface CheckInErrorResponse {
  statusCode: number;
  error: string;
  message: string;
  code: string;
  details?: {
    currentStatus?: string;
    visitId?: string;
  };
}
```

### 2.4 Frontend State Types

```typescript
interface CheckInTabState {
  // ... existing state from Task 6.3
  isCheckingIn: boolean;
  checkInError?: string;
}

interface VisitorCheckInAction {
  visitId: string;
  onSuccess: (response: CheckInSuccessResponse) => void;
  onError: (error: CheckInErrorResponse) => void;
}
```

## 3. Function Signatures

### 3.1 Controller Method

```typescript
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.SECURITY, Role.SECURITY_SUPERVISOR)
@ApiBearerAuth('access-token')
@Post('checkin/:visitId')
@ApiOperation({
  summary: 'Check-in visitor using visit ID (after OTP verification)',
})
@ApiResponse({ status: 200, description: 'Visitor checked in successfully' })
@ApiResponse({ status: 400, description: 'Invalid visit state for check-in' })
@ApiResponse({ status: 401, description: 'Unauthorized' })
@ApiResponse({ status: 404, description: 'Visit not found' })
async checkInVisitor(
  @Param('visitId') visitId: string,
  @Req() req: RequestWithUser,
): Promise<CheckInSuccessResponse>
```

### 3.2 Service Method

```typescript
/**
 * Performs visitor check-in after OTP verification.
 * Validates visit is in APPROVED state, updates to CHECKED_IN,
 * records check-in time and security user who performed check-in.
 *
 * @param visitId - Visit ID (UUID) to check in
 * @param user - Security user performing check-in
 * @returns Check-in success response with timestamp
 *
 * @throws BadRequestException - With code 'VISIT_NOT_APPROVED' if visit is not APPROVED
 * @throws BadRequestException - With code 'ALREADY_CHECKED_IN' if visit is already CHECKED_IN
 * @throws BadRequestException - With code 'VISIT_ALREADY_COMPLETED' if visit is CHECKED_OUT or REJECTED
 * @throws NotFoundException - With code 'VISIT_NOT_FOUND' if visit does not exist
 */
async checkInVisitor(
  visitId: string,
  user: JwtPayload,
): Promise<CheckInSuccessResponse>
```

### 3.3 Frontend API Client Method

```typescript
/**
 * Check-in visitor using visit ID from verified OTP.
 * Called after successful OTP verification (Task 6.2).
 *
 * @param visitId - Visit ID returned from verify-checkin-otp endpoint
 * @returns Check-in success response
 *
 * @throws ApiError with code 'VISIT_NOT_APPROVED': Visit is not in APPROVED state
 * @throws ApiError with code 'ALREADY_CHECKED_IN': Visit is already checked in
 * @throws ApiError with code 'VISIT_NOT_FOUND': Visit does not exist
 */
async checkInVisit(
  visitId: string,
): Promise<CheckInSuccessResponse>
```

### 3.4 Frontend Component Handler

```typescript
/**
 * Handle check-in button click from CheckIn tab.
 * Calls check-in API with visitId from verified OTP response.
 * Shows success toast on completion, transitions back to OTP input.
 *
 * @param visitId - Visit ID from VerifyCheckInOtpResponse
 * @returns void
 */
async function handleCheckIn(visitId: string): Promise<void>
```

## 4. Pseudo-Code / Logic

### 4.1 Backend Service Logic

```typescript
async checkInVisitor(visitId: string, user: JwtPayload): Promise<CheckInSuccessResponse> {
  const now = new Date();

  // 1. Fetch visit with visitor relation
  const visit = await this.prisma.visit.findUnique({
    where: { id: visitId },
    include: { visitor: true },
  });

  // 2. Validate visit exists
  if (!visit) {
    throw new NotFoundException({
      statusCode: 404,
      message: 'Visit not found',
      error: 'VISIT_NOT_FOUND',
    });
  }

  // 3. Validate user has access to this visit's branch
  if (visit.branchId !== user.branchId) {
    throw new BadRequestException({
      statusCode: 403,
      message: 'Visit does not belong to your branch',
      error: 'FORBIDDEN_BRANCH',
    });
  }

  // 4. Validate visit is in APPROVED state (only APPROVED visits can be checked in)
  if (visit.status !== VisitStatus.APPROVED) {
    if (visit.status === VisitStatus.CHECKED_IN) {
      throw new BadRequestException({
        statusCode: 400,
        message: 'Visitor is already checked in',
        error: 'ALREADY_CHECKED_IN',
      });
    }
    if (visit.status === VisitStatus.CHECKED_OUT) {
      throw new BadRequestException({
        statusCode: 400,
        message: 'Visit has already been completed',
        error: 'VISIT_ALREADY_COMPLETED',
      });
    }
    if (visit.status === VisitStatus.REJECTED) {
      throw new BadRequestException({
        statusCode: 400,
        message: 'Visit was rejected',
        error: 'VISIT_ALREADY_COMPLETED',
      });
    }
    // REQUEST_SENT or any other state
    throw new BadRequestException({
      statusCode: 400,
      message: 'Visit is not approved for check-in',
      error: 'VISIT_NOT_APPROVED',
      details: { currentStatus: visit.status },
    });
  }

  // 5. Update visit to CHECKED_IN state
  const updatedVisit = await this.prisma.visit.update({
    where: { id: visitId },
    data: {
      status: VisitStatus.CHECKED_IN,
      checkInTime: now,
      checkedInById: user.id,
      checkedInLocation: user.location || null,
    },
  });

  // 6. Notify staff (if staff is assigned)
  if (visit.staffId) {
    const staff = await this.prisma.user.findUnique({
      where: { id: visit.staffId },
    });
    if (staff) {
      await this.notificationsService.notifyStaffOnCheckIn(
        updatedVisit,
        staff,
        visit.visitor,
      );
    }
  }

  // 7. Return success response
  return {
    success: true,
    message: 'Visitor checked in successfully.',
    visitId: updatedVisit.id,
    checkInTime: updatedVisit.checkInTime!,
    visitor: {
      id: visit.visitor.id,
      firstName: visit.visitor.firstName,
      lastName: visit.visitor.lastName,
    },
  };
}
```

### 4.2 Frontend API Client Logic

```typescript
async function checkInVisit(visitId: string): Promise<CheckInSuccessResponse> {
  const response = await apiClient.post<CheckInSuccessResponse>(
    `/api/visitors/checkin/${visitId}`,
    {}, // Empty request body
    {
      headers: {
        'Content-Type': 'application/json',
      },
    },
  );

  return response.data;
}
```

### 4.3 Frontend Component Handler Logic

```typescript
async function handleCheckIn(visitId: string): Promise<void> {
  setIsCheckingIn(true);
  setCheckInError(undefined);

  try {
    const response = await VisitorService.checkInVisit(visitId);

    // Show success toast with visitor name
    toast.success('Check-In Successful', {
      description: `${response.visitor.firstName} ${response.visitor.lastName} is now checked in.`,
    });

    // Announce to screen readers
    announceStatus('Check-in completed successfully.');

    // Reset to fresh OTP input state
    resetToOtpView();

    // Optionally call parent callback if provided
    onCheckInSuccess?.(response);
  } catch (error: ApiError) {
    // Map error codes to user-friendly messages
    const errorMessage = mapCheckInErrorToMessage(error.code);
    setCheckInError(errorMessage);

    toast.error('Check-In Failed', {
      description: errorMessage,
    });
  } finally {
    setIsCheckingIn(false);
  }
}

function mapCheckInErrorToMessage(code: string): string {
  switch (code) {
    case 'VISIT_NOT_APPROVED':
      return 'Visit is not approved for check-in.';
    case 'ALREADY_CHECKED_IN':
      return 'Visitor is already checked in.';
    case 'VISIT_ALREADY_COMPLETED':
      return 'This visit has already been completed.';
    case 'VISIT_NOT_FOUND':
      return 'Visit not found. Please verify again.';
    case 'FORBIDDEN_BRANCH':
      return 'You do not have access to this visit.';
    default:
      return 'Check-in failed. Please try again.';
  }
}

function resetToOtpView(): void {
  setViewMode('otp');
  setOtpValue('');
  setOtpState('idle');
  setOtpError(undefined);
  setVisitorData(null);
  setCheckInError(undefined);
}
```

### 4.4 Integration with Visitor Details Card

```typescript
function VisitorDetailsCard({
  visitorData,
  onCheckIn,
  onCancel,
  isCheckingIn = false,
}: VisitorDetailsCardProps) {
  return (
    <div className="space-y-4">
      {/* Visitor details display ... */}

      {/* Check-In Action Section */}
      {visitorData.canCheckIn && (
        <Button
          onClick={() => onCheckIn(visitorData.visitId)}
          disabled={isCheckingIn}
          className="w-full cursor-pointer"
          aria-label={`Check in ${visitorData.visitor.firstName} ${visitorData.visitor.lastName}`}
        >
          {isCheckingIn && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isCheckingIn ? 'Checking In...' : 'Check In'}
        </Button>
      )}

      {!visitorData.canCheckIn && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Cannot Check In</AlertTitle>
          <AlertDescription>
            Visit status is {visitorData.visit.status}. Only approved visits can be checked in.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
```

## 5. Test Cases

### 5.1 Backend Unit Tests

| Test Case | Description | Expected Result |
|-----------|-------------|-----------------|
| Valid Check-in - Approved Visit | Check-in visitor with APPROVED status | Returns success, status = CHECKED_IN, checkInTime set |
| Valid Check-in - With Staff Assignment | Check-in visit with assigned staff | Success, staff notification sent |
| Valid Check-in - Without Staff Assignment | Check-in visit without staff (delivery) | Success, no staff notification |
| Wrong Branch - User Different | User from different branch attempts check-in | 403 Forbidden, error: 'FORBIDDEN_BRANCH' |
| Not Approved - REQUEST_SENT | Attempt check-in on pending visit | 400, error: 'VISIT_NOT_APPROVED', details: currentStatus |
| Already Checked In | Attempt check-in on CHECKED_IN visit | 400, error: 'ALREADY_CHECKED_IN' |
| Visit Rejected | Attempt check-in on REJECTED visit | 400, error: 'VISIT_ALREADY_COMPLETED' |
| Visit Completed | Attempt check-in on CHECKED_OUT visit | 400, error: 'VISIT_ALREADY_COMPLETED' |
| Visit Not Found | Check-in with non-existent visitId | 404, error: 'VISIT_NOT_FOUND' |
| Check-in Time Recording | Verify checkInTime is recorded | checkInTime is current timestamp (within 1 second) |
| User Tracking | Verify checkedInById is set | checkedInById matches requesting security user |

### 5.2 Frontend Component Tests

| Test Case | Description | Expected Result |
|-----------|-------------|-----------------|
| Click Check-In Button | User clicks "Check In" with valid visitId | API call made, isCheckingIn = true |
| Check-In Success | API returns success | Success toast shown, state reset to OTP view |
| Check-In Error - Not Approved | API returns VISIT_NOT_APPROVED | Error toast with message, state remains on visitor details |
| Check-In Error - Already Checked In | API returns ALREADY_CHECKED_IN | Error toast, button disabled |
| Loading State | Check-in in progress | Button shows spinner, "Checking In..." text, button disabled |
| Cancel During Check-In | User clicks Cancel after check-in completes | State reset to OTP view regardless |
| Error Recovery | Check-in fails, user tries again | Retry allowed, previous error cleared |

### 5.3 Integration Tests (E2E)

| Test Case | Description | Expected Result |
|-----------|-------------|-----------------|
| Full OTP + Check-In Flow | Enter OTP → Verify → Click Check-In | Complete flow from OTP to check-in success |
| Multiple Sequential Check-Ins | Check-in visitor A, then visitor B | Both successful, no state pollution |
| Check-In After Reload | Verify OTP, reload page, click Check-In | Check-in still works (visitId preserved) |
| Staff Notification Flow | Check-in visit with assigned staff | Staff receives notification of check-in |

### 5.4 Security Tests

| Test Case | Description | Expected Result |
|-----------|-------------|-----------------|
| No Auth Token | Request without JWT | 401 Unauthorized |
| Invalid Auth Token | Request with expired JWT | 401 Unauthorized |
| Non-Security Role | Request from STAFF role | 403 Forbidden |
| Cross-Boundary Check-In | User from branch A checks-in branch B visit | 403 Forbidden, error: 'FORBIDDEN_BRANCH' |

## 6. Error Codes

### 6.1 New Error Codes

```typescript
export enum CheckInError {
  VISIT_NOT_FOUND = 'VISIT_NOT_FOUND',
  VISIT_NOT_APPROVED = 'VISIT_NOT_APPROVED',
  ALREADY_CHECKED_IN = 'ALREADY_CHECKED_IN',
  VISIT_ALREADY_COMPLETED = 'VISIT_ALREADY_COMPLETED',
  FORBIDDEN_BRANCH = 'FORBIDDEN_BRANCH',
}
```

### 6.2 HTTP Status Codes

| Status | Error Code | Description |
|--------|------------|-------------|
| 200 | - | Success - Visitor checked in |
| 400 | VISIT_NOT_APPROVED | Visit is not in APPROVED state |
| 400 | ALREADY_CHECKED_IN | Visit is already checked in |
| 400 | VISIT_ALREADY_COMPLETED | Visit is CHECKED_OUT or REJECTED |
| 403 | FORBIDDEN_BRANCH | User does not have access to this visit's branch |
| 404 | VISIT_NOT_FOUND | Visit does not exist |
| 401 | - | Unauthorized (missing/invalid JWT) |
| 403 | - | Forbidden (user not SECURITY/SECURITY_SUPERVISOR) |

## 7. Accessibility Requirements

### 7.1 Keyboard Navigation

- **Check-In Button:** Accessible via Tab, activates on Enter/Space
- **Escape Key:** Cancels check-in operation (optional enhancement)
- **Tab Order:** Logical flow from visitor details to Check-In button

### 7.2 ARIA Attributes

```typescript
<Button
  onClick={() => handleCheckIn(visitId)}
  disabled={isCheckingIn || !canCheckIn}
  className="w-full cursor-pointer"
  aria-label={`Check in ${visitor.firstName} ${visitor.lastName}`}
  aria-busy={isCheckingIn}
>
  {isCheckingIn && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
  {isCheckingIn ? 'Checking In...' : 'Check In'}
</Button>
```

- **aria-label:** Describes button action with visitor name
- **aria-busy:** Indicates loading state during API call
- **aria-describedby:** Links to error message (if present)

### 7.3 Screen Reader Announcements

```typescript
// Success announcement
announceStatus('Check-in completed successfully. Welcome, [Visitor Name].');

// Error announcement
announceStatus(`Check-in failed. ${errorMessage}`);
```

### 7.4 Visual Accessibility

- **Button Disabled State:** Visibly muted color + opacity, maintains legibility
- **Loading Indicator:** Spinner with text "Checking In..." for context
- **Error Messages:** High contrast red on light background (WCAG AA 4.5:1)
- **Touch Targets:** Minimum 44px height for mobile

## 8. Integration Points

### 8.1 Preceding Tasks

- **Task 6.2 (verify-checkin-otp):** Provides visitId after OTP verification
  - Returns `VerifyCheckInOtpResponse` with `visitId` field
  - Visit must be in APPROVED state before check-in

- **Task 6.3 (Check-In Tab):** Renders visitor details with Check-In button
  - `canCheckIn: true` flag enables Check-In button
  - Calls `handleCheckIn()` with visitId on button click

### 8.2 Following Tasks

- **Task 7.2 (Visitor Logs):** Will show CHECKED_IN visitors in "In" filter
- **Task 9.2 (Already Checked In Edge Case):** Will display "Already checked in at [time]" for duplicate attempts

### 8.3 Related Backend Services

- **NotificationsService:** Sends staff notification on check-in
- **Prisma:** Updates Visit record with status and timestamps

### 8.4 Related Frontend Components

- **VisitorProfileCard:** Used to display checked-in visitor in logs
- **StatusBadge:** Shows CHECKED_IN status (purple variant)
- **Logs Tab:** Refreshes to show visitor in "In" list after check-in

## 9. Edge Cases

| Edge Case | Handling |
|-----------|----------|
| Check-in during approval transition | Visit status is APPROVED, proceed normally |
| Check-in with stale visitId | Visit already CHECKED_OUT, return VISIT_ALREADY_COMPLETED |
| Multiple rapid check-in clicks | Debounce or disable button during API call |
| Network timeout during check-in | Show error, allow retry, preserve visitor details |
| Staff notification failure | Log error, complete check-in anyway (don't block on notification) |
| User location missing | Set `checkedInLocation: null`, don't block check-in |
| Visit has no visitor relation | Should not happen (FK constraint), return VISIT_NOT_FOUND |
| JWT expires mid-check-in | Return 401, frontend redirects to login |

## 10. Performance Considerations

### 10.1 Backend

- **Database Query:** Single `findUnique` + `update` transaction
- **Indexing:** Ensure `Visit.id` is indexed (primary key)
- **Staff Notification:** Async, non-blocking (fire and forget)

### 10.2 Frontend

- **Button Debouncing:** Disable button during API call (prevent double submit)
- **Optimistic UI:** Show loading state immediately on click
- **Cancel Pending Calls:** Abort controller on unmount or cancel
- **Toast Performance:** Use lightweight toast notifications, don't block UI

## 11. Data Flow Diagram

```
[Visitor presents OTP]
         ↓
[Security enters OTP in Check-In Tab]
         ↓
[Task 6.2: POST /visitors/verify-checkin-otp]
         ↓ (returns VerifyCheckInOtpResponse)
[Check-In Tab shows visitor details + "Check In" button]
         ↓
[Security clicks "Check In"]
         ↓
[Task 6.5: POST /visitors/checkin/:visitId]
         ↓ (returns CheckInSuccessResponse)
[Backend: Update Visit.status → CHECKED_IN]
[Backend: Set checkInTime, checkedInById, checkedInLocation]
[Backend: Send staff notification (if assigned)]
         ↓
[Frontend: Show success toast]
[Frontend: Reset to OTP input view]
[Logs Tab (Task 7.2): Shows visitor in "In" list]
```

## 12. Dependencies

| Dependency | Purpose |
|-------------|---------|
| `JwtAuthGuard` | Validates security user JWT token |
| `RolesGuard` | Enforces SECURITY/SECURITY_SUPERVISOR role |
| `NotificationsService` | Sends check-in notification to staff |
| `Prisma` | Database updates for visit status |
| `OtpInput` (Task 3.1) | OTP input component for verification |
| `VerifyCheckInOtpResponse` (Task 6.2) | Provides visitId for check-in |
