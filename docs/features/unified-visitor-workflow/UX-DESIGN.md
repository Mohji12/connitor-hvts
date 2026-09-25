# UX Design: Unified Visitor Workflow

## 1. Overview

### Problem Statement
Currently, the visitor tracking system suffers from fragmented user experiences. The public-facing self-registration and the internal security dashboard use inconsistent visual styles, divergent workflows, and disparate component implementations. This leads to confusion for visitors, inefficiency for security guards, and increased maintenance overhead due to code duplication.

### Goals
1.  **Unified Visual Language**: Establish a cohesive design system that adapts the tone for public (welcoming) vs. security (efficient) contexts while sharing core visual DNA.
2.  **Standardized Workflow**: Implement a consistent 6-step registration process (including phone verification) across both interfaces.
3.  **Consolidated Operations**: Merge Security Check-In and Visitor Logs into a single, efficient dashboard view.
4.  **Reusable Components**: Create shared UI components (Profile Cards, Badges) to ensure consistency and reduce technical debt.

### User Personas
*   **The Visitor (Public Interface)**
    *   **Context**: Standing at reception or gate, using a mobile phone.
    *   **Needs**: Speed, clarity, large touch targets, minimal typing, visual confirmation of success.
    *   **Tone**: Friendly, guiding, "You are welcome here."
*   **The Security Guard (Internal Dashboard)**
    *   **Context**:
        *   **Primary**: Mobile phone (standing, patrolling, at gate).
        *   **Secondary**: Tablet/Laptop (supervisors, high-volume shifts).
    *   **Needs**: One-handed operation, large touch targets, high contrast for outdoor use, quick verification workflows.
    *   **Tone**: Professional, alert, "Process completed."

## 2. Design Principles

### Visual Language Guidelines
*   **Color Palette**:
    *   **Primary (Meeting)**: Emerald/Teal (`text-emerald-600`, `bg-emerald-500`) - Conveying permission and calmness.
    *   **Primary (Delivery)**: Amber/Orange (`text-amber-600`, `bg-amber-500`) - Conveying caution and transient nature.
    *   **Success**: Green (`text-green-600`).
    *   **Error**: Red (`text-red-600`).
    *   **Pending**: Blue (`text-blue-600`).
    *   **Neutral**: Slate/Gray for text and borders.
*   **Typography**: Clean sans-serif (Inter/Geist). Headings bold, labels uppercase/tracking-wide for forms.
*   **Card Styles**: Consistent rounded corners (`rounded-lg`), subtle borders (`border-gray-200`), and soft shadows (`shadow-sm`) for both public and dashboard views.

### Tone Differences
*   **Public**: Uses gradients, illustrations/icons, "Welcome" headers, conversational labels ("What is your phone number?").
*   **Internal**: Uses flat colors, high contrast, dense tables, direct labels ("Phone Number").

## 3. User Flows

### 3.1 Public Self-Registration Flow (Mobile)
A linear wizard-style flow that adapts based on the visit type (Meeting vs. Delivery).

```mermaid
graph TD
    A[Landing / QR] --> B[Step 1: Phone Entry]
    B --> B2[Step 1b: SMS Verification]
    B2 --> C{Registered?}
    C -- No --> D[Step 2: Visit Type Select]
    D --> E{Type?}
    E -- Delivery --> F[Step 3: Fast Track ID]
    E -- Meeting --> G[Step 3: Full ID + Docs]
    F --> H[Step 4: Delivery Details]
    G --> I[Step 4: Meeting Details]
    C -- Yes --> J[Step 3: Auto-fill Profile]
    J --> I
    H --> K[Step 5: Confirmation (Pending)]
    I --> K
    K -- Approved --> L[Gate Pass View]
```

**Steps:**

