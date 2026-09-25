# 3. Visitor Workflow Split (Meeting vs. Delivery)

Date: 2025-12-19

## Status

Accepted

## Context

The initial requirement treated all visitors uniformly. However, during analysis, we identified two distinct user journeys with conflicting requirements:
1.  **Meeting Visitors:** (e.g., Medical Reps, Family) Require high security, identity verification, and host approval. High friction is acceptable for security.
2.  **Delivery Personnel:** (e.g., Swiggy, Amazon) Require speed and low friction. High friction causes operational delays and user frustration.

## Decision

We decided to **split the Visitor Workflow** into two distinct paths: **Meeting** and **Delivery**.

*   **Meeting:** Requires full registration (Name, Phone, Email, Company, Photo, ID).
*   **Delivery:** Requires minimal registration (Name, Phone, Company/Platform).

## Consequences

**Positive:**
*   **UX:** Delivery personnel can check in within 30 seconds.
*   **Data Quality:** We capture detailed data for meetings where it matters, without polluting the DB with partial data from deliveries.
*   **Security:** We maintain high security for sensitive visits while acknowledging the transient nature of deliveries.

**Negative:**
*   **Complexity:** The frontend form logic is more complex (conditional rendering based on visit type).
*   **Database:** The `Visit` table requires nullable fields to accommodate both types (e.g., `deliveryPlatform` is null for meetings).

## Compliance

*   The `Visit` model in `schema.prisma` must support a `visitCategory` enum.
*   The Frontend `PublicQRVisitorForm` must implement the branching logic.
