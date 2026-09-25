# Technical Specification: Rate Limiting Middleware for Public OTP Endpoints

> **Task ID:** 2.5
> **Increment:** 2 - Public API Layer
> **Status:** Approved
> **Created:** 2026-01-23

---

## 1. Overview

This specification defines rate limiting middleware (or guard) that protects public OTP endpoints from abuse. The middleware enforces a limit of 3 requests per IP address per hour for `POST /public/visitors/send-otp` endpoint, preventing SMS spam and protecting against brute force attacks.

Rate limiting is applied **before** any expensive operations (database queries, SMS sending), ensuring that malicious requests are rejected early in request lifecycle.

### Key Features
- **IP-Based Limiting:** Limits requests based on client IP address
- **Configurable:** Rate limit parameters configurable via environment variables
- **Proxy-Friendly:** Extracts IP from `X-Forwarded-For` header when behind reverse proxy
- **Standard Response:** Returns HTTP 429 with `Retry-After` header
- **Storage:** Supports in-memory storage (MVP) with Redis option for scaling
- **Early Rejection:** Applied before controller logic executes

### Dependencies
- Task 2.1: `POST /public/visitors/send-otp` endpoint (protected endpoint)
- NestJS: `@nestjs/throttler` (recommended) or custom middleware implementation

---

## 2. File Path

**New Middleware/Guard:**
```
backend/src/visitors/guards/public-otp-rate-limit.guard.ts
```

**OR Custom Middleware:**
```
backend/src/visitors/middleware/rate-limit.middleware.ts
```

**Module Update:**
```
backend/src/visitors/visitors.module.ts
```

**Controller Usage:**
```
backend/src/visitors/public-controller/public-visitors.controller.ts
```

---

## 3. Data Models

### 3.1 Configuration Interface

```typescript
/**
 * Configuration for OTP rate limiting
 */
export interface OtpRateLimitConfig {
  /** Maximum number of requests allowed per IP per window */
  limit: number;

  /** Time window in seconds */
  ttl: number;

  /** Storage backend: 'memory' or 'redis' */
  storage: 'memory' | 'redis';

  /** Redis connection URL (required if storage='redis') */
  redisUrl?: string;

  /** Headers to trust for IP extraction (proxy scenarios) */
  trustedHeaders: string[];

  /** Whether to skip rate limiting in TEST_MODE */
  skipInTestMode: boolean;
}
```

### 3.2 Rate Limit Record (In-Memory)

```typescript
/**
 * In-memory storage record for rate limiting
 */
export interface RateLimitRecord {
  /** Number of requests made in current window */
  count: number;

  /** Timestamp of first request in current window (milliseconds since epoch) */
  windowStart: number;

  /** Timestamp of last request (for debugging) */
  lastRequest: number;
}
```

### 3.3 Error Response DTO

```typescript
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Response when rate limit is exceeded
 */
export class RateLimitExceededDto {
  @ApiProperty({
    description: 'HTTP status code',
    example: 429,
  })
  statusCode: number;

  @ApiProperty({
    description: 'Error message',
    example: 'Too many requests. Please try again in 30 minutes.',
  })
  message: string;

  @ApiProperty({
    description: 'Error type',
    example: 'Too Many Requests',
  })
  error: string;

  @ApiPropertyOptional({
    description: 'Seconds until next allowed request',
    example: 1800,
  })
  retryAfter?: number;
}
```

### 3.4 Error Response Interface

```typescript
/**
 * Standard error response structure for rate limiting
 */
export interface RateLimitErrorResponse {
  statusCode: 429;
  message: string;
  error: 'Too Many Requests';
  retryAfter?: number; // Included in body for convenience (also in header)
}
```

---

## 4. Configuration

### 4.1 Environment Variables

Add to `backend/.env.example`:

```bash
# Rate Limiting Configuration
# Maximum OTP requests per IP per hour
RATE_LIMIT_SMS_PER_HOUR=3

# Rate limiting storage: 'memory' or 'redis'
RATE_LIMIT_STORAGE=memory

# Redis connection URL (required if RATE_LIMIT_STORAGE=redis)
# RATE_LIMIT_REDIS_URL=redis://localhost:6379

# Skip rate limiting in TEST_MODE
RATE_LIMIT_SKIP_IN_TEST_MODE=true
```

### 4.2 Default Configuration