1.  **Phone Check (Step 1a)**: Visitor enters phone number. System checks DB.
2.  **Phone Verification (Step 1b)**: System sends SMS OTP to entered number, visitor enters OTP to verify ownership.
    *   **States**:
        *   **Default**: OTP input with countdown timer, "Resend OTP" link (disabled during countdown).
        *   **Loading**: Spinner while verifying.
        *   **Error**: "Invalid OTP" inline message, attempt counter (lock after 3 attempts).
        *   **Success**: Green checkmark animation before proceeding.
3.  **Type Selection (Step 2)**: Choose "Meeting" (Person) or "Delivery" (Package).
4.  **Identification (Step 3 - Conditional)**:
    *   **Delivery Flow (Fast Track)**:
        *   First Name (Required)
        *   Last Name (Required)
        *   Phone Number (Pre-filled from Step 1)
        *   Photo (Required - Camera capture)
    *   **Meeting Flow (Full Verification)**:
        *   First Name (Required)
        *   Last Name (Required)
        *   Email Address (Required)
        *   Company/Organization
        *   Designation/Title
        *   Address (Optional)
        *   Photo (Required - Camera capture)
        *   **Government ID** (Required - Upload/Capture Aadhaar, PAN, etc.)
        *   **Office ID** (Optional - Upload/Capture)
5.  **Visit Details (Step 4 - Conditional)**:
    *   **Delivery Flow**:
        *   Platform/Company (e.g., Zomato, Swiggy, Amazon)
        *   Recipient Name or Department
    *   **Meeting Flow**:
        *   Department
        *   Host Name (Searchable)
        *   Purpose of Visit
6.  **Confirmation (Step 5 - Pending)**: Success screen confirming submission.
    *   Displays "Request Submitted" message.
    *   Explains next steps: "Wait for approval. You'll receive your Gate Pass via WhatsApp once approved."
    *   NO OTP displayed.
7.  **Gate Pass (Step 6 - Approved)**:
    *   Gate Pass image is sent via **WhatsApp** to the visitor's verified phone number.
    *   The **Web App** also displays the Gate Pass (visitor can access via link or by re-checking status).
    *   Both WhatsApp image and Web View contain the **Check-In OTP**.
    *   Visitor details (Photo, Name).
    *   Host details (if Meeting).

> **OTP Clarification:**
> **Phone Verification OTP (SMS):** Sent during registration (Step 1b) to verify the visitor owns the phone number they entered. This is a one-time identity verification.
>
> **Check-In OTP (on Gate Pass):** Generated when the visit is approved. Displayed on the Gate Pass (Web + WhatsApp image). The visitor shows this to Security for check-in verification.

**Navigation:**
*   **Back**: Steps 2-5 include a "← Back" ghost button to return to the previous screen.
*   **Cancel**: "X" or "Cancel" option in header resets flow to Step 1.
*   **Step 1**: No back button (entry point).

### 3.2 Security-Assisted Registration Flow
Identical logic to Public flow but streamlined for Guard input.

1.  **Lookup**: Guard types phone number in "Quick Check-in" panel.
2.  **Status Check**:
    *   *Active Pass*: Show details & "Verify OTP" prompt.
    *   *No Pass*: Prompt "Create New Visit".
3.  **Quick Register**:
    *   Guard selects Type.
    *   Fills required fields based on type.
    *   Takes photo.
4.  **Action**: Click "Check-in" (bypasses approval for specific low-risk types or creates "Pending" request).

### 3.3 Security Dashboard Operations
*   **Navigation Structure**:
    *   **Mobile (Primary)**: Bottom Navigation Bar with tabs:
        1.  **Check-In**: Default tab. Quick lookup, OTP verification, and registration wizard.
        2.  **Logs**: Visitor lists (Pending, Approved, In, Out).
    *   **Desktop/Tablet (Secondary)**: Split-pane layout (Input Left, Logs Right).
*   **Tab Switching (Logs View)**:
    *   *Pending*: Needs Approval.
    *   *Approved*: Ready to arrive.
    *   *Checked-In*: Currently on premise.
    *   *Completed*: Left premise.
    *   *Rejected*: Denied entry.
