# Technical Specification: Delivery Registration Form (Step 3 - Delivery)

> **Task ID:** 4.4
> **Increment:** 4 - Public Registration UI (Phone Auth Flow)
> **Status:** Approved
> **Created:** 2026-01-27
> **Approved:** 2026-01-27
> **Dependencies:** Task 4.3 (visit type selection)

---

## 1. Overview

Third step in the public visitor registration wizard for delivery visitors. Minimal fast-track form for courier/package deliveries with essential fields only.

### Key Features
- Fields: First Name*, Last Name*, Phone (pre-filled, read-only), Photo* (camera capture)
- Phone pre-filled from Step 1b
- Camera capture button with photo preview
- Back navigation to Step 2
- Single-column, centered layout (max-width 480px)
- Amber/Orange theming

---

## 2. File Path

```
frontend/src/components/visitors/steps/DeliveryRegistrationForm.tsx
```

---

## 3. Data Models

### 3.1 Component Props

```typescript
export interface DeliveryRegistrationFormProps {
  visitorPhone: string;
  onSubmit: (data: DeliveryFormData) => Promise<void>;
  onBack: () => void;
  isLoading?: boolean;
}
```

### 3.2 Form Data Schema

```typescript
export const deliveryRegistrationSchema = z.object({
  firstName: z.string().min(2).max(50),
  lastName: z.string().min(2).max(50),
  photo: z.instanceof(File)
    .refine((f) => f.size <= 5 * 1024 * 1024, 'Max 5MB')
    .refine((f) => ['image/jpeg', 'image/png'].includes(f.type), 'JPEG/PNG only'),
});

export type DeliveryFormData = z.infer<typeof deliveryRegistrationSchema>;
```

### 3.3 Component State

```typescript
export interface DeliveryFormState {
  photoFile: File | null;
  photoPreview: string | null;
}
```

---

## 4. Component Structure

```typescript
export function DeliveryRegistrationForm(props: DeliveryRegistrationFormProps): JSX.Element
```

**Child Components:**
- FileUploadField (reusable for photo capture)
- BackButton (ghost style)
- SubmitButton (primary with loading state)

---

## 5. Logic Flow

### 5.1 Initialization

```typescript
// Initialize react-hook-form with zodResolver
// Set defaultValues: firstName: '', lastName: ''
// Initialize state: photoFile: null, photoPreview: null
```

### 5.2 Photo Handling

```typescript
function handlePhotoChange(file: File | null): void {
  if (file) {
    // Validate size/type, create preview URL, update state
  } else {
    // Clear photoFile, photoPreview, form value
  }
}
```

### 5.3 Form Submission

```typescript
async function handleSubmit(data: DeliveryFormData): Promise<void> {
  // Validate via react-hook-form
  // Call props.onSubmit({ ...data, phone: visitorPhone })
  // Parent handles navigation to Step 4
}
```

### 5.4 Back Navigation

```typescript
function handleBack(): void {
  props.onBack();
}
```

---

## 6. Styling Requirements

### Layout
- Container: Centered, max-width 480px
- Step indicator: "Step 3 of 6 • Delivery" (gray text)
- Header: "Quick Info"

### Form Fields
- First/Last Name: Required, 48px min-height
- Phone: Pre-filled, read-only, grayed out
- Photo: Large capture button (60px min-height), camera icon, amber border

### Buttons
- Back: Ghost style, "← Back", left-aligned
- Submit: Primary style, "Continue", right-aligned, amber background

### States
- Focus: Blue ring (2px)
- Error: Red border + inline message
- Loading: Submit button disabled + spinner

---

## 7. Accessibility

### ARIA Attributes

```tsx
<form role="form" aria-label="Delivery visitor registration">
  <FormField name="firstName" render={({ field }) => (
    <FormItem>
      <FormLabel htmlFor="firstName">First Name *</FormLabel>
      <FormControl>
        <Input {...field} id="firstName" aria-describedby="firstName-error" aria-required="true" />
      </FormControl>
      <FormMessage id="firstName-error" />
    </FormItem>
  )} />
</form>
```

