# Technical Specification: Meeting Details Step (Step 4 - Meeting)

> **Task ID:** 5.2
> **Increment:** 5 - Public Registration UI (Visit Details & Status)
> **Status:** Spec
> **Created:** 2026-02-06
> **Updated:** 2026-02-20
> **Dependencies:** Task 4.5 (Meeting Registration Form), Task 2.4 (Status Endpoint), getBranchInfo endpoint

---

## 1. Overview

Fourth step in the public visitor registration wizard for meeting visitors. Collects department, host name (selectable from department staff list OR manual entry), and purpose of visit. Features staff list by department, searchable staff lookup API, and manual entry option for hosts not in the system.

### Key Features
- Fields: Department (dropdown), Host Name (department staff dropdown with "Other" option OR manual entry form), Purpose of Visit (textarea)
- Staff selection from department dropdown with "Other" option for manual entry
- Staff lookup API integration for searching hosts by name (existing functionality)
- Department staff API integration for listing all staff in selected department
- Back button to Step 3, Step indicator "Step 4 of 6 • Meeting"
- Single-column, centered layout (max-width 480px)
- Teal/Emerald theming consistent with Meeting flow
- Two host selection modes: dropdown (existing staff) and manual (for "Other")
- States: Loading (spinner, disabled inputs), Error (inline red text + red border), Success (green checkmark)

---

## 2. File Path

```
frontend/src/components/visitors/steps/MeetingDetailsStep.tsx
```

---

## 3. Data Models

### 3.1 Component Props

```typescript
export interface MeetingDetailsStepProps {
  onSubmit: (data: MeetingDetailsFormData) => Promise<void>;
  onBack: () => void;
  isLoading?: boolean;
  initialDepartment?: string;
  initialHost?: StaffMember | null;
  initialPurpose?: string;
  branchId: string;
}
```

### 3.2 Form Data Schema

```typescript
import { z } from 'zod';

// Base schema with hostSelectionMode field
export const meetingDetailsSchema = z.object({
  department: z.nativeEnum(Department).nullable().refine((val) => val !== null, {
    message: 'Department is required',
  }),
  hostSelectionMode: z.enum(['dropdown', 'manual']).default('dropdown'),
  // Dropdown mode fields
  hostId: z.string().uuid('Invalid host selection').nullable().optional(),
  // Manual mode fields
  staffName: z.string().min(2, 'Staff Name must be at least 2 characters').max(100, 'Staff Name must not exceed 100 characters').optional(),
  staffPhone: z.string().regex(/^\d{10}$/, 'Please enter a valid 10-digit phone number').optional(),
  // Common field
  purpose: z.string().min(5, 'Purpose must be at least 5 characters').max(500, 'Purpose must not exceed 500 characters'),
}).refine((data) => {
  // Conditional validation based on mode
  if (data.hostSelectionMode === 'dropdown') {
    return data.hostId !== null && data.hostId !== undefined;
  } else {
    return data.staffName !== undefined && data.staffName !== '' && data.staffPhone !== undefined && data.staffPhone !== '';
  }
}, {
  message: 'Host selection is required',
  path: ['hostSelectionMode'],
});

export type MeetingDetailsFormData = z.infer<typeof meetingDetailsSchema>;
```

### 3.3 Staff Member (from Staff Lookup API)

```typescript
export interface StaffMember {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  department: Department | null;
}

export interface StaffLookupResponse {
  staff: StaffMember[];
  total: number;
}

export interface DepartmentStaffResponse {
  staff: StaffMember[];
}

export interface ApiErrorResponse {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}
```

### 3.4 Component State

```typescript
export interface MeetingDetailsStepState {
  selectedDepartment: Department | null;
  selectedHost: StaffMember | null;
  showSuccessAnimation: boolean;
  submissionError: string | null;
  hostSearchResults: StaffMember[];
  isSearchingHost: boolean;
  hostSearchQuery: string;  // Display/input value, used for manual entry mode and dropdown input population
  showHostDropdown: boolean;
  departmentStaffList: StaffMember[] | null;
  isLoadingDepartmentStaff: boolean;
  hostSelectionMode: 'dropdown' | 'manual';
  manualHostData: { name: string; phone: string };
}
```

### 3.5 Department Options

