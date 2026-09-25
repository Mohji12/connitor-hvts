# Spec: Meeting Registration Form (Step 3 - Meeting)

**Task ID:** 4.5
**Feature:** Unified Visitor Workflow
**Increment:** 4 - Public Registration UI (Phone Auth Flow)
**Status:** Approved

---

## 1. Overview

Create the Meeting visitor registration form (Step 3 of the public registration flow) for collecting comprehensive visitor details including personal information, photo, government ID, and optional office ID. The form must support auto-fill for existing visitors and be mobile-optimized with touch-friendly targets.

### Key Requirements
- Collect full visitor details for Meeting visit type
- Support auto-fill for existing visitors from phone verification
- Handle photo capture and document uploads (Government ID, Office ID)
- Pre-fill phone number (read-only) from verified phone
- Mobile-first design with 48px touch targets
- Teal/Emerald theming consistent with Meeting selection

---

## 2. File Path

```
frontend/src/components/visitors/public/MeetingRegistrationForm.tsx
```

---

## 3. Data Models

### 3.1 Component Props

```typescript
interface MeetingRegistrationFormProps {
  /** Verified phone number (from Step 1b) */
  phone: string;
  /** Branch ID for registration context */
  branchId: string;
  /** Whether this is an existing visitor (for auto-fill) */
  isExistingVisitor: boolean;
  /** Pre-filled visitor data (if existing) */
  existingVisitorData?: ExistingVisitorData | null;
  /** Callback on form submission with valid data */
  onSubmit: (data: MeetingFormData) => void;
  /** Callback on back navigation */
  onBack: () => void;
  /** Loading state for submission */
  isLoading?: boolean;
}

/** Visitor data returned from phone verification (existing visitor) */
interface ExistingVisitorData {
  firstName: string;
  lastName: string;
  email?: string | null;
  company?: string | null;
  designation?: string | null;
  address?: string | null;
  // Note: Photo, governmentIdDocument, officeIdDocument NOT included
}
```

### 3.2 Form Data Model

```typescript
/** Complete form data structure for Meeting registration */
interface MeetingFormData {
  // Personal Information
  firstName: string;
  lastName: string;
  email: string;
  company?: string | null;
  designation?: string | null;
  address?: string | null;

  // Phone (read-only, pre-filled)
  phone: string;

  // Document Uploads (File objects for submission)
  photo: File | null;
  governmentIdDocument: File | null;
  officeIdDocument?: File | null;
}
```

### 3.3 Validation Schema Type

```typescript
/** Zod validation schema type for form data */
type MeetingRegistrationSchema = z.ZodObject<{
  firstName: z.ZodString;
  lastName: z.ZodString;
  email: z.ZodString;
  company: z.ZodOptional<z.ZodString>;
  designation: z.ZodOptional<z.ZodString>;
  address: z.ZodOptional<z.ZodString>;
  phone: z.ZodString;
  photo: z.ZodObject<{
    file: z.ZodAny; // File object
    name: z.ZodString;
    size: z.ZodNumber;
    type: z.ZodString;
  }>;
  governmentIdDocument: z.ZodObject<{
    file: z.ZodAny;
    name: z.ZodString;
    size: z.ZodNumber;
    type: z.ZodString;
  }>;
  officeIdDocument: z.ZodOptional<z.ZodObject<{
    file: z.ZodAny;
    name: z.ZodString;
    size: z.ZodNumber;
    type: z.ZodString;
  }>>;
}>;
```

---

## 4. Component Structure

### 4.1 Main Component

```typescript
/**
 * MeetingRegistrationForm - Step 3 of public registration flow
 *
 * Renders comprehensive registration form for Meeting visitors with:
 * - Auto-fill for existing visitors
 * - Photo capture (camera)
 * - Government ID upload/capture (required)
 * - Office ID upload/capture (optional)
 * - Read-only phone field
 */
export function MeetingRegistrationForm(props: MeetingRegistrationFormProps): JSX.Element;
```

### 4.2 Internal Functions

