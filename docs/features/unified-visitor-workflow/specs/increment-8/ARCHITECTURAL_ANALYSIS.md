# Architectural Analysis: Increment 8 - Gate Pass Generation & WhatsApp Delivery

> **Feature:** Unified Visitor Workflow
> **Increment:** 8
> **Analysis Date:** 2026-02-12
> **Status:** Analysis Complete (Awaiting Decision)

---

## Executive Summary

This document analyzes two critical architectural questions for Increment 8 (Gate Pass Generation & WhatsApp Delivery):

1. **GCP Bucket Access:** How to handle GCP Storage access for gate pass images when the bucket is private
2. **GCP Storage Necessity:** Whether storing gate pass images in GCP is necessary or if on-demand regeneration is viable

**Key Finding:** The current specification assumes a workflow that doesn't match the actual WhatsAppService implementation. The WhatsApp service uploads images directly to Meta's servers, not via GCP URLs. This creates a fundamental architectural misalignment that needs to be resolved.

---

## Part 1: GCP Bucket Access & Pre-Authenticated URLs

### 1.1 Current Situation Analysis

#### 1.1.1 Current Spec Assumptions

The existing specs (tasks 8.1-8.4) assume:

1. **Task 8.1:** Generate gate pass image (base64 PNG)
2. **Task 8.2:** Upload gate pass to GCP Storage → Return public URL
3. **Task 8.3:** Send gate pass via WhatsApp → Uses the GCP URL
4. **Task 8.4:** Public endpoint → Returns gate pass GCP URL

**Critical Issue:** The specification assumes the GCP bucket is publicly accessible, allowing direct URL access.

#### 1.1.2 Actual Reality

**GCP Bucket Configuration:**
- The GCP bucket for gate pass uploads is **NOT public**
- Images are private and require authentication
- Direct public URL access will return 403 Forbidden

**Existing Fallback Pattern in GcpStorageService:**

```typescript
// From gcp-storage.service.ts lines 95-123
blobStream.on('finish', () => {
  void (async () => {
    try {
      // Step 1: Try to make file publicly accessible
      await blob.makePublic();
      const publicUrl = `https://storage.googleapis.com/${this.bucketName}/${filePath}`;
      resolve(publicUrl);
    } catch (publicError) {
      // Step 2: Fallback to signed URL (1 hour expiry)
      try {
        const signedUrl = await this.generateSignedUrl(filePath);
        resolve(signedUrl);
      } catch {
        // Step 3: Final fallback (public URL format - won't work if bucket is private)
        const fallbackUrl = `https://storage.googleapis.com/${this.bucketName}/${filePath}`;
        resolve(fallbackUrl);
      }
    }
  })();
});
```

**Key Observations:**
1. The existing code already attempts `makePublic()` - this will FAIL if bucket permissions disallow it
2. The signed URL fallback has a **1-hour expiry** hardcoded
3. The final fallback (public URL format) will **NOT WORK** if the bucket is truly private

#### 1.1.3 WhatsApp Service Reality Check

**CRITICAL DISCOVERY:** The `WhatsAppService.sendGatePass()` method **does NOT use GCP URLs at all**.

```typescript
// From whatsapp.service.ts lines 229-233
async sendGatePass(
  to: string,
  branchName: string,
  gatePassBase64: string  // Receives base64 image, NOT a URL
): Promise<boolean> {
  // ... validation ...

  // Uploads image directly to Meta's servers
  const mediaId = await this.uploadMedia(imageBuffer);
  // Sends template with Meta media ID
  return this.sendTemplateMessage(phone, branchName, mediaId);
}
```

**Implication:** Task 8.3's specification is **fundamentally misaligned** with the actual WhatsApp service implementation. The spec says we send the GCP URL via WhatsApp, but the WhatsApp service uploads the image buffer directly to Meta.

---

### 1.2 Comparison: Signed URLs vs. Custom Download Endpoint

#### Option A: Google Cloud Signed URLs (Pre-Authenticated URLs)

**How it works:**
1. Generate a temporary URL with cryptographic signature
2. URL includes expiration timestamp
3. GCP validates signature and expiration on each access
4. No additional server-side code needed

**Pros:**
- Native GCP feature, no custom endpoint needed
- Cryptographically secure (signature validates authenticity)
- No compute overhead (handled by GCP)
- Works with CDN caching
- Simple to implement

**Cons:**
- Fixed expiration time (cannot be extended)
- URL regeneration required if expired
- Must choose appropriate expiry (trade-off between security and UX)
- No audit logging of access attempts (on our side)
- Cost: Minimal (per-URL generation is negligible)

**Implementation Details:**

```typescript
// Example: Generating a signed URL with 7-day expiry
const [signedUrl] = await storage
  .bucket(bucketName)
  .file(filePath)
  .getSignedUrl({
    version: 'v4',
    action: 'read',
    expires: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
  });