Uses `Department` enum from Prisma schema (includes all hospital departments: GENERAL_MEDICINE, CARDIOLOGY, NEUROLOGY, etc.)

---

## 4. Component Structure

```typescript
export function MeetingDetailsStep(props: MeetingDetailsStepProps): JSX.Element
```

**Child Components:** DepartmentSelect, HostSelectionMode (dropdown or manual), HostSearchInput, HostSearchDropdown, ManualHostEntryForm, BackButton, SubmitButton, SuccessCheckmark, LoadingSpinner

---

## 5. Logic Flow

### 5.1 Initialization
Initialize react-hook-form with zodResolver. Set defaultValues from props. Initialize state with empty search results, closed dropdown, no success animation, and dropdown mode as default. Fetch initial staff list using TanStack Query if initialDepartment provided.

### 5.2 Department Selection
```typescript
function handleDepartmentChange(department: Department | null): void {
  // Update form.department value
  // Switch back to dropdown mode (reset from manual if needed)
  // Clear manual entry data
  // Clear host selection if department changes
  // Fetch department staff list via useDepartmentStaffQuery(department)
  // Update selectedDepartment state
  // Update departmentStaffList state
}
```

### 5.3 Department Staff Fetching
```typescript
function useDepartmentStaff(branchId: string, department: Department) {
  return useQuery({
    queryKey: ['department-staff', branchId, department],
    queryFn: async () => {
      // GET /public/staff/by-department/:branchId/:department
      // Returns DepartmentStaffResponse { staff: StaffMember[] }
    },
    enabled: department !== null,
    staleTime: 5 * 60 * 1000,
  });
}
```

### 5.4 Host Search Input - Existing Functionality
```typescript
function handleHostSearchInput(query: string): void {
  // Update hostSearchQuery state (display/input value, no debouncing)
  // If query.length >= 2: trigger search immediately, set isSearchingHost = true,
  //   call searchStaffByQuery(query), update results, show dropdown
  // If query.length < 2: clear results, hide dropdown
}
```

### 5.5 Host Selection from Dropdown
```typescript
function handleHostSelect(staffMember: StaffMember): void {
  // Set hostSelectionMode = 'dropdown'
  // Update form.hostId value to staffMember.id
  // Update selectedHost state, close dropdown
  // Clear hostSearchQuery, display selected name, clear errors
  // Clear manual entry data
}

function handleOtherOptionSelect(): void {
  // Set hostSelectionMode = 'manual'
  // Clear form.hostId value
  // Clear selectedHost state
  // Clear hostSearchQuery
  // Close dropdown
  // Show manual entry form
  // Focus staffName input
}
```

### 5.6 Manual Entry Form Handling
```typescript
function handleManualHostInputChange(field: 'name' | 'phone', value: string): void {
  // Update manualHostData[field] = value
  // Update form.staffName or form.staffPhone value
  // Clear validation errors for the field
}
```

### 5.7 Mode Switching
```typescript
function switchToDropdownMode(): void {
  // Set hostSelectionMode = 'dropdown'
  // Clear manual entry data (name, phone)
  // Clear form.staffName and form.staffPhone
  // Show staff dropdown if department is selected
  // Focus host dropdown input
}

function switchToManualMode(): void {
  // Set hostSelectionMode = 'manual'
  // Clear hostId value
  // Clear selectedHost state
  // Show manual entry form
  // Focus staffName input
}
```

### 5.8 Staff Lookup API Integration
```typescript
function useStaffSearch(branchId: string, query: string, department?: Department | null) {
  return useQuery({
    queryKey: ['staff-search', branchId, query, department],
    queryFn: async () => {
      // GET /public/staff/search?branchId={branchId}&query={query}&department={department}
      // Returns StaffLookupResponse
    },
    enabled: query.length >= 2,
    staleTime: 5 * 60 * 1000,
    cacheTime: 10 * 60 * 1000,
  });
}
```

### 5.9 Form Submission
```typescript
async function handleSubmit(data: MeetingDetailsFormData): Promise<void> {
  // Validate via react-hook-form, set isLoading = true
  // If mode === 'dropdown': use data.hostId
  // If mode === 'manual': use data.staffName and data.staffPhone
  // Call props.onSubmit(data), show success animation (500ms)
  // On error: set submissionError, set isLoading = false
}
```