*   **Quick Actions**:
    *   **Verify OTP**: Input field for 6-digit visitor OTP -> Opens Visitor Details -> One-click Check-in.
    *   **Phone Lookup**: Search by phone number -> Shows visitor details -> "Verify OTP" step -> Check-in.
    *   **Approve/Reject**: Inline buttons on "Pending" rows.
    *   **Check-Out**: "Exit" button on "Checked-In" rows.

### 3.4 Error Paths
*   **Network Failure**: Show inline error "Connection lost. Retry?". Preserve form data.
*   **Status Check (Pending)**: If visitor checks status before approval, show "Pending" screen (not Gate Pass).
*   **Visitor Already Checked In**: "You are already checked in. Need help?" with "Contact Security".
*   **Approval Timeout**: "Still waiting? Notify security" secondary action.
*   **Invalid OTP**: Show inline error "Invalid OTP". Lock out after 3 failed attempts.

## 4. Page/Component Specifications

### 4.1 Public Visitor Form
**Layout**: Single column, centered, max-width 480px.

**Component States**:
*   **Loading**: Button shows spinner, inputs disabled.
*   **Error**: Inline red text below input field. Border turns red.
*   **Success**: Green checkmark animation before transitioning to next step.

### 4.2 Security Dashboard (Mobile First)
**Layout Strategy**: Adaptive layout. Mobile uses bottom navigation. Tablet/Desktop uses split-pane.

**Mobile Layout (Primary)**:
*   **Bottom Navigation**: Fixed at bottom.
    *   **[Check-In]**: Icon `ClipboardCheck`.
    *   **[Logs]**: Icon `List`.
*   **Header**: Hamburger menu (User profile/Settings), "Live" status indicator.

**View 1: Check-In Tab**:
*   **Quick Actions**:
    *   **Phone Input**: Top section, large input for Phone Number.
    *   **OTP Input**: 6-digit input field for direct verification.
    *   **Verify Button**: "Verify OTP" or "Lookup" based on input.
    *   **No Scan QR**: QR scanning is removed in favor of OTP.
*   **Recent/Pending**: Below input, list of "Pending Approvals" for quick access.

**View 2: Logs Tab**:
*   **Status Filters**: Horizontal scrollable pill list at top (Pending, Approved, In, Out).
*   **List**: Cards for each visitor.
    *   **Card Content**: Name, Type/Host, Time, Action Button.

**Tablet/Desktop Layout (Secondary)**:
*   **Layout**: Split-pane. Sidebar navigation (global), Main content split into Left (Action) and Right (Data).
*   **Quick Check-In Panel**: Always visible on left. Contains Phone/OTP Input.
*   **Visitor Logs**: Data table with sortable columns on right.

### 4.3 Shared Components

#### VisitorProfileCard
*   **Purpose**: Display summary of visitor in lists or modals.
*   **Props**: `visitor` (object), `compact` (boolean).
*   **Content**:
    *   Avatar (Circle: Image or Initials).
    *   Name (Bold).
    *   Phone (Small, gray).
    *   Badges (Type, Status).
*   **Actions**: Optional slot for action buttons (e.g., "Check Out").

#### StatusBadge
*   **Variants**: `pending` (Blue), `approved` (Emerald), `rejected` (Red), `checked-in` (Purple), `checked-out` (Gray).

#### VisitTypeBadge
*   **Variants**: `Meeting` (Teal/Emerald), `Delivery` (Amber/Orange).

#### FileUploadField
*   **Purpose**: Handles both Photo Capture and Document Upload.
*   **Features**:
    *   **Photo Capture**: Triggers camera for visitor profile photos.
    *   **Document Upload**: Accepts PDF, JPG, PNG for IDs (Govt/Office).
    *   **Constraints**: Max file size 5MB.
    *   **UI**:
        *   Mobile: Action sheet (Take Photo / Choose from Library / Upload File).
        *   Desktop: Drag & drop zone.
    *   **State**: Shows preview thumbnail or file icon with name.

