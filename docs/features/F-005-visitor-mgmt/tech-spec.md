# Technical Specification: Visitor Management (F-005)

## 1. Overview
The core feature of the application. Allows Security Guards to register visitors, issue passes (QR Codes), and track check-in/check-out times.

## 2. Visitor Workflow (Redesigned)
The system distinguishes between **Meeting** visitors (high detail) and **Delivery** visitors (low detail).

### 2.1 Types
1.  **Meeting:** (e.g., Medical Rep, Family) -> Requires Name, Phone, Email, Company, Designation. Optional: Photo, ID Proof, Host Approval.
2.  **Delivery:** (e.g., Swiggy, Amazon) -> Requires Name, Phone, Company.

### 2.2 Flow
1.  **Entry:** Visitor scans branch QR code or security enters phone.
2.  **Identification:**
    - *New Visitor:* Register (Select Type -> Fill Form).
    - *Returning Visitor:* Auto-fill details from existing profile.
3.  **Profile Completion (Meeting Visits Only):**
    - If visitor previously registered as Delivery type and now wants Meeting visit, they must complete their profile.
    - **Required Fields:** Email, Company, Designation
    - **Optional Fields:** Photo, Government ID, Office ID, Alternate Email, Alternate Phone, Company Website, Address, Manager Details
4.  **Approval:**
    - **Meeting Visits:** Status is `REQUEST_SENT`. Staff must approve request before visitor can enter.
    - **Delivery Visits:** Status is `REQUEST_SENT`. Security must approve at gate before check-in.
    - **System sends Gate Pass (QR Code) via WhatsApp upon approval (Meeting only).**
5.  **Check-In:**
    - Visitor presents QR Code (from WhatsApp for meetings) or waits at gate (for deliveries).
    - Security scans/approves -> Status `CHECKED_IN`.
6.  **Exit:** Security scans pass -> Status `CHECKED_OUT`.

## 3. API Design

### 3.1 Public Endpoints (No Authentication)
| Method  | Endpoint                                | Description                                  | Request Type          |
| :------ | :-------------------------------------- | :------------------------------------------- | :-------------------- |
| `GET`   | `/public/visitors/check-phone`          | Check if visitor exists by phone             | Query Params          |
| `POST`  | `/public/visitors/register`             | Full registration (meeting visitors)         | `multipart/form-data` |
| `POST`  | `/public/visitors/quick-register`       | Quick registration (delivery visitors)       | JSON                  |
| `PATCH` | `/public/visitors/complete-profile/:id` | Complete profile (delivery->meeting upgrade) | `multipart/form-data` |
| `POST`  | `/public/visitors/delivery-visit`       | Create delivery visit request                | JSON                  |
| `POST`  | `/public/visitors/meeting-visit`        | Create meeting visit request                 | JSON                  |

### 3.2 Authenticated Endpoints (Security/Staff)
| Method | Endpoint             | Description                       | Role     |
| :----- | :------------------- | :-------------------------------- | :------- |
| `POST` | `/visitor/check-in`  | Create visit (handle reg if new). | SECURITY |
| `POST` | `/visitor/check-out` | Mark visit as complete.           | SECURITY |
| `GET`  | `/visitor/active`    | List currently inside visitors.   | SECURITY |
| `GET`  | `/visitor/history`   | Search past visits.               | ADMINS   |

### 3.3 File Upload Handling
- **Endpoints Supporting Files:** `/public/visitors/register`, `/public/visitors/complete-profile/:id`
- **File Fields:** `photo`, `governmentIdDocument`, `officeIdDocument`
- **Accepted Types:**
  - Photo: `.jpg`, `.jpeg`, `.png`, `.img`
  - Documents: `.jpg`, `.jpeg`, `.png`, `.img`, `.pdf`
- **Upload Method:** `multipart/form-data` with `FileFieldsInterceptor`
- **Storage:** GCP Cloud Storage via `GcpStorageService`
- **Validation:** Backend validates file types using MIME type regex

### 3.4 Messaging Integration
- **Service:** `MessagingService` (using WhatsApp Business API / Twilio / Meta).
- **Trigger:** When `Visit` status changes to `APPROVED`.
- **Payload:** Visitor Name, Host Name, Visit Time, **QR Code Image URL**.
- **Condition:** Only for `VisitType == MEETING`. Delivery visitors do not receive WhatsApp messages.