```

**Recommended Expiration Times:**

| Use Case | Recommended Expiration | Rationale |
|----------|------------------------|-----------|
| WhatsApp delivery | **7 days** | Gate pass validity + buffer for delayed arrival |
| Visitor web viewing | **7 days** | Matches Check-In OTP expiry (8 hours) |
| Status endpoint | **7 days** | Consistent with above |

**Security Considerations:**
- URL is sent over WhatsApp (encrypted)
- Only visitor with access to WhatsApp can open URL
- UUID-based visit ID prevents enumeration
- Expiration limits risk window

#### Option B: Custom Download Endpoint (Proxy)

**How it works:**
1. Create a new backend endpoint: `GET /public/visits/:visitId/gate-pass-image`
2. Server downloads image from GCP (using service account credentials)
3. Server streams image to client
4. Server logs access attempts

**Pros:**
- Complete control over access (can implement custom logic)
- Full audit logging of all image accesses
- No URL expiration issues (always accessible)
- Can implement rate limiting per IP
- Can implement additional validation (e.g., IP geolocation)

**Cons:**
- **Significant compute overhead:** Each access requires:
  - HTTP request to backend
  - Server-side download from GCP
  - Server-side streaming to client
  - Higher latency
- **Increased server load:** Scales with visitor traffic
- **No CDN caching:** Images go through backend, can't use GCP/CDN caching
- **More complex:** Requires additional endpoint, error handling, monitoring
- **Cost:** Higher compute costs (especially at scale)

**Implementation Details:**

```typescript
// Example: Custom download endpoint
@Public()
@Get('visits/:visitId/gate-pass-image')
async getGatePassImage(@Param('visitId') visitId: string) {
  // Validate visit
  const visit = await this.prisma.visit.findUnique({
    where: { id: visitId },
    include: { branch: true }
  });

  if (!visit || visit.status !== VisitStatus.APPROVED) {
    throw new NotFoundException();
  }

  // Download from GCP
  const filePath = `gate-passes/${visitId}.png`;
  const buffer = await this.gcpStorageService.downloadFile(filePath);

  // Stream to client
  return new StreamableFile(buffer, {
    type: 'image/png',
    disposition: 'inline'
  });
}
```

**Performance Comparison:**

| Metric | Signed URL | Custom Endpoint |
|--------|------------|-----------------|
| Initial request latency | ~50ms (GCP edge) | ~200-500ms (backend + GCP) |
| Subsequent requests | ~50ms (cached) | ~200-500ms (no caching) |
| Server compute load | Minimal (URL generation) | High (per-request processing) |
| CDN support | Yes (GCP CDN) | No |
| Scalability | Excellent (handled by GCP) | Limited by server capacity |

---

### 1.3 Recommendation for Question 1

**Primary Recommendation: Signed URLs with 7-Day Expiration**

**Rationale:**

1. **Simplicity & Reliability:**
   - Leverages native GCP feature
   - Less code to maintain
   - No custom endpoint to debug
   - Works with existing GCP service patterns

2. **Performance:**
   - ~50ms initial latency vs. ~200-500ms for proxy
   - CDN caching reduces latency further
   - Zero server compute overhead for image access

3. **Security:**
   - Cryptographically secure
   - Time-limited access (7 days covers typical use case)
   - UUID prevents enumeration

4. **Cost:**
   - Minimal signed URL generation cost
   - No additional compute costs
   - Reduced egress costs if using CDN caching

5. **User Experience:**
   - 7 days is sufficient for Check-In OTP (8 hours) + buffer
   - Fast image loading from GCP edge locations
   - No URL expiration handling needed (within window)

**Implementation Changes Required:**

**Task 8.2 (Gate Pass Upload to GCP):**

| Change | Current Spec | Recommended Change |
|--------|--------------|-------------------|
| URL type | Public URL | Signed URL with 7-day expiry |
| Storage approach | Try `makePublic()`, fallback to 1h signed URL | Always use signed URL (7 days) |
| Fallback strategy | Public URL format → will fail | Graceful degradation to custom endpoint if GCP fails |

**Updated Pseudo-Code for Task 8.2:**

```typescript
async uploadGatePassToGcp(
  visitId: string,
  imageBase64: string
): Promise<GatePassUploadResponse> {
  // Check TEST_MODE
  const isTestMode = this.configService.get<string>('TEST_MODE') === 'true';
  if (isTestMode) {
    return { publicUrl: this.getMockGatePassUrl(visitId) };
  }

  // Validate and decode base64
  const buffer = this.validateAndDecodeImage(imageBase64);

  // Upload to GCP
  const filePath = `gate-passes/${visitId}.png`;
  await this.gcpStorageService.uploadGatePassBuffer(buffer, visitId);

  // Generate signed URL with 7-day expiry
  const signedUrl = await this.gcpStorageService.generateSignedUrl(
    filePath,
    7 * 24 * 60 * 60 * 1000 // 7 days in ms
  );

  // Update database with signed URL
  await this.prisma.visit.update({
    where: { id: visitId },
    data: {
      visitQRCode: signedUrl,
      gatePassGeneratedAt: new Date()
    }
  });

  return { publicUrl: signedUrl };
}
```

**Task 8.3 (WhatsApp Integration):**

**CRITICAL CHANGE NEEDED:** The current spec is **incorrect**. The WhatsApp service does NOT use GCP URLs - it uploads the image buffer directly to Meta.

| Change | Current Spec (WRONG) | Corrected Spec |
|--------|---------------------|---------------|
| Input | GCP URL (from task 8.2) | Base64 image buffer (from task 8.1) |
| Workflow | Generate → Upload to GCP → Send GCP URL via WhatsApp | Generate → Upload to GCP (for storage) → Send base64 via WhatsApp |
| GCP URL purpose | Primary delivery method | Backup/record only |

**Updated Integration Flow:**

```typescript
// In SecurityService.approveVisit
async approveVisit(visitId: string) {
  // 1. Generate Check-In OTP
  await this.gatePassService.generateCheckInOtp(visitId);

  // 2. Generate gate pass image (base64)
  const { imageUrl: imageBase64 } = await this.gatePassService.generateGatePassImage(visitId);

  // 3. Upload to GCP for storage (returns signed URL)
  const { publicUrl: gcpSignedUrl } = await this.gatePassService.uploadGatePassToGcp(
    visitId,
    imageBase64
  );

  // 4. Send via WhatsApp (uses BASE64, not GCP URL)
  await this.gatePassService.sendGatePassViaWhatsApp(
    visitId,
    imageBase64  // ← Pass base64, not GCP URL!
  );
}
```

**Task 8.4 (Public Endpoint):**

| Change | Current Spec | Recommended Change |
|--------|--------------|-------------------|
| Response data | Returns GCP URL (public) | Returns GCP signed URL (or regenerated on demand) |
| URL validation | Assumes public URL works | Handles expired signed URLs gracefully |

**Edge Case Handling:**

If a signed URL expires (after 7 days), the public endpoint should:

1. Check if the URL is expired
2. If expired, regenerate a new signed URL
3. Update the database with new URL
4. Return the new URL to the visitor

```typescript
// In getGatePassPublic()
let gatePassUrl = visit.visitQRCode;