#### GatePass
*   **Purpose**: The "ticket" the visitor shows to security after approval.
*   **Props**: `visitor` (object), `otp` (string).
*   **Content**:
    *   **Header**: "Gate Pass" with "Approved" badge.
    *   **Visitor**: Photo (large) and Name.
    *   **Details**: Visit Date/Time, Purpose.
    *   **Host Info**: Host Name/Department (if Meeting).
    *   **OTP**: Large, prominent 6-digit code.
    *   **QR Code**: Optional, for record keeping.
*   **States**:
    *   **Loading**: Skeleton loader.
    *   **Success**: Full gate pass displayed with OTP visible.
    *   **Error**: "Unable to load pass" with "Retry" action.
    *   **Expired**: "This pass has expired" (if OTP validity has passed).
*   **Accessibility**: High contrast for OTP.

## 5. Interaction Specifications

### 5.1 Empty States
*   **Public Form**: Not applicable.
*   **Security Dashboard**:
    *   *Logs*: "No visitors in this category".
    *   *Search*: "No visitors match your search".

### 5.2 Destructive Action Confirmations
*   **Check-Out**: "Are you sure you want to check out [Name]?" [Cancel] [Check Out].
*   **Reject Visit**: Dialog with "Reason for rejection" textarea.

### 5.3 Microcopy Reference
| Context | Label/Copy |
|---------|------------|
| Phone Input Label | "Your Mobile Number" (Public) / "Visitor Phone" (Security) |
| OTP Input Label | "Visitor OTP" |
| OTP Verify Button | "Verify OTP" |
| OTP Success | "OTP Verified! Ready to check in." |
| OTP Error | "Invalid OTP. Please check and try again." |
| OTP Sent | "Verification code sent via SMS." |
| Phone Verification Sent | "A 6-digit code has been sent to your mobile via SMS." |
| Phone Verification Input Label | "Enter Verification Code" |
| Phone Verification Success | "Phone verified successfully!" |
| Phone Verification Error | "Invalid code. Please try again. [X] attempts remaining." |
| Resend Code | "Didn't receive the code? Resend" |
| Resend Cooldown | "Resend code in [X] seconds" |
| Continue Button | "Continue" (generic) / "Check Visitor" (phone lookup) |
| Submit Visit Button | "Submit Visit Request" |
| Success - Meeting | "Request Submitted! Please wait for approval. You will receive your Gate Pass via WhatsApp when approved." |
| Success - Delivery | "Request Submitted! Please wait for approval. You will receive your Gate Pass via WhatsApp when approved." |
| Approval Notification | "Your visit is approved! Your Gate Pass with Check-In OTP has been sent to your WhatsApp. You can also view it here: [Link]" |
| Gate Pass Header | "Show this OTP to Security" |
| Error - Phone Not Found | "We couldn't find a visitor with this number." (Action: "Register as new visitor") |
| Error - Network | "Connection lost. Please check your internet and try again." |

### 5.4 Error Handling Patterns
*   **Inline Errors**: Red border on input, error message below.
*   **Toast Errors**: For async operation failures (API 500).
*   **Error Recovery**: "Retry" buttons for network issues.

### Buttons (General)
*   **Primary**: Solid color (Teal/Amber).
*   **Secondary**: Outline or Ghost.
*   **Loading**: Spinner replacement.

### Form Validation
*   **Phone**: 10 digits.
*   **Name**: Min 2 chars.
*   **Required**: Marked `*`.
*   **Files**: Size/Type validation.

## 6. Accessibility Requirements

*   **Keyboard Navigation**: Logical tab order.
*   **Focus Management**: Trap focus in modals. Reset focus on step change.
*   **Screen Readers**: Labels for all inputs. `aria-live` for status updates. `aria-describedby` for errors.
*   **Contrast**: WCAG AA.

## 7. Responsive Behavior

### Breakpoints
*   **Mobile (< 768px)**: Public = Full screen steps. Security = Bottom nav.
*   **Tablet/Desktop**: Security = Split pane, Sidebar.

