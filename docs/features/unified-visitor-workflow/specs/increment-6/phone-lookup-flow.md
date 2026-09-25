# Phone Lookup Flow in Check-In Tab

**Task ID:** 6.4
**Increment:** 6
**Feature:** Unified Visitor Workflow
**Status:** Draft
**File Path:** `frontend/src/app/security/dashboard/components/PhoneLookupFlow.tsx`

## 1. File Path

- **Component:** `frontend/src/app/security/dashboard/components/PhoneLookupFlow.tsx`
- **Parent:** `frontend/src/app/security/dashboard/components/CheckInTab.tsx`
- **API Client:** `frontend/src/lib/api/visitors-api.ts` (add search-visitors method)

## 2. Data Models

### 2.1 Component Props

```typescript
interface PhoneLookupFlowProps {
  branchId: string;
  onVisitorFound: (visitor: VisitorData) => void;
  onBack: () => void;
  className?: string;
}
```

### 2.2 Internal State

```typescript
type LookupState = 'idle' | 'validating' | 'loading' | 'found' | 'not_found' | 'error';

interface PhoneLookupFlowState {
  phoneValue: string;
  lookupState: LookupState;
  validationError?: string;
  visitorData: VisitorData | null;
  apiError?: ApiError;
}
```

### 2.3 Visitor Data Type

```typescript
interface VisitorData {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email?: string | null;
  photo?: string | null;
  company?: string | null;
  designation?: string | null;
  governmentIdDocument?: string | null;
  lastVisit?: {
    visitDate: string;
    status: string;
  } | null;
}
```

### 2.4 API Request/Response Types

```typescript
interface SearchVisitorsRequest {
  phone: string; // 10-digit string
  branchId: string;
}

interface SearchVisitorsResponse {
  found: boolean;
  visitor?: VisitorData;
}

interface ApiError {
  statusCode: number;
  code: string;
  message: string;
}
```

## 3. Function Signatures

### 3.1 Main Component

```typescript
export function PhoneLookupFlow({
  branchId,
  onVisitorFound,
  onBack,
  className,
}: PhoneLookupFlowProps): JSX.Element
```

**Responsibilities:**
- Render phone input field with country code prefix
- Validate phone number format (10 digits)
- Call visitor search API on lookup action
- Display visitor details when found
- Display "Not found" state with "Register New" option
- Handle API errors gracefully

### 3.2 API Client Method

```typescript
export async function searchVisitors(
  request: SearchVisitorsRequest,
): Promise<SearchVisitorsResponse>
```

**Throws:**
- `ApiError` with status 400: Invalid phone format
- `ApiError` with status 401/403: Authentication/Authorization errors
- `ApiError` with status 500: Server error

### 3.3 Sub-Component: Visitor Found Display

```typescript
interface VisitorFoundDisplayProps {
  visitor: VisitorData;
  onSelect: () => void;
  onSearchAnother: () => void;
}

function VisitorFoundDisplay({
  visitor,
  onSelect,
  onSearchAnother,
}: VisitorFoundDisplayProps): JSX.Element
```

**Responsibilities:**
- Display visitor photo with initials fallback
- Show visitor name, phone, company
- Show last visit information if available
- Render "Select" button to proceed
- Render "Search Another" secondary button

### 3.4 Sub-Component: Visitor Not Found Display

```typescript
interface VisitorNotFoundDisplayProps {
  phone: string;
  onRegisterNew: () => void;
  onSearchAnother: () => void;
}

function VisitorNotFoundDisplay({
  phone,
  onRegisterNew,
  onSearchAnother,
}: VisitorNotFoundDisplayProps): JSX.Element
```

**Responsibilities:**
- Display "Not found" message with phone number
- Show "Register as new visitor" primary button
- Show "Search another" secondary button

## 4. High-Level Logic Flow

### 4.1 PhoneLookupFlow Component