// Check if URL is expired (signed URLs contain expiry in query params)
if (this.isSignedUrlExpired(gatePassUrl)) {
  const filePath = `gate-passes/${visitId}.png`;
  gatePassUrl = await this.gcpStorageService.generateSignedUrl(
    filePath,
    7 * 24 * 60 * 60 * 1000
  );
  await this.prisma.visit.update({
    where: { id: visitId },
    data: { visitQRCode: gatePassUrl }
  });
}

return { gatePass: { gatePassUrl } };
```

---

## Part 2: GCP Storage Necessity

### 2.1 Comparison of Options

#### Option A: Store in GCP (Current Design)

**Workflow:**
1. Generate gate pass image → Upload to GCP → Store signed URL in DB
2. Send gate pass via WhatsApp (base64 uploaded to Meta)
3. Visitor views gate pass via signed URL from DB

**Pros:**
- **Fast delivery:** Image generated once, stored permanently
- **Instant access:** No generation delay when visitor views gate pass
- **Consistent URL:** Same URL throughout visit lifecycle
- **Reduced compute load:** No regeneration needed
- **Audit trail:** Image stored with timestamp for compliance
- **Backup/record:** Image available even if visit data changes

**Cons:**
- **Storage costs:** ~50-200KB per visit × number of visits
- **Cleanup complexity:** Need to delete old images (data retention policy)
- **URL expiration management:** Need to handle expired signed URLs
- **Stale data:** If visitor details change, stored image is outdated

**Cost Analysis:**

| Metric | Estimate | Notes |
|--------|----------|-------|
| Image size | 100KB average | 400x600px PNG |
| Storage cost | $0.020/GB/month | GCP Standard Storage |
| Monthly visits (estimate) | 1,000 | Conservative estimate |
| Monthly storage | 100KB × 1,000 = 100MB | ~$0.002/month |
| **Annual storage cost** | **~$0.024** | Negligible |

**Conclusion on Storage Cost:** Storage cost is **negligible** ($0.024/year for 1,000 visits). This should NOT be a decision factor.

#### Option B: Regenerate On Demand

**Workflow:**
1. Generate gate pass image → Send via WhatsApp (upload to Meta)
2. Do NOT store in GCP
3. When visitor requests gate pass → Regenerate image → Stream directly

**Pros:**
- **Zero storage costs:** No files in GCP
- **Always fresh:** Image always reflects latest visitor data
- **No cleanup needed:** No old files to delete
- **No URL expiration:** New URL each time (or stream directly)
- **Simpler data model:** No visitQRCode field to manage

**Cons:**
- **Increased compute load:** Regeneration for every access
- **Slower response:** 200-500ms generation time per access
- **WhatsApp delivery delay:** Must regenerate before sending
- **Potential UX issues:** Visitor may wait for image generation
- **No audit trail:** Cannot prove what was sent
- **Inconsistent images:** Image may change if visitor data is updated

**Performance Analysis:**

| Operation | Time Estimate | Notes |
|-----------|---------------|-------|
| Image generation (Canvas) | 50-150ms | Depends on image complexity |
| Photo download from GCP | 50-200ms | For visitor photo |
| Image rendering | 20-50ms | Canvas operations |
| Total generation time | **120-400ms** | Per request |

**Scalability Concerns:**

- **Low traffic (≤10 visits/hour):** Regeneration is acceptable
- **Medium traffic (≤100 visits/hour):** Compute starts to add up
- **High traffic (>100 visits/hour):** Regeneration becomes bottleneck

**User Experience Impact:**

| Scenario | With Storage | Without Storage |
|----------|--------------|-----------------|
| Visitor views gate pass immediately after approval | ~50ms (signed URL) | ~400ms (regenerate) |
| Visitor views gate pass hours later | ~50ms (signed URL) | ~400ms (regenerate) |
| Visitor reloads gate pass | ~50ms (signed URL) | ~400ms (regenerate) |

**Conclusion:** Regeneration adds ~350ms latency per access. This is noticeable but acceptable for many use cases.

#### Option C: Hybrid Approach (Recommended)

**Workflow:**
1. Generate gate pass image → Upload to GCP with short-lived signed URL (24-48 hours)
2. Send gate pass via WhatsApp
3. Visitor views gate pass via signed URL
4. If URL expires, regenerate on demand and re-upload

**Pros:**
- **Best of both worlds:** Fast initial access, fresh data on regeneration
- **Automatic cleanup:** Old URLs expire naturally
- **Reduced storage costs:** Short-lived files can be deleted with TTL
- **Flexibility:** Can adjust TTL based on needs

**Cons:**
- **More complex logic:** Need to handle expiration and regeneration
- **Potential for stale data:** If visitor details change within TTL window
- **Additional state:** Need to track last generation time

**TTL Recommendations:**

| Use Case | Recommended TTL | Rationale |
|----------|----------------|-----------|
| Gate pass image | **48 hours** | Covers Check-In OTP (8 hours) + buffer + overnight visits |
| GCP object lifecycle rule | **72 hours** | Grace period after URL expires |

**Implementation:**

```typescript
// GCP lifecycle rule: Delete files after 3 days
const lifecycleRule = {
  lifecycle: {
    rule: [{
      action: { type: 'Delete' },
      condition: { age: 3 } // Days
    }]
  }
};

