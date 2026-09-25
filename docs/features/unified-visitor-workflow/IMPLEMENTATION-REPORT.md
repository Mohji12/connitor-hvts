# Implementation Report: Unified Visitor Workflow

**Feature Period:** December 2024 - February 2025 (Based on git history)
**Increments Completed:** 8 (Tasks 1.1 - 8.6)
**Status:** Partially complete (Increment 9 pending, missing unified workflow page)

---

## Executive Summary

The Unified Visitor Workflow feature unifies public visitor registration and security operations into a cohesive, end-to-end experience. This implementation builds upon an existing hospital visitor tracking system, introducing phone verification, enhanced gate passes with visitor photos, and a unified security dashboard.

Eight increments have been successfully completed, covering database schema changes, public API endpoints, shared UI components, public registration flows, and security dashboard functionality. The feature includes comprehensive test coverage with 316 unit tests (100% passing) and 112+ E2E tests passing.

Key accomplishments include: phone verification via SMS OTP (5-minute expiry), Check-In OTP generation (8-hour expiry), gate pass image generation with Canvas, WhatsApp delivery integration, and a mobile-first security dashboard. However, the unified multi-step workflow page and main landing page for visitor registration (Increment 9 and main entry point) remain pending, leaving a gap between individual components and a complete user journey.

---

## 1. Workflows

### 1.1 New Workflows

- **Phone Verification Workflow**: Visitors enter phone number → receive SMS OTP → verify phone ownership (5-minute expiry, 3 attempts max)
- **Gate Pass Generation Workflow**: On visit approval → generate Check-In OTP → create gate pass image (Canvas) → upload to GCP → send via WhatsApp
- **Security Check-In Workflow**: Security enters OTP at gate → verify OTP → mark visitor as CHECKED_IN
- **Visitor Status Check Workflow**: Visitor polls status endpoint (30-second interval) → transitions from pending → approved → gate pass display
- **Phone Lookup Flow (Security)**: Enter visitor phone → search database → display visitor details → approve/reject or view full info

### 1.2 Modified Workflows

- **Visitor Registration Flow**: Enhanced with phone verification as prerequisite before submission (previously direct registration)
- **Visit Approval Flow**: Enhanced to generate Check-In OTP and trigger gate pass image generation and WhatsApp delivery
- **Security Dashboard Operations**: Enhanced with unified Check-In and Logs tabs, polling for real-time updates, one-click actions

### 1.3 Pre-existing Workflows

- **Visitor Entry/Exit Tracking**: Existing functionality maintained
- **Staff/Visitor Management**: Existing CRUD operations maintained
- **Visit Request Submission**: Enhanced but core logic pre-existing
- **WhatsApp Messaging**: Existing WhatsAppService used (no changes required)
- **SMS Messaging**: Existing SmsService used (no changes required)
- **File Upload to GCP**: Existing GcpStorageService used (no changes required)
- **Government ID Storage**: Existing functionality maintained

---

## 2. Backend: API Endpoints

### 2.1 New Endpoints

| Method | Endpoint | Purpose | Increment |
|--------|----------|---------|------------|
| POST | /public/visitors/send-otp | Send SMS OTP for phone verification | 2.1 |
| POST | /public/visitors/verify-phone | Verify OTP and mark phone as verified | 2.2 |
| POST | /public/visitors | Register visitor (phone-verified flow) | 2.3 (modified) |
| GET | /public/visits/:visitId/status | Poll visit status (no auth required) | 2.4 |
| GET | /public/visits/:visitId/gate-pass | Get gate pass image URL | 8.4 |
| POST | /visitors/verify-checkin-otp | Verify Check-In OTP at gate | 6.2 |
| POST | /visitors/checkin/:visitId | Mark visitor as CHECKED_IN | 6.5 |
| GET | /visitors/search | Search visitors by phone | 6.4 |
| GET | /api/public/staff/search | Proxy endpoint for staff lookup | 5.2 |

### 2.2 Modified Endpoints

| Method | Endpoint | Changes | Increment |
|--------|----------|---------|------------|
| POST | /visitors/approve/:visitId | Now generates Check-In OTP, creates gate pass image, uploads to GCP, sends via WhatsApp | 8.5 |
| POST | /visitors/reject/:visitId | Enhanced with reason field and proper status transition | 7.5 |
| POST | /visits/:visitId/check-out | Enhanced with confirmation dialog | 9.4 (pending) |