```typescript
function PhoneLookupFlow({ branchId, onVisitorFound, onBack, className }: PhoneLookupFlowProps) {
  // State: phoneValue, lookupState, validationError, visitorData, apiError

  // Phone input change handler with validation
  function handlePhoneChange(value: string): void {
    // Remove non-digit characters
    const cleaned = value.replace(/\D/g, '');
    setPhoneValue(cleaned);

    // Validate: max 10 digits
    if (cleaned.length === 10) {
      setValidationError(undefined);
      setLookupState('valid');
    } else if (cleaned.length > 0) {
      setValidationError('Phone number must be 10 digits');
      setLookupState('idle');
    } else {
      setValidationError(undefined);
      setLookupState('idle');
    }
  }

  // Lookup handler
  async function handleLookup(): Promise<void> {
    if (phoneValue.length !== 10) {
      setValidationError('Please enter a valid 10-digit phone number');
      return;
    }

    setLookupState('loading');
    setApiError(undefined);

    try {
      const response = await searchVisitors({ phone: phoneValue, branchId });

      if (response.found && response.visitor) {
        setVisitorData(response.visitor);
        setLookupState('found');
        announceStatus('Visitor found.');
      } else {
        setVisitorData(null);
        setLookupState('not_found');
        announceStatus('Visitor not found.');
      }
    } catch (error) {
      setApiError(error as ApiError);
      setLookupState('error');
      announceStatus('Search failed. Please try again.');
    }
  }

  // Select found visitor
  function handleSelectVisitor(): void {
    if (visitorData) {
      onVisitorFound(visitorData);
    }
  }

  // Register new visitor - Placeholder for future implementation
  function handleRegisterNew(): void {
    // Register new visitor - Placeholder for future implementation
    // Option 1: Navigate to public registration flow with pre-filled phone
    // Option 2: Open modal for quick registration (requires new task)
    // Current: Show informative message
    toast.info('Registration Required', {
      description: 'Please ask the visitor to register using the public kiosk or QR code.',
    });
  }

  // Search another resets to initial state
  function handleSearchAnother(): void {
    setPhoneValue('');
    setLookupState('idle');
    setValidationError(undefined);
    setVisitorData(null);
    setApiError(undefined);
  }

  // Back handler
  function handleBack(): void {
    onBack();
  }

  // Render based on state: found | not_found | error | idle
}
```

### 4.2 API Client

```typescript
async function searchVisitors(request: SearchVisitorsRequest): Promise<SearchVisitorsResponse> {
  const response = await fetch(`/api/visitors/search?phone=${request.phone}&branchId=${request.branchId}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${getAuthToken()}`,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new ApiError(error);
  }

  return response.json();
}
```

### 4.3 Error Code Mapping

```typescript
function mapErrorCodeToMessage(code: string): string {
  switch (code) {
    case 'INVALID_PHONE_FORMAT': return 'Invalid phone number format.';
    case 'NETWORK_ERROR': return 'Connection lost. Please check your internet and try again.';
    case 'SERVER_ERROR': return 'Something went wrong. Please try again.';
    default: return 'Search failed. Please try again.';
  }
}
```

## 5. Component States & Transitions

### 5.1 State Diagram

```
[Initial - Phone Input]
        |
        | User enters phone (10 digits)
        v
[Valid]
        |
        | Click "Check Visitor" / "Search"
        v
[Loading - Searching...]
        |
        | API response
        +-------+--------+
        |                 |
     [Found]        [Not Found]
        |                 |
[Visitor Display]  [Not Found Display]
        |                 |
   Select visitor   Register new visitor
        |                 |
   onVisitorFound    navigateToPublicRegistration
        |
        | Click "Search Another"
        v
[Reset to Phone Input]

[Error State] - Any API error during loading
        |
        | Click "Try Again"
        v
[Retry Lookup]
```

### 5.2 State Visual Indicators