// On gate pass request:
if (this.isSignedUrlExpired(visit.visitQRCode)) {
  // Regenerate and re-upload
  const { imageUrl: newImageBase64 } = await this.generateGatePassImage(visitId);
  const { publicUrl: newUrl } = await this.uploadGatePassToGcp(visitId, newImageBase64);
  return newUrl;
}
return visit.visitQRCode;
```

---

### 2.2 Performance vs. Cost Trade-offs

| Metric | Store (A) | Regenerate (B) | Hybrid (C) |
|--------|------------|----------------|-------------|
| **Initial generation cost** | One-time | Per WhatsApp send | One-time |
| **Visitor view cost** | Zero | Per view | Per expired view |
| **Storage cost** | $0.024/year (1K visits) | $0 | $0.008/year (1K visits, 3-day TTL) |
| **Compute cost (1K visits)** | $0.001 (generation only) | $0.004 (generation × 4) | $0.002 (regen × 2) |
| **Latency (visitor view)** | ~50ms | ~400ms | ~50ms (usually) |
| **Latency (WhatsApp delivery)** | ~50ms | ~400ms | ~50ms |
| **Data freshness** | May be stale | Always fresh | Fresh after expiry |
| **Auditability** | High (timestamp) | None | Medium |
| **Implementation complexity** | Medium | Low | High |

**Annual Cost Comparison (1,000 visits):**

| Approach | Storage | Compute | Total |
|----------|----------|---------|-------|
| A: Store | $0.024 | $0.001 | **$0.025** |
| B: Regenerate | $0 | $0.004 | **$0.004** |
| C: Hybrid | $0.008 | $0.002 | **$0.010** |

**Conclusion:** All costs are **negligible** ($0.004 - $0.025 per year for 1,000 visits). Cost should NOT be the deciding factor. User experience and simplicity should drive the decision.

---

### 2.3 User Experience Analysis

#### Visitor Journey Flow:

```
1. Visitor registers visit → Request submitted
2. Security approves visit → Gate pass generated & sent via WhatsApp
3. Visitor receives WhatsApp → Can tap to view gate pass
4. Visitor arrives at gate → Shows gate pass or Check-In OTP
5. Security verifies OTP → Visitor checked in
```

#### Analysis by Approach:

**Storage Approach (A):**

| Step | Experience | Notes |
|------|------------|-------|
| 2. Approval | Fast (~50ms) | Image generated once |
| 3. WhatsApp delivery | Fast | Image already generated |
| 4. View gate pass | Instant (~50ms) | Signed URL from GCP edge |
| 5. Security check | Instant | OTP displayed in image |

**Regenerate Approach (B):**

| Step | Experience | Notes |
|------|------------|-------|
| 2. Approval | Slower (~400ms) | Image regenerated for WhatsApp |
| 3. WhatsApp delivery | Slower | Waiting for generation |
| 4. View gate pass | Slower (~400ms) | Regeneration delay |
| 5. Security check | Slower | Same as view |

**Hybrid Approach (C):**

| Step | Experience | Notes |
|------|------------|-------|
| 2. Approval | Fast (~50ms) | Image generated once |
| 3. WhatsApp delivery | Fast | Image already generated |
| 4. View gate pass (initial) | Fast (~50ms) | Signed URL |
| 4. View gate pass (after expiry) | Slower (~400ms) | Regeneration |
| 5. Security check | Fast | Usually cached |

**UX Verdict:** Storage approach (A) provides the smoothest experience. Hybrid (C) is close. Regenerate (B) adds noticeable delays.

---

### 2.4 WhatsApp Delivery Considerations

**Critical Discovery:** WhatsAppService does NOT use GCP URLs.

**Current WhatsApp Service Behavior:**

```typescript
async sendGatePass(
  to: string,
  branchName: string,
  gatePassBase64: string  // ← Expects base64, not URL
): Promise<boolean> {
  const imageBuffer = Buffer.from(base64Data, 'base64');
  const mediaId = await this.uploadMedia(imageBuffer);  // Uploads to Meta
  return this.sendTemplateMessage(phone, branchName, mediaId);
}
```

**Implication:** GCP storage is NOT needed for WhatsApp delivery. The image is uploaded directly to Meta's servers from the base64 buffer.

**Decision Point:** If we don't store in GCP at all, we can:
- Generate image once
- Send via WhatsApp (upload to Meta)
- Discard image (don't store in GCP)
- Regenerate when visitor views gate pass (if needed)

**But this changes the user experience:**
- WhatsApp delivery is slower (need to generate before sending)
- Visitor viewing is slower (need to regenerate)

---

### 2.5 Recommendation for Question 2

**Primary Recommendation: Option A (Store in GCP with Signed URLs)**

**Rationale:**

1. **User Experience:**
   - Fastest delivery (~50ms vs. ~400ms)
   - Instant viewing (~50ms vs. ~400ms)
   - No waiting for image generation

2. **Cost is Negligible:**
   - $0.024/year for 1,000 visits
   - Not a meaningful expense

3. **Audit & Compliance:**
   - Timestamped image record
   - Proves what was sent to visitor
   - Useful for security audits

4. **Implementation Simplicity:**
   - Generate once, store once
   - Simple lifecycle: generate → store → delete (after retention period)
   - No complex regeneration logic

5. **Scalability:**
   - Low compute load (one generation per visit)
   - GCP handles serving efficiently
   - CDN caching at edge locations

6. **Edge Case Handling:**
   - Visitor can view gate pass multiple times without regeneration
   - Offline capability (if URL is cached)
   - Sharing capability (visitor can share URL with security)

**Alternative: Option C (Hybrid) - If Storage Policy Requires It**

**Use case:** If the organization has strict policies against long-term image storage or GDPR concerns about storing visitor photos.

**Implementation:**
- Store for 48-72 hours (matches typical visit window)
- Auto-delete after TTL using GCP lifecycle rules
- Regenerate if visitor needs gate pass after expiry

**Recommendation:** Only choose hybrid if storage policy demands it. UX is slightly worse than Option A.

---

## Part 3: Combined Recommendation

### 3.1 Optimal Architecture (Recommended)

**Combining Answers to Both Questions:**

**1. GCP Storage Strategy:**
- Use **Signed URLs with 7-day expiration**
- Store gate pass images in GCP (Option A)
- Implement URL regeneration on expiration

**2. Storage Approach:**
- Store images in GCP (Option A)
- Use 7-day signed URLs (covers Check-In OTP + buffer)
- Implement lifecycle rule to delete after 30 days (retention policy)

**3. WhatsApp Integration:**
- **Critical Fix:** Update task 8.3 spec to reflect actual WhatsApp service behavior
- Use base64 image for WhatsApp delivery (NOT GCP URL)
- Use GCP storage as backup/record only

### 3.2 Corrected Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                     Visit Approval Flow                     │
└─────────────────────────────────────────────────────────────┘

Security approves visit
    │
    ▼
┌─────────────────────────────────────────┐
│  1. Generate Check-In OTP (Task 1.5)  │
│     - 6-digit OTP                      │
│     - 8-hour expiry                    │
└─────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────┐
│  2. Generate Gate Pass Image (8.1)    │
│     - Canvas rendering                 │
│     - Returns base64 PNG              │
│     - ~50-150ms                      │
└─────────────────────────────────────────┘
    │
    ├─────────────────────┬─────────────────────┐
    │                     │                     │
    ▼                     ▼                     ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│ 3a. Upload to   │  │ 3b. Send via    │  │ 3c. Update DB   │
│    GCP (8.2)    │  │    WhatsApp     │  │    (8.2)        │
│                 │  │    (8.3)        │  │                 │
│ - Store image   │  │ - Upload base64 │  │ - Store signed  │
│ - Generate      │  │   to Meta       │  │   URL (7 days)  │
│   signed URL    │  │ - Send template │  │ - Timestamp     │
│   (7 days)      │  │                 │  │                 │
└─────────────────┘  └─────────────────┘  └─────────────────┘
    │                     │                     │
    └─────────────────────┴─────────────────────┘
                          │
                          ▼
               ┌─────────────────────────┐
               │  APPROVAL COMPLETE     │
               │  - OTP generated      │
               │  - WhatsApp sent      │
               │  - Image stored       │
               └─────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                 Visitor Viewing Flow                        │
└─────────────────────────────────────────────────────────────┘

Visitor views gate pass
    │
    ▼
┌─────────────────────────────────────────┐
│  GET /public/visits/:id/gate-pass    │
│     (Task 8.4)                        │
└─────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────┐
│  Check: Is signed URL expired?         │
└─────────────────────────────────────────┘
    │
    ├───────────────┬───────────────────┤
    │ No (valid)    │ Yes (expired)     │
    ▼               ▼
┌───────────────┐ ┌───────────────────┐
│ Return signed  │ │ Regenerate URL    │
│ URL directly   │ │ - Generate new   │
│ (~50ms)       │ │   signed URL     │
│               │ │ - Update DB      │
│               │ │ - Return new URL │
│               │ │ (~400ms total)   │
└───────────────┘ └───────────────────┘
```