### 2.3 Pre-existing Endpoints Used

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | /auth/login | Staff authentication (JWT) |
| GET | /branches | Branch listing |
| GET | /staff | Staff listing |
| GET | /visitors/:id | Get visitor details |
| GET | /visits/:id | Get visit details |
| POST | /file/upload | File upload to GCP |

---

## 3. Backend: DTOs

### 3.1 New DTOs Created

- `backend/src/visitors/dto/rate-limit.dto.ts` - RateLimitRequestDto, RateLimitResponseDto
- `backend/src/visitors/dto/visit-status.dto.ts` - VisitStatusApiResponse, GatePassData, MeetingDetails, DeliveryDetails
- `backend/src/visitors/dto/visitor-registration.dto.ts` - MeetingRegistrationDto, DeliveryRegistrationDto, VisitTypeDto
- `backend/src/visitors/dto/gate-pass.dto.ts` - GatePassRequestDto, GatePassResponseDto, GatePassUploadResponseDto, GatePassGeneratedResponseDto
- `backend/src/visitors/dto/visitor-search.dto.ts` - VisitorSearchRequestDto, VisitorSearchResponseDto
- `backend/src/visitors/dto/checkin-otp.dto.ts` - CheckInOtpRequestDto, CheckInOtpResponseDto

### 3.2 Modified DTOs

- `backend/src/visitors/dto/visitor.dto.ts` - Enhanced with phone verification fields

### 3.3 Pre-existing DTOs Used

- CreateVisitorDto - Base visitor creation
- UpdateVisitorDto - Visitor updates
- CreateVisitDto - Visit creation
- Government ID upload DTOs

---

## 4. Backend: Services & Modules

### 4.1 New Services Created

| Service | File Path | Purpose | Increment |
|---------|-----------|---------|------------|
| PhoneVerificationService | backend/src/visitors/services/phone-verification.service.ts | OTP generation, verification, rate limiting | 1.3-1.4 |
| GatePassService | backend/src/visitors/services/gate-pass.service.ts | Check-In OTP generation, gate pass image generation, GCP upload, WhatsApp delivery | 1.5, 8.1-8.3 |
| RateLimitStorageService | backend/src/visitors/services/rate-limit-storage.service.ts | In-memory rate limiting storage | 2.5 |
| VisitorSearchService | backend/src/visitors/services/visitor-search.service.ts | Phone-based visitor search | 6.4 |

### 4.2 Modified Services

| Service | Changes | Increment |
|---------|---------|------------|
| SecurityService.approveVisit() | Enhanced to generate Check-In OTP, create gate pass image, upload to GCP, send via WhatsApp in parallel | 8.5 |
| VisitorsService | Enhanced with phone verification checks, error handling improvements | 2.3 |

### 4.3 New Modules

- `backend/src/visitors/public-controller/` - Public API controllers (no-auth endpoints)
- `backend/src/visitors/security/` - Security-specific logic (if separate)

### 4.4 Pre-existing Services Used

| Service | Purpose |
|---------|---------|
| SmsService | SMS delivery via AWS SNS |
| WhatsAppService | WhatsApp message delivery (uploads images to Meta) |
| GcpStorageService | File upload/download to GCP Storage |
| NotificationsService | Notification handling |
| AuthService | JWT authentication |

---

## 5. Database Schema (Prisma)

### 5.1 New Fields Added

#### Visitor Model
| Field | Type | Purpose | Increment |
|-------|------|---------|------------|
| phoneVerificationOtp | String? | 6-digit OTP for phone verification | 1.1 |
| phoneVerificationExpiry | DateTime? | 5-minute OTP expiry timestamp | 1.1 |
| phoneVerified | Boolean @default(false) | Track phone verification status | 1.1 |
| phoneVerificationAttempts | Int @default(0) | Track failed attempts (max 3) | 1.1 |

#### Visit Model
| Field | Type | Purpose | Increment |
|-------|------|---------|------------|
| checkInOtp | String? | 6-digit OTP for gate check-in | 1.2 |
| checkInOtpExpiry | DateTime? | 8-hour Check-In OTP expiry | 1.2 |
| gatePassGeneratedAt | DateTime? | Timestamp when gate pass was created | 1.2 |
| gatePassSentViaWhatsApp | Boolean @default(false) | Track WhatsApp delivery status | 1.2 |
| gatePassUrlExpiry | DateTime? | Expiry for signed GCP URL (added in Increment 8 analysis) | 8.2 |