## 4. Frontend Implementation

### 4.1 Component Architecture
- **Main Component:** `PublicQRVisitorForm.tsx` (State Machine Orchestrator)
- **Step Components:**
  - `VisitTypeSelection.tsx` - Choose Meeting or Delivery
  - `MeetingCategorySelection.tsx` - Choose meeting sub-type
  - `DeliveryCategorySelection.tsx` - Choose delivery sub-type
  - `QuickRegistrationForm.tsx` - Minimal registration for delivery visitors
  - `CompleteProfilePrompt.tsx` - Profile completion for delivery->meeting upgrade
  - `DeliveryVisitRequest.tsx` - Delivery visit details
  - **Shared:** `FileUploadField.tsx` - Reusable file upload component

### 4.2 State Machine Flow
```
welcome → check (phone) → visit-type-selection
              ↓
    ┌─────────┴─────────┐
    ↓                   ↓
MEETING              DELIVERY
    ↓                   ↓
meeting-category    delivery-category
    ↓                   ↓
┌───┴───┐          ┌────┴────┐
↓       ↓          ↓         ↓
New  Returning    New    Returning
↓       ↓          ↓         ↓
register complete quick-   delivery-
         -profile  register request
    ↓       ↓          ↓         ↓
registration request delivery- delivery-
-success         -success    success
    ↓       ↓          
request request
       -success
```

### 4.3 Profile Completeness Check
```typescript
function isProfileCompleteForMeeting(visitor: {
  email?: string | null;
  company?: string | null;
  designation?: string | null;
}): boolean {
  return Boolean(visitor.email && visitor.company && visitor.designation);
}
```

### 4.4 Complete Profile Form Fields
**Required:**
- Email
- Company
- Designation

**Optional (Documents):**
- Visitor Photo
- Government ID Document
- Office ID Document

**Optional (Text Fields - in collapsible):**
- Middle Name
- Alternate Phone
- Alternate Email
- Company Website
- Address
- Reporting Manager Name
- Reporting Manager Phone

## 5. Database Schema

### 5.1 Visitor Model
```typescript
model Visitor {
  id: string
  firstName: string
  lastName: string
  middleName?: string
  phone: string (unique per branch)
  email?: string
  alternateEmail?: string
  alternatePhone?: string
  company?: string
  designation?: string
  companyWebsite?: string
  address?: string
  photo?: string (GCP URL)
  governmentIdDocument?: string (GCP URL)
  officeIdDocument?: string (GCP URL)
  reportingManagerName?: string
  reportingManagerPhone?: string
  branchId: string
  visits: Visit[]
}
```

### 5.2 Visit Model
```typescript
model Visit {
  id: string
  visitCategory: VisitCategory (MEETING | DELIVERY)
  visitSubType: string
  status: VisitStatus (REQUEST_SENT | APPROVED | CHECKED_IN | CHECKED_OUT | REJECTED)
  checkInTime?: DateTime
  checkOutTime?: DateTime
  
  // Meeting-specific fields
  purpose?: string
  department?: string
  staffId?: string
  staffName?: string
  staffPhone?: string
  
  // Delivery-specific fields
  deliveryPlatform?: string
  deliveryRecipient?: string
  orderReference?: string
  
  visitorId: string
  visitor: Visitor
  branchId: string
  branch: Branch
}
```

## 6. Business Rules

### 6.1 Visit Status Transitions
- **REQUEST_SENT** (Initial state for both Meeting and Delivery)
  - Meeting: Waits for staff approval
  - Delivery: Waits for security approval at gate
- **APPROVED** -> Visitor can proceed to check-in
- **CHECKED_IN** -> Visitor is currently inside
- **CHECKED_OUT** -> Visit completed
- **REJECTED** -> Request denied

### 6.2 Profile Completion Requirements
- Delivery visitors can create visits with minimal info (name, phone, company)
- If delivery visitor later requests meeting visit, they MUST complete profile:
  - Backend validates: `isProfileCompleteForMeeting()` throws `BadRequestException` if incomplete
  - Frontend: Automatically routes to `complete-profile` step