### Keyboard Navigation
- **Tab**: First Name → Last Name → Photo → Back → Submit
- **Enter**: Submit when focused
- **Escape**: Optional form reset
- **Focus**: Auto-focus first name on mount

### Screen Reader Support
- Labels linked via `htmlFor`/`id`
- `aria-required="true"` on required fields
- `aria-describedby` links errors
- `aria-live` for status updates

### Touch Targets
- Min 44x44px (48px for inputs/buttons)

---

## 8. Testing

### 8.1 Component Tests

**File:** `frontend/src/components/visitors/steps/DeliveryRegistrationForm.test.tsx`

**Tests:**
1. Renders step indicator, header, all fields, buttons
2. Phone pre-filled and read-only
3. Photo capture/preview/remove
4. Validation errors (empty fields, file type/size)
5. Submit calls onSubmit with valid data
6. Loading state disables inputs
7. Back button calls onBack
8. ARIA attributes, keyboard nav, screen reader

```typescript
it('should validate required fields', async () => {
  const onSubmit = jest.fn().mockResolvedValue(undefined);
  render(
    <DeliveryRegistrationForm
      visitorPhone="+91 99999 99999"
      onSubmit={onSubmit}
      onBack={() => {}}
    />
  );
  fireEvent.click(screen.getByRole('button', { name: /continue/i }));
  await waitFor(() => {
    expect(screen.getByText(/first name is required/i)).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });
});

it('should submit with valid data', async () => {
  const onSubmit = jest.fn().mockResolvedValue(undefined);
  render(<DeliveryRegistrationForm visitorPhone="+91 99999 99999" onSubmit={onSubmit} onBack={() => {}} />);
  fireEvent.change(screen.getByLabelText(/first name/i), { target: { value: 'John' } });
  fireEvent.change(screen.getByLabelText(/last name/i), { target: { value: 'Doe' } });
  const file = new File(['test'], 'photo.jpg', { type: 'image/jpeg' });
  fireEvent.change(screen.getByLabelText(/capture visitor photo/i), { target: { files: [file] } });
  fireEvent.click(screen.getByRole('button', { name: /continue/i }));
  await waitFor(() => {
    expect(onSubmit).toHaveBeenCalledWith({ firstName: 'John', lastName: 'Doe', photo: expect.any(File), phone: '+91 99999 99999' });
  });
});
```

### 8.2 Storybook Stories

**File:** `frontend/src/components/visitors/steps/DeliveryRegistrationForm.stories.tsx`

**Stories:** Default, WithPhoto, ValidationErrors, Loading, Mobile (375px), Desktop (1024px)

### 8.3 E2E Tests

**File:** `frontend/e2e/visitor-registration/delivery-registration.spec.ts`

**Scenarios:**
1. Complete flow: Fill form, upload photo, submit, navigate to Step 4
2. Validation: Submit empty form, show errors, fix, submit
3. Photo: Upload, preview, remove, re-upload
4. Back: Click back, return to Step 2
5. Loading: Submit during loading, verify disabled
6. File validation: Invalid size/type shows error

```typescript
test('complete delivery registration', async ({ page }) => {
  await page.goto('/visitor-registration');
  await page.fill('[name="phone"]', '9999999999');
  await page.click('text=Send OTP');
  await page.fill('input[name="otp"]', '123456');
  await page.click('text=Verify');
  await page.click('text=Delivery');
  await page.fill('[name="firstName"]', 'John');
  await page.fill('[name="lastName"]', 'Doe');
  await page.locator('input[type="file"]').setInputFiles('test-assets/photo.jpg');
  await page.click('text=Continue');
  await expect(page.locator('text=Step 4 of 6')).toBeVisible();
});
```

---

## 9. Example Usage