### 5.10 Back & Dropdown Management
```typescript
function handleBack(): void { props.onBack(); }

function handleHostInputFocus(): void { /* Show dropdown if results exist */ }
function handleHostInputBlur(): void { /* Hide dropdown after 100ms delay */ }
function handleDropdownItemClick(staffMember: StaffMember): void {
  // Call handleHostSelect(staffMember), focus input
}
function handleOtherOptionClick(): void {
  // Call handleOtherOptionSelect()
}
```

---

## 6. Styling Requirements

### Layout
- Centered container, max-width 480px, single column
- Step indicator: "Step 4 of 6 • Meeting" (gray, text-sm)
- Header: "Meeting Details", Sub-header: "Who are you visiting?"
- Mode indicator: "Dropdown Selection" or "Manual Entry" label (subtle badge) for accessibility

### Fields
- **Department Select:** Required, 48px min-height, Teal/Emerald focus border, red error border, options sorted alphabetically

#### Dropdown Mode (hostSelectionMode === 'dropdown')
- **Host Select:** Required, 48px min-height, Teal/Emerald focus border, red error border
  - Displays department staff list (sorted alphabetically)
  - "Other" option as LAST item in dropdown (gray text, italic, separated by divider)
  - Selected staff member displayed after selection
  - Existing search input available for quick search in large departments
- **Host Search Input:** 48px min-height, placeholder "Type to search for host...", Teal/Emerald focus, red error, loading spinner right side, X button to clear
- **Host Dropdown:** Absolute positioning below input, z-index 50, max-height 200px scrollable, white background, rounded-md, shadow-lg. Items: 12px padding, light teal hover, teal text + checkmark for selected. "Other" option: gray text, italic, top border for visual separation

#### Manual Mode (hostSelectionMode === 'manual')
- **Staff Name Input:** Required, 48px min-height, placeholder "Enter staff member name", Teal/Emerald focus, red error border
- **Staff Phone Input:** Required, 48px min-height, placeholder "Enter 10-digit phone number", Teal/Emerald focus, red error border, numeric only validation
- **Back to Dropdown Link:** Text link below manual form "← Select from dropdown instead"

#### Common Fields
- **Purpose Textarea:** Required, min 4 rows auto-expand, placeholder "e.g., Consultation, Follow-up", min 5 chars max 500, Teal/Emerald focus, red error

### Buttons
- **Back:** Ghost style, "← Back", left-aligned, gray
- **Submit:** Primary, "Continue", right-aligned, emerald-600 background, white text, disabled state with spinner

### States
- Focus: Teal ring (2px, ring-emerald-500)
- Error: Red border + inline red text
- Success: Green checkmark centered overlay
- Loading: Submit spinner, all inputs disabled
- Host searching: Small spinner in input, dropdown disabled
- Department staff loading: Small spinner in dropdown, placeholder "Loading staff..."
- Mode indicator: Subtle badge (gray-100 bg, gray-600 text) for current mode

---

## 7. Accessibility

### ARIA Attributes
```tsx
<form role="form" aria-label="Meeting details form">
  {/* Department: aria-required, aria-invalid, aria-describedby */}
  {/* Host mode indicator: aria-live="polite" announces mode changes */}
  {/* Host select/dropdown (dropdown mode): role="combobox", aria-expanded, aria-controls */}
  {/* Host dropdown list: role="listbox", aria-label="Staff members" */}
  {/* Host dropdown items: role="option", aria-selected */}
  {/* "Other" option: aria-label="Manually enter staff details" */}
  {/* Staff name input (manual mode): aria-required, aria-invalid, aria-describedby */}
  {/* Staff phone input (manual mode): aria-required, aria-invalid, aria-describedby */}
  {/* Back to dropdown link: aria-label="Return to staff selection dropdown" */}
  {/* Purpose: aria-required, aria-invalid, aria-describedby */}
</form>
```

### Keyboard Navigation

#### Dropdown Mode
- **Tab:** Department → Host Select/Dropdown → Purpose → Back → Continue
- **Arrows:** Up/Down in host dropdown (listbox pattern)
- **Enter/Space:** Select dropdown item, select department
- **Escape:** Close dropdown or trigger onBack
- **Focus:** Auto-focus department on mount

#### Manual Mode
- **Tab:** Department → Staff Name → Staff Phone → Back to Dropdown Link → Purpose → Back → Continue
- **Enter:** Submit form (when all fields valid)
- **Escape:** Return to dropdown mode if manual mode active