### 5.2 Pre-existing Tables/Fields Used

- Visitor model: id, firstName, lastName, phone, email, photo, governmentIdDocument, etc.
- Visit model: id, status, visitType, departmentId, staffId, etc.
- Branch, Staff, Department models for relational data
- visitQRCode field: Stores signed GCP URL for gate pass (updated usage)

---

## 6. Frontend: Components

### 6.1 New Components Created

#### Shared Components (Increment 3)
| Component | Path | Purpose | Increment |
|-----------|------|---------|------------|
| OtpInput | frontend/src/components/visitors/shared/OtpInput.tsx | 6-digit OTP input with auto-focus, paste support | 3.1 |
| StatusBadge | frontend/src/components/visitors/shared/StatusBadge.tsx | Visit status display with color variants | 3.2 |
| VisitTypeBadge | frontend/src/components/visitors/shared/VisitTypeBadge.tsx | Meeting/Delivery type badges | 3.3 |
| VisitorProfileCard | frontend/src/components/visitors/shared/VisitorProfileCard.tsx | Compact/full visitor profile display | 3.4 |
| GatePassView | frontend/src/components/visitors/shared/GatePassView.tsx | Gate pass display with OTP, photo, validity | 3.5 |

#### Public Registration Components (Increments 4-5)
| Component | Path | Purpose | Increment |
|-----------|------|---------|------------|
| PhoneEntryStep | frontend/src/components/visitors/steps/ | Phone number entry with country code | 4.1 |
| PhoneVerificationStep | frontend/src/components/visitors/steps/ | OTP verification with countdown timer | 4.2 |
| VisitTypeSelectionStep | frontend/src/components/visitors/steps/ | Meeting vs Delivery selection | 4.3 |
| DeliveryRegistrationForm | frontend/src/components/visitors/steps/ | Minimal fields for delivery visitors | 4.4 |
| MeetingRegistrationForm | frontend/src/components/visitors/steps/ | Full fields for meeting visitors | 4.5 |
| DeliveryDetailsStep | frontend/src/components/visitors/steps/ | Platform/recipient details | 5.1 |
| MeetingDetailsStep | frontend/src/components/visitors/steps/ | Department, host, purpose details | 5.2 |
| ConfirmationStep | frontend/src/components/visitors/steps/ | Success confirmation after submission | 5.3 |

#### Security Dashboard Components (Increments 6-7)
| Component | Path | Purpose | Increment |
|-----------|------|---------|------------|
| SecurityDashboard | frontend/src/components/visitors/security/ | Main dashboard layout | 6.1 |
| DashboardHeader | frontend/src/components/visitors/security/ | Header with hamburger menu | 6.1 |
| BottomNavigation | frontend/src/components/visitors/security/ | Mobile bottom nav (Check-In/Logs) | 6.1 |
| SidebarNavigation | frontend/src/components/visitors/security/ | Desktop sidebar navigation | 6.1 |
| LiveIndicator | frontend/src/components/visitors/security/ | Live status indicator | 6.1 |
| MobileMenu | frontend/src/components/visitors/security/ | Mobile hamburger menu | 6.1 |
| CheckInTab | frontend/src/components/visitors/security/ | Check-In interface | 6.3 |
| PhoneLookupFlow | frontend/src/components/visitors/security/ | Phone-based visitor search | 6.4 |
| VisitorDetailsCard | frontend/src/components/visitors/security/ | Compact visitor details display | 6.4 |
| LogsTab | frontend/src/components/visitors/logs/ | Visitor logs with filtering | 7.1 |
| VisitorList | frontend/src/components/visitors/logs/ | List of visitors with cards | 7.2 |
| StatusFilterPills | frontend/src/components/visitors/logs/ | Horizontal filter pills | 7.1 |
| VisitorDetailsModal | frontend/src/components/visitors/security/ | Full visitor details modal | 7.4 |
| RejectVisitDialog | frontend/src/components/visitors/security/ | Reason dialog for rejection | 7.5 |
| VisitorActionButtons (logs) | frontend/src/components/visitors/logs/ | Approve/Reject action buttons | 7.5 |
| VisitorActionButtons (security) | frontend/src/components/visitors/security/ | Check In/Check Out action buttons | 7.5 |
| LogsRefreshControl | frontend/src/components/visitors/logs/ | Manual refresh + live indicator | 7.3 |
| SearchInput | frontend/src/components/visitors/logs/ | Search input for visitor list | 7.2 |