```typescript
/**
 * Initialize form with default values
 * Auto-fills personal data for existing visitors
 */
function initializeForm(
  phone: string,
  isExistingVisitor: boolean,
  existingData?: ExistingVisitorData | null
): DefaultValues<MeetingFormData>;

/**
 * Handle form submission
 * Validates data and invokes onSubmit callback
 */
function handleSubmit(
  data: MeetingFormData,
  callback: (data: MeetingFormData) => void,
  setSubmitting: (isSubmitting: boolean) => void
): Promise<void>;

/**
 * Handle file selection for uploads
 * Validates file type and size before updating form state
 */
function handleFileChange(
  file: File | null,
  fieldName: 'photo' | 'governmentIdDocument' | 'officeIdDocument',
  allowedTypes: string[],
  maxSizeBytes: number
): File | null | never;

/**
 * Validate file type against allowed types
 */
function isValidFileType(file: File, allowedTypes: string[]): boolean;

/**
 * Validate file size (max 5MB)
 */
function isValidFileSize(file: File, maxSizeBytes: number): boolean;

/**
 * Extract error message from Zod validation error
 */
function getFormErrorMessage(error: z.ZodError, fieldName: string): string | undefined;
```

### 4.3 Sub-Components

```typescript
/**
 * AutoFillBanner - Shows message for existing visitors
 */
function AutoFillBanner(): JSX.Element;

/**
 * PhotoCaptureSection - Large camera button for visitor photo
 */
function PhotoCaptureSection(): JSX.Element;

/**
 * DocumentUploadSection - Reusable for Government ID and Office ID
 */
function DocumentUploadSection(props: DocumentUploadSectionProps): JSX.Element;

interface DocumentUploadSectionProps {
  fieldName: 'governmentIdDocument' | 'officeIdDocument';
  label: string;
  description: string;
  accept: string;
  isRequired: boolean;
}
```

---

## 5. Logic Flow

### 5.1 Component Initialization

1. **Receive Props:** Extract phone, branchId, isExistingVisitor, existingVisitorData, onSubmit, onBack, isLoading
2. **Initialize Form:** Create useForm with Zod resolver; phone always from props; personal fields auto-filled if existing visitor; document fields always null
3. **Render Layout:** Single column, centered, max-width 480px; header "Step 3 of 6 • Meeting"; auto-fill banner (conditional); form fields; back button (ghost), submit button "Continue"

### 5.2 Auto-Fill Logic

```typescript
if (isExistingVisitor && existingVisitorData) {
  // Display banner: "We found your details. Please verify and update."
  form.setValue('firstName', existingVisitorData.firstName);
  form.setValue('lastName', existingVisitorData.lastName);
  form.setValue('email', existingVisitorData.email || '');
  form.setValue('company', existingVisitorData.company || '');
  form.setValue('designation', existingVisitorData.designation || '');
  form.setValue('address', existingVisitorData.address || '');
  // Do NOT auto-fill: photo, governmentIdDocument, officeIdDocument
}
```

### 5.3 Form Handling

**Field Rendering:**
- First Name & Last Name: Two columns on desktop, stacked on mobile
- Email: Full-width, email validation
- Company/Designation/Address: Optional fields, full-width
- Phone: Read-only input, disabled styling
- Photo: Large button (PhotoCaptureSection) with camera icon
- Government ID & Office ID: FileUploadField for upload/capture (required/optional)

**Validation:** Real-time on blur and change; First Name/Last Name: Required, min 2 chars; Email: Required, valid format; Photo: Required, valid image (jpg, png, jpeg), max 5MB; Government ID: Required, valid document (pdf, jpg, png, jpeg), max 5MB; Office ID: Optional, if provided: valid document, max 5MB

**File Upload:** On selection validate type and size; if valid update field, if invalid show error; on removal clear field

### 5.4 Form Submission

1. User clicks "Continue" → trigger form.handleSubmit() → run full validation
2. On valid: Extract data, call props.onSubmit(formData), parent handles API and navigation
3. On invalid: Show errors below fields, focus first invalid field, do not call onSubmit

### 5.5 File Upload Error Handling

| Error Type | Display Message | Action |
|-----------|-----------------|--------|
| Invalid File Type | "Please upload a valid image (JPG, PNG)" | Clear field, show error |
| File Too Large | "File size exceeds 5MB limit" | Clear field, show error |
| Upload Failed | "Upload failed. Please try again." | Keep file, show retry option |