### 3.3 Database Schema Impact

**Current Schema (from FEATURE-ARCHITECTURE.md):**

```prisma
model Visit {
  // ... existing fields

  checkInOtp              String?
  checkInOtpExpiry        DateTime?

  // Gate Pass Image Tracking
  gatePassGeneratedAt     DateTime?
  gatePassSentViaWhatsApp Boolean @default(false)

  // Note: 'visitQRCode' stores the Gate Pass URL (or base64)
}
```

**Required Changes:**

| Field | Current | Recommended | Notes |
|-------|---------|-------------|-------|
| `visitQRCode` | Stores base64 or URL | Store **signed URL** | Consistent storage |
| `gatePassUrlExpiry` | Not present | **ADD** | Track URL expiration |
| `gatePassGeneratedAt` | DateTime? | DateTime? | Keep (audit trail) |
| `gatePassSentViaWhatsApp` | Boolean | Boolean | Keep (audit trail) |

**New Field Definition:**

```prisma
model Visit {
  // ... existing fields

  checkInOtp              String?
  checkInOtpExpiry        DateTime?

  // Gate Pass Image Tracking
  gatePassGeneratedAt     DateTime?
  gatePassSentViaWhatsApp Boolean      @default(false)
  gatePassUrlExpiry       DateTime?    // NEW: Track signed URL expiry

  // Stores signed GCP URL (7-day expiry)
  visitQRCode             String?      // Changed: Always URL, never base64
}
```