```typescript
export const DEFAULT_OTP_RATE_LIMIT_CONFIG: OtpRateLimitConfig = {
  limit: parseInt(process.env.RATE_LIMIT_SMS_PER_HOUR || '3', 10),
  ttl: 3600, // 1 hour in seconds
  storage: (process.env.RATE_LIMIT_STORAGE as 'memory' | 'redis') || 'memory',
  redisUrl: process.env.RATE_LIMIT_REDIS_URL,
  trustedHeaders: ['x-forwarded-for', 'x-real-ip'],
  skipInTestMode: process.env.RATE_LIMIT_SKIP_IN_TEST_MODE === 'true',
};
```

### 4.3 Storage Options

| Storage Type | Description | Recommended For | Pros | Cons |
|--------------|-------------|------------------|------|------|
| **In-Memory (Map)** | Simple JavaScript Map to store request counts | Development, single-instance MVP | Fast, simple, no dependencies | Not distributed, memory leaks without cleanup, data lost on restart |
| **Redis** | Distributed in-memory data store with TTL | Production, multi-instance deployments | Distributed, atomic operations, built-in TTL, data persists across restarts | Requires Redis infrastructure, additional dependency |

---

## 5. Implementation Options

### 5.1 Option A: Custom Guard (Recommended)

Using a custom NestJS Guard provides fine-grained control and easy integration with existing patterns.

**File:** `backend/src/visitors/guards/public-otp-rate-limit.guard.ts`

```typescript
import {
  CanActivate,
  ExecutionContext,
  Injectable,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';

// In-memory storage (Map<string, RateLimitRecord>)
const rateLimitStore = new Map<string, RateLimitRecord>();

@Injectable()
export class PublicOtpRateLimitGuard implements CanActivate {
  private readonly config: OtpRateLimitConfig;

  constructor(
    private readonly configService: ConfigService,
    private readonly reflector: Reflector,
  ) {
    this.config = {
      limit: this.configService.get<number>('RATE_LIMIT_SMS_PER_HOUR', 3),
      ttl: 3600, // 1 hour in seconds
      storage: this.configService.get<'memory' | 'redis'>('RATE_LIMIT_STORAGE', 'memory'),
      redisUrl: this.configService.get<string>('RATE_LIMIT_REDIS_URL'),
      trustedHeaders: ['x-forwarded-for', 'x-real-ip'],
      skipInTestMode: this.configService.get<boolean>('RATE_LIMIT_SKIP_IN_TEST_MODE', true),
    };
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Skip rate limiting if configured to do so in TEST_MODE
    if (this.config.skipInTestMode && process.env.TEST_MODE === 'true') {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const clientIp = this.extractClientIp(request);

    // Check rate limit
    const result = await this.checkRateLimit(clientIp);

    if (result.exceeded) {
      // Set Retry-After header
      const response = context.switchToHttp().getResponse();
      response.setHeader('Retry-After', result.retryAfter);

      // Throw 429 error
      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          message: `Too many requests. Please try again in ${Math.ceil(result.retryAfter / 60)} minutes.`,
          error: 'Too Many Requests',
          retryAfter: result.retryAfter,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    return true;
  }

  /**
   * Extract client IP address from request, accounting for proxy headers
   */
  private extractClientIp(request: Request): string {
    // Check trusted headers in order
    for (const header of this.config.trustedHeaders) {
      const forwardedIps = request.headers[header];
      if (typeof forwardedIps === 'string') {
        // X-Forwarded-For may contain multiple IPs: "client, proxy1, proxy2"
        // The leftmost IP is original client
        return forwardedIps.split(',')[0].trim();
      }
    }

    // Fallback to direct connection IP
    return request.ip || request.socket.remoteAddress || '0.0.0.0';
  }

  /**
   * Check if IP has exceeded rate limit
   */
  private async checkRateLimit(ip: string): Promise<{
    exceeded: boolean;
    retryAfter?: number;
  }> {
    const now = Date.now();
    const ttlMs = this.config.ttl * 1000;

    // Get or create record
    let record = rateLimitStore.get(ip);

    if (!record) {
      // First request - create new record
      record = {
        count: 1,
        windowStart: now,
        lastRequest: now,
      };
      rateLimitStore.set(ip, record);
      return { exceeded: false };
    }

    // Check if window has expired
    if (now - record.windowStart > ttlMs) {
      // Window expired - reset
      record.count = 1;
      record.windowStart = now;
      record.lastRequest = now;
      return { exceeded: false };
    }

    // Window still active - increment count
    record.count++;
    record.lastRequest = now;

    if (record.count > this.config.limit) {
      // Rate limit exceeded
      const timeElapsed = now - record.windowStart;
      const retryAfter = Math.ceil((ttlMs - timeElapsed) / 1000);
      return { exceeded: true, retryAfter };
    }

    return { exceeded: false };
  }
}
```