#### Hooks (Increment 7)
| Hook | Purpose | Increment |
|------|---------|------------|
| useLogsPolling | 30-second polling for logs refresh | 7.3 |

### 6.2 Modified Components

| Component | Changes |
|-----------|---------|
| FileUploadField | Enhanced validation that works in both browser and JSDOM environments |

### 6.3 Pre-existing Components Reused

- All shadcn/ui components (Badge, Avatar, Card, InputOTP, Skeleton, Button, Dialog, Form, etc.)
- FileUploadField (from pre-existing codebase)
- input-otp library
- lucide-react icons
- class-variance-authority, tailwind-merge utilities

---

## 7. Frontend: Pages & Routes

### 7.1 New Pages/Routes

| Route | Page Component | Purpose | Increment |
|-------|----------------|---------|------------|
| /security/dashboard | SecurityDashboard | Main security dashboard | 6.1 |
| /public/visits/:visitId/status | StatusCheckPage | Status polling page | 5.4 |
| /public/visits/:visitId/gate-pass | GatePassPage | Gate pass display page | 5.5 |

### 7.2 Modified Pages

None documented (existing pages may have been enhanced but not tracked)

### 7.3 Pre-existing Pages

| Page | Purpose |
|------|---------|
| /visitor-registration | Main registration entry point (needs implementation) |
| /dashboard | Admin dashboard (pre-existing) |
| /visitors | Visitor management (pre-existing) |

---

## 8. Configuration & Utilities

### 8.1 New Configurations

- **TEST_MODE** environment variable: When true, returns deterministic OTPs ("123456" for phone verification, "654321" for Check-In)
- Rate limiting configuration: 3 requests per IP per hour for public OTP endpoints
- Signed URL expiration: 7 days for gate pass images (based on Increment 8 analysis)
- Polling interval: 30 seconds for status checks and logs refresh

### 8.2 New Utility Functions

- **TEST_MODE utility**: Deterministic OTP generation for testing
- **useLogsPolling hook**: Auto-refresh logic with cleanup
- **UUID v4 validation**: For visitId parameters
- **Phone number masking**: Privacy protection in public endpoints
- **Signed URL generation/expiry checking**: GCP access for gate pass images

### 8.3 Pre-existing Config Used

- JWT authentication configuration
- GCP Storage configuration (bucket, credentials)
- AWS SNS configuration (SMS)
- Meta Cloud API configuration (WhatsApp)
- PostgreSQL connection string

---

## 9. Integration Points

### 9.1 New External Integrations

| Integration | Service | Purpose | Details |
|-------------|---------|---------|---------|
| Canvas Image Generation | node-canvas | Gate pass image rendering | Server-side PNG generation with visitor photo and OTP |
| Signed GCP URLs | Google Cloud Storage | Secure gate pass access | 7-day expiry URLs for gate pass images |
| Parallel Execution | Promise.all | Concurrent operations | GCP upload + WhatsApp delivery in parallel |

### 9.2 Existing Services Integrated

| Integration | Service | Usage |
|-------------|---------|-------|
| SMS | AWS SNS (via SmsService) | Send OTP for phone verification |
| WhatsApp | Meta Cloud API (via WhatsAppService) | Send gate pass images (uploads to Meta directly from base64) |
| File Storage | GCP Storage (via GcpStorageService) | Store visitor photos, government IDs, gate pass images |
| Email | (existing) | Notification delivery |
| Auth | Passport JWT | Security dashboard authentication |

---

## 10. Gap Analysis

### 10.1 Missing Implementations

| Item | Description | Impact |
|------|-------------|--------|
| **Unified Multi-Step Workflow Page** | Page to orchestrate all registration steps (phone entry → verification → type selection → details → confirmation → status → gate pass) | Critical - blocks end-to-end public visitor registration flow |
| **Main Landing Page (/visitor-registration)** | Entry point for public visitor registration | Critical - no way for visitors to access registration |
| **Increment 9 Tasks** | Network error handling, "Already Checked In" scenario, expired Check-In OTP handling, Check-Out confirmation dialog, empty states, 24-hour link expiry validation, accessibility improvements | High - edge cases and polish not implemented |