### Touch vs Mouse
*   **Touch Targets**: Min 44px for mobile.
*   **Inputs**: Height 48px min.

## 8. Open Questions for Architecture
1.  **Real-time Updates**: Does the "Visitor Logs" table need WebSockets/SSE?
2.  **Offline Support**: PWA offline capabilities?
3.  **Image Storage**: Retention policy for photos?
4.  **Consolidated API**: Dedicated controller vs reused?
5.  **OTP Delivery**: RESOLVED: SMS for phone verification, WhatsApp for Gate Pass delivery.
6.  **OTP Expiry**: Validity duration (e.g., 30 mins after approval)?
7.  **ID Document Storage**: Secure storage/encryption for Govt IDs?
8.  **ID Verification**: Manual review by guard or automated OCR/Verification?
9.  **Gate Pass Access**: RESOLVED: Gate Pass sent via WhatsApp image AND accessible via web link.

## 9. ASCII Wireframes

### A. Public Flow

**1. Landing Page**
```
┌─────────────────────────────────────┐
│        [Hospital Logo]              │
│     Welcome to [Hospital Name]      │
│     ─────────────────────────       │
│                                     │
│     [ Large Illustration ]          │
│                                     │
│     Visitor Registration            │
│                                     │
│     [ Start Registration → ]        │
│                                     │
└─────────────────────────────────────┘
```

**2. Phone Entry (Step 1a)**
```
┌─────────────────────────────────────┐
│  [Logo]   Hospital Name             │
├─────────────────────────────────────┤
│   Step 1 of 6                       │
│   ┌─────────────────────────────┐   │
│   │ Let's get started.          │   │
│   │ What is your mobile number? │   │
│   └─────────────────────────────┘   │
│   +91 | 999 999 9999                │
│   [ Send OTP / Continue ]           │
└─────────────────────────────────────┘
```

**2b. Phone Verification (Step 1b)**
```
┌─────────────────────────────────────┐
│  [Logo]   Hospital Name             │
├─────────────────────────────────────┤
│   Step 1 of 6                       │
│   ┌─────────────────────────────┐   │
│   │ Verify Your Phone Number    │   │
│   │                             │   │
│   │ We've sent a 6-digit code   │   │
│   │ to +91 999****999 via SMS   │   │
│   └─────────────────────────────┘   │
│                                     │
│   Enter Verification Code           │
│   ┌─────────────────────────────┐   │
│   │  [_] [_] [_] [_] [_] [_]    │   │
│   └─────────────────────────────┘   │
│                                     │
│   Didn't receive? Resend in 0:45    │
│                                     │
│   [ Verify & Continue ]             │
│                                     │
│   ─────────────────────────────     │
│   ← Change Phone Number             │
│                                     │
└─────────────────────────────────────┘
```

**3. Type Selection (Step 2)**
```
┌─────────────────────────────────────┐
│  ← Back                             │
├─────────────────────────────────────┤
│   Step 2 of 6                       │
│   What brings you here today?       │
│   [ 👤  Meeting ]                   │
│   [ 📦  Delivery ]                  │
│   [ Continue → ]                    │
└─────────────────────────────────────┘
```

**4. Registration Form (Step 3 - Delivery)**
```
┌─────────────────────────────────────┐
│  ← Back                             │
├─────────────────────────────────────┤
│   Step 3 of 6 • Delivery            │
│   Quick Info                        │
│                                     │
│   First Name *                      │
│   ┌─────────────────────────────┐   │
│   │                             │   │
│   └─────────────────────────────┘   │
│                                     │
│   Last Name *                       │
│   ┌─────────────────────────────┐   │
│   │                             │   │
│   └─────────────────────────────┘   │
│                                     │
│   Photo ID *                        │
│   ┌─────────────────────────────┐   │
│   │  📷  Take Photo             │   │
│   └─────────────────────────────┘   │
│                                     │
│   [ Continue → ]                    │
│                                     │
└─────────────────────────────────────┘
```