### 3.4 Spec Changes Required

#### Task 8.1 (Gate Pass Image Generation)

**No changes needed.** This task only generates the base64 image. Storage decisions are handled in 8.2.

#### Task 8.2 (Gate Pass Upload to GCP)

**Critical Changes:**

| Section | Current | Changed To |
|---------|----------|------------|
| Output URL type | Public URL | Signed URL (7 days) |
| `visitQRCode` field | Public GCP URL | Signed GCP URL |
| Expiration | Not specified | 7 days |
| `makePublic()` logic | Yes (try, then fallback) | Remove (use signed URL only) |
| Fallback strategy | Public URL format (broken) | Graceful error + regeneration |

**New Field Added:**
- `gatePassUrlExpiry`: DateTime field to track when signed URL expires

**Acceptance Criteria Updates:**
- [ ] Generates signed URL with 7-day expiry (not public URL)
- [ ] Stores signed URL in `visitQRCode` field
- [ ] Stores expiry timestamp in `gatePassUrlExpiry` field
- [ ] Retries upload up to 3 times on network errors
- [ ] Falls back to custom endpoint if GCP fails completely
- [ ] Updates database with both URL and expiry

#### Task 8.3 (WhatsApp Integration)

**CRITICAL CORRECTION:**

| Section | Current (WRONG) | Corrected |
|---------|-----------------|-----------|
| Input parameter | `gcpImageUrl: string` | `gatePassBase64: string` |
| Data passed to WhatsApp | GCP URL (incorrect) | Base64 image buffer (correct) |
| Dependency on task 8.2 | Uses GCP URL | Independent of task 8.2 |
| `prepareWhatsAppDeliveryContext` | Fetches `visitQRCode` | Fetches visitor data for context only |

**New Function Signature:**

```typescript
async sendGatePassViaWhatsApp(
  visitId: string,
  gatePassBase64: string  // ← Changed from gcpImageUrl
): Promise<WhatsAppDeliveryResponse>
```

**Workflow Change:**

```typescript
// OLD (incorrect):
await this.gatePassService.sendGatePassViaWhatsApp(visitId, gcpResponse.publicUrl);

// NEW (correct):
await this.gatePassService.sendGatePassViaWhatsApp(visitId, imageBase64);
```

**Acceptance Criteria Updates:**
- [ ] Accepts `gatePassBase64` parameter (not `gcpImageUrl`)
- [ ] Passes base64 to `WhatsAppService.sendGatePass()`
- [ ] Updates `gatePassSentViaWhatsApp` flag based on delivery status
- [ ] Never throws for WhatsApp failures
- [ ] Works independently of GCP upload status

#### Task 8.4 (Public Endpoint)

**Required Changes:**

| Section | Current | Changed To |
|---------|----------|------------|
| URL handling | Assumes public URL works | Handles expired signed URLs |
| Regeneration logic | Not present | Add regeneration on expiry |
| Response data | Returns `gatePassUrl` | Returns valid (possibly regenerated) URL |
| Expiry check | Not present | Compare `gatePassUrlExpiry` with current time |

**New Logic Added:**

```typescript
async getGatePassPublic(visitId: string): Promise<GatePassResponse> {
  // ... existing validation ...

  // Check if URL is expired
  const now = new Date();
  let gatePassUrl = visit.visitQRCode;

  if (visit.gatePassUrlExpiry && visit.gatePassUrlExpiry < now) {
    // URL expired, regenerate
    const { imageUrl: newImageBase64 } = await this.generateGatePassImage(visitId);
    const { publicUrl: newUrl } = await this.uploadGatePassToGcp(visitId, newImageBase64);
    gatePassUrl = newUrl;
  }

  // ... return response ...
}
```

**Acceptance Criteria Updates:**
- [ ] Returns valid signed URL (not expired)
- [ ] Regenerates URL if `gatePassUrlExpiry` < current time
- [ ] Updates database with new URL and expiry when regenerating
- [ ] Handles GCP generation failures gracefully
- [ ] Logs regeneration attempts for monitoring

---

## Part 4: Security & Privacy Considerations

### 4.1 Signed URL Security

**Why 7 Days?**

| Factor | Consideration |
|--------|---------------|
| Check-In OTP expiry | 8 hours |
| Typical visit duration | 1-4 hours |
| Overnight visits | Up to 12 hours |
| Visitor scheduling buffer | +24 hours |
| **Recommended TTL** | **7 days (168 hours)** |

**Security Trade-offs:**

| TTL | Security Risk | UX Impact |
|-----|---------------|-----------|
| 1 hour | Low (tight window) | Poor (frequent regen) |
| 8 hours | Medium (matches OTP) | Acceptable |
| 24 hours | Medium-High | Good |
| **7 days** | **Medium** | **Best** |
| 30 days | High | Best |

**Recommendation:** 7 days provides excellent UX with acceptable security. The risk is mitigated by:
- UUID-based visit ID (not enumerable)
- Only visitor with WhatsApp access gets URL
- OTP still expires in 8 hours (time-limited entry)
- Physical verification required at gate

### 4.2 Access Logging

**Recommended Logging:**