| Interaction | Key Sequence | Expected Behavior |
|-------------|--------------|-------------------|
| Focus First Element | Tab | Focus moves to Department dropdown |
| Navigate Departments | Up Arrow / Down Arrow | Move between department options |
| Select Department | Enter / Space | Selects focused department, updates form, fetches staff list |
| Navigate to Host Select | Tab (from department) | Focus moves to Host Select (dropdown mode) |
| Open Host Dropdown | Enter / Space / Arrow Down | Opens dropdown list of department staff |
| Navigate Host Dropdown | Up Arrow / Down Arrow | Move between staff members |
| Select Host | Enter (on dropdown item) | Selects host, closes dropdown, sets mode to 'dropdown' |
| Select "Other" Option | Enter (on "Other" item) | Switches to manual mode, clears host, shows manual form |
| Navigate Manual Inputs | Tab (from staff name) | Focus moves through Staff Name → Staff Phone → Back Link |
| Back to Dropdown | Enter (on "Back to dropdown" link) | Switches to dropdown mode, clears manual data |
| Navigate to Purpose | Tab | Focus moves to Purpose textarea |
| Navigate to Buttons | Tab (from purpose) | Focus moves to Back button, then Continue |
| Submit Form | Tab (to Submit) + Enter / Click | Validates and submits if valid |
| Back Navigation | Escape | Triggers onBack callback, closes dropdown if open, returns to dropdown mode from manual |
| Close Dropdown | Escape (when dropdown open) | Closes dropdown, stays on host select |

### Screen Reader Support
- `role="listbox"` on dropdown, `role="option"` and `aria-selected` on items
- `aria-live="polite"` for mode changes ("Switched to manual entry", "Switched to dropdown selection")
- `aria-live="polite"` for search results count
- `aria-describedby` links error messages
- `aria-busy="true"` during search/loading, `aria-expanded` on input indicates dropdown state
- Mode announcement: "Dropdown mode selected" or "Manual entry mode selected"
- "Other" option: "Manually enter staff member details"

### Focus Management
- Mode switch: Auto-focus first input of new mode (host select or staff name)
- Department change: Focus host select
- Close dropdown: Return focus to trigger element
- Manual entry validation: Focus first invalid field on submit

### Touch Targets
- Min 44x44px (48px inputs/buttons), dropdown items full width min-height 48px, "Other" option same as others

---

## 8. Testing

### 8.1 Component Tests
**File:** `frontend/src/components/visitors/steps/MeetingDetailsStep.test.tsx`

**Key Scenarios:**

#### Dropdown Mode Tests
1. Rendering: Step indicator, header, all fields (dropdown mode), buttons
2. Department Selection: Updates form value, fetches staff list, validates required
3. Department Staff Fetching: Displays staff list, handles loading/error states
4. Host Select Dropdown: Shows/hides correctly, displays department staff
5. Host Selection: Updates form, closes dropdown, displays name, sets mode to 'dropdown'
6. "Other" Option Selection: Switches to manual mode, clears host, shows manual form
7. Host Search Input: Typing triggers search, loading state displayed
8. Host Search Dropdown: Shows/hides correctly, displays results
9. Direct Search: Verifies search triggers immediately on input (no debounce delay)

#### Manual Mode Tests
10. Manual Entry Rendering: Staff Name and Phone inputs displayed, "Back to dropdown" link present
11. Staff Name Validation: Min/max length, required field, clear on mode switch
12. Staff Phone Validation: Exactly 10 digits, numeric only, required field
13. Manual Entry Submit: Submits with staffName and staffPhone, no hostId
14. Back to Dropdown Link: Switches to dropdown mode, clears manual data
15. Mode Switching: Dropdown ↔ Manual, clears relevant state, preserves department

#### Common Tests
16. Purpose Validation: Min/max length, required field
17. Form Submission (Dropdown Mode): Calls onSubmit with hostId
18. Form Submission (Manual Mode): Calls onSubmit with staffName and staffPhone
19. Loading State: Disables inputs + shows spinner
20. Success: Green checkmark displayed
21. Error Handling: Network errors, validation errors shown
22. Back Navigation: Calls onBack callback
23. Department Change: Clears host/manual data, refetches staff list
24. Conditional Validation: Validates correct fields based on mode
25. Keyboard Navigation (Dropdown Mode): Tab, arrows, Enter/Space, Escape
26. Keyboard Navigation (Manual Mode): Tab through manual inputs, Back to Dropdown
27. Accessibility: ARIA attributes, screen reader, focus management
28. "Other" Option: Displayed as last item, distinct styling, triggers manual mode

