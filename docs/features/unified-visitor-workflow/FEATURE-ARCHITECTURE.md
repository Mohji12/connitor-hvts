# Feature Architecture: Unified Visitor Workflow

> **Feature**: Unified Visitor Workflow
> **Status**: Draft
> **Owner**: Execution Architect

## 1. Overview

This feature unifies the public visitor registration and security operations into a cohesive workflow. It introduces phone verification for public visitors, separates "Phone Verification" (5-min OTP) from "Check-In" (8-hr OTP), and enhances the Gate Pass with visitor photos.

### Key Goals
- **Secure Public Access**: Validate phone ownership before registration.
- **Enhanced Gate Pass**: Include visitor photo and clear Check-In OTP.
- **Frictionless Status Check**: URL-based status tracking for visitors.
- **Unified Security Dashboard**: Streamlined verification and check-in tools.

### 1.1 Out of Scope

The following are explicitly NOT part of this feature:

- **Offline Support / PWA**: Security dashboard will require network connectivity.
- **Automated ID Verification**: Government ID documents are stored for manual review, no OCR or automated verification.
- **Real-time Push Notifications**: Using 30s polling instead of WebSockets/SSE for visitor log updates.
- **Multi-factor Authentication**: Phone verification is single-factor (OTP only).
- **Visitor Accounts / Login**: Visitors do not create accounts; status check uses UUID-based URLs.

## 2. Architecture Design

### 2.1 Database Schema Changes

We will extend the `Visitor` and `Visit` models in `backend/prisma/schema.prisma`.

```prisma
model Visitor {
  // ... existing fields

  // Phone Verification Logic
  phoneVerificationOtp    String?      // 6-digit OTP
  phoneVerificationExpiry DateTime?    // 5-minute expiry
  phoneVerified           Boolean      @default(false)
  phoneVerificationAttempts Int        @default(0)  // Security lock (max 3)
}

model Visit {
  // ... existing fields

  // Gate Pass & Security Logic
  // checkInOtp was formerly 'visitCode'
  checkInOtp              String?      // 6-digit OTP shown on Gate Pass
  checkInOtpExpiry        DateTime?    // 8-hour expiry from approval

  // Gate Pass Image Tracking
  gatePassGeneratedAt     DateTime?
  gatePassSentViaWhatsApp Boolean      @default(false)
  
  // Note: 'visitQRCode' stores the Base64 Gate Pass Image
}
```

### 2.2 System Components

#### A. Phone Verification Service (New)
- **Responsibility**: Handle public phone validation.
- **Logic**:
  - Generate 6-digit OTP (expiry: 5 mins).
  - Rate limit: 3 requests / 10 mins.
  - Send via `SmsService` (AWS SNS).
  - Verify and lock after 3 failed attempts.

#### B. Gate Pass Service (New)
- **Responsibility**: Generate and deliver the digital gate pass.
- **Logic**:
  - Triggered on Visit Approval.
  - Generates Image (Canvas/Sharp) containing:
    - Visitor Photo (fetched from GCP).
    - Check-In OTP (Large font).
    - Validity Timestamp.
  - Sends via `WhatsAppService`.

#### C. Public API Layer (Extended)
- **No-Auth Endpoints**:
  - `POST /public/visitors/send-otp`: Initiate verification.
  - `POST /public/visitors/verify-phone`: Complete verification.
  - `GET /public/visits/:visitId/status`: Poll for approval status.
  - `GET /public/visits/:visitId/gate-pass`: View approved pass.

#### D. Security API Layer (Extended)
- **Auth Endpoints (JWT)**:
  - `POST /visitors/verify-checkin-otp`: Validate visitor at gate.
  - `POST /visitors/checkin/:visitId`: Mark visit as active.

## 3. Workflows

### 3.1 Public Registration with Phone Verification
See `phone-verification-flow.mmd`

1. Visitor enters Phone Number.
2. System sends SMS OTP (5-min validity).
3. Visitor verifies OTP.
4. If **Existing Visitor**: Prefill form.
5. If **New Visitor**: Show empty registration form.

### 3.2 Visit Approval & Gate Pass Delivery
See `gate-pass-flow.mmd`

1. Staff/Security approves request.
2. System generates **Check-In OTP** (8-hr validity).
3. System compiles **Gate Pass Image** (Photo + OTP).
4. Sent via WhatsApp.
5. Visitor presents OTP at Gate.
6. Security validates OTP -> Check-In.

## 4. Technical Specifications

### 4.1 OTP Configuration
| Type | Length | Expiry | Purpose |
| :--- | :--- | :--- | :--- |
| **Verification OTP** | 6 digits | 5 minutes | Verify phone ownership |
| **Check-In OTP** | 6 digits | 8 hours | Validate physical entry |