| Event | Log Level | Details |
|-------|-----------|---------|
| Image generated | INFO | visitId, timestamp |
| GCP upload | INFO | visitId, file size |
| Signed URL generated | INFO | visitId, expiry time |
| URL regenerated (expired) | WARN | visitId, time since expiry |
| WhatsApp delivery | INFO | visitId, phone (masked), success |
| Gate pass accessed (public endpoint) | INFO | visitId, IP address, timestamp |
| Failed access (invalid UUID) | WARN | IP address, attempted UUID |
| Failed access (not approved) | INFO | visitId, current status |

**Security Audit Trail:**
All gate pass views are logged with IP and timestamp. This helps detect:
- Suspicious access patterns
- Brute force attempts on UUIDs
- Compliance requirements

### 4.3 Privacy Considerations

**Data Exposed in Gate Pass:**

| Data | Exposure | Acceptable? |
|------|----------|-------------|
| Visitor name | Visible in image | Yes (access document) |
| Visitor phone | Masked in endpoint, visible in image | Yes (necessary for verification) |
| Check-In OTP | Visible in image | Yes (intended) |
| Visit details (host, dept, etc.) | Visible in image | Yes (context for security) |
| Visitor photo | Visible in image | Yes (identity verification) |

**Data NOT Exposed:**

- Government ID (never in image)
- Email address (never in image)
- Home address (never in image)
- Office ID (never in image)
- Visitor ID (not included)

**GDPR Considerations:**
- Gate pass contains personal data (name, phone, photo)
- Stored for 30 days (retention policy)
- Access is logged for audit
- Visitor can request deletion (via support)

---

## Part 5: Implementation Recommendations

### 5.1 Phased Implementation

**Phase 1: Core Storage (Tasks 8.1, 8.2)**
1. Implement gate pass image generation (task 8.1)
2. Implement GCP upload with signed URLs (task 8.2 modified)
3. Add `gatePassUrlExpiry` field to schema
4. Test signed URL generation and validation

**Phase 2: WhatsApp Integration (Task 8.3 modified)**
1. Correct spec to use base64 instead of GCP URL
2. Implement WhatsApp delivery (uses existing service)
3. Test delivery flow
4. Verify no dependency on GCP upload status

**Phase 3: Public Endpoint (Task 8.4 modified)**
1. Implement URL expiration checking
2. Add regeneration logic for expired URLs
3. Test happy path (valid URL)
4. Test expired URL path (regeneration)

**Phase 4: Testing & Polish**
1. E2E tests for full flow
2. Load testing (concurrent approvals)
3. Edge case testing (expired URLs, network failures)
4. Documentation updates

### 5.2 Risk Mitigation

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| GCP service unavailable | Low | High | Regenerate on demand, stream directly |
| Signed URL generation fails | Low | Medium | Fallback to custom endpoint |
| WhatsApp delivery fails | Medium | Low | Log error, continue approval |
| URL expires during visitor access | Medium | Low | Auto-regenerate on access |
| Storage costs increase over time | Low | Low | Implement lifecycle rules for auto-delete |

### 5.3 Monitoring & Alerts

**Metrics to Track:**

| Metric | Threshold | Alert |
|--------|-----------|-------|
| Gate pass generation time | >500ms | Warning |
| GCP upload failures | >5% | Alert |
| WhatsApp delivery failures | >10% | Warning |
| URL regeneration rate | >20% of accesses | Info (may need longer TTL) |
| Public endpoint errors (4xx/5xx) | >1% | Alert |
| Storage usage growth | >10GB/month | Info (review retention policy) |

---

## Part 6: Summary of Recommendations

### 6.1 Question 1: GCP Bucket Access

**Answer:** Use **Google Cloud Signed URLs with 7-day expiration**

**Key Points:**
- Native GCP feature, secure and efficient
- ~50ms latency (vs. ~400ms for custom endpoint)
- No server compute overhead for image access
- Cryptographically secure with time-limited access
- Implement URL regeneration on expiration

### 6.2 Question 2: GCP Storage Necessity

**Answer:** **Store in GCP** (Option A)

**Key Points:**
- Fastest user experience (~50ms vs. ~400ms)
- Negligible cost ($0.024/year for 1,000 visits)
- Audit trail for compliance
- Simplifies implementation
- Scalable approach

### 6.3 Critical Spec Correction

**Task 8.3 WhatsApp Integration:**

**Current Spec (INCORRECT):**
- Assumes we pass GCP URL to WhatsApp service
- The WhatsApp service doesn't support URLs!

**Corrected Spec:**
- Pass base64 image buffer to WhatsApp service
- WhatsApp service uploads image to Meta's servers
- GCP storage is for backup/audit only

### 6.4 Spec Changes Summary

| Task | Change Type | Description |
|------|-------------|-------------|
| 8.1 | None | No changes needed |
| 8.2 | Major | Use signed URLs (7 days), add `gatePassUrlExpiry` field, remove `makePublic()` logic |
| 8.3 | **Critical** | Change input from `gcpImageUrl` to `gatePassBase64`, update workflow |
| 8.4 | Moderate | Add URL expiration check, implement regeneration logic |
| Schema | Minor | Add `gatePassUrlExpiry` DateTime field |

### 6.5 Next Steps

1. **Review this analysis** with technical lead and product owner
2. **Decide on:** Signed URL approach + Storage approach (or alternatives)
3. **Update specs** for tasks 8.2, 8.3, 8.4 based on decisions
4. **Update database schema** with `gatePassUrlExpiry` field
5. **Implement** following the phased approach (Phase 1-4)
6. **Test** thoroughly before deployment