### 10.2 Pre-existing Functionality Not Yet Integrated

| Functionality | Status | Notes |
|---------------|--------|-------|
| "Register as new visitor" action from Security Check-In tab | Stub only | Needs implementation of modal or navigation to public registration |
| "Pending Approvals" list in Check-In tab | Not implemented | UX review recommendation (task 10.3) |
| Rate limiting on public staff search endpoint | Not implemented | Task 10.1 pending |
| Audit logging for public API endpoints | Not implemented | Task 10.2 pending |

### 10.3 Component Fragmentation

- All individual step components exist (PhoneEntryStep, PhoneVerificationStep, etc.) but no orchestrating page connects them
- StatusCheckPage and GatePassPage exist but are not connected from a unified flow
- Components are tested individually in isolation (test pages for E2E) but not integrated in a production workflow

---

## 11. File Inventory

### 11.1 New Backend Files

#### Services
- `backend/src/visitors/services/phone-verification.service.ts`
- `backend/src/visitors/services/gate-pass.service.ts`
- `backend/src/visitors/services/rate-limit-storage.service.ts`
- `backend/src/visitors/services/visitor-search.service.ts`

#### Controllers
- `backend/src/visitors/public-controller/public-visitors.controller.ts`
- `backend/src/visitors/public-controller/public-visits.controller.ts`

#### DTOs
- `backend/src/visitors/dto/rate-limit.dto.ts`
- `backend/src/visitors/dto/visit-status.dto.ts`
- `backend/src/visitors/dto/visitor-registration.dto.ts`
- `backend/src/visitors/dto/gate-pass.dto.ts`
- `backend/src/visitors/dto/visitor-search.dto.ts`
- `backend/src/visitors/dto/checkin-otp.dto.ts`

#### Guards
- `backend/src/visitors/guards/public-otp-rate-limit.guard.ts`

#### Schema
- `backend/prisma/schema.prisma` (modified with new fields)

#### Tests (Backend)
- All `.spec.ts` files for new services and controllers
- `backend/test/public-visitors-controller.e2e-spec.ts` (41 tests)
- Increment-specific E2E tests

### 11.2 New Frontend Files

#### Shared Components
- `frontend/src/components/visitors/shared/OtpInput.tsx` + `.test.tsx`
- `frontend/src/components/visitors/shared/StatusBadge.tsx` + `.test.tsx`
- `frontend/src/components/visitors/shared/VisitTypeBadge.tsx` + `.test.tsx`
- `frontend/src/components/visitors/shared/VisitorProfileCard.tsx` + `.test.tsx`
- `frontend/src/components/visitors/shared/GatePassView.tsx` + `.test.tsx`

#### Public Registration Steps
- `frontend/src/components/visitors/steps/PhoneEntryStep.tsx` (implied)
- `frontend/src/components/visitors/steps/PhoneVerificationStep.tsx` (implied)
- `frontend/src/components/visitors/steps/VisitTypeSelection.tsx` (implied)
- `frontend/src/components/visitors/steps/DeliveryRegistrationForm.tsx` + `.test.tsx`
- `frontend/src/components/visitors/steps/MeetingRegistrationForm.tsx` + `.test.tsx`
- `frontend/src/components/visitors/steps/DeliveryDetailsStep.tsx` + `.test.tsx`
- `frontend/src/components/visitors/steps/MeetingDetailsStep.tsx` + `.test.tsx`
- `frontend/src/components/visitors/steps/ConfirmationStep.tsx` + `.test.tsx`

#### Security Dashboard
- `frontend/src/components/visitors/security/SecurityDashboard.tsx` (implied)
- `frontend/src/components/visitors/security/DashboardHeader.tsx` (implied)
- `frontend/src/components/visitors/security/BottomNavigation.tsx` (implied)
- `frontend/src/components/visitors/security/SidebarNavigation.tsx` (implied)
- `frontend/src/components/visitors/security/LiveIndicator.tsx` (implied)
- `frontend/src/components/visitors/security/MobileMenu.tsx` (implied)
- `frontend/src/components/visitors/security/CheckInTab.tsx` (implied)
- `frontend/src/components/visitors/security/PhoneLookupFlow.tsx` (implied)
- `frontend/src/components/visitors/security/VisitorDetailsCard.tsx` (implied)
- `frontend/src/components/visitors/security/VisitorDetailsModal.tsx` + `.test.tsx`
- `frontend/src/components/visitors/security/RejectVisitDialog.tsx` + `.test.tsx`
- `frontend/src/components/visitors/security/VisitorActionButtons.tsx` + `.test.tsx`

