# Technical Specification: Delivery Details Step (Step 4 - Delivery)

> **Task ID:** 5.1
> **Increment:** 5 - Public Registration UI (Visit Details & Status)
> **Status:** Spec
> **Created:** 2026-02-06
> **Dependencies:** Task 4.4 (Delivery Registration Form)

---

## 1. Overview

Fourth step in the public visitor registration wizard for delivery visitors. Collects delivery platform/company name and recipient name or department. Features quick selection chips for common delivery platforms (Zomato, Swiggy, Amazon, Dunzo, Uber Eats, Blinkit, Others) to accelerate input.

### Key Features
- Fields: Platform/Company (with chips), Recipient Name or Department
- 7 quick selection chips for common platforms + "Others"
- Back button to Step 3, Step indicator "Step 4 of 6 • Delivery"
- Single-column, centered layout (max-width 480px)
- Amber/Orange theming
- States: Loading (spinner), Error (inline red text + red border), Success (green checkmark)

---

## 2. File Path

```
frontend/src/components/visitors/steps/DeliveryDetailsStep.tsx
```

---

## 3. Data Models

### 3.1 Component Props

```typescript
export interface DeliveryDetailsStepProps {
  onSubmit: (data: DeliveryDetailsFormData) => Promise<void>;
  onBack: () => void;
  isLoading?: boolean;
  initialPlatform?: string;
  initialRecipient?: string;
}

// Note: void is the correct return type for callback functions that do not return values.
// This includes event handlers and user action callbacks.
```

### 3.2 Form Data Schema

```typescript
export const deliveryDetailsSchema = z.object({
  platform: z.string().min(2).max(100),
  recipient: z.string().min(2).max(100),
});

export type DeliveryDetailsFormData = z.infer<typeof deliveryDetailsSchema>;
```

### 3.3 Component State

```typescript
export interface DeliveryDetailsStepState {
  selectedChipIndex: number | null;
  showSuccessAnimation: boolean;
  submissionError: string | null;
}
```

### 3.4 Platform Chip Data

```typescript
export interface PlatformChip {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }> | null;
}

export const COMMON_DELIVERY_PLATFORMS: PlatformChip[] = [
  { label: 'Zomato', value: 'Zomato', icon: null },
  { label: 'Swiggy', value: 'Swiggy', icon: null },
  { label: 'Amazon', value: 'Amazon', icon: null },
  { label: 'Dunzo', value: 'Dunzo', icon: null },
  { label: 'Uber Eats', value: 'Uber Eats', icon: null },
  { label: 'Blinkit', value: 'Blinkit', icon: null },
  { label: 'Others', value: '', icon: null },
];
```

---

## 4. Component Structure

```typescript
export function DeliveryDetailsStep(props: DeliveryDetailsStepProps): JSX.Element
```

**Child Components:** PlatformChipButton, BackButton, SubmitButton, SuccessCheckmark

---

## 5. Logic Flow

### 5.1 Initialization

Initialize react-hook-form with zodResolver. Set defaultValues from props or empty. Initialize state: selectedChipIndex: null, showSuccessAnimation: false, submissionError: null.

### 5.2 Platform Chip Selection

```typescript
function handleChipSelect(chip: PlatformChip, index: number): void {
  if (chip.value === 'Others') {
    // Focus platform input field
  } else {
    // Set platform input value to chip.value, update selectedChipIndex, clear errors
  }
}

function handlePlatformInputChange(value: string): void {
  // Update form value; if no chip matches, set selectedChipIndex to null
}
```

### 5.3 Form Submission

```typescript
async function handleSubmit(data: DeliveryDetailsFormData): Promise<void> {
  // Set isLoading = true, validate via react-hook-form
  try {
    // Call props.onSubmit(data); show success animation (500ms); parent navigates to Step 5
  } catch (error) {
    // Set submissionError, set isLoading = false
  }
}
```

### 5.4 Back Navigation

```typescript
function handleBack(): void {
  props.onBack();
}
```

### 5.5 Success Animation

```typescript
function showSuccess(): void {
  // Set showSuccessAnimation = true, disable inputs, clear after 500ms
}
```

---

## 6. Styling Requirements

### 6.1 Layout & Typography
- Container: Centered, max-width 480px, single column
- Step indicator: "Step 4 of 6 • Delivery" (gray)
- Header: "Delivery Details", Sub-header: "Tell us about your delivery"

### 6.2 Platform Chips Section
- Label: "Platform / Company *"
- Chip container: Horizontal scrollable on mobile, flex-wrap on larger screens
- Chip dimensions: 40px height, auto width, min-width 80px
- Chip border-radius: `rounded-full`, gap: 8px
- Selected: Amber border (2px), amber background, white text
- Unselected: Gray border, white background, gray text
- Hover: Amber border on unselected chips

### 6.3 Platform Input Field
- Label: "Or enter platform name" (shown when "Others" selected or typing)
- Required, 48px min-height
- Amber border on focus, red on error

### 6.4 Recipient Input Field
- Label: "Recipient Name or Department *"
- Placeholder: "e.g., Dr. Smith, Pharmacy, Reception"
- Required, 48px min-height
- Amber border on focus, red on error