### 4.2 Security & Constraints
- **Rate Limiting**: Public endpoints protected against spam.
- **Status Token**: Visit Status Check uses UUID (high entropy) instead of login.
- **Image Privacy**: Visitor photos stored in GCP, accessed via secure service-to-service calls for Gate Pass generation.

### 4.3 Scalability Considerations

#### Current Design (MVP)
- **Polling**: 30-second interval for visitor log updates
- **Bottleneck**: Gate Pass image generation (Canvas/Sharp)
- **Mitigation**: Generate asynchronously, store result

#### Future Improvements (Post-MVP)
- **WebSockets**: For high-volume branches (>100 visitors/hour)
- **Caching**: Redis cache for frequent branch/staff lookups
- **Image CDN**: Move Gate Pass images to CDN for faster WhatsApp uploads

## 5. Integration Points

- **AWS SNS**: SMS Delivery (Existing).
- **Meta Cloud API**: WhatsApp Delivery (Existing).
- **GCP Storage**: Image persistence (Existing).
- **Sharp/Canvas**: Server-side image generation (Existing).

## 6. Shared Component Strategy

### 6.1 Frontend Components

| Component | Location | Usage |
|-----------|----------|-------|
| `OtpInput` | `frontend/src/components/visitors/shared/` | Phone verification (public), Check-in (security) |
| `VisitorProfileCard` | `frontend/src/components/visitors/shared/` | Public confirmation, Security list items |
| `StatusBadge` | `frontend/src/components/visitors/shared/` | Both interfaces |
| `VisitTypeBadge` | `frontend/src/components/visitors/shared/` | Both interfaces |
| `GatePassView` | `frontend/src/components/visitors/shared/` | Public status page, Security details modal |
| `FileUploadField` | `frontend/src/components/visitors/shared/` | Already exists, reuse |

### 6.2 Backend Services

| Service | Module | Responsibility |
|---------|--------|----------------|
| `PhoneVerificationService` | `visitors` | OTP generation, verification, rate limiting |
| `GatePassService` | `visitors` | Image generation with visitor photo |
| `SmsService` | `messaging` | Existing, extend for verification SMS |
| `WhatsAppService` | `messaging` | Existing, no changes needed |

## 7. Error Handling & Failure Modes

| Scenario | System Response | User Experience |
|----------|-----------------|-----------------|
| **SMS send failure** | Log error, return success with warning flag | Show "OTP sent" with retry option if not received |
| **WhatsApp send failure** | Log error, mark `gatePassSentViaWhatsApp = false` | Visitor can view Gate Pass via web link |
| **OTP expired** | Return `OTP_EXPIRED` error code | Show "Code expired" with resend option |
| **OTP locked (3 attempts)** | Return `OTP_LOCKED` error code | Show "Too many attempts, try again in 10 minutes" |
| **Visit not found** | Return 404 | Generic "Visit not found" message (no data leak) |
| **Already checked in** | Return `ALREADY_CHECKED_IN` with timestamp | Show "Already checked in at [time]" |
| **Check-In OTP expired** | Return `CHECKIN_OTP_EXPIRED` | Security sees "Pass expired, contact staff" |
| **GCP Storage unavailable** | Retry 3x, then fail gracefully | Gate Pass generated without photo (fallback) |
| **Network failure (frontend)** | Preserve form data in local state | Show "Connection lost. Retry?" |

## 8. Testing & Test Mode Support

### 8.1 TEST_MODE Environment Variable

When `TEST_MODE=true`:

| Behavior | Default | Test Mode |
|----------|---------|-----------|
| Phone Verification OTP | Random 6-digit | Fixed `"123456"` |
| Check-In OTP | Random 6-digit | Fixed `"654321"` |
| SMS Delivery | AWS SNS | Mocked (logged only) |
| WhatsApp Delivery | Meta Cloud API | Mocked (logged only) |
| OTP Expiry | Enforced | Still enforced (use fresh OTPs) |

### 8.2 E2E Test Scenarios

1. **Phone Verification Flow**: Enter phone → Receive "123456" → Verify → Proceed
2. **Visit Approval Flow**: Submit request → Approve → Check-In OTP = "654321"
3. **Security Check-In**: Enter "654321" → Verify → Check-in successful
4. **Error Cases**: Test expired OTP, locked attempts, invalid OTP

## 9. Implementation Strategy

1. **Database**: Apply schema migration.
2. **Backend**: Implement `PhoneVerificationService` and `GatePassService`.
3. **API**: Expose new public and security endpoints.
4. **Frontend**: Build `OtpInput` and update registration flows.