### 5.2 Option B: Using @nestjs/throttler (Alternative)

NestJS provides a built-in throttler package that can be customized for our needs.

**Installation:**
```bash
npm install @nestjs/throttler
```

**Configuration:** Add to `backend/src/app.module.ts`:

```typescript
import { ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard } from '@nestjs/throttler';

@Module({
  imports: [
    // ... other imports
    ThrottlerModule.forRoot([
      {
        ttl: 3600000, // 1 hour in milliseconds
        limit: 3,
      },
    ]),
  ],
  providers: [
    // ... other providers
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
```

**Custom Throttler Guard:** `backend/src/visitors/guards/public-otp-throttler.guard.ts`

```typescript
import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { Request } from 'express';

@Injectable()
export class PublicOtpThrottlerGuard extends ThrottlerGuard {
  protected getRequestResponse(context: ExecutionContext) {
    const ctx = GqlExecutionContext.create(context);
    const req = ctx.getContext().req;
    return { req, res: ctx.getContext().res };
  }

  protected getTracker(req: Record<string, any>): string {
    // Extract IP from X-Forwarded-For header if present
    const forwardedIps = req.headers['x-forwarded-for'] as string;
    if (forwardedIps) {
      return forwardedIps.split(',')[0].trim();
    }

    // Fallback to req.ip
    return req.ip || req.socket.remoteAddress || '0.0.0.0';
  }

  protected throwThrottlingException(): void {
    // Calculate retry-after based on window
    const now = Date.now();
    const windowStart = req.__throttlerData?.windowStart || now;
    const ttl = 3600000; // 1 hour
    const retryAfter = Math.ceil((ttl - (now - windowStart)) / 1000);

    const response = this.reflector.get<Response>(RESPONSE_KEY, context);
    response.setHeader('Retry-After', retryAfter);

    throw new HttpException(
      {
        statusCode: 429,
        message: `Too many requests. Please try again in ${Math.ceil(retryAfter / 60)} minutes.`,
        error: 'Too Many Requests',
        retryAfter,
      },
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }
}
```

### 5.3 Option C: Redis Storage (Scaling)

For production deployments with multiple instances, use Redis for distributed rate limiting.

**Installation:**
```bash
npm install ioredis
```

**Redis Implementation:** Extend guard with Redis support:

```typescript
import Redis from 'ioredis';

@Injectable()
export class PublicOtpRateLimitGuard implements CanActivate {
  private redis: Redis | null = null;

  constructor(private readonly configService: ConfigService) {
    if (this.config.storage === 'redis' && this.config.redisUrl) {
      this.redis = new Redis(this.config.redisUrl);
    }
  }

  private async checkRateLimit(ip: string): Promise<{
    exceeded: boolean;
    retryAfter?: number;
  }> {
    if (this.redis) {
      return this.checkRateLimitRedis(ip);
    }
    return this.checkRateLimitMemory(ip);
  }

  private async checkRateLimitRedis(ip: string): Promise<{
    exceeded: boolean;
    retryAfter?: number;
  }> {
    const key = `ratelimit:otp:${ip}`;
    const now = Date.now();
    const ttl = this.config.ttl * 1000;

    // Redis pipeline for atomic operations
    const pipeline = this.redis.pipeline();
    pipeline.zrangebyscore(key, now - ttl, '+inf'); // Get active requests
    pipeline.zremrangebyscore(key, '-inf', now - ttl); // Remove expired
    pipeline.zadd(key, now, `${now}-${Math.random()}`); // Add new request
    pipeline.expire(key, this.config.ttl); // Set expiry
    pipeline.zcard(key); // Count requests

    const results = await pipeline.exec();
    const count = results?.[4][1] as number;

    if (count > this.config.limit) {
      // Get oldest request timestamp for retry-after calculation
      const oldest = await this.redis.zrange(key, 0, 0);
      const oldestTimestamp = parseInt(oldest[0].split('-')[0], 10);
      const retryAfter = Math.ceil((oldestTimestamp + ttl - now) / 1000);
      return { exceeded: true, retryAfter };
    }

    return { exceeded: false };
  }
}
```