| State | Phone Input | Lookup Button | Visitor Display | Error Message |
|-------|-------------|---------------|-----------------|---------------|
| Idle | Enabled | Disabled "Check Visitor" | Hidden | None |
| Valid (10 digits) | Enabled | Enabled "Check Visitor" | Hidden | None |
| Loading | Disabled | Spinner "Searching..." | Hidden | None |
| Found | Disabled | Hidden | Visible with "Select" | None |
| Not Found | Disabled | Hidden | Not found message with "Register New" | None |
| Error | Enabled with value | "Try Again" | Hidden | Red text |

### 5.3 Transition Logic

1. **Idle → Valid**: User enters 10th digit, validation passes
2. **Valid → Loading**: User clicks "Check Visitor" button or presses Enter
3. **Loading → Found**: API returns `found: true` with visitor data
4. **Loading → Not Found**: API returns `found: false`
5. **Loading → Error**: API returns error response
6. **Found → Idle**: User clicks "Search Another", clear all state
7. **Not Found → Idle**: User clicks "Search Another", clear all state
8. **Error → Valid**: User clicks "Try Again", retry lookup with same phone

## 6. Key Test Cases

### 6.1 Happy Path

| Test Case | Expected Behavior |
|-----------|-------------------|
| Enter valid phone (10 digits) | Validation passes, "Check Visitor" enabled |
| Click "Check Visitor" with valid phone | Loading state, then visitor found/not found |
| Visitor found | Display visitor card with "Select" and "Search Another" buttons |
| Click "Select" | Calls `onVisitorFound` with visitor data |
| Click "Search Another" | Resets to phone input with empty state |
| Visitor not found | Display not found message with "Register New" button |
| Enter key after 10 digits | Triggers lookup |

### 6.2 Validation Scenarios

| Test Case | Expected Behavior |
|-----------|-------------------|
| Enter 9 digits | Validation error "Phone number must be 10 digits" |
| Enter 11 digits | Truncate to 10 digits, validate |
| Enter non-digit characters | Characters ignored, digits preserved |
| Empty input + click "Check Visitor" | Validation error, button disabled |
| Phone with spaces | Spaces removed, digits preserved |

### 6.3 Error Scenarios

| Test Case | Expected Behavior |
|-----------|-------------------|
| Network error during lookup | Show error message, "Try Again" button enabled |
| API 500 error | Show error message, preserve input |
| Invalid phone format (API returns 400) | Show error message, allow retry |
| Unauthorized error (401) | Show error message, suggest login |
| Multiple failed lookups | Allow retry until user clears input |

### 6.4 Visitor Display

| Test Case | Expected Behavior |
|-----------|-------------------|
| Visitor with photo | Display visitor image |
| Visitor without photo | Display initials fallback (e.g., "JD" for John Doe) |
| Visitor with company | Show company name |
| Visitor with last visit | Show last visit date and status |
| Visitor without last visit | Hide last visit section |

### 6.5 Accessibility

| Test Case | Expected Behavior |
|-----------|-------------------|
| Tab navigation | Logical order: Phone input → Lookup button → Back button |
| Screen reader validation | Announces validation errors (aria-live) |
| Screen reader found | Announces "Visitor found" |
| Screen reader not found | Announces "Visitor not found" |
| Keyboard | Enter key triggers lookup when phone valid |
| Focus management | Focus input on mount, focus error message on error |

## 7. Accessibility Requirements

### 7.1 Keyboard & Focus

- Logical tab order: Phone input → Lookup button → Back button
- Enter key triggers lookup when phone is valid (10 digits)
- Escape key triggers back action
- Focus phone input on component mount
- Focus visitor display when found
- Focus error message when error occurs
- Focus input after "Search Another"

### 7.2 ARIA Attributes