### 6.5 Buttons
- Back: Ghost style, "← Back", left-aligned, gray
- Submit: Primary, "Continue", right-aligned, amber background, white text
- Submit loading: Disabled, spinner, grayed out

### 6.6 Interactive States
- Focus: Blue ring (2px)
- Error: Red border + inline red text
- Success: Green checkmark centered
- Loading: Submit spinner, all inputs disabled

---

## 7. Accessibility

### 7.1 ARIA Attributes

```tsx
<div role="group" aria-label="Platform selection">
  {COMMON_DELIVERY_PLATFORMS.map((chip, index) => (
    <button
      role="radio"
      aria-checked={selectedChipIndex === index}
      aria-label={`${chip.label} platform`}
      onClick={() => handleChipSelect(chip, index)}
    >
      {chip.label}
    </button>
  ))}
</div>

<form role="form" aria-label="Delivery details form">
  {/* Platform input with aria-describedby, aria-required */}
  {/* Recipient input with aria-describedby, aria-required */}
</form>
```

### 7.2 Keyboard Navigation

| Interaction | Key Sequence | Expected Behavior |
|-------------|--------------|-------------------|
| Focus First Element | Tab | Focus moves to first platform chip |
| Navigate Chips | Right Arrow / Left Arrow | Move focus between chips in radiogroup |
| Select Chip | Enter / Space | Activates focused chip, updates form |
| Navigate to Platform Input | Tab (from chips) | Focus moves to platform input field |
| Navigate to Recipient | Tab (from platform) | Focus moves to recipient field |
| Submit Form | Enter (on recipient) / Click Submit | Validates and submits if valid |
| Back Navigation | Escape | Triggers onBack callback |
| Retry After Error | Tab / Click | Focus moves to Submit button for retry |

- **Tab**: Chips → Platform input → Recipient → Back → Continue
- **Arrow Keys**: Left/Right between chips (radiogroup pattern)
- **Enter/Space**: Select focused chip or submit
- **Escape**: Trigger onBack
- **Focus**: Auto-focus first chip on mount

### 7.3 Screen Reader Support
- `role="group"` on chip container
- `role="radio"` and `aria-checked` on chips
- `aria-label` on interactive elements
- `aria-required="true"` on required fields
- `aria-describedby` links error messages
- `aria-live="polite"` for success/error announcements

### 7.4 Touch Targets
- Min 44x44px (48px inputs/buttons), chips: 80px width, 40px height

---

## 8. Testing

### 8.1 Component Tests

**File:** `frontend/src/components/visitors/steps/DeliveryDetailsStep.test.tsx`

**Tests:**
1. Rendering: Step indicator, header, fields, chips, buttons
2. Chip Selection: Updates state and form value
3. Chip "Others": Focuses input field
4. Form Validation: Required fields, min/max length
5. Input Sync: Typing clears chip selection
6. Submission: Calls onSubmit with valid data
7. Loading: Disables inputs + spinner
8. Success: Green checkmark displayed
9. Error Handling: Network errors shown
10. Back: Calls onBack
11. Keyboard: Tab, arrows, Enter/Space
12. Accessibility: ARIA, screen reader, focus

```typescript
it('should select platform chip and update form', () => {
  render(<DeliveryDetailsStep onSubmit={jest.fn()} onBack={() => {}} />);
  const zomatoChip = screen.getByLabelText('Zomato platform');
  fireEvent.click(zomatoChip);
  expect(screen.getByLabelText(/platform/i)).toHaveValue('Zomato');
  expect(zomatoChip).toHaveAttribute('aria-checked', 'true');
});

it('should validate required fields', async () => {
  const onSubmit = jest.fn().mockResolvedValue(undefined);
  render(<DeliveryDetailsStep onSubmit={onSubmit} onBack={() => {}} />);
  fireEvent.click(screen.getByRole('button', { name: /continue/i }));
  await waitFor(() => {
    expect(screen.getByText(/platform is required/i)).toBeInTheDocument();
    expect(screen.getByText(/recipient is required/i)).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });
});

it('should submit with valid data', async () => {
  const onSubmit = jest.fn().mockResolvedValue(undefined);
  render(<DeliveryDetailsStep onSubmit={onSubmit} onBack={() => {}} />);
  fireEvent.click(screen.getByLabelText('Zomato platform'));
  fireEvent.change(screen.getByLabelText(/recipient/i), { target: { value: 'Pharmacy' } });
  fireEvent.click(screen.getByRole('button', { name: /continue/i }));
  await waitFor(() => {
    expect(onSubmit).toHaveBeenCalledWith({ platform: 'Zomato', recipient: 'Pharmacy' });
  });
});
```

### 8.2 E2E Tests

**File:** `frontend/e2e/visitor-registration/delivery-details.spec.ts`

**Scenarios:**
1. Complete Flow: Select chip, fill recipient, submit, navigate to Step 5
2. Chip Selection: Different chips, verify form updates
3. "Others" Handling: Select, type custom platform
4. Validation: Empty form, errors, fix, submit
5. Input Override: Select chip, type custom, verify deselect
6. Back: Return to Step 3
7. Loading: Submit during loading, verify disabled
8. Success: Green checkmark, transition to Step 5
9. Network Error: Mock failure, verify error message
10. Keyboard: Tab, arrows, Enter/Space