### 8.2 E2E Tests
**File:** `frontend/e2e/visitor-registration/meeting-details.spec.ts`

**Key Scenarios:**

#### Dropdown Mode Flow
1. Complete Flow (Dropdown): Select department → select staff from dropdown → fill purpose → submit → navigate to Step 5
2. Department Selection: Different departments verify form updates, staff list loads
3. Staff Dropdown: Select department → see staff list → select staff member
4. Host Search: Type query → see results → select host (existing functionality)
5. Host Search Response: Verify search triggers immediately (no debounce delay)
6. No Results: Search with no matches → verify message

#### Manual Mode Flow
7. Complete Flow (Manual): Select department → select "Other" → fill manual form → fill purpose → submit → navigate to Step 5
8. "Other" Option: Select "Other" → manual form appears → validate fields
9. Manual Entry Validation: Test name min/max, phone 10 digits
10. Back to Dropdown: Manual mode → click "Back to dropdown" → dropdown appears, manual cleared

#### Common Scenarios
11. Validation (Dropdown): Empty form → errors → fix → submit
12. Validation (Manual): Empty form → errors on manual fields → fix → submit
13. Mode Switching: Select staff → switch to manual → manual cleared → back to dropdown → staff cleared
14. Department Change: Clear both dropdown and manual data when department changes
15. Back Navigation: Return to Step 3
16. Loading State: Submit during loading → verify disabled
17. Success State: Green checkmark → transition to Step 5
18. Network Error: Mock failure → verify error message
19. Keyboard (Dropdown Mode): Full keyboard navigation flow
20. Keyboard (Manual Mode): Tab through manual inputs, Back to Dropdown via keyboard
21. Accessibility: ARIA attributes, screen reader announcements, mode changes
22. API Integration: Department staff endpoint called correctly, search endpoint called correctly

---

## 9. Error Handling

### Validation Errors
- Department: "Department is required"
- Host (Dropdown Mode): "Please select a host"
- Staff Name (Manual Mode): "Staff Name must be at least 2 characters", "Staff Name must not exceed 100 characters"
- Staff Phone (Manual Mode): "Please enter a valid 10-digit phone number"
- Purpose: "Purpose of visit is required", "Purpose must be 5-500 characters"
- Mode Switch: "Host selection is required" (generic error when no valid selection in current mode)

### Submission Errors
- Network: "Connection lost. Please check your internet and try again."
- API 400: "Invalid data. Please check your inputs."
- API 404: "Branch not found"
- API 500: "Something went wrong. Please try again."
- Timeout: "Request timed out. Please try again."

### Staff Lookup Errors
- Network: "Unable to search hosts. Please try again."
- API 500: "Search unavailable. Please try again."
- No results: "No hosts found matching your search"

### Department Staff Errors
- Network: "Unable to load staff list. Please try again."
- API 500: "Staff list unavailable. Please try again."
- Empty staff list: "No staff found in this department. Please use 'Other' to enter manually."

### Error Display & Recovery
- Validation: Inline red text below field + red border
- Submission: Toast notification
- Host search: Inline error below input, preserve query for retry
- Department staff: Inline error below dropdown, show "Retry" button
- Recovery: Form data preserved, retry enabled, mode preserved

### Mode Switching Error Handling
- Clear validation errors when switching modes
- Clear irrelevant field values (hostId vs staffName/staffPhone)
- Preserve department selection across mode switches

---

## 10. Implementation Notes

### 10.1 Dependencies
```json
{
  "dependencies": {
    "react": "^18.3.0",
    "react-hook-form": "^7.51.0",
    "@hookform/resolvers": "^3.3.4",
    "zod": "^3.22.4",
    "@tanstack/react-query": "^5.0.0",
    "lucide-react": "^0.367.0",
    "clsx": "^2.1.0",
    "tailwind-merge": "^2.2.0"
  },
  "devDependencies": {
    "@testing-library/react": "^14.2.0",
    "@testing-library/jest-dom": "^6.4.0",
    "@testing-library/user-event": "^14.5.0"
  }
}
```