- **Phone Input:** `aria-label="Visitor Phone"`, `aria-describedby` for validation error
- **Lookup Button:** `aria-label="Check Visitor"`, `aria-busy` during loading
- **Back Button:** `aria-label="Back to OTP verification"`
- **Validation Error:** `role="alert"`, `aria-live="polite"`
- **Found Message:** `role="status"`, `aria-live="polite"`
- **Not Found Message:** `role="status"`, `aria-live="polite"`
- **API Error:** `role="alert"`, `aria-live="assertive"`

### 7.3 Screen Reader Announcements

- "Visitor found." when visitor is found
- "Visitor not found." when visitor not found
- Validation errors as they appear
- "Searching..." during loading
- "Search failed. Please try again." on API error

### 7.4 Visual Accessibility

- Error message: Red text on light background (WCAG AA 4.5:1)
- Button disabled state: Visibly muted but legible
- Touch targets: Minimum 44px height for mobile
- High contrast for visitor found/not found states

## 8. Visual Language & Microcopy

### 8.1 Key Design Tokens

| Element | Primary Colors |
|---------|---------------|
| Primary Button | Emerald-600 (`bg-emerald-600 hover:bg-emerald-700`) |
| Secondary Button | Slate/Gray (`bg-white border-gray-300 text-gray-700`) |
| Error State | Red-600 (`text-red-600 border-red-300`) |
| Not Found State | Amber-600 (`text-amber-600`) |
| Success State | Green-500 (`text-green-500`) |

### 8.2 Typography Scale

| Element | Size | Weight |
|---------|------|--------|
| Section Heading | text-lg | Semibold |
| Visitor Name | text-base | Semibold |
| Button Text | text-sm | Medium |
| Detail Labels/Values | text-sm | Normal/Medium |
| Error/Validation | text-sm | Medium |

### 8.3 Microcopy

| Context | Text |
|---------|-------|
| Section Heading | "Quick Check-In" |
| Phone Input Label | "Visitor Phone" |
| Phone Input Placeholder | "Enter 10-digit number" |
| Lookup Button | "Check Visitor" / "Search" |
| Loading State | "Searching..." |
| Found Message | "Visitor Found" |
| Not Found Message | "We couldn't find a visitor with this number." |
| Register New Button | "Register as new visitor" |
| Select Visitor Button | "Select" |
| Search Another Button | "Search Another" |
| Try Again Button | "Try Again" |
| Back Button | "Back" |
| Validation Error | "Phone number must be 10 digits" |
| Network Error | "Connection lost. Please check your internet and try again." |
| API Error | "Search failed. Please try again." |

## 9. Dependencies

### 9.1 Internal Components

- `VisitorProfileCard` (Task 3.4): Reusable visitor display card (compact variant)
- `StatusBadge` (Task 3.2): Visitor status badges

### 9.2 UI Components (shadcn/ui)

- `Button`, `Card`, `Avatar`, `Alert`, `Input`

### 9.3 External Libraries

- `lucide-react`: Icons (`Search`, `X`, `Loader2`, `AlertCircle`, `UserPlus`)

### 9.4 API Endpoints

- `GET /api/visitors/search?phone={phone}&branchId={branchId}`: Search visitor by phone

## 10. Error Handling Strategy

### 10.1 API Error Handling

| Error Code | User Message | Action |
|------------|-------------|--------|
| INVALID_PHONE_FORMAT | "Invalid phone number format." | Clear input, focus phone input |
| NETWORK_ERROR | "Connection lost. Please check your internet and try again." | Show "Try Again" button |
| SERVER_ERROR (500) | "Something went wrong. Please try again." | Show "Try Again" button |
| UNAUTHORIZED (401) | "Session expired. Please log in again." | Redirect to login |
| FORBIDDEN (403) | "You don't have permission to search visitors." | Show error, no retry |
| VISITOR_NOT_FOUND_REGISTER | "This visitor is not in our system. Please ask them to register." | Show info message with QR code option (future) |

### 10.2 Client-Side Validation