#### Logs Tab
- `frontend/src/components/visitors/logs/LogsTab.tsx` (implied)
- `frontend/src/components/visitors/logs/VisitorList.tsx` (implied)
- `frontend/src/components/visitors/logs/StatusFilterPills.tsx` + `.test.tsx`
- `frontend/src/components/visitors/logs/SearchInput.tsx` + `.test.tsx`
- `frontend/src/components/visitors/logs/VisitorActionButtons.tsx` + `.test.tsx`
- `frontend/src/components/visitors/logs/LogsRefreshControl.tsx` (implied, part of useLogsPolling hook)

#### Hooks
- `frontend/src/components/visitors/logs/useLogsPolling.ts` (implied)

#### Pages
- `frontend/src/app/security/dashboard/page.tsx` (implied)
- `frontend/src/app/public/visits/[visitId]/status/page.tsx` (implied)
- `frontend/src/app/public/visits/[visitId]/gate-pass/page.tsx` (implied)

#### API Routes
- `frontend/src/app/api/public/staff/search/route.ts` (proxy endpoint)

#### Tests (Frontend)
- 183 E2E tests for Increment 4 (phone auth flow)
- 279 E2E tests for Increment 5 (details & status)
- 60 E2E tests for Increment 6 (check-in tab)
- 112 E2E tests for Increment 7 (logs tab)
- Component unit tests for all new components

### 11.3 Modified Backend Files

- `backend/src/visitors/visitors.service.ts` - Enhanced with phone verification checks
- `backend/src/security/security.service.ts` - Enhanced approveVisit method
- `backend/src/visitors/visitors.controller.ts` - Modified registration endpoint
- `backend/src/common/filters/http-exception.filter.ts` - Type-safe error handling
- `backend/src/main.ts` - Global filter application
- `backend/prisma/schema.prisma` - Added new fields

### 11.4 Modified Frontend Files

- `frontend/src/components/visitors/shared/FileUploadField.tsx` - Enhanced validation

---

## Conclusion

The Unified Visitor Workflow feature has achieved significant progress with 8 out of 9 increments completed. The implementation successfully introduces phone verification, enhanced gate passes with visitor photos, WhatsApp delivery, and a unified security dashboard. Test coverage is excellent with 316 unit tests (100% passing) and 112+ E2E tests passing.

**Key Accomplishments:**
- ✅ Database schema updated with phone verification and gate pass fields
- ✅ Public API layer with no-auth endpoints for phone verification and status checking
- ✅ 5 shared UI components for reusability
- ✅ 8 public registration step components (phone auth, type selection, forms)
- ✅ Security dashboard with Check-In and Logs tabs
- ✅ Gate pass image generation with Canvas
- ✅ GCP Storage integration with signed URLs
- ✅ WhatsApp delivery integration
- ✅ Comprehensive test coverage

**Critical Gaps:**
- ❌ No unified multi-step workflow page to orchestrate public registration
- ❌ No main landing page (/visitor-registration) for visitor entry
- ❌ Increment 9 tasks pending (edge cases, error handling, Check-Out, empty states, accessibility)

**Recommendations:**
1. **Priority 1:** Implement the unified multi-step workflow page at `/visitor-registration` to connect all existing components into a cohesive end-to-end flow
2. **Priority 2:** Complete Increment 9 tasks for edge case handling and polish
3. **Priority 3:** Implement UX review recommendations (Pending Approvals list, "Register as new visitor" action, phone lookup flow clarification)
4. **Priority 4:** Add rate limiting and audit logging for public API endpoints (tasks 10.1-10.2)

The foundation is solid, with all building blocks in place. The primary blocker is the orchestration layer that connects these components into a production-ready user journey. Once the unified workflow page is implemented, the feature will be complete and ready for production deployment.

---

**Report Generated:** February 13, 2026
**Increments Covered:** 1-8 (Tasks 1.1 - 8.6)
**Next Steps:** Implement unified workflow page + Increment 9 tasks