---

## 6. Controller Integration

### 6.1 Applying the Guard

**File:** `backend/src/visitors/public-controller/public-visitors.controller.ts`

```typescript
import {
  Controller,
  Post,
  Body,
  UseGuards,
} from '@nestjs/common';
import { PublicOtpRateLimitGuard } from '../guards/public-otp-rate-limit.guard';

@ApiTags('Public Visitor')
@Controller('public/visitors')
export class PublicVisitorsController {
  constructor(
    private readonly visitorsService: VisitorsService,
    private readonly phoneVerificationService: PhoneVerificationService,
  ) {}

  @Public()
  @UseGuards(PublicOtpRateLimitGuard) // Apply rate limiting
  @Post('send-otp')
  @ApiOperation({
    summary: 'Send OTP to visitor phone for verification',
    description:
      'Initiates phone verification by sending a 6-digit OTP via SMS. Rate limited to 3 requests per IP per hour.',
  })
  @ApiResponse({ status: 201, description: 'OTP sent successfully' })
  @ApiResponse({ status: 429, description: 'Rate limit exceeded' })
  async sendOtp(@Body() dto: SendOtpDto): Promise<SendOtpResponseDto> {
    // ... existing implementation
  }

  @Public()
  // Note: verify-phone is NOT rate limited - visitors should be able to retry verification
  @Post('verify-phone')
  @ApiOperation({
    summary: 'Verify phone number with OTP',
  })
  @ApiResponse({ status: 200, description: 'Phone verified successfully' })
  @ApiResponse({ status: 400, description: 'Invalid OTP or expired OTP' })
  @ApiResponse({ status: 404, description: 'Visitor not found' })
  async verifyPhone(@Body() dto: VerifyPhoneDto): Promise<VerifyPhoneResponseDto> {
    // ... existing implementation
  }
}
```

---

## 7. Function Signatures

### 7.1 Guard Interface

```typescript
export interface IOtpRateLimitGuard {
  /**
   * Main guard method - called by NestJS before controller
   * @param context Execution context containing request/response
   * @returns true if request should proceed, throws HttpException otherwise
   */
  canActivate(context: ExecutionContext): Promise<boolean>;

  /**
   * Extract client IP from request headers
   * @param request Express request object
   * @returns IP address string
   */
  extractClientIp(request: Request): string;

  /**
   * Check if IP has exceeded rate limit
   * @param ip Client IP address
   * @returns Object indicating if limit exceeded and retry time
   */
  checkRateLimit(ip: string): Promise<{
    exceeded: boolean;
    retryAfter?: number;
  }>;
}
```

### 7.2 Helper Functions

```typescript
/**
 * Normalize IP address (remove IPv6 prefix, handle localhost)
 */
export function normalizeIp(ip: string): string {
  if (ip === '::1' || ip === '127.0.0.1') {
    return '127.0.0.1';
  }
  // Remove IPv6 prefix if present
  if (ip.startsWith('::ffff:')) {
    return ip.substring(7);
  }
  return ip;
}

/**
 * Calculate retry-after time in seconds
 * @param windowStart Start of rate limit window (timestamp)
 * @param ttl Time-to-live in milliseconds
 * @param now Current timestamp
 * @returns Retry-after in seconds
 */
export function calculateRetryAfter(
  windowStart: number,
  ttl: number,
  now: number,
): number {
  const windowEnd = windowStart + ttl;
  const remaining = windowEnd - now;
  return Math.ceil(remaining / 1000);
}

/**
 * Format retry-after for human-readable message
 * @param seconds Retry-after in seconds
 * @returns Human-readable string (e.g., "30 minutes")
 */
export function formatRetryAfter(seconds: number): string {
  const minutes = Math.ceil(seconds / 60);
  if (minutes < 60) {
    return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
  }
  const hours = Math.ceil(minutes / 60);
  return `${hours} hour${hours !== 1 ? 's' : ''}`;
}
```

---

## 8. Error Response

### 8.1 HTTP 429 Too Many Requests

**Response Headers:**
```http
HTTP/1.1 429 Too Many Requests
Content-Type: application/json
Retry-After: 1800
```