```tsx
'use client';
import { DeliveryRegistrationForm, DeliveryFormData } from '@/components/visitors/steps/DeliveryRegistrationForm';
import { useMutation } from '@tanstack/react-query';

export default function RegistrationWizard() {
  const [step, setStep] = useState(3);
  const mutation = useMutation({
    mutationFn: async (data: DeliveryFormData) => {
      const res = await fetch('/api/visitors/public/register', {
        method: 'POST',
        body: JSON.stringify({ ...data, phone: '+91 99999 99999', visitCategory: 'DELIVERY' }),
      });
      return res.json();
    },
    onSuccess: () => setStep(4),
  });

  return step === 3 && (
    <DeliveryRegistrationForm
      visitorPhone="+91 99999 99999"
      onSubmit={(data) => mutation.mutate(data)}
      onBack={() => setStep(2)}
      isLoading={mutation.isPending}
    />
  );
}
```

---

## 10. Edge Cases

### Critical Cases
1. No photo: Validation error
2. Invalid file type: "JPEG/PNG only" error
3. File >5MB: "Max 5MB" error
4. Camera fails: User-friendly error message
5. Network error: Preserve data, enable retry
6. Rapid clicks: Prevent duplicate submits via isLoading
7. Unmount during submit: Cancel pending, cleanup preview URL

### Error Handling
- Validation: Inline red text + red border
- File errors: FormMessage below FileUploadField
- Submission errors: Toast notification
- Camera errors: "Unable to access camera. Try again or use different method."

---

## 11. Implementation Notes

### Dependencies
- react-hook-form, @hookform/resolvers, zod, lucide-react
- Shadcn UI: Button, Input, Form components
- FileUploadField (existing component)

### Integration Patterns
- Parent passes visitorPhone, onSubmit, onBack
- Local form state via react-hook-form
- Photo via FileUploadField
- Callback-based navigation

### Photo Handling
- Capture: `<input type="file" accept="image/*" capture="user">`
- Preview: `URL.createObjectURL(file)`
- Cleanup: Revoke in useEffect

### Performance
- useCallback for handlers
- useMemo for preview URL
- Cleanup object URLs

### Accessibility
- Semantic HTML, ARIA attributes
- Keyboard nav, screen reader support
- WCAG AA contrast, focus management

---

## 12. Acceptance Criteria

1. ✅ Renders "Step 3 of 6 • Delivery" indicator
2. ✅ Renders "Quick Info" header
3. ✅ Renders First Name (required, min 2 chars)
4. ✅ Renders Last Name (required, min 2 chars)
5. ✅ Renders Phone (pre-filled, read-only)
6. ✅ Renders Photo capture (camera icon)
7. ✅ Photo preview after capture with remove button
8. ✅ Validation errors for empty required fields
9. ✅ Validation error for invalid file type
10. ✅ Validation error for file >5MB
11. ✅ Submit calls onSubmit with data + phone
12. ✅ Back button navigates to Step 2
13. ✅ Loading state disables submit + spinner
14. ✅ Centered layout, max-width 480px
15. ✅ Touch targets ≥ 44px (48px inputs/buttons)
16. ✅ Amber/Orange theming
17. ✅ ARIA attributes present
18. ✅ Keyboard navigation works
19. ✅ Screen reader support
20. ✅ No TS errors or console warnings
21. ✅ All component tests pass
22. ✅ All Storybook stories render
23. ✅ All E2E tests pass
24. ✅ Responsive (mobile to desktop)
25. ✅ Photo cleanup prevents memory leaks
26. ✅ Form data preserved on errors
27. ✅ Submit disabled when invalid/loading
28. ✅ Error messages actionable

---

## 13. Related Tasks

- **Task 4.1-4.3:** Phone entry, verification, type selection steps
- **Task 4.5:** Meeting registration form
- **Task 5.1:** Delivery details step
- **Task 3.4:** FileUploadField component
- **Task 2.3:** Visitor registration endpoint

---

**End of Specification**