### 10.2 API Endpoints

#### Staff Search (Existing)
**GET /public/staff/search?branchId={branchId}&query={query}&department={department}**
- **Rate Limiting:** 10 requests per minute per IP
- **Cache:** 5 minutes stale time, 10 minutes cache time
- **Query Params:** branchId (required, UUID), query (required, min 2 chars), department (optional, Department enum)
- **Success Response (200):** `{ staff: StaffMember[], total: number }`
- **Error Responses:**
  - **400 Bad Request:** `{ code: 'INVALID_REQUEST', message: 'Invalid request parameters', details: { field: string } }`
  - **404 Not Found:** `{ code: 'BRANCH_NOT_FOUND', message: 'Branch not found' }`
  - **429 Too Many Requests:** `{ code: 'RATE_LIMIT_EXCEEDED', message: 'Too many requests. Please try again later.', details: { retryAfter: number } }`
  - **500 Internal Server Error:** `{ code: 'INTERNAL_ERROR', message: 'Something went wrong. Please try again.' }`

#### Department Staff (NEW)
**GET /public/staff/by-department/:branchId/:department**
- **Rate Limiting:** 10 requests per minute per IP
- **Cache:** 5 minutes stale time
- **Path Params:** branchId (required, UUID), department (required, Department enum)
- **Success Response (200):** `{ staff: StaffMember[] }`
- **Error Responses:**
  - **400 Bad Request:** `{ code: 'INVALID_REQUEST', message: 'Invalid request parameters' }`
  - **404 Not Found:** `{ code: 'BRANCH_NOT_FOUND', message: 'Branch not found' }` OR `{ code: 'DEPARTMENT_NOT_FOUND', message: 'Department not found' }`
  - **429 Too Many Requests:** `{ code: 'RATE_LIMIT_EXCEEDED', message: 'Too many requests. Please try again later.', details: { retryAfter: number } }`
  - **500 Internal Server Error:** `{ code: 'INTERNAL_ERROR', message: 'Something went wrong. Please try again.' }`
- **Behavior:** Returns all staff members belonging to the specified department at the specified branch, sorted alphabetically by name

### 10.3 Integration Patterns
- Parent-Child: onSubmit/onBack callbacks
- State: Form via react-hook-form, UI via useState, search via useQuery
- Navigation: Callback-based, parent handles step state
- Form Data: Combined with Step 3 data on submission
- Mode Management: Local state for hostSelectionMode, synchronized with form values

### 10.4 Performance
- useCallback for handlers, useMemo for computed values
- TanStack Query for staff search and department staff with caching
- Cleanup timers and queries in useEffect
- Lazy loading of department staff (only when department selected)
- hostSearchQuery is a direct display/input value (no debouncing)

### 10.5 Accessibility & Theming
- Semantic HTML, proper ARIA attributes, focus trap during success animation
- Mode announcements via aria-live
- Theme colors: `bg-emerald-600`, `text-emerald-600`, `border-emerald-500`
- Error: `text-red-600`, `border-red-500`
- Success: `text-green-600`, `bg-green-500`
- Spacing: `space-y-4`
- Mode indicator: `bg-gray-100 text-gray-600` for subtle labeling

### 10.6 Example Usage
```tsx
'use client';
import { MeetingDetailsStep, MeetingDetailsFormData } from '@/components/visitors/steps/MeetingDetailsStep';
import { useMutation } from '@tanstack/react-query';

export default function RegistrationWizard() {
  const [step, setStep] = useState(4);
  const mutation = useMutation({
    mutationFn: async (data: MeetingDetailsFormData) => {
      const res = await fetch('/api/visits/meeting/details', { method: 'POST', body: JSON.stringify(data) });
      return res.json();
    },
    onSuccess: () => setStep(5),
  });

  return step === 4 && (
    <MeetingDetailsStep
      onSubmit={(data) => mutation.mutate(data)}
      onBack={() => setStep(3)}
      isLoading={mutation.isPending}
      branchId="branch-uuid"
    />
  );
}
```

### 10.7 Frontend Patterns Applied