**5. Registration Form (Step 3 - Meeting)**
```
┌─────────────────────────────────────┐
│  ← Back                             │
├─────────────────────────────────────┤
│   Step 3 of 6 • Meeting             │
│   Your Details                      │
│                                     │
│   First Name *        Last Name *   │
│   ┌────────────┐      ┌────────────┐│
│   │            │      │            ││
│   └────────────┘      └────────────┘│
│                                     │
│   Email Address *                   │
│   ┌─────────────────────────────┐   │
│   │                             │   │
│   └─────────────────────────────┘   │
│                                     │
│   Company / Organization            │
│   ┌─────────────────────────────┐   │
│   │                             │   │
│   └─────────────────────────────┘   │
│                                     │
│   Designation                       │
│   ┌─────────────────────────────┐   │
│   │                             │   │
│   └─────────────────────────────┘   │
│                                     │
│   Address                           │
│   ┌─────────────────────────────┐   │
│   │                             │   │
│   └─────────────────────────────┘   │
│                                     │
│   ─── ID Verification ───           │
│                                     │
│   Government ID * (Aadhaar/PAN/etc) │
│   ┌─────────────────────────────┐   │
│   │  📎  Upload Document        │   │
│   │  or tap to capture          │   │
│   └─────────────────────────────┘   │
│                                     │
│   Office/Company ID                 │
│   ┌─────────────────────────────┐   │
│   │  📎  Upload Document        │   │
│   │  or tap to capture          │   │
│   └─────────────────────────────┘   │
│                                     │
│   Photo *                           │
│   ┌─────────────────────────────┐   │
│   │  📷  Take Photo             │   │
│   └─────────────────────────────┘   │
│                                     │
│   [ Continue → ]                    │
│                                     │
└─────────────────────────────────────┘
```

**6. Success Confirmation (Step 5)**
```
┌─────────────────────────────────────┐
│                                     │
│           ✓                         │
│     (Large green checkmark)         │
│                                     │
│     Request Submitted!              │
│                                     │
│   We've notified Dr. Smith.         │
│   Please wait for approval.         │
│                                     │
│   You'll receive your Gate Pass     │
│   via **WhatsApp** with your        │
│   Check-In OTP once approved.       │
│                                     │
│   ─────────────────────────────     │
│   Estimated wait: 2-5 minutes       │
│                                     │
│   [ Done ]                          │
│   [ Need help? Contact Security ]   │
│                                     │
└─────────────────────────────────────┘
```

**7. Gate Pass (Approved)**
```
┌─────────────────────────────────────┐
│  [Approved]   Gate Pass             │
├─────────────────────────────────────┤
│                                     │
│         ┌─────────┐                 │
│         │  👤     │                 │
│         │  Photo  │                 │
│         └─────────┘                 │
│         John Doe                    │
│                                     │
│   Meeting • Dr. Smith • Cardiology  │
│   Purpose: Consultation             │
│                                     │
│   ─────────────────────────────     │
│   SHOW TO SECURITY:                 │
│                                     │
│      8 4 7 2 9 1                    │
│    (Large OTP Display)              │
│                                     │
│   ─────────────────────────────     │
│   Valid until: 12:30 PM             │
│                                     │
│   [ 🔳 QR Code (Optional) ]         │
│                                     │
└─────────────────────────────────────┘
```
**Note:** This Gate Pass is also sent as a composed image via WhatsApp to the visitor's phone. The Check-In OTP is used by Security to verify and check-in the visitor.

### B. Security Flow (Mobile First)

**1. Security Dashboard - Check-In Tab**
```
┌─────────────────────────────────────┐
│  ☰  Security Dashboard    [●] Live  │
├─────────────────────────────────────┤
│                                     │
│   Quick Check-In                    │
│   ┌─────────────────────────────┐   │
│   │ Enter phone or OTP...       │   │
│   └─────────────────────────────┘   │
│   [ 🔍 Lookup ]  [ ✓ Verify OTP ]   │
│                                        │
│   ─────────────────────────────     │
│   Pending Approvals (3)             │
│   [List of pending visitors...]     │
│                                     │
├─────────────────────────────────────┤
│  [clipboard]      [list]            │
│   Check-In         Logs             │
└─────────────────────────────────────┘
```

