# 🔥 Active Sprint: Sprint 1

**Sprint Goal:** Solidify the "In Dev" features by ensuring the code matches the newly created Tech Specs, completing the core CRUD operations, and **kickoff Messaging (F-007) for Gate Pass delivery.**

## 🚨 Critical Path

1. **F-002 (Hospital Chains):** ✅ Complete.
2. **F-003 (Branches):** Must be complete to unblock User assignment.
3. **F-004 (User Mgmt):** Must be complete to create Security/Staff users.
4. **F-005 (Visitor Mgmt):** The end-user value; depends on all above.
5. **F-007 (Messaging):** 🆕 HIGH PRIORITY - WhatsApp Gate Passes. Direct Meta API upload (no GCP). ~5.5h total.

## 📋 Task Board

### 🟡 In Progress

| Ticket       | Priority | Feature | Description                                                        |
| :----------- | :------- | :------ | :----------------------------------------------------------------- |
| **TASK-002** | High     | F-003   | Implement strict Chain Admin scoping logic for Branch management.  |
| **TASK-003** | High     | F-005   | Refactor Frontend Visitor Form to support "Meeting vs. Delivery" split. |

### ⚪ Todo (Backlog for Sprint)

| Ticket       | Priority | Feature | Description                                                                        |
| :----------- | :------- | :------ | :--------------------------------------------------------------------------------- |
| **TASK-006** | High     | F-007   | Create `WhatsAppService` with `normalizePhone()`, `uploadMedia()`, and `sendGatePass()` (2.5h). |
| **TASK-008** | High     | F-007   | Register `WhatsAppService` in `MessagingModule` (10m).                             |
| **TASK-012** | High     | F-007   | Import `MessagingModule` in `NotificationsModule` (10m).                           |
| **TASK-009** | High     | F-007   | Implement `notifyVisitorOnApproval()` with branch lookup and WhatsApp call (1h).   |
| **TASK-010** | High     | F-007   | Add WhatsApp env vars to `.env.example` (5m).                                      |
| **TASK-011** | Medium   | F-007   | Write unit tests for `WhatsAppService` (focus on phone normalization edge cases) (1.5h). |
| **TASK-004** | Medium   | F-004   | Implement User creation logic with hierarchical permission checks.                 |
| **TASK-005** | Medium   | F-006   | Finalize Sidebar configuration based on User Role.                                 |

### 🟢 Done

| Ticket       | Feature     | Description                                              |
| :----------- | :---------- | :------------------------------------------------------- |
| **F-001**    | Auth System | OTP Login, JWT issuance, and basic RBAC guards are live. |
| **TASK-001** | F-002       | Backend CRUD endpoints validated and Live.               |

### ❌ Cancelled

| Ticket       | Feature | Reason                                                                                      |
| :----------- | :------ | :------------------------------------------------------------------------------------------ |
| **TASK-007** | F-007   | GCP Storage no longer required. Media uploaded directly to Meta servers (Spec Jan 06 2026). |