---

## 6. Styling

### Layout & Typography
- Container: Single column, centered, max-w-md (480px), gap-6 between groups
- Header: Step indicator (text-sm muted-foreground), "Your Details" (text-2xl font-bold)

### Fields
- Input height: Minimum 48px; Required labels: Append `*` with destructive color; Read-only phone: Grayed background, disabled styling

### Theming (Meeting)
- Primary button: bg-emerald-600 hover:bg-emerald-700; Back button: Ghost style; Auto-fill banner: Light green with emerald text; Focus: ring-2 ring-emerald-500

### Photo Capture
- Large button with camera icon, 120px x 120px; Dashed border when empty, solid when selected, show thumbnail on selection

### Document Upload
- Use FileUploadField, dashed border, upload/camera button centered, show file name on upload, X button for clearing

---

## 7. Accessibility

### ARIA & Keyboard
- Form: role="form", aria-labelledby="form-heading"; Step indicator: aria-live="polite", aria-label; Required fields: aria-required="true"; Errors: role="alert", linked via aria-describedby; File inputs: Hidden, triggered by accessible button with aria-label
- Tab order: First Name → Last Name → Email → Company → Designation → Address → Photo → Government ID → Office ID → Back → Continue; Focus first input on mount, Enter triggers submission, file inputs accessible via keyboard

### Screen Reader & Contrast
- Announce step indicator on mount, auto-fill banner, file upload instructions, linked errors, loading state via live region
- WCAG AA compliance, ring-2 ring-emerald-500 focus indicators, error text red/dark gray, disabled fields readable

---

## 8. Testing

### Component Tests
- Rendering: All required and optional fields render correctly
- Auto-fill: Existing visitor data populates, documents remain empty, banner displays
- Validation: Required field errors, email format, file type/size validation
- File handling: Selection, error display, removal functionality
- Submission: Valid form calls onSubmit, invalid shows errors; Navigation: Back button calls onBack

### Integration Tests
- Auto-fill integration: Form populates from existing visitor data
- File upload integration: FileUploadField component integration

### E2E Tests
- New visitor flow: Complete registration with all required fields
- Existing visitor flow: Verify pre-filled data, updates, submission
- Validation flow: Error display and correction
- File upload errors: Type and size error messages

### Storybook Stories
- Default (new visitor), existing visitor (auto-filled), photo uploaded, government ID uploaded, validation errors, loading state

---

## 9. Example Usage

```typescript
'use client';
import { MeetingRegistrationForm } from '@/components/visitors/public/MeetingRegistrationForm';
import { useRouter } from 'next/navigation';

export default function PublicRegistrationStep3Page() {
  const router = useRouter();
  const handleBack = () => router.push('/register/step-2');
  const handleSubmit = async (data: MeetingFormData) => {
    const formData = new FormData();
    Object.entries(data).forEach(([k, v]) => {
      if (v instanceof File) formData.append(k, v);
      else if (v) formData.append(k, v.toString());
    });
    // Submit to API and navigate
  };
  return (
    <MeetingRegistrationForm
      phone="+91 99999 99999"
      branchId="branch-uuid"
      isExistingVisitor={false}
      onSubmit={handleSubmit}
      onBack={handleBack}
      isLoading={false}
    />
  );
}
```

---

## 10. Edge Cases

### Network Errors
- Upload fails: Toast error, preserve file, allow retry
- Submission fails: Preserve form data, show retry button

### Auto-Fill Conflicts
- Empty existing data: Show empty form with banner
- Values changed: Allow editing, submit updated values
- No email: Field empty (optional per API)

### File Upload
- Same file twice: Replace previous; File removed: Clear field; Invalid filename: Allow upload; Multiple files: Take first only

### Mobile
- Camera denied: Error message, fallback to upload; Low storage: Warn before large file; Slow network: Loading spinner, prevent duplicate submission

---

## 11. Implementation Notes

### Dependencies
- `react-hook-form`, `@hookform/resolvers`, `zod` - Form handling and validation
- Shadcn/Radix UI - Button, Input, Form, Label
- `lucide-react` - Icons (Camera, Upload, X)
- `FileUploadField` - Existing component