- Phone must be exactly 10 digits
- Only numeric characters allowed (non-digits stripped)
- Lookup button disabled when phone is invalid (< 10 digits)
- Enter key only triggers lookup when phone is valid

### 10.3 Graceful Degradation

- Show fallback display if VisitorProfileCard fails
- Preserve input on API error for retry
- Show initials fallback if visitor photo fails to load
- Cancel pending API calls on component unmount
- Cancel pending API calls on new lookup request

## 11. Integration Notes

### 11.1 Preceding Tasks

- **Task 3.4 (VisitorProfileCard)**: Provides visitor display component
- **Task 6.1 (Security Dashboard)**: Provides container layout
- **Task 6.3 (Check-In Tab)**: Parent component that uses phone lookup

### 11.2 Following Tasks

- **Task 6.5 (One-click check-in)**: Uses visitor data from phone lookup for check-in
- **Public Registration Flow**: "Register New" button may navigate to this flow (TBD)

### 11.3 File Structure

```
frontend/src/app/security/dashboard/components/
├── CheckInTab.tsx              # Parent component
└── PhoneLookupFlow.tsx         # Phone lookup flow (this task)

frontend/src/lib/api/
└── visitors-api.ts             # Add searchVisitors method
```

### 11.4 Parent Integration

PhoneLookupFlow is used within CheckInTab:
- CheckInTab maintains `viewMode` state ('otp' | 'phone' | 'visitor_details')
- When user clicks "Phone Lookup" in CheckInTab, sets `viewMode` to 'phone'
- PhoneLookupFlow receives `onBack` prop to return to OTP view
- PhoneLookupFlow receives `onVisitorFound` prop to transition to visitor details

## 12. Performance Considerations

- Cancel pending API calls on new lookup request (prevent race conditions)
- Debounce phone input (optional, consider user typing experience)
- Lazy load visitor photos with error boundaries
- Use React.memo for sub-components if needed
- Stable callback functions with useCallback
- Cache lookup results for recent searches (optional optimization)

## 13. Backend: Search Visitors Endpoint (New Task)

**Task ID:** 6.4.1
**Increment:** 6
**Feature:** Unified Visitor Workflow
**Status:** Draft

### 13.1 File Path

- **Controller:** `backend/src/visitors/visitors.controller.ts`
- **Service:** `backend/src/visitors/services/visitor-search.service.ts` (new)
- **DTO:** `backend/src/visitors/dto/visitor-search.dto.ts` (new)
- **Error Codes:** `backend/src/visitors/constants/visitor-error-codes.enum.ts` (extend)

### 13.2 Data Models

#### 13.2.1 Request DTO: SearchVisitorsQueryDto

```typescript
import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsNumberString, Length } from 'class-validator';

export class SearchVisitorsQueryDto {
  @ApiProperty({
    description: '10-digit phone number to search for',
    example: '9876543210',
    minLength: 10,
    maxLength: 10,
  })
  @IsString()
  @IsNotEmpty()
  @Length(10, 10)
  @IsNumberString()
  phone: string;

  @ApiProperty({
    description: 'Branch ID to filter visitors',
    example: 'branch-uuid-123',
  })
  @IsString()
  @IsNotEmpty()
  branchId: string;
}
```

#### 13.2.2 Success Response: SearchVisitorsResponse

```typescript
export interface SearchVisitorsResponse {
  found: boolean;
  visitor?: {
    id: string;
    firstName: string;
    lastName: string;
    phone: string;
    email?: string | null;
    photo?: string | null;
    company?: string | null;
    lastVisit?: {
      visitDate: string;
      status: string;
    } | null;
  };
}
```

#### 13.2.3 Error Response: StandardErrorResponse

```typescript
export interface StandardErrorResponse {
  statusCode: number;
  error: string;
  message: string;
  code: string;
}
```

### 13.3 Function Signatures

#### 13.3.1 Controller Method