**Response Body:**
```json
{
  "statusCode": 429,
  "message": "Too many requests. Please try again in 30 minutes.",
  "error": "Too Many Requests",
  "retryAfter": 1800
}
```

**Retry-After Header Format:**
- **Type:** Integer (seconds)
- **Description:** Number of seconds until the client can make another request
- **Calculation:** TTL - (now - windowStart)
- **Example:** `Retry-After: 1800` (30 minutes)

### 8.2 Error Handling in Frontend

**Frontend Response Handler:**

```typescript
async function handleSendOtp(phone: string, branchId: string) {
  try {
    const response = await fetch('/public/visitors/send-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, branchId }),
    });
    const data = await response.json();
    // Handle success
  } catch (error) {
    if (error.status === 429) {
      // Rate limit exceeded
      const retryAfter = error.retryAfter; // seconds
      const minutes = Math.ceil(retryAfter / 60);
      alert(`Too many requests. Please try again in ${minutes} minutes.`);
    }
  }
}
```

---

## 9. Test Cases

### 9.1 Unit Tests

**File:** `backend/src/visitors/guards/public-otp-rate-limit.guard.spec.ts`

| Test Case | Input | Expected Output | Description |
|:----------|:-------|:----------------|:------------|
| **TC-1: First request allowed** | Request from new IP | `canActivate` returns `true` | No record exists, request allowed |
| **TC-2: Second request allowed** | Request from IP with 1 previous request | `canActivate` returns `true` | Within limit (2/3) |
| **TC-3: Third request allowed** | Request from IP with 2 previous requests | `canActivate` returns `true` | Within limit (3/3) |
| **TC-4: Fourth request blocked** | Request from IP with 3 previous requests | Throws `429 Too Many Requests` | Limit exceeded (4/3) |
| **TC-5: Window expires** | Request from IP with expired window | `canActivate` returns `true` | Old window expired, new window started |
| **TC-6: Different IP allowed** | Request from different IP with limit exceeded on first IP | `canActivate` returns `true` | Rate limit is per-IP |
| **TC-7: TEST_MODE bypass** | Set `TEST_MODE=true`, make 4+ requests | All requests allowed | Rate limit disabled in TEST_MODE |
| **TC-8: IP extraction from X-Forwarded-For** | Request with `X-Forwarded-For: 203.0.113.1` | Uses `203.0.113.1` as IP | Proxy header respected |
| **TC-9: IP extraction fallback** | Request without proxy headers | Uses `request.ip` | Fallback to direct IP |
| **TC-10: Retry-After header** | Request exceeds limit | Response includes `Retry-After` header | Header calculated correctly |
| **TC-11: Multiple IPs in X-Forwarded-For** | `X-Forwarded-For: 203.0.113.1, 198.51.100.1` | Uses `203.0.113.1` (leftmost) | Uses original client IP |
| **TC-12: IPv6 normalization** | Request from `::ffff:192.0.2.1` | Normalizes to `192.0.2.1` | Handles IPv6-mapped IPv4 |
| **TC-13: Loopback normalization** | Request from `::1` | Normalizes to `127.0.0.1` | Handles localhost IPv6 |

### 9.2 Unit Test Implementation

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, HttpException } from '@nestjs/core';
import { PublicOtpRateLimitGuard } from './public-otp-rate-limit.guard';
import { ConfigService } from '@nestjs/config';