```typescript
test('complete delivery details flow', async ({ page }) => {
  await page.goto('/visitor-registration');
  // ... complete Steps 1-3 ...
  await page.click('text=Zomato');
  await page.fill('[name="recipient"]', 'Pharmacy');
  await page.click('text=Continue');
  await expect(page.locator('[aria-label="Success checkmark"]')).toBeVisible();
  await expect(page.locator('text=Request Submitted')).toBeVisible();
});
```

---

## 9. Error Handling

### 9.1 Validation Errors
- Platform required: "Platform is required"
- Platform min/max: "Platform must be 2-100 characters"
- Recipient required: "Recipient name or department is required"
- Recipient min/max: "Recipient must be 2-100 characters"

### 9.2 Submission Errors
- Network: "Connection lost. Please check your internet and try again."
- API 500: "Something went wrong. Please try again."
- Timeout: "Request timed out. Please try again."

### 9.3 Error Display & Recovery
- Validation: Inline red text below field, red border
- Submission: Toast notification
- Recovery: Form data preserved, retry enabled, "Others" for unlisted platforms

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
    "lucide-react": "^0.367.0",
    "clsx": "^2.1.0",
    "tailwind-merge": "^2.2.0",
    "@tanstack/react-query": "^5.0.0"
  },
  "devDependencies": {
    "@testing-library/react": "^14.2.0",
    "@testing-library/jest-dom": "^6.4.0",
    "@testing-library/user-event": "^14.5.0"
  }
}
```

### 10.2 Edge Cases

1. **No Chip + Empty Input**: Validation error on platform
2. **Chip Selected Then Typed**: Chip deselects, input takes precedence
3. **"Others" + Empty**: User must type platform name
4. **Rapid Chip Clicks**: Debounce 200ms to prevent jank
5. **Unselect During Submit**: Prevent form submission
6. **Unmount During Submit**: Cancel pending, cleanup timers
7. **Initial Values**: Prefill, match chips if applicable
8. **Long Names**: Truncate chips to 15 chars max
9. **Special Characters**: Allow apostrophes, hyphens
10. **Whitespace Only**: Trim, treat as empty

### 10.3 Integration Patterns
- Parent-Child: onSubmit/onBack callbacks
- State: Form via react-hook-form, UI via useState
- Navigation: Callback-based, parent handles step state
- Form Data: Combined with Step 3 data on submission

### 10.4 Performance
- useCallback for handlers, useMemo for computed values
- Debounce chip clicks 200ms
- Cleanup animation timers in useEffect

### 10.5 Accessibility & Styling
- Semantic HTML, proper ARIA attributes
- Focus trap during success animation
- Amber theme: `bg-amber-500`, `text-amber-600`, `border-amber-500`
- Error: `text-red-600`, `border-red-500`
- Success: `text-green-600`, `bg-green-500`
- Chips: `rounded-full`, form spacing: `space-y-4`

---

## 11. Acceptance Criteria

Task 5.1 is complete when:

1. ✅ Renders "Step 4 of 6 • Delivery" indicator
2. ✅ Renders "Delivery Details" header and sub-header
3. ✅ Renders 7 platform chips with proper styling
4. ✅ Chips show selected state (amber border/background)
5. ✅ "Others" focuses platform input, others update value
6. ✅ Typing in input deselects selected chip
7. ✅ Platform and recipient inputs render with validation
8. ✅ Validation errors display inline for empty/invalid fields
9. ✅ Submit calls onSubmit with platform and recipient
10. ✅ Back button navigates to Step 3
11. ✅ Loading state disables inputs + spinner
12. ✅ Success animation shows green checkmark (500ms)
13. ✅ Centered layout, max-width 480px
14. ✅ Touch targets ≥ 44px (48px inputs/buttons)
15. ✅ Amber/Orange theming throughout
16. ✅ Chips horizontal scrollable on mobile
17. ✅ ARIA attributes (role="radiogroup", role="radio", aria-checked)
18. ✅ Keyboard navigation (Tab, Arrows, Enter/Space, Escape)
19. ✅ Screen reader support
20. ✅ No TS errors or console warnings
21. ✅ All component tests pass
22. ✅ All E2E tests pass
23. ✅ Responsive (mobile 375px to desktop 1024px+)
24. ✅ Error messages actionable
25. ✅ Form data preserved on errors
26. ✅ Submit disabled when invalid/loading
27. ✅ Initial values supported via props
28. ✅ Special characters allowed in fields
29. ✅ Whitespace trimmed from inputs

---

## 12. Related Tasks

- **Task 4.1-4.3:** Phone entry, verification, type selection
- **Task 4.4:** Delivery registration form (Step 3)
- **Task 5.2:** Meeting details step (Step 4 - Meeting)
- **Task 5.3:** Confirmation page (Step 5)
- **Task 3.1-3.5:** Shared UI components

---

**End of Specification**