```typescript
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.SECURITY, Role.SECURITY_SUPERVISOR)
@ApiBearerAuth('access-token')
@Get('search')
@ApiOperation({
  summary: 'Search for a visitor by phone number (Security only)',
})
@ApiResponse({ status: 200, description: 'Search completed successfully' })
@ApiResponse({ status: 400, description: 'Invalid request parameters' })
@ApiResponse({ status: 401, description: 'Unauthorized' })
@ApiResponse({ status: 403, description: 'Forbidden' })
async searchVisitors(
  @Query() query: SearchVisitorsQueryDto,
  @Req() req: RequestWithUser,
): Promise<SearchVisitorsResponse>
```

#### 13.3.2 Service Method (New VisitorSearchService)

```typescript
/**
 * Searches for a visitor by phone number within a specific branch.
 * Returns the visitor's most recent visit information if available.
 *
 * @param phone - 10-digit phone number
 * @param branchId - Branch ID for scoping the search
 * @returns Search result with visitor data if found
 *
 * @throws BadRequestException - With code 'INVALID_PHONE_FORMAT' if phone is invalid
 * @throws NotFoundException - With code 'VISITOR_NOT_FOUND' if no visitor found
 */
async searchVisitors(
  phone: string,
  branchId: string,
): Promise<SearchVisitorsResponse>
```

### 13.4 Pseudo-Code / Logic

#### 13.4.1 Controller Logic

```typescript
async searchVisitors(
  @Query() query: SearchVisitorsQueryDto,
  @Req() req: RequestWithUser,
): Promise<SearchVisitorsResponse> {
  // 1. Validate query DTO (handled by class-validator decorators)

  // 2. Call VisitorSearchService.searchVisitors
  return this.visitorSearchService.searchVisitors(query.phone, query.branchId);
}
```

#### 13.4.2 Service Logic

```typescript
async searchVisitors(
  phone: string,
  branchId: string,
): Promise<SearchVisitorsResponse> {
  // 1. Find visitor by phone and branchId
  const visitor = await this.prisma.visitor.findUnique({
    where: {
      phone_branchId: {
        phone: phone,
        branchId: branchId,
      },
    },
  });

  // 2. Handle visitor not found
  if (!visitor) {
    return {
      found: false,
    };
  }

  // 3. Find most recent visit for this visitor
  const lastVisit = await this.prisma.visit.findFirst({
    where: {
      visitorId: visitor.id,
      branchId: branchId,
    },
    orderBy: {
      createdAt: 'desc',
    },
    select: {
      createdAt: true,
      status: true,
    },
  });

  // 4. Return visitor data with last visit info
  return {
    found: true,
    visitor: {
      id: visitor.id,
      firstName: visitor.firstName,
      lastName: visitor.lastName,
      phone: visitor.phone,
      email: visitor.email,
      photo: visitor.photo,
      company: visitor.company,
      lastVisit: lastVisit ? {
        visitDate: lastVisit.createdAt.toISOString(),
        status: lastVisit.status,
      } : null,
    },
  };
}
```

### 13.5 Test Cases

#### 13.5.1 Happy Path

| Test Case | Description | Expected Result |
|-----------|-------------|-----------------|
| Visitor Found | Search with existing phone and branch | Returns `found: true` with visitor data |
| Visitor Found With Visit | Search with visitor who has previous visits | Returns visitor with `lastVisit` populated |
| Visitor No Previous Visits | Search with visitor who has no visits | Returns visitor with `lastVisit: null` |

#### 13.5.2 Error Cases

| Test Case | Description | Expected Result |
|-----------|-------------|-----------------|
| Visitor Not Found | Search with non-existent phone | Returns `found: false` |
| Wrong Branch | Search with phone from different branch | Returns `found: false` |
| Invalid Phone Format | Phone with non-numeric characters | 400, validation error |

#### 13.5.3 Validation Cases