- Document uploads (photo, IDs) are optional but encouraged

### 6.3 Visitor Uniqueness
- Visitors are unique per `phone + branchId`
- Email uniqueness is validated within the same branch during profile completion

## 7. Implementation Notes / Changes

### Date: Tue Jan 13 2026

#### Change 1: Added `alternateEmail` Field to Complete Profile Form
**Issue:** Form schema included `alternateEmail` but UI didn't render the input field.

**Fix:**
- Added `FormField` for `alternateEmail` in `CompleteProfilePrompt.tsx` (inside optional collapsible section)
- **File:** `frontend/src/components/visitors/steps/CompleteProfilePrompt.tsx:200-215`

#### Change 2: Delivery Visits Now Require Security Review
**Issue:** Delivery visits were auto-approved (`CHECKED_IN` immediately), skipping security review.

**Original Behavior:**
- Status: `CHECKED_IN`
- CheckInTime: Set immediately
- Message: "Delivery visit created and checked in successfully"

**New Behavior:**
- Status: `REQUEST_SENT` (same as meeting visits)
- CheckInTime: Not set until security approves
- Message: "Delivery visit created. Pending security review."
- UI: Amber "pending" styling with message "Please wait at the gate. Security will assist you shortly."

**Files Modified:**
- Backend: `backend/src/visitors/visitors.service.ts:1271-1287`
- Frontend: `frontend/src/components/visitors/steps/DeliveryVisitRequest.tsx:129`
- Frontend: `frontend/src/components/visitors/PublicQRVisitorForm.tsx:415, 532-558`

#### Change 3: Added File Upload Support to Complete Profile Flow
**Issue:** Complete profile endpoint only accepted JSON. Could not upload photo or ID documents when upgrading from delivery to meeting visitor.

**Implementation:**

**Backend Changes:**
1. Controller (`public-visitors.controller.ts:151-172`):
   - Added `@UseInterceptors(FileFieldsInterceptor([...]))`
   - Added `@ApiConsumes('multipart/form-data')`
   - Added `@UploadedFiles() files: VisitorFiles` parameter

2. Service (`visitors.service.ts:1183-1238`):
   - Added `files: VisitorFiles` parameter
   - Added file validation and GCP upload logic (same pattern as registration)
   - Files are uploaded to: `visitors/{visitorId}/{photo|government-id|office-id}`

**Frontend Changes:**
1. Created shared component: `FileUploadField.tsx` (extracted from `PublicQRVisitorForm`)
   - Reusable file upload UI with preview and removal
   - Supports file type validation via `accept` prop

2. Updated `CompleteProfilePrompt.tsx`:
   - Added schema fields: `photo`, `governmentIdDocument`, `officeIdDocument`
   - Added file state hooks: `photoFile`, `govIdFile`, `officeIdFile`
   - Added 3 `FileUploadField` components (in dedicated "Documents (Optional)" section)
   - Updated `onSubmit` callback signature to include files object

3. Updated `visitorService.ts:250-271`:
   - Changed from JSON to `FormData`
   - Added `files` parameter
   - Set `Content-Type: multipart/form-data` header

4. Updated `PublicQRVisitorForm.tsx:280-314`:
   - Updated `handleCompleteProfile` to accept and pass files to service

**Files Created:**
- `frontend/src/components/visitors/shared/FileUploadField.tsx`

**Files Modified:**
- `backend/src/visitors/public-controller/public-visitors.controller.ts`
- `backend/src/visitors/visitors.service.ts`
- `frontend/src/components/visitors/steps/CompleteProfilePrompt.tsx`
- `frontend/src/lib/services/visitorService.ts`
- `frontend/src/components/visitors/PublicQRVisitorForm.tsx`

**Validation:**
- All changes verified via frontend lint, frontend build, and backend build
- File uploads are optional - visitor can skip if documents not available

## 8. Visitor Pre-Registration (cross-reference)

Platform-wide visitor profiles (pre-booking registration, password/OAuth login, S3 media) are documented in:

- `docs/features/visitor-pre-registration/FEATURE-ARCHITECTURE.md`
- Branch `Visitor` records link to global `VisitorAccount` via `visitorAccountId` at booking and gate flows.