describe('PublicOtpRateLimitGuard', () => {
  let guard: PublicOtpRateLimitGuard;
  let configService: ConfigService;

  const mockContext = (ip: string): ExecutionContext => {
    return {
      switchToHttp: () => ({
        getRequest: () => ({ ip, headers: {} }),
        getResponse: () => ({
          setHeader: jest.fn(),
        }),
      }),
    } as unknown as ExecutionContext;
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PublicOtpRateLimitGuard,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultValue: any) => {
              const config: Record<string, any> = {
                RATE_LIMIT_SMS_PER_HOUR: 3,
                RATE_LIMIT_STORAGE: 'memory',
                RATE_LIMIT_SKIP_IN_TEST_MODE: true,
              };
              return config[key] ?? defaultValue;
            }),
          },
        },
      ],
    }).compile();

    guard = module.get<PublicOtpRateLimitGuard>(PublicOtpRateLimitGuard);
    configService = module.get<ConfigService>(ConfigService);

    // Clear in-memory store before each test
    (guard as any).rateLimitStore.clear();
  });

  describe('canActivate', () => {
    it('should allow first request from new IP', async () => {
      const context = mockContext('192.0.2.1');
      const result = await guard.canActivate(context);
      expect(result).toBe(true);
    });

    it('should allow requests within limit', async () => {
      const context = mockContext('192.0.2.1');

      // Make 3 requests
      for (let i = 0; i < 3; i++) {
        const result = await guard.canActivate(context);
        expect(result).toBe(true);
      }
    });

    it('should block requests exceeding limit', async () => {
      const context = mockContext('192.0.2.1');

      // Make 3 requests (allowed)
      for (let i = 0; i < 3; i++) {
        await guard.canActivate(context);
      }

      // 4th request should be blocked
      await expect(guard.canActivate(context)).rejects.toThrow(
        new HttpException(
          {
            statusCode: 429,
            message: expect.stringContaining('Too many requests'),
            error: 'Too Many Requests',
            retryAfter: expect.any(Number),
          },
          429,
        ),
      );
    });

    it('should allow different IPs independently', async () => {
      const context1 = mockContext('192.0.2.1');
      const context2 = mockContext('192.0.2.2');

      // Exhaust limit for IP1
      for (let i = 0; i < 3; i++) {
        await guard.canActivate(context1);
      }

      // IP2 should still be allowed
      const result = await guard.canActivate(context2);
      expect(result).toBe(true);
    });

    it('should skip rate limiting in TEST_MODE', async () => {
      process.env.TEST_MODE = 'true';
      const context = mockContext('192.0.2.1');

      // Make 10 requests
      for (let i = 0; i < 10; i++) {
        const result = await guard.canActivate(context);
        expect(result).toBe(true);
      }

      delete process.env.TEST_MODE;
    });
  });

  describe('extractClientIp', () => {
    it('should extract IP from X-Forwarded-For', () => {
      const request = {
        ip: '192.0.2.100',
        headers: {
          'x-forwarded-for': '203.0.113.1, 198.51.100.1',
        },
      };

      const ip = (guard as any).extractClientIp(request);
      expect(ip).toBe('203.0.113.1');
    });

    it('should fallback to request.ip when no proxy headers', () => {
      const request = {
        ip: '192.0.2.100',
        headers: {},
      };

      const ip = (guard as any).extractClientIp(request);
      expect(ip).toBe('192.0.2.100');
    });

    it('should handle multiple IPs in X-Forwarded-For', () => {
      const request = {
        ip: '192.0.2.100',
        headers: {
          'x-forwarded-for': '203.0.113.1, 198.51.100.1, 192.0.2.1',
        },
      };

      const ip = (guard as any).extractClientIp(request);
      expect(ip).toBe('203.0.113.1');
    });
  });
});
```

### 9.3 Integration Tests

**File:** `backend/src/visitors/public-controller/public-visitors.controller.e2e-spec.ts`

```typescript
describe('Rate Limiting (E2E)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('should allow 3 requests per IP per hour', async () => {
    const dto = {
      phone: '9999999999',
      branchId: 'test-branch-id',
    };

    // First 3 requests should succeed
    for (let i = 0; i < 3; i++) {
      await request(app.getHttpServer())
        .post('/public/visitors/send-otp')
        .send(dto)
        .expect(201);
    }

    // 4th request should fail with 429
    await request(app.getHttpServer())
      .post('/public/visitors/send-otp')
      .send(dto)
      .expect(429)
      .expect((res) => {
        expect(res.body).toMatchObject({
          statusCode: 429,
          message: expect.stringContaining('Too many requests'),
          error: 'Too Many Requests',
          retryAfter: expect.any(Number),
        });
        expect(res.headers['retry-after']).toBeDefined();
      });
  });

  it('should handle different IPs independently', async () => {
    const dto = {
      phone: '9999999999',
      branchId: 'test-branch-id',
    };

    // Exhaust limit for IP1
    for (let i = 0; i < 4; i++) {
      await request(app.getHttpServer())
        .post('/public/visitors/send-otp')
        .set('X-Forwarded-For', '192.0.2.1')
        .send(dto)
        .expect(i < 3 ? 201 : 429);
    }

    // IP2 should still be allowed
    await request(app.getHttpServer())
      .post('/public/visitors/send-otp')
      .set('X-Forwarded-For', '192.0.2.2')
      .send(dto)
      .expect(201);
  });

  it('should skip rate limiting in TEST_MODE', async () => {
    process.env.TEST_MODE = 'true';

    const dto = {
      phone: '9999999999',
      branchId: 'test-branch-id',
    };

    // Make 10 requests - all should succeed
    for (let i = 0; i < 10; i++) {
      await request(app.getHttpServer())
        .post('/public/visitors/send-otp')
        .send(dto)
        .expect(201);
    }

    delete process.env.TEST_MODE;
  });
});
```

### 9.4 Performance Tests

**File:** `backend/src/visitors/guards/public-otp-rate-limit.guard.perf.spec.ts`

```typescript
describe('PublicOtpRateLimitGuard (Performance)', () => {
  it('should handle 1000 concurrent requests without significant delay', async () => {
    const guard = new PublicOtpRateLimitGuard(configService, reflector);
    const promises: Promise<boolean>[] = [];

    // Create 1000 unique IPs
    for (let i = 0; i < 1000; i++) {
      const ip = `192.0.2.${i}`;
      const context = mockContext(ip);
      promises.push(guard.canActivate(context));
    }

    const start = Date.now();
    const results = await Promise.all(promises);
    const duration = Date.now() - start;

    expect(results.every((r) => r === true)).toBe(true);
    expect(duration).toBeLessThan(100); // Should complete in <100ms
  });

  it('should not leak memory (in-memory store cleanup)', async () => {
    const guard = new PublicOtpRateLimitGuard(configService, reflector);
    const storeSizeBefore = (guard as any).rateLimitStore.size;

    // Simulate 1000 requests
    for (let i = 0; i < 1000; i++) {
      const ip = `192.0.2.${i}`;
      const context = mockContext(ip);
      await guard.canActivate(context);
    }

    const storeSizeAfter = (guard as any).rateLimitStore.size;

    expect(storeSizeAfter).toBe(storeSizeBefore + 1000);

    // TODO: Implement periodic cleanup for expired entries
    // For MVP, manual cleanup or Redis recommended
  });
});
```

---

## 10. Security Considerations

### 10.1 Threats and Mitigations

| Threat | Description | Mitigation |
|:-------|:------------|:-----------|
| **IP Spoofing** | Attacker forges IP address | Rate limit is a defense-in-depth measure; combine with OTP lockout |
| **Distributed Attack** | Attackers use botnet with many IPs | Per-IP limit reduces impact; monitor for unusual patterns |
| **Proxy Abuse** | Attackers uses open proxies | Trust only configured proxy headers (from load balancer) |
| **Header Injection** | Attacker spoofs `X-Forwarded-For` | Only trust headers from trusted reverse proxies |
| **Memory Exhaustion** | Attacker floods with unique IPs | Use Redis for production; implement periodic cleanup |

### 10.2 Best Practices

1. **Trust Only Trusted Proxies:**
   - Configure reverse proxy (Nginx, Cloudflare, AWS ALB) to set `X-Forwarded-For`
   - Do not trust client-provided headers directly

2. **Use Redis for Production:**
   - In-memory storage is not scalable for multi-instance deployments
   - Redis provides distributed, atomic rate limiting

3. **Monitor and Alert:**
   - Log rate limit violations with IP and timestamp
   - Set up alerts for unusual patterns (e.g., 100+ IPs blocked/hour)

4. **Periodic Cleanup:**
   - For in-memory storage, implement a TTL-based cleanup job
   - Example: Run cleanup every 5 minutes to remove expired entries

5. **TEST_MODE Bypass:**
   - Only bypass rate limiting in controlled test environments
   - Never set `RATE_LIMIT_SKIP_IN_TEST_MODE=true` in production

---

## 11. Notes & Considerations

### 11.1 Why Per-IP, Not Per-Phone?

Rate limiting is implemented per-IP address, not per-phone number, for following reasons:

1. **Prevent Phone Number Enumeration:** Attackers could probe system to determine which phone numbers are registered
2. **Prevent SMS Cost Abuse:** Attackers could send OTPs to random phone numbers (SMS spam)
3. **Proxy Detection Difficult:** Determining unique visitors is unreliable; IP-based limiting is standard practice

### 11.2 Storage Strategy

| Storage | Pros | Cons | Recommended For |
|:--------|:-----|:------|:-----------------|
| **In-Memory (Map)** | Simple, fast, no dependencies | Not distributed, memory leaks without cleanup | Development, single-instance MVP |
| **Redis** | Distributed, atomic operations, built-in TTL | Requires Redis infrastructure | Production, multi-instance deployments |

### 11.3 Window Strategy

**Fixed Window vs. Sliding Window:**

- **Fixed Window (MVP):** Reset counter every hour. Simple, but allows "burst at boundary" (e.g., 3 requests at 59:59, 3 more at 00:01)
- **Sliding Window (Future):** Count requests within rolling 1-hour window. More complex but provides smooth limiting

**Recommendation:** Start with fixed window (MVP). Upgrade to sliding window or token bucket if needed.

### 11.4 Rate Limit Scope

**Endpoints Protected:**
- ✅ `POST /public/visitors/send-otp` - SMS sending (expensive operation)

**Endpoints NOT Protected:**
- ❌ `POST /public/visitors/verify-phone` - OTP verification (cheap, allow retries)
- ❌ `GET /public/visits/:visitId/status` - Status check (read-only, idempotent)
- ❌ `GET /public/visits/:visitId/gate-pass` - Gate pass view (read-only)

### 11.5 Proxy Configuration

For production deployments behind a reverse proxy (Nginx, AWS ALB, Cloudflare):

**Nginx Example:**
```nginx
location / {
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_pass http://backend:5000;
}
```

**AWS ALB Example:**
```typescript
// Trust ALB headers by default
trustedHeaders: ['x-forwarded-for', 'x-real-ip'];
```

### 11.6 Monitoring and Observability

Add logging for rate limit events:

```typescript
@Injectable()
export class PublicOtpRateLimitGuard implements CanActivate {
  private readonly logger = new Logger(PublicOtpRateLimitGuard.name);

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // ... existing logic