| Test Case | Description | Expected Result |
|-----------|-------------|-----------------|
| Phone Not 10 Digits | Phone with 9 or 11 digits | 400, validation error |
| Phone Contains Letters | Phone "12345abcde" | 400, validation error |
| Empty Phone | Phone parameter missing | 400, validation error |
| Empty branchId | branchId parameter missing | 400, validation error |

#### 13.5.4 Security Cases

| Test Case | Description | Expected Result |
|-----------|-------------|-----------------|
| No Auth Token | Request without JWT | 401 Unauthorized |
| Invalid Auth Token | Request with invalid JWT | 401 Unauthorized |
| Non-Security Role | Request from STAFF role | 403 Forbidden |

### 13.6 Error Codes

#### 13.6.1 New Error Codes (extend existing enum)

```typescript
export enum VisitorSearchError {
  INVALID_PHONE_FORMAT = 'INVALID_PHONE_FORMAT',
  VISITOR_NOT_FOUND_REGISTER = 'VISITOR_NOT_FOUND_REGISTER',
}
```

#### 13.6.2 HTTP Status Codes

| Status | Error Code | Description |
|--------|------------|-------------|
| 200 | - | Success - Search completed |
| 400 | INVALID_PHONE_FORMAT | Phone number format is invalid |
| 401 | - | Unauthorized (missing/invalid JWT) |
| 403 | - | Forbidden (user not SECURITY/SECURITY_SUPERVISOR) |

### 13.7 Security Considerations

#### 13.7.1 Authentication
- **Required:** JWT token in `Authorization` header
- **Valid Roles:** `SECURITY`, `SECURITY_SUPERVISOR`
- **Guard:** `JwtAuthGuard` + `RolesGuard`

#### 13.7.2 Rate Limiting (Recommended)
- **Threshold:** 10 requests per minute per IP
- **Action:** Return `429 Too Many Requests` with `Retry-After` header
- **Implementation:** Use existing rate limiting patterns from Increment 2

#### 13.7.3 Data Privacy
- **Visitor Photo:** Returned as Base64 string (already stored in DB)
- **Phone Number:** Full number returned to security personnel (needed for verification)
- **Sensitive Data:** Government IDs are not included in response

#### 13.7.4 Audit Logging (Recommended)
- Log each search attempt with:
  - Timestamp
  - Security user ID
  - Branch ID
  - Phone searched
  - Result (found/not found)

### 13.8 Dependencies

| Service/Module | Purpose |
|--------------|---------|
| `VisitorSearchService` | Core search logic (new) |
| `JwtAuthGuard` | JWT token validation |
| `RolesGuard` | Role-based access control |
| `Prisma` | Database access |
| Unique Index | `phone_branchId` index on Visitor table |

### 13.9 Edge Cases

| Edge Case | Handling |
|-----------|----------|
| Multiple visitors with same phone | Not applicable - unique constraint on phone+branchId |
| Phone with spaces/characters | Validation catches before reaching service |
| BranchId doesn't exist | Query returns no matches (found: false) |
| Visitor has no photo | Return null for photo field |
| Visitor has no company | Return null for company field |
| Very old visits | Return most recent visit regardless of age |

### 13.10 Integration Notes

#### 13.10.1 Preceding Task
- **Task 6.4:** Phone Lookup Flow UI - Frontend component that calls this endpoint

#### 13.10.2 Following Task
- **Task 6.5:** One-click check-in - Uses visitor data returned by this endpoint

#### 13.10.3 Related Endpoints
- `GET /visitors/verify-checkin-otp` - Alternative visitor lookup method for Check-In

## 14. Open Questions

All questions resolved:
1. **Public Registration Integration**: Out of scope for MVP. Security dashboard uses OTP verification primarily. "Register New" shows info message with public registration instructions.
2. **Recent Visits**: Included - API returns visitor's most recent visit if available.
3. **Multiple Matches**: Not applicable - Phone is unique per visitor per branch due to database constraints.
4. **Search History**: Out of scope for MVP. Can be added as enhancement.