### Integration Patterns
- useForm with zodResolver, controlled components; FileUploadField handles display, parent manages File objects; Validation on file selection, auto-fill via form.setValue(); onBack() and onSubmit() callbacks for navigation

### File Upload Handling
- Photo: image/jpeg, image/png, image/jpg (max 5MB); Government ID: image/jpeg, image/png, image/jpg, application/pdf (max 5MB); Office ID: image/jpeg, image/png, image/jpg, application/pdf (max 5MB, optional); Actual upload handled by parent during submission

### Auto-Fill Logic
- Check isExistingVisitor prop; Populate personal fields on mount via form.setValue(); Never auto-fill document fields

### Form Validation Schema (Zod)

```typescript
const meetingRegistrationSchema = z.object({
  firstName: z.string().min(2, 'First name must be at least 2 characters').trim(),
  lastName: z.string().min(2, 'Last name must be at least 2 characters').trim(),
  email: z.string().email('Please enter a valid email address').trim(),
  company: z.string().trim().optional(),
  designation: z.string().trim().optional(),
  address: z.string().trim().optional(),
  phone: z.string().min(10, 'Invalid phone number').max(15, 'Invalid phone number'),
  photo: z.object({
    file: z.any(),
    name: z.string(),
    size: z.number(),
    type: z.string(),
  }).refine((data) => isValidFileType(data, ['image/jpeg', 'image/png', 'image/jpg']), {
    message: 'Please upload a valid image (JPG, PNG)',
  }).refine((data) => isValidFileSize(data, 5 * 1024 * 1024), {
    message: 'Photo must be less than 5MB',
  }),
  governmentIdDocument: z.object({
    file: z.any(),
    name: z.string(),
    size: z.number(),
    type: z.string(),
  }).refine((data) => isValidFileType(data, ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf']), {
    message: 'Please upload a valid document (JPG, PNG, PDF)',
  }).refine((data) => isValidFileSize(data, 5 * 1024 * 1024), {
    message: 'Document must be less than 5MB',
  }),
  officeIdDocument: z.object({
    file: z.any(),
    name: z.string(),
    size: z.number(),
    type: z.string(),
  }).refine((data) => isValidFileType(data, ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf']), {
    message: 'Please upload a valid document (JPG, PNG, PDF)',
  }).refine((data) => isValidFileSize(data, 5 * 1024 * 1024), {
    message: 'Document must be less than 5MB',
  }).optional(),
});
```

---

## 12. Acceptance Criteria Checklist

### Form Fields & Rendering
- [ ] All required fields render: First Name, Last Name, Email, Phone (read-only), Photo, Government ID
- [ ] All optional fields render: Company, Designation, Address, Office ID
- [ ] Phone number is pre-filled and read-only

### Auto-Fill Behavior
- [ ] Auto-fill banner displays for existing visitors
- [ ] Personal fields auto-populate for existing visitors
- [ ] Document fields do NOT auto-fill

### Photo & Document Upload
- [ ] Photo capture button is prominent (120px x 120px minimum)
- [ ] Government ID upload is required with upload/capture options
- [ ] Office ID upload is optional with upload/capture options
- [ ] FileUploadField component is reused for document uploads

### Validation
- [ ] All required fields validate correctly (min length, email format)
- [ ] File upload validation enforces allowed types and size limit (max 5MB)
- [ ] Validation errors display inline below fields

### Form Submission
- [ ] Back button navigates to Step 2
- [ ] Submit button validates form before submission
- [ ] Valid form submission calls onSubmit with correct data structure
- [ ] Invalid form submission shows errors and does not call onSubmit
- [ ] File removal clears field and error state

### Styling & UX
- [ ] Mobile layout optimized (touch targets 48px min, single column)
- [ ] Teal/Emerald theming consistent (primary buttons, focus states)
- [ ] Loading state disables submit button and shows spinner

### Accessibility
- [ ] All ARIA attributes present (labels, roles, descriptions)
- [ ] Keyboard navigation follows logical order
- [ ] Screen reader announces step indicator and errors