---

## Appendix A: Cost Analysis Details

### A.1 GCP Storage Costs

**Pricing (Standard Storage, us-central1):**
- $0.020 per GB/month
- $0.05 per 10,000 Class A operations (upload)
- $0.004 per 10,000 Class B operations (download)

**Gate Pass Image:**
- Size: ~100KB average (400x600px PNG)
- Visits per year: ~1,000 (conservative estimate)
- Total storage: 100KB × 1,000 = 100MB = 0.1 GB

**Annual Cost:**
- Storage: 0.1 GB × $0.020 = **$0.002**
- Upload operations: 1,000 uploads = 0.1 × 10,000 ops
  - Cost: 0.1 × $0.05 = **$0.005**
- Download operations (estimated 5,000 views): 5,000 downloads = 0.5 × 10,000 ops
  - Cost: 0.5 × $0.004 = **$0.002**

**Total Annual Cost:** **$0.009**

**Conclusion:** Storage cost is negligible (< $0.01/year for 1,000 visits).

### A.2 Compute Costs (Regeneration)

**Node.js Compute (Cloud Run):**

| Operation | Time | vCPU-seconds | Cost |
|-----------|-------|--------------|------|
| Image generation | 0.2s avg | 0.000056 vCPU-hrs | $0.000003 |
| Regeneration (×5 accesses) | 1.0s total | 0.000278 vCPU-hrs | $0.000014 |

**Annual Cost (1,000 visits × 5 accesses):**
- Compute: 1,000 × 5 × 0.000278 = 1.39 vCPU-hours
- Cost: 1.39 × $0.05/vCPU-hr = **$0.070**

**Comparison:**

| Approach | Annual Cost | Difference |
|----------|--------------|-------------|
| Store (no regeneration) | $0.009 | Baseline |
| Regenerate (5× per visit) | $0.070 | +$0.061 |
| Hybrid (1× regeneration) | $0.018 | +$0.009 |

**Conclusion:** Compute cost for regeneration is still negligible (< $0.10/year for 1,000 visits). However, it's 7-8x higher than storage.

---

## Appendix B: Performance Benchmark Estimates

### B.1 Image Generation Performance

**Test Environment:**
- Node.js v20
- Canvas (node-canvas)
- 400x600px image
- No visitor photo (initials only)

**Results (estimated):**

| Operation | Time | Notes |
|-----------|-------|-------|
| Canvas creation | 5ms | createCanvas() |
| Background draw | 2ms | fillRect() |
| Avatar (initials) | 8ms | arc(), fillText() |
| Text rendering | 15ms | 4 text fields |
| Image export (PNG) | 20ms | toDataURL() |
| **Total** | **~50ms** | Best case |

**With Visitor Photo:**

| Operation | Time | Notes |
|-----------|-------|-------|
| Canvas creation | 5ms | createCanvas() |
| Photo download | 50-150ms | From GCP |
| Photo processing | 10ms | Circular mask, border |
| Text rendering | 15ms | 4 text fields |
| Image export (PNG) | 20ms | toDataURL() |
| **Total** | **100-200ms** | Typical case |

### B.2 GCP Operations Performance

**Test Environment:**
- GCP Storage bucket (us-central1)
- 100KB file size
- Network: AWS (us-east-1) to GCP (us-central1)

| Operation | Time | Notes |
|-----------|-------|-------|
| Signed URL generation | 10-20ms | API call |
| Upload (gzip) | 50-100ms | 100KB payload |
| Download | 30-80ms | Edge caching |
| makePublic() | 50-150ms | ACL update |

### B.3 End-to-End Latency Comparison

**Visitor Views Gate Pass:**

| Approach | Latency | Breakdown |
|----------|----------|-----------|
| Store (signed URL) | ~50ms | GCP edge cache hit |
| Store (signed URL, miss) | ~200ms | GCP fetch + edge caching |
| Regenerate (no photo) | ~50ms | Canvas only |
| Regenerate (with photo) | ~150-200ms | Canvas + GCP photo fetch |
| Custom endpoint proxy | ~300-500ms | Backend + GCP fetch + streaming |

---

## Appendix C: Migration Plan

### C.1 Database Migration

**Add `gatePassUrlExpiry` field:**

```prisma
// Migration SQL
ALTER TABLE "Visit" ADD COLUMN "gatePassUrlExpiry" TIMESTAMP(3);
```

**Existing Data:**
- Old `visitQRCode` values (base64) remain as-is
- New gate passes will use signed URLs
- `gatePassUrlExpiry` will be null for old gate passes (acceptable)

### C.2 Backward Compatibility

**Handling Old Gate Passes (Base64):**

```typescript
async getGatePassPublic(visitId: string): Promise<GatePassResponse> {
  const visit = await this.prisma.visit.findUnique(...);

  let gatePassUrl = visit.visitQRCode;

  // Check if old format (base64)
  if (visit.visitQRCode?.startsWith('data:image/png;base64,')) {
    // Old base64 format - return directly
    return { gatePassUrl };
  }

  // New format (signed URL)
  if (visit.gatePassUrlExpiry && visit.gatePassUrlExpiry < new Date()) {
    // Expired - regenerate
    // ...
  }

  return { gatePassUrl };
}
```

**Migration Strategy:**
- No forced migration of old gate passes
- New gate passes use signed URLs
- Old gate passes continue to work (base64 returned directly)
- Gradual migration as visits are approved

---

**End of Analysis Document**
