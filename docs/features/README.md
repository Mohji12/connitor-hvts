# 📦 Feature Catalog

**Usage:** Search this file to find the ID of the feature you need.

### The Feature State Legend

#### 1. ⚪ **Proposed** (The "Idea")

- **Definition:** The feature exists as a requirement or a wireframe, but **no code** has been written.
- **Agent Rule:** The **Architect** and **Tech Lead** are active here. The Developer is blocked.

#### 2. 🟡 **In Dev** (The "Construction Zone")

- **Definition:** Active coding is happening. The implementation is incomplete or unstable.
- **Agent Rule:** **Developer Agents** have full write access. Things may break.

#### 3. 🟠 **In QA / Review** (The "Gate")

- **Definition:** Development is "Code Complete." It is currently sitting in a Pull Request or being tested.
- **Agent Rule:** **Developer** is read-only (unless fixing bugs).

#### 4. 🟢 **Live** (The "Production Standard")

- **Definition:** The feature is deployed to production and being used by users.
- **Agent Rule:** **Strictly Read-Only** for Refactoring.

## Core Platform

| ID      | Name            | Description                                 | Status      |
| :------ | :-------------- | :------------------------------------------ | :---------- |
| `F-001` | **Auth System** | OTP Login, JWT, RBAC, Auth UI.              | 🟢 Live     |
| `F-006` | **Navigation**  | Sidebar, Role-based routing.                | 🟡 In Dev   |
| `F-007` | **Messaging**   | WhatsApp/SMS integration for notifications. | 🟡 In Dev   |

## Administration

| ID      | Name                | Description                        | Status    |
| :------ | :------------------ | :--------------------------------- | :-------- |
| `F-002` | **Hospital Chains** | Super Admin management of Chains.  | 🟢 Live   |
| `F-003` | **Branches**        | Management of Hospital Branches.   | 🟡 In Dev |
| `F-004` | **User Mgmt**       | Staff, Security, Admin management. | 🟡 In Dev |

## Visitor Operations

| ID      | Name             | Description                           | Status    |
| :------ | :--------------- | :------------------------------------ | :-------- |
| `F-005` | **Visitor Mgmt** | Registration, Check-in/out, QR Codes. | 🟡 In Dev |