**2. OTP Verification Modal**
```
┌─────────────────────────────────────┐
│  Verify Visitor OTP          [ ✕ ]  │
├─────────────────────────────────────┤
│                                     │
│   Enter the 6-digit OTP shown       │
│   by the visitor                    │
│                                     │
│   ┌─────────────────────────────┐   │
│   │  [_] [_] [_] [_] [_] [_]    │   │
│   └─────────────────────────────┘   │
│                                     │
│   [ Verify & Check In ]             │
│                                     │
│   ─────────────────────────────     │
│   Can't verify? Try phone lookup    │
│                                     │
└─────────────────────────────────────┘
```

**3. Security Dashboard - Logs Tab (Mobile)**
```
┌─────────────────────────────────────┐
│  ☰  Visitor Logs          [Filter]  │
├─────────────────────────────────────┤
│ [Pending] [Approved] [In] [Out]     │
│    (3)       (5)      (8)   (12)    │
├─────────────────────────────────────┤
│   🔍 Search visitors...             │
├─────────────────────────────────────┤
│                                     │
│   ┌─────────────────────────────┐   │
│   │ 👤 John Doe        Pending  │   │
│   │ Meeting • Dr. Smith         │   │
│   │ 10:32 AM            [View]  │   │
│   └─────────────────────────────┘   │
│                                     │
│   ┌─────────────────────────────┐   │
│   │ 👤 Jane Roe        In       │   │
│   │ Delivery • Nursing          │   │
│   │ 10:15 AM          [Check Out]│   │
│   └─────────────────────────────┘   │
│                                     │
│   ┌─────────────────────────────┐   │
│   │ 👤 Bob Smith       Approved │   │
│   │ Meeting • Admin             │   │
│   │ 09:45 AM         [Verify OTP]│   │
│   └─────────────────────────────┘   │
│                                     │
├─────────────────────────────────────┤
│  [clipboard]      [list]            │
│   Check-In         Logs (active)    │
└─────────────────────────────────────┘
```

**4. Visitor Details Modal**
```
┌─────────────────────────────────────┐
│                              [ ✕ ]  │
│                                     │
│         ┌─────────┐                 │
│         │  👤     │                 │
│         │  Photo  │                 │
│         └─────────┘                 │
│         John Doe                    │
│         +91 99999 99999             │
│                                     │
│   ┌──────────┐  ┌──────────┐        │
│   │ Meeting  │  │ Approved │        │
│   └──────────┘  └──────────┘        │
│                                     │
│   ─────────────────────────────     │
│   Host: Dr. Smith                   │
│   Department: Cardiology            │
│   Purpose: Consultation             │
│   OTP: 847291 (If Approved)         │
│   ─────────────────────────────     │
│   Requested: 10:32 AM               │
│   Approved: 10:35 AM                │
│                                     │
│   [ Check In ✓ ]                    │
│   (Full width primary button)       │
│                                     │
└─────────────────────────────────────┘
```

### C. Shared Components

**Visitor Profile Card (Compact + Full)**
```
Compact (List Item):
┌─────────────────────────────────────┐
│ [Avatar] Name Here          Status  │
│          Type • Host • Time  [Action]│
└─────────────────────────────────────┘

Full (Card):
┌─────────────────────────────────────┐
│  ┌──────┐                           │
│  │ 👤   │  Name Here                │
│  │Photo │  +91 99999 99999          │
│  └──────┘                           │
│  [Meeting Badge] [Status Badge]     │
│                                     │
│  Host: Dr. Smith                    │
│  Purpose: Consultation              │
│  ─────────────────────────────      │
│  [ Primary Action ]  [ Secondary ]  │
└─────────────────────────────────────┘
```