    if (result.exceeded) {
      this.logger.warn(
        `Rate limit exceeded for IP: ${clientIp}. Retry after: ${result.retryAfter}s`,
      );
      // Optionally send to monitoring system (e.g., Datadog, Sentry)
    }

    return true;
  }
}
```

---

## 12. Future Enhancements (Out of Scope)

1. **Sliding Window Rate Limiting:** Replace fixed window with sliding window or token bucket algorithm
2. **Captcha Integration:** Show CAPTCHA after rate limit exceeded to prove human
3. **IP Whitelisting:** Allow bypass for trusted IPs (e.g., internal networks)
4. **Per-Endpoint Limits:** Different limits for different public endpoints
5. **Geographic Blocking:** Block requests from certain countries/regions
6. **Machine Learning:** Anomaly detection for sophisticated attacks
7. **Distributed Lock:** For Redis-based implementations with cluster mode

---

## 13. Related Tasks

- **Task 2.1:** Create `POST /public/visitors/send-otp` endpoint (Protected endpoint)
- **Task 1.3:** PhoneVerificationService with OTP generation (Dependency)
- **Task 4.1:** Create phone entry step (Frontend integration - handle 429 errors)
- **Task 4.2:** Create phone verification step (Frontend integration)

---

## 14. Acceptance Criteria

Task 2.5 is complete when:

1. ✅ Rate limit of 3 requests per IP per hour is enforced
2. ✅ Returns HTTP 429 with `Retry-After` header when limit exceeded
3. ✅ Extracts IP from `X-Forwarded-For` header (proxy-friendly)
4. ✅ Falls back to `request.ip` when proxy headers not present
5. ✅ Configurable via environment variables (`RATE_LIMIT_SMS_PER_HOUR`, `RATE_LIMIT_STORAGE`)
6. ✅ Skips rate limiting when `TEST_MODE=true` (if configured via `RATE_LIMIT_SKIP_IN_TEST_MODE`)
7. ✅ Applied only to `POST /public/visitors/send-otp` endpoint
8. ✅ Does NOT apply to `verify-phone`, status, or gate-pass endpoints
9. ✅ Defines storage options (in-memory Map vs Redis)
10. ✅ Defines `Retry-After` header format (integer seconds)
11. ✅ All unit tests pass (TC-1 through TC-13)
12. ✅ Integration tests verify rate limit behavior
13. ✅ E2E tests verify full flow with rate limiting
14. ✅ Performance tests confirm <100ms for 1000 concurrent unique IPs
15. ✅ Documentation updated with environment variables and configuration

---

**End of Specification**