#### Component Design
- **Single Responsibility:** Handles meeting details collection only, delegates mode switching logic to handlers
- **Composition over Inheritance:** Composes DropdownHostSelection and ManualHostEntry components
- **Props for Configuration:** Uses props for data and configuration (branchId, callbacks)
- **Callbacks for Events:** Uses callbacks for communicating actions upward (onSubmit, onBack)

#### State Management
- **Colocate State:** Mode state (hostSelectionMode) collocated with form, department staff state nearby
- **Lift When Necessary:** Form validation state lifted to react-hook-form, mode state local to component
- **Distinguish State Types:**
  - UI State: showHostDropdown, showSuccessAnimation, isSearchingHost
  - Form State: All form values via react-hook-form
  - Server State: Department staff list and search results via useQuery

#### Forms
- **Labels:** Every input has a visible label (or aria-label for "Other" option)
- **Association:** Labels connected to inputs via htmlFor/id or wrapping
- **Validation Timing:** Validate on blur (manual inputs) and submit (all fields)
- **Error Messages:** Specific and actionable ("Please select a host", "Enter a valid 10-digit phone number")
- **Submit State:** Disable button or show loading indicator during submission
- **Conditional Validation:** Different fields validated based on hostSelectionMode

#### Accessibility
- **Semantic HTML First:** Uses <form>, <label>, <select>, <input>, <textarea> appropriately
- **ARIA Supplements:** ARIA attributes for mode announcements, dropdown states, live regions
- **Keyboard Navigation:** Tab, Enter/Space, Arrow keys, Escape for both modes
- **Focus Management:** Auto-focus first input after mode switch, return focus after dropdown close
- **Live Regions:** aria-live="polite" for mode changes and search results

#### Responsive Design
- **Mobile-First CSS:** Mobile layout base, enhanced for larger screens
- **Flexible Layouts:** Single-column layout, max-width 480px, responsive margins
- **Touch Targets:** Min 48px for all inputs and buttons
- **Test Breakpoints:** Verify at 375px (mobile), 768px (tablet), 1024px+ (desktop)

### 10.8 Edge Cases

#### Form Validation & Selection
- No Department + Empty Host (Dropdown Mode): Validation errors on both
- Department Selected + No Host (Dropdown Mode): Validation error on host only
- Department Selected + Empty Manual Fields: Validation errors on name and phone
- Department Selected + Invalid Manual Fields: Specific validation errors per field
- Host Selected + Department Changed: Clear host and manual data, prompt to re-select
- Manual Entry + Department Changed: Clear manual data, switch to dropdown mode, fetch new staff list
- Unselect Host During Submit: Prevent form submission (dropdown mode)
- Empty Manual Data During Submit: Prevent form submission (manual mode)

#### Search & Input Behavior
- Rapid Typing: TanStack Query request deduplication prevents duplicate API calls
- Long Host Names: Truncate dropdown items to 40 chars max
- Special Characters: Allow apostrophes, hyphens, periods in names
- Whitespace Only: Trim, treat as empty
- Duplicate Staff Names: Show department suffix for disambiguation
- Search Results > 50: Limit to first 50, show "Limited to 50 results"
- Staff Without Department: Display "No Department" in dropdown
- Department Staff Load Failure: Show error, offer "Other" option as fallback
- Phone Number Non-Numeric: Prevent non-digit input, show validation error

#### Mode Switching
- Dropdown → Manual: Clear hostId, clear host search results, show manual form, focus staff name
- Manual → Dropdown: Clear staffName/staffPhone, hide manual form, show dropdown, focus dropdown
- Department Change While in Manual Mode: Switch to dropdown mode, clear manual data, fetch new staff list
- Department Change While in Dropdown Mode: Clear host selection, fetch new staff list
- Submit During Mode Switch: Prevent submission, show validation errors

#### Lifecycle & State
- Unmount During Submit: Cancel pending, cleanup timers/queries
- Initial Values: Prefill department/host/purpose if provided via props
- Selected Host Not in Department Staff List: Allow submission with selected host ID (from search)
- Slow Network: Show loading indicator, prevent duplicate searches
- Mode State Persistence: Maintain mode across re-renders, reset on department change

---

## 11. Acceptance Criteria

Task 5.2 is complete when:

### Core Functionality - Dropdown Mode
1. ✅ Renders "Step 4 of 6 • Meeting" indicator, "Meeting Details" header
2. ✅ Renders Department select with all Department enum options (unchanged)
3. ✅ Department selection triggers staff list fetch for selected department
4. ✅ Renders Staff select dropdown with department staff list
5. ✅ Staff dropdown displays "Other" as the LAST option with visual distinction
6. ✅ Selecting staff member updates form and closes dropdown
7. ✅ Selecting "Other" switches to manual entry mode and shows manual form
8. ✅ Existing staff search functionality remains available for quick search
9. ✅ Host search triggers on typing (no debouncing, direct use of hostSearchQuery)
10. ✅ Host search dropdown displays results with proper styling
11. ✅ Loading spinner shows during department staff fetch and form submission
12. ✅ Validation errors display inline for required fields (dropdown mode)

### Core Functionality - Manual Mode
13. ✅ Manual entry form displays when "Other" is selected
14. ✅ Renders Staff Name input (required, min 2 chars, max 100 chars)
15. ✅ Renders Staff Phone input (required, exactly 10 digits, numeric only)
16. ✅ "Back to dropdown" link allows returning to dropdown selection
17. ✅ Manual form validation works correctly (name min/max, phone 10 digits)
18. ✅ Submitting with manual data calls onSubmit with staffName and staffPhone
19. ✅ Mode indicator displays current mode (dropdown vs manual)

### Core Functionality - Common
20. ✅ Renders Purpose of Visit textarea (unchanged)
21. ✅ Form submission calls onSubmit with correct data based on mode
22. ✅ Back button navigates to Step 3
23. ✅ Loading state disables inputs + shows spinner
24. ✅ Success animation shows green checkmark (500ms)
25. ✅ Initial values supported via props
26. ✅ Department change clears host/manual data and refetches staff list
27. ✅ API endpoint `/public/staff/by-department/:branchId/:department` works correctly
28. ✅ Staff search API endpoint integrates correctly (existing functionality)
29. ✅ TanStack Query caching works (5 min stale time for both endpoints)

### UI & Layout
30. ✅ Centered layout, max-width 480px
31. ✅ Touch targets ≥ 44px (48px inputs/buttons)
32. ✅ Teal/Emerald theming throughout
33. ✅ Dropdown max-height 200px, scrollable
34. ✅ Responsive (mobile 375px to desktop 1024px+)
35. ✅ "Other" option visually distinct (gray text, italic, top border)
36. ✅ Mode indicator displays current mode subtly
37. ✅ Manual entry form appears smoothly when switching modes

### Accessibility & Testing
38. ✅ ARIA attributes (role="listbox", role="option", aria-selected, etc.)
39. ✅ Keyboard navigation for dropdown mode (Tab, Arrows, Enter/Space, Escape)
40. ✅ Keyboard navigation for manual mode (Tab through inputs, Back to Dropdown link)
41. ✅ Screen reader support for both modes, including mode announcements
42. ✅ Focus management: Auto-focus first input after mode switch
43. ✅ No TS errors or console warnings
44. ✅ All component tests pass (including new manual mode tests)
45. ✅ All E2E tests pass (including new manual mode scenarios)

### Error Handling & Edge Cases
46. ✅ Error messages actionable and clear
47. ✅ Form data preserved on errors
48. ✅ Submit disabled when invalid/loading
49. ✅ Special characters allowed in name field
50. ✅ Whitespace trimmed from inputs
51. ✅ Staff lookup API integrates correctly
52. ✅ Department staff API integrates correctly
53. ✅ TanStack Query request deduplication prevents excessive API calls
54. ✅ Mode switching clears relevant state (host ↔ manual data)
55. ✅ Department staff load failure shows error and offers "Other" fallback
56. ✅ Phone number validation rejects non-numeric input
57. ✅ Mode switching clears validation errors

---

## 12. Related Tasks

- **Task 4.1-4.3:** Phone entry, verification, type selection
- **Task 4.5:** Meeting registration form (Step 3)
- **Task 5.1:** Delivery details step (Step 4 - Delivery)
- **Task 5.3:** Confirmation page (Step 5)
- **Task 3.1-3.5:** Shared UI components
- **Task 2.4:** Get branch info endpoint (returns staff data)
- **Staff Lookup API (Existing):** GET /public/staff/search endpoint
- **Department Staff API (NEW):** GET /public/staff/by-department/:branchId/:department endpoint

---

**End of Specification**
