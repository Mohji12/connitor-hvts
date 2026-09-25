# Future Architectural Suggestions & Technical Debt

This document records identified shortcomings in the current architecture and provides recommendations for future improvements.

## 1. Scalability & Performance

### 1.1 Database Bottlenecks
- **Current State:** Single MySQL instance handling all reads/writes.
- **Issue:** As the number of branches and visits grows, the `Visit` and `Notification` tables will grow rapidly, potentially slowing down queries.
- **Suggestion:**
  - Implement **Read Replicas** for heavy read operations (e.g., Analytics dashboards).
  - Consider **Table Partitioning** for the `Visit` table based on `createdAt` (Time-series data) or `hospitalChainId`.

### 1.2 Monolithic Backend
- **Current State:** Single NestJS application handling API, background jobs, and scheduled tasks.
- **Issue:** Long-running tasks (e.g., generating reports, processing image uploads) can block the event loop or consume resources needed for API requests.
- **Suggestion:**
  - Extract background jobs (SMS sending, Image processing) into a separate **Worker Service** using a message queue (e.g., Redis/BullMQ).

## 2. Security & Compliance

### 2.1 PII Protection
- **Current State:** Visitor PII (Phone, Name, Documents) is stored in the main database and standard cloud storage.
- **Issue:** Healthcare compliance (HIPAA/GDPR) often requires stricter controls on PII.
- **Suggestion:**
  - Implement **Column-level Encryption** for sensitive fields (Phone, Email) in the database.
  - Use **Signed URLs** with short expiration times for accessing ID documents in GCP Storage.

### 2.2 Audit Logging
- **Current State:** Basic timestamps (`createdAt`, `updatedAt`) and some relations (`checkedInBy`).
- **Issue:** No comprehensive audit trail of *who changed what and when* (e.g., who changed a user's role?).
- **Suggestion:**
  - Implement a dedicated **Audit Log** table or service to track all mutation events (CREATE, UPDATE, DELETE) with `actorId`, `action`, `resource`, and `diff`.

## 3. Reliability & Maintenance

### 3.1 Single Point of Failure (SPOF)
- **Current State:** Single server deployment (implied by `VM-deploy.md`).
- **Issue:** If the VM goes down, the entire system is inaccessible.
- **Suggestion:**
  - Move to a **Container Orchestration** platform (Kubernetes or AWS ECS/GCP Cloud Run) with a minimum of 2 replicas behind a Load Balancer.

### 3.2 Testing Strategy
- **Current State:** Basic Unit and E2E tests exist.
- **Issue:** As complexity grows, regression testing becomes harder.
- **Suggestion:**
  - Increase **Integration Test** coverage specifically for complex workflows like "Visitor Check-in Flow" involving multiple services.

## 4. Frontend & UX

### 4.1 State Management
- **Current State:** Mix of Context and React Query.
- **Issue:** Potential for prop drilling or inconsistent state if not strictly governed.
- **Suggestion:**
  - Formalize the use of **TanStack Query** for all server state and strictly limit Context for global UI themes/auth only.

### 4.2 Offline Support
- **Current State:** Web-based only.
- **Issue:** Hospitals may have dead zones where internet is spotty.
- **Suggestion:**
  - Implement **PWA (Progressive Web App)** capabilities to allow basic check-in/out operations to be queued offline and synced when online.
