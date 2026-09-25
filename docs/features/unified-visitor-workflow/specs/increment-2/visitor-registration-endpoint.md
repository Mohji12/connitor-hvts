# Technical Specification: POST /public/visitors (Registration)

> **Task ID:** 2.3
> **Increment:** 2 - Public API Layer
> **Feature:** Unified Visitor Workflow
> **Status:** Approved
> **Dependencies:** Task 2.2 (phone verification), Task 1.1 (Prisma schema with phone verification fields)

---

## 1. Overview

This specification defines the `POST /public/visitors` endpoint, which completes the visitor registration flow after phone verification. This is a public (no-auth) endpoint used to register visitors and create their first visit request.

The endpoint accepts two types of registration payloads:
1. **Meeting Registration** - Full visitor profile with detailed visit information
2. **Delivery Registration** - Minimal visitor profile with delivery-specific details

### Primary Purpose
- Complete visitor registration after successful phone verification
- Update visitor record with provided information (overwrites placeholder names for new visitors)
- Create a new Visit record with status `PENDING`
- Return visit details for status tracking

### Key Behaviors
1. Requires `phoneVerified=true` for the visitor record (must have completed Task 2.2)
2. Supports discriminated union for Meeting vs. Delivery registration types
3. Updates visitor record with provided details (creates new visitor if phone not found)
4. Creates Visit record with appropriate fields based on visit type
5. Supports file uploads for photos and documents
6. Returns `visitId` for status checking via Task 2.4

---

## 2. Endpoint Definition

### Path & Method
```
POST /public/visitors
```

### Controller
- **File:** `backend/src/visitors/public-controller/public-visitors.controller.ts`
- **Class:** `PublicVisitorsController` (new file)
- **Decorator:** `@Public()` (no authentication required)
- **Tags:** `Public Visitor`

### Content-Type
```
multipart/form-data
```

### HTTP Status Codes

| Status Code | Scenario | Response Body |
|-------------|----------|---------------|
| `201 Created` | Visitor registered and visit created successfully | `VisitorRegistrationResponse` |
| `400 Bad Request` | Validation failed, phone not verified, or file upload error | `ErrorResponse` |
| `404 Not Found` | Visitor or branch not found | `ErrorResponse` |
| `500 Internal Server Error` | File upload to GCP failed or database error | `ErrorResponse` |

---

## 3. Data Models

### 3.1 Visit Category Enum

```typescript
/**
 * Visit category enum from Prisma schema
 */
export enum VisitCategory {
  MEETING = 'MEETING',
  DELIVERY = 'DELIVERY',
}
```

### 3.2 Base DTO (Common Fields)

**File:** `backend/src/visitors/dto/visitor-registration.dto.ts`

```typescript
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsEmail, IsEnum, IsUUID, MinLength } from 'class-validator';
import { VisitCategory } from '@prisma/client';

/**
 * Base DTO for visitor registration (common fields for both types)
 */
export class VisitorRegistrationBaseDto {
  @ApiProperty({
    description: "Visitor's verified phone number (10 digits)",
    example: '9876543210',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{10}$/, { message: 'Phone must be exactly 10 digits' })
  phone: string;

  @ApiProperty({
    description: 'Branch ID from QR code (UUID v4 format)',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsString()
  @IsNotEmpty()
  @IsUUID('4', { message: 'Branch ID must be a valid UUID v4' })
  branchId: string;

  @ApiProperty({
    description: 'Visit category (determines which additional fields are required)',
    enum: VisitCategory,
    example: VisitCategory.MEETING,
  })
  @IsEnum(VisitCategory, { message: 'Visit category must be MEETING or DELIVERY' })
  @IsNotEmpty()
  visitCategory: VisitCategory;

  @ApiProperty({
    description: "Visitor's first name (min 2 characters)",
    example: 'John',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(2, { message: 'First name must be at least 2 characters' })
  firstName: string;

  @ApiPropertyOptional({
    description: "Visitor's middle name",
    example: 'Michael',
  })
  @IsString()
  @IsOptional()
  middleName?: string;

  @ApiProperty({
    description: "Visitor's last name (min 2 characters)",
    example: 'Doe',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(2, { message: 'Last name must be at least 2 characters' })
  lastName: string;

  @ApiPropertyOptional({
    type: 'string',
    format: 'binary',
    description: 'Visitor photo (.jpg, .png) - Required for both types (max 5MB)',
  })
  @IsOptional()
  photo?: Express.Multer.File;
}
```

### 3.3 Meeting Registration DTO

```typescript
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsEmail, IsEnum, IsUUID, IsUrl } from 'class-validator';
import { Department } from '@prisma/client';

/**
 * Extended DTO for Meeting visitor registration
 */
export class MeetingRegistrationDto extends VisitorRegistrationBaseDto {
  @ApiProperty({
    description: 'Visit category for meetings',
    enum: VisitCategory,
    default: VisitCategory.MEETING,
  })
  visitCategory: VisitCategory.MEETING;

  @ApiProperty({
    description: "Visitor's email address (required for meetings)",
    example: 'john.doe@company.com',
  })
  @IsEmail({}, { message: 'Email must be a valid email address' })
  @IsNotEmpty()
  email: string;

  @ApiPropertyOptional({
    description: "Visitor's alternate phone number (10 digits)",
    example: '9998887777',
  })
  @IsString()
  @IsOptional()
  @Matches(/^\d{10}$/, { message: 'Phone must be exactly 10 digits' })
  alternatePhone?: string;

  @ApiPropertyOptional({
    description: "Visitor's alternate email address",
    example: 'johndoe.alt@gmail.com',
  })
  @IsEmail({}, { message: 'Email must be a valid email address' })
  @IsOptional()
  alternateEmail?: string;

  @ApiPropertyOptional({
    description: "Visitor's company or organization name",
    example: 'Acme Corporation',
  })
  @IsString()
  @IsOptional()
  company?: string;

  @ApiPropertyOptional({
    description: "Visitor's company website",
    example: 'https://acme.com',
  })
  @IsUrl({}, { message: 'Website must be a valid URL' })
  @IsOptional()
  companyWebsite?: string;

  @ApiProperty({
    description: "Visitor's designation or job title",
    example: 'Sales Manager',
  })
  @IsString()
  @IsNotEmpty()
  designation: string;

  @ApiPropertyOptional({
    description: "Visitor's residential address",
    example: '123 Main Street, Bangalore',
  })
  @IsString()
  @IsOptional()
  address?: string;

  @ApiPropertyOptional({
    description: 'Department to visit',
    enum: Department,
    example: Department.CARDIOLOGY,
  })
  @IsEnum(Department)
  @IsOptional()
  department?: Department;

  @ApiPropertyOptional({
    description: "Staff member's ID to meet (optional if staffName/staffPhone provided)",
    example: 'staff-uuid-here',
  })
  @IsString()
  @IsOptional()
  @IsUUID('4', { message: 'Staff ID must be a valid UUID v4' })
  personToMeet?: string;

  @ApiPropertyOptional({
    description: "Staff member's name to meet (if personToMeet is 'other')",
    example: 'Dr. Smith',
  })
  @IsString()
  @IsOptional()
  staffName?: string;

  @ApiPropertyOptional({
    description: "Staff member's phone to meet (if personToMeet is 'other', 10 digits)",
    example: '9123456789',
  })
  @IsString()
  @IsOptional()
  @Matches(/^\d{10}$/, { message: 'Phone must be exactly 10 digits' })
  staffPhone?: string;

  @ApiProperty({
    description: 'Purpose of visit',
    example: 'Sales presentation with Dr. Smith',
  })
  @IsString()
  @IsNotEmpty()
  purpose: string;

  @ApiPropertyOptional({
    description: "Reporting manager's name",
    example: 'Jane Manager',
  })
  @IsString()
  @IsOptional()
  reportingManagerName?: string;

  @ApiPropertyOptional({
    description: "Reporting manager's phone (10 digits)",
    example: '9112345678',
  })
  @IsString()
  @IsOptional()
  @Matches(/^\d{10}$/, { message: 'Phone must be exactly 10 digits' })
  reportingManagerPhone?: string;

  @ApiPropertyOptional({
    type: 'string',
    format: 'binary',
    description: 'Government ID Document (.jpg, .png, .pdf) - Required for meetings (max 5MB)',
  })
  @IsOptional()
  governmentIdDocument?: Express.Multer.File;

  @ApiPropertyOptional({
    type: 'string',
    format: 'binary',
    description: 'Office/Company ID Document (.jpg, .png, .pdf) - Optional for meetings (max 5MB)',
  })
  @IsOptional()
  officeIdDocument?: Express.Multer.File;

  @ApiPropertyOptional({
    type: 'string',
    format: 'binary',
    description: 'Base64 encoded visiting card photo (.jpg, .png) - Optional for meetings (max 5MB)',
  })
  @IsOptional()
  visitingCardPhoto?: Express.Multer.File;

  // Visit Sub-type for meetings
  @ApiProperty({
    description: 'Meeting sub-type',
    example: 'SALES_MARKETING',
    enum: ['MEDICAL_REPRESENTATIVE', 'SALES_MARKETING', 'CONSULTATION', 'INTERVIEW', 'OTHER'],
  })
  @IsString()
  @IsNotEmpty()
  @IsEnum(['MEDICAL_REPRESENTATIVE', 'SALES_MARKETING', 'CONSULTATION', 'INTERVIEW', 'OTHER'], {
    message: 'Visit sub-type must be one of: MEDICAL_REPRESENTATIVE, SALES_MARKETING, CONSULTATION, INTERVIEW, OTHER',
  })
  visitSubType: string;
}
```

### 3.4 Delivery Registration DTO

```typescript
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

/**
 * Extended DTO for Delivery visitor registration
 */
export class DeliveryRegistrationDto extends VisitorRegistrationBaseDto {
  @ApiProperty({
    description: 'Visit category for deliveries',
    enum: VisitCategory,
    default: VisitCategory.DELIVERY,
  })
  visitCategory: VisitCategory.DELIVERY;

  @ApiProperty({
    description: 'Delivery platform/company (e.g., Swiggy, Amazon, Blue Dart)',
    example: 'Swiggy',
  })
  @IsString()
  @IsNotEmpty()
  deliveryPlatform: string;

  @ApiPropertyOptional({
    description: 'Who/where delivery is for (name, room, or department)',
    example: 'Reception / Dr. Smith',
  })
  @IsString()
  @IsOptional()
  deliveryRecipient?: string;

  @ApiPropertyOptional({
    description: 'Order ID / AWB number for tracking',
    example: 'ORD123456',
  })
  @IsString()
  @IsOptional()
  orderReference?: string;

  // Visit Sub-type for deliveries
  @ApiProperty({
    description: 'Delivery sub-type',
    example: 'FOOD_DELIVERY',
    enum: ['PROFESSIONAL_GOODS', 'PACKAGE_COURIER', 'FOOD_DELIVERY', 'OTHER'],
  })
  @IsString()
  @IsNotEmpty()
  @IsEnum(['PROFESSIONAL_GOODS', 'PACKAGE_COURIER', 'FOOD_DELIVERY', 'OTHER'], {
    message: 'Visit sub-type must be one of: PROFESSIONAL_GOODS, PACKAGE_COURIER, FOOD_DELIVERY, OTHER',
  })
  visitSubType: string;
}
```

### 3.5 Union DTO for API Documentation

```typescript
/**
 * Union type for visitor registration (Meeting or Delivery)
 * This is for OpenAPI documentation purposes only
 */
export class VisitorRegistrationDto {
  @ApiProperty({ type: 'string', format: 'binary', required: true })
  photo: Express.Multer.File;

  @ApiProperty({
    oneOf: [
      { $ref: '#/components/schemas/MeetingRegistrationDto' },
      { $ref: '#/components/schemas/DeliveryRegistrationDto' },
    ],
  })
  data: MeetingRegistrationDto | DeliveryRegistrationDto;
}
```

### 3.6 Response Schema

```typescript
/**
 * Successful registration response
 */
export interface VisitorRegistrationResponse {
  success: true;
  message: string;
  visitId: string;
  visitStatus: string;
  visitorId: string;
  visitorName: string;
}
```

### 3.7 Error Response Schema

```typescript
/**
 * Standard error response structure
 */
export interface ErrorResponse {
  statusCode: number;
  message: string | string[];
  error: string; // Error code or HTTP status text
}
```

### 3.8 Response Examples

**Meeting Registration Success:**
```json
{
  "success": true,
  "message": "Visit request submitted successfully. Please wait for approval.",
  "visitId": "550e8400-e29b-41d4-a716-446655440001",
  "visitStatus": "PENDING",
  "visitorId": "550e8400-e29b-41d4-a716-4466554400000",
  "visitorName": "John Doe"
}
```

**Delivery Registration Success:**
```json
{
  "success": true,
  "message": "Visit request submitted successfully. Please wait for approval.",
  "visitId": "550e8400-e29b-41d4-a716-4466554402",
  "visitStatus": "PENDING",
  "visitorId": "550e8400-e29b-41d4-a716-4466554400000",
  "visitorName": "Raj Kumar"
}
```

---

## 4. Behavior & Logic

### 4.1 Pseudo-Code Algorithm

```typescript
async registerVisitor(
  files: VisitorFiles,
  dto: MeetingRegistrationDto | DeliveryRegistrationDto,
): Promise<VisitorRegistrationResponse> {

  // ==================================================================
  // STEP 1: Input Validation (handled by class-validator decorators)
  // ==================================================================
  // - phone: 10 digits, numeric only, regex: /^\d{10}$/
  // - branchId: valid UUID v4
  // - visitCategory: MEETING or DELIVERY (enum)
  // - firstName, lastName: non-empty, min 2 chars
  // - Photo: required for both types (multipart/form-data)
  // - For Meeting: email, designation, purpose, visitSubType are required
  // - For Meeting: governmentIdDocument is required
  // - For Delivery: deliveryPlatform, visitSubType are required

  // ==================================================================
  // STEP 2: Phone Verification Check
  // ==================================================================
  const visitor = await this.prisma.visitor.findUnique({
    where: {
      phone_branchId: {
        phone: dto.phone,
        branchId: dto.branchId,
      }
    }
  });

  // Validate visitor exists
  if (!visitor) {
    throw new NotFoundException({
      statusCode: 404,
      message: 'VISITOR_NOT_FOUND. Please complete phone verification first.',
      error: 'VISITOR_NOT_FOUND',
    });
  }

  // Validate visitor phone is verified
  if (!visitor.phoneVerified) {
    throw new BadRequestException({
      statusCode: 400,
      message: 'PHONE_NOT_VERIFIED. Please complete phone verification first.',
      error: 'PHONE_NOT_VERIFIED',
    });
  }

  // ==================================================================
  // STEP 3: File Upload Constraints Validation
  // ==================================================================
  // - Max file size: 5MB per file
  // - Allowed MIME types: 'image/jpeg', 'image/png', 'application/pdf'
  // - Photo is REQUIRED for both Meeting and Delivery
  // - governmentIdDocument is REQUIRED for Meeting
  // - officeIdDocument and visitingCardPhoto are OPTIONAL for Meeting

  const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB in bytes
  const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'application/pdf'];

  // Validate photo
  if (!files.photo || files.photo.length === 0) {
    throw new BadRequestException({
      statusCode: 400,
      message: 'FILE_UPLOAD_ERROR. Photo is required.',
      error: 'FILE_UPLOAD_ERROR',
    });
  }

  if (files.photo[0].size > MAX_FILE_SIZE) {
    throw new BadRequestException({
      statusCode: 400,
      message: 'FILE_UPLOAD_ERROR. Photo must be less than 5MB.',
      error: 'FILE_UPLOAD_ERROR',
    });
  }

  if (!ALLOWED_MIME_TYPES.includes(files.photo[0].mimetype)) {
    throw new BadRequestException({
      statusCode: 400,
      message: 'FILE_UPLOAD_ERROR. Photo must be JPG, PNG, or PDF.',
      error: 'FILE_UPLOAD_ERROR',
    });
  }

  // Validate governmentIdDocument for Meeting
  if (dto.visitCategory === VisitCategory.MEETING) {
    if (!files.governmentIdDocument || files.governmentIdDocument.length === 0) {
      throw new BadRequestException({
        statusCode: 400,
        message: 'FILE_UPLOAD_ERROR. Government ID document is required for meeting registrations.',
        error: 'FILE_UPLOAD_ERROR',
      });
    }
  }

  // ==================================================================
  // STEP 4: Process File Uploads
  // ==================================================================
  const photoBase64 = files.photo?.[0]
    ? await this.fileService.uploadToGCP(files.photo[0], `visitors/${visitor.id}/photo`)
    : null;

  const governmentIdDocumentBase64 = files.governmentIdDocument?.[0]
    ? await this.fileService.uploadToGCP(files.governmentIdDocument[0], `visitors/${visitor.id}/govt-id`)
    : null;

  const officeIdDocumentBase64 = files.officeIdDocument?.[0]
    ? await this.fileService.uploadToGCP(files.officeIdDocument[0], `visitors/${visitor.id}/office-id`)
    : null;

  const visitingCardPhotoBase64 = files.visitingCardPhoto?.[0]
    ? await this.fileService.uploadToGCP(files.visitingCardPhoto[0], `visitors/${visitor.id}/visiting-card`)
    : null;

  // ==================================================================
  // STEP 5: Update Visitor Record
  // ==================================================================
  const updatedVisitor = await this.prisma.visitor.update({
    where: { id: visitor.id },
    data: {
      // Always update these fields
      firstName: dto.firstName,
      middleName: dto.middleName || null,
      lastName: dto.lastName,
      photo: photoBase64,

      // Meeting-specific fields
      ...(dto.visitCategory === VisitCategory.MEETING && {
        email: (dto as MeetingRegistrationDto).email,
        alternatePhone: (dto as MeetingRegistrationDto).alternatePhone || null,
        alternateEmail: (dto as MeetingRegistrationDto).alternateEmail || null,
        company: (dto as MeetingRegistrationDto).company || null,
        companyWebsite: (dto as MeetingRegistrationDto).companyWebsite || null,
        designation: (dto as MeetingRegistrationDto).designation,
        address: (dto as MeetingRegistrationDto).address || null,
        governmentIdDocument: governmentIdDocumentBase64,
        officeIdDocument: officeIdDocumentBase64,
        reportingManagerName: (dto as MeetingRegistrationDto).reportingManagerName || null,
        reportingManagerPhone: (dto as MeetingRegistrationDto).reportingManagerPhone || null,
      }),
    },
  });

  // ==================================================================
  // STEP 6: Create Visit Record
  // ==================================================================
  let visitData: Prisma.VisitCreateInput;

  if (dto.visitCategory === VisitCategory.MEETING) {
    const meetingDto = dto as MeetingRegistrationDto;
    visitData = {
      visitCategory: VisitCategory.MEETING,
      visitSubType: meetingDto.visitSubType,
      purpose: meetingDto.purpose,
      department: meetingDto.department || null,
      personToMeet: meetingDto.personToMeet || null,
      staffName: meetingDto.staffName || null,
      staffPhone: meetingDto.staffPhone || null,
      visitingCardPhoto: visitingCardPhotoBase64,
      status: 'PENDING',
      visitor: { connect: { id: updatedVisitor.id } },
      branch: { connect: { id: dto.branchId } },
    };
  } else {
    // Delivery
    const deliveryDto = dto as DeliveryRegistrationDto;
    visitData = {
      visitCategory: VisitCategory.DELIVERY,
      visitSubType: deliveryDto.visitSubType,
      deliveryPlatform: deliveryDto.deliveryPlatform,
      deliveryRecipient: deliveryDto.deliveryRecipient || null,
      orderReference: deliveryDto.orderReference || null,
      status: 'PENDING',
      visitor: { connect: { id: updatedVisitor.id } },
      branch: { connect: { id: dto.branchId } },
    };
  }

  const visit = await this.prisma.visit.create({
    data: visitData,
  });

  // ==================================================================
  // STEP 7: Send Notification to Staff (if applicable)
  // ==================================================================
  if (dto.visitCategory === VisitCategory.MEETING) {
    const meetingDto = dto as MeetingRegistrationDto;

    // Find staff member to notify
    if (meetingDto.personToMeet && meetingDto.personToMeet !== 'other') {
      const staff = await this.prisma.user.findUnique({
        where: { id: meetingDto.personToMeet },
      });

      if (staff) {
        await this.notificationService.create({
          recipientId: staff.id,
          message: `New visitor request from ${updatedVisitor.firstName} ${updatedVisitor.lastName}. Purpose: ${meetingDto.purpose}.`,
          visitId: visit.id,
        });
      }
    }
  }

  // ==================================================================
  // STEP 8: Return Response
  // ==================================================================
  return {
    success: true,
    message: 'Visit request submitted successfully. Please wait for approval.',
    visitId: visit.id,
    visitStatus: visit.status,
    visitorId: updatedVisitor.id,
    visitorName: `${updatedVisitor.firstName} ${updatedVisitor.lastName}`,
  };
}
```

### 4.2 State Transition Diagram

```
Visitor State Before Registration:
┌─────────────────────────────────────────────┐
│ phoneVerified: true (must be true)         │
│ phoneVerificationOtp: null                 │
│ firstName: 'Guest' (if new visitor)      │
│ lastName: 'Visitor' (if new visitor)      │
│ phone: "9876543210"                      │
│ branchId: "uuid-branch-id"                │
└─────────────────────────────────────────────┘
              │
              ▼
       [Registration Submitted]
              │
              ├─► Visitor not found ──► 404 Error: VISITOR_NOT_FOUND
              │
              ├─► Phone not verified ──► 400 Error: PHONE_NOT_VERIFIED
              │
              └─► Phone verified ───────► Success
                       │
                       ▼
              Update Visitor Record:
             ┌─────────────────────────────────┐
             │ firstName: "John"              │
             │ lastName: "Doe"               │
             │ email: "john@company.com"      │
             │ photo: <base64_image>         │
             │ (and other fields...)           │
             └─────────────────────────────────┘
                        │
                        ▼
               Create Visit Record:
              ┌─────────────────────────────────┐
              │ visitCategory: MEETING/DELIVERY│
              │ visitSubType: "SALES_MKTING"   │
              │ status: PENDING                │
              │ visitorId: <uuid>              │
              │ branchId: <uuid>              │
              │ (and type-specific fields...)    │
              └─────────────────────────────────┘
                        │
                        ▼
               Send Notification (if Meeting)
                        │
                        ▼
                    Return Response (201)
```

---

## 5. Error Handling

### 5.1 Error Code Matrix

| Error Code | HTTP Status | Trigger Condition | User Action |
|-----------|-------------|-------------------|-------------|
| `VISITOR_NOT_FOUND` | 404 | No visitor record found for phone + branchId | Complete phone verification first |
| `PHONE_NOT_VERIFIED` | 400 | Visitor `phoneVerified` is false | Complete phone verification first |
| `FILE_UPLOAD_ERROR` | 400 | Photo upload failed (invalid format, too large, or missing) | Check file constraints (max 5MB, jpg/png/pdf) |
| `VALIDATION_ERROR` | 400 | DTO validation failed (missing required fields, invalid format) | Check and correct input fields |
| `STAFF_NOT_FOUND` | 404 | Specified staff member not found (non-fatal warning) | Visit still created, staff not notified |
| `BRANCH_NOT_FOUND` | 404 | Invalid branchId | Scan valid QR code |
| `GCP_UPLOAD_FAILED` | 500 | Failed to upload files to GCP | Retry or contact support |

### 5.2 Error Response Format

All errors follow the NestJS standard error format:

```typescript
interface ErrorResponse {
  statusCode: number;
  message: string | string[];
  error: string; // Error code or HTTP status text
}
```

### 5.3 Error Response Examples

```json
// Phone Not Verified
{
  "statusCode": 400,
  "message": "PHONE_NOT_VERIFIED. Please complete phone verification first.",
  "error": "Bad Request"
}

// Visitor Not Found
{
  "statusCode": 404,
  "message": "VISITOR_NOT_FOUND. Please complete phone verification first.",
  "error": "Not Found"
}

// Validation Error (Missing Email for Meeting)
{
  "statusCode": 400,
  "message": ["email should not be empty", "email must be an email"],
  "error": "Bad Request"
}

// File Upload Error (Photo Missing)
{
  "statusCode": 400,
  "message": "FILE_UPLOAD_ERROR. Photo is required.",
  "error": "Bad Request"
}

// File Upload Error (File Too Large)
{
  "statusCode": 400,
  "message": "FILE_UPLOAD_ERROR. Photo must be less than 5MB.",
  "error": "Bad Request"
}

// File Upload Error (Invalid Format)
{
  "statusCode": 400,
  "message": "FILE_UPLOAD_ERROR. Photo must be JPG, PNG, or PDF.",
  "error": "Bad Request"
}

// Government ID Missing for Meeting
{
  "statusCode": 400,
  "message": "FILE_UPLOAD_ERROR. Government ID document is required for meeting registrations.",
  "error": "Bad Request"
}
```

---

## 6. Controller Implementation

### 6.1 Controller Method Signature

```typescript
import { Public } from '../../auth/decorators/public.decorator';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { MeetingRegistrationDto, DeliveryRegistrationDto } from '../dto/visitor-registration.dto';

interface VisitorFiles {
  photo?: Express.Multer.File[];
  governmentIdDocument?: Express.Multer.File[];
  officeIdDocument?: Express.Multer.File[];
  visitingCardPhoto?: Express.Multer.File[];
}

@ApiTags('Public Visitor')
@Controller('public/visitors')
export class PublicVisitorsController {
  constructor(private readonly visitorsService: VisitorsService) {}

  @Public()
  @Post()
  @ApiOperation({
    summary: 'Register visitor and create visit request',
    description: 'Creates or updates visitor record and creates a pending visit request. Requires phone verification first.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiResponse({ status: 201, description: 'Visit created successfully' })
  @ApiResponse({ status: 400, description: 'Validation failed or phone not verified' })
  @ApiResponse({ status: 404, description: 'Visitor or branch not found' })
  @ApiResponse({ status: 500, description: 'File upload or database error' })
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'photo', maxCount: 1 },
      { name: 'governmentIdDocument', maxCount: 1 },
      { name: 'officeIdDocument', maxCount: 1 },
      { name: 'visitingCardPhoto', maxCount: 1 },
    ]),
  )
  async registerVisitor(
    @Body() dto: MeetingRegistrationDto | DeliveryRegistrationDto,
    @UploadedFiles() files: VisitorFiles,
  ): Promise<VisitorRegistrationResponse> {
    return this.visitorsService.registerPublicVisitor(files, dto);
  }
}
```

### 6.2 File Upload Constraints

| Field | Format | Max Size | Required For | Allowed MIME Types |
|-------|--------|----------|--------------|-------------------|
| `photo` | JPG, PNG, PDF | 5MB | Both Meeting and Delivery | `image/jpeg`, `image/png`, `application/pdf` |
| `governmentIdDocument` | JPG, PNG, PDF | 5MB | Meeting (required) | `image/jpeg`, `image/png`, `application/pdf` |
| `officeIdDocument` | JPG, PNG, PDF | 5MB | Meeting (optional) | `image/jpeg`, `image/png`, `application/pdf` |
| `visitingCardPhoto` | JPG, PNG | 5MB | Meeting (optional) | `image/jpeg`, `image/png` |

### 6.3 File Upload Middleware Configuration

```typescript
// Configure multer for file uploads
const uploadConfig = {
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
  fileFilter: (req: Request, file: Express.Multer.File, cb: FileFilterCallback) => {
    const allowedMimes = [
      'image/jpeg',
      'image/png',
      'application/pdf',
    ];

    if (!allowedMimes.includes(file.mimetype)) {
      return cb(new BadRequestException({
        statusCode: 400,
        message: 'FILE_UPLOAD_ERROR. Only JPG, PNG, and PDF files are allowed.',
        error: 'FILE_UPLOAD_ERROR',
      }), false);
    }

    cb(null, true);
  },
};
```

### 6.4 Service Layer Method

```typescript
// In VisitorsService
async registerPublicVisitor(
  files: VisitorFiles,
  dto: MeetingRegistrationDto | DeliveryRegistrationDto,
): Promise<VisitorRegistrationResponse> {
  // Implementation follows the pseudo-code in Section 4.1
}
```

---

## 7. Test Cases

### 7.1 Unit Test Scenarios

| Test Case | Input | Expected Output | Notes |
|-----------|-------|-----------------|-------|
| **TC-1: Valid Meeting Registration** | phone: verified, branchId: valid, all meeting fields, photo file | success: true, visitId, status: PENDING (201) | Creates visit with meeting details |
| **TC-2: Valid Delivery Registration** | phone: verified, branchId: valid, all delivery fields, photo file | success: true, visitId, status: PENDING (201) | Creates visit with delivery details |
| **TC-3: New Visitor Registration** | phone: verified (new visitor), branchId: valid, all fields, photo file | success: true, visitor updated with real names (201) | Overwrites placeholder names |
| **TC-4: Existing Visitor Registration** | phone: verified (existing), branchId: valid, updated fields, photo file | success: true, visitor updated with new data (201) | Updates existing visitor |
| **TC-5: Phone Not Verified** | phone: unverified, branchId: valid, all fields | Error: PHONE_NOT_VERIFIED (400) | Rejection without phone verification |
| **TC-6: Visitor Not Found** | phone: not in DB, branchId: valid, all fields | Error: VISITOR_NOT_FOUND (404) | Must complete verification first |
| **TC-7: Missing Photo** | phone: verified, branchId: valid, all fields, no photo file | Error: FILE_UPLOAD_ERROR (400) | Photo is required |
| **TC-8: Missing Required Meeting Fields** | phone: verified, branchId: valid, missing email/designation/purpose | Error: VALIDATION_ERROR (400) | Email, designation, purpose required for meetings |
| **TC-9: Missing Required Delivery Fields** | phone: verified, branchId: valid, missing deliveryPlatform | Error: VALIDATION_ERROR (400) | deliveryPlatform required for deliveries |
| **TC-10: Invalid File Format** | phone: verified, photo: .exe file | Error: FILE_UPLOAD_ERROR (400) | Only jpg/png/pdf allowed |
| **TC-11: File Too Large** | phone: verified, photo: 10MB file | Error: FILE_UPLOAD_ERROR (400) | Max 5MB allowed |
| **TC-12: Missing Government ID for Meeting** | phone: verified, branchId: valid, meeting fields, photo, no govt-id | Error: FILE_UPLOAD_ERROR (400) | Government ID required for meetings |
| **TC-13: Invalid Phone Format** | phone: "+91-9876543210" (non-10 digit) | Error: VALIDATION_ERROR (400) | Validation decorator rejects |
| **TC-14: Invalid BranchId** | branchId: "invalid-uuid" | Error: VALIDATION_ERROR (400) | UUID validation fails |

### 7.2 Integration Test Scenarios

| Test Case | Precondition | Action | Expected Result |
|-----------|--------------|--------|-----------------|
| **IT-1: Full Meeting Flow** | Phone verified | POST /public/visitors with meeting payload | Visitor updated, visit created with meeting details, notification sent to staff (201) |
| **IT-2: Full Delivery Flow** | Phone verified | POST /public/visitors with delivery payload | Visitor updated, visit created with delivery details (201) |
| **IT-3: New Visitor Complete Flow** | None | send-otp → verify-phone → POST /public/visitors | New visitor created with real names, visit created (201) |
| **IT-4: File Upload to GCP** | Phone verified, photo file | POST /public/visitors with photo | Photo uploaded to GCP, URL stored in visitor.photo (201) |
| **IT-5: Staff Notification** | Phone verified, meeting with staffId | POST /public/visitors with personToMeet | Notification created for specified staff (201) |
| **IT-6: Phone Verification Check** | Phone unverified | POST /public/visitors | Returns PHONE_NOT_VERIFIED error (400) |

### 7.3 E2E Test Scenarios (with TEST_MODE)

**File:** `backend/src/visitors/public-controller/public-visitors.controller.e2e-spec.ts`

```typescript
describe('POST /public/visitors (E2E)', () => {
  it('should register new meeting visitor in TEST_MODE', async () => {
    // Given
    process.env.TEST_MODE = 'true';

    // Step 1: Send OTP and verify
    await request(app.getHttpServer())
      .post('/public/visitors/send-otp')
      .send({ phone: '9999999999', branchId: 'test-branch-id' })
      .expect(201);

    await request(app.getHttpServer())
      .post('/public/visitors/verify-phone')
      .send({ phone: '9999999999', otp: '123456', branchId: 'test-branch-id' })
      .expect(200);

    // Step 2: Register visitor
    const formData = new FormData();
    formData.append('visitCategory', 'MEETING');
    formData.append('phone', '9999999999');
    formData.append('branchId', 'test-branch-id');
    formData.append('firstName', 'John');
    formData.append('lastName', 'Doe');
    formData.append('email', 'john.doe@company.com');
    formData.append('designation', 'Sales Manager');
    formData.append('purpose', 'Sales presentation');
    formData.append('visitSubType', 'SALES_MARKETING');
    formData.append('photo', fs.readFileSync('test/fixtures/test-photo.jpg'), {
      filename: 'test-photo.jpg',
      contentType: 'image/jpeg',
    });
    formData.append('governmentIdDocument', fs.readFileSync('test/fixtures/test-id.pdf'), {
      filename: 'test-id.pdf',
      contentType: 'application/pdf',
    });

    // When
    const response = await request(app.getHttpServer())
      .post('/public/visitors')
      .send(formData)
      .set('Content-Type', 'multipart/form-data')
      .expect(201);

    // Then
    expect(response.body).toMatchObject({
      success: true,
      visitStatus: 'PENDING',
      visitorName: 'John Doe',
    });

    // Verify visitor updated in DB
    const visitor = await prisma.visitor.findFirst({
      where: { phone: '9999999999' },
    });
    expect(visitor?.firstName).toBe('John');
    expect(visitor?.lastName).toBe('Doe');
    expect(visitor?.email).toBe('john.doe@company.com');

    // Verify visit created
    const visit = await prisma.visit.findFirst({
      where: { visitorId: visitor?.id },
    });
    expect(visit?.status).toBe('PENDING');
    expect(visit?.visitCategory).toBe('MEETING');
  });
});
```

---

## 8. API Examples

### 8.1 Meeting Registration Request

**Request:**
```http
POST /public/visitors
Content-Type: multipart/form-data

{
  "visitCategory": "MEETING",
  "phone": "9876543210",
  "branchId": "550e8400-e29b-41d4-a716-446655440000",
  "firstName": "John",
  "middleName": "Michael",
  "lastName": "Doe",
  "email": "john.doe@acme.com",
  "alternatePhone": "9998887777",
  "company": "Acme Corporation",
  "companyWebsite": "https://acme.com",
  "designation": "Sales Manager",
  "address": "123 Main Street, Bangalore",
  "department": "CARDIOLOGY",
  "personToMeet": "staff-uuid-here",
  "staffName": "Dr. Smith",
  "staffPhone": "9123456789",
  "purpose": "Sales presentation",
  "visitSubType": "SALES_MARKETING",
  "reportingManagerName": "Jane Manager",
  "reportingManagerPhone": "9112345678",
  "photo": <binary file>,
  "governmentIdDocument": <binary file>,
  "officeIdDocument": <binary file>
}
```

**Response:**
```http
HTTP/1.1 201 Created
Content-Type: application/json

{
  "success": true,
  "message": "Visit request submitted successfully. Please wait for approval.",
  "visitId": "550e8400-e29b-41d4-a716-4466554401",
  "visitStatus": "PENDING",
  "visitorId": "550e8400-e29b-41d4-a716-4466554400000",
  "visitorName": "John Doe"
}
```

### 8.2 Delivery Registration Request

**Request:**
```http
POST /public/visitors
Content-Type: multipart/form-data

{
  "visitCategory": "DELIVERY",
  "phone": "9876543210",
  "branchId": "550e8400-e29b-41d4-a716-4466554400000",
  "firstName": "Raj",
  "lastName": "Kumar",
  "deliveryPlatform": "Swiggy",
  "deliveryRecipient": "Reception",
  "orderReference": "ORD123456",
  "visitSubType": "FOOD_DELIVERY",
  "photo": <binary file>
}
```

**Response:**
```http
HTTP/1.1 201 Created
Content-Type: application/json

{
  "success": true,
  "message": "Visit request submitted successfully. Please wait for approval.",
  "visitId": "550e8400-e29b-41d4-a716-4466554402",
  "visitStatus": "PENDING",
  "visitorId": "550e8400-e29b-41d4-a716-4466554400000",
  "visitorName": "Raj Kumar"
}
```

### 8.3 Error Response - Phone Not Verified

**Request:**
```http
POST /public/visitors
Content-Type: multipart/form-data

{
  "visitCategory": "MEETING",
  "phone": "9876543210",
  "branchId": "550e8400-e29b-41d4-a716-4466554400000",
  "firstName": "John",
  "lastName": "Doe",
  "email": "john@example.com",
  "designation": "Sales",
  "purpose": "Meeting",
  "visitSubType": "OTHER",
  "photo": <binary file>
}
```

**Response:**
```http
HTTP/1.1 400 Bad Request
Content-Type: application/json

{
  "statusCode": 400,
  "message": "PHONE_NOT_VERIFIED. Please complete phone verification first.",
  "error": "Bad Request"
}
```

### 8.4 Error Response - Missing Photo

**Request:**
```http
POST /public/visitors
Content-Type: multipart/form-data

{
  "visitCategory": "DELIVERY",
  "phone": "9876543210",
  "branchId": "550e8400-e29b-41d4-a716-4466554400000",
  "firstName": "Raj",
  "lastName": "Kumar",
  "deliveryPlatform": "Swiggy",
  "visitSubType": "FOOD_DELIVERY"
}
```

**Response:**
```http
HTTP/1.1 400 Bad Request
Content-Type: application/json

{
  "statusCode": 400,
  "message": "FILE_UPLOAD_ERROR. Photo is required.",
  "error": "Bad Request"
}
```

---

## 9. Notes & Considerations

### 9.1 Phone Verification Requirement

The endpoint strictly requires:
1. Visitor record exists for phone + branchId
2. `phoneVerified = true` (set by Task 2.2)

This ensures only verified users can register. Frontend must:
- Call `POST /public/visitors/send-otp` first
- Call `POST /public/visitors/verify-phone` second
- Then call `POST /public/visitors` to register

### 9.2 New vs. Existing Visitors

**New Visitors:**
- Created during Task 2.1 (send-otp) with placeholder names: `firstName: 'Guest'`, `lastName: 'Visitor'`
- This endpoint overwrites those placeholder names with real data

**Existing Visitors:**
- Already have real names and data
- This endpoint updates their information with any new data provided

### 9.3 Meeting vs. Delivery Logic

**Meeting Registration:**
- Required fields: email, designation, purpose, visitSubType, governmentIdDocument, photo
- Optional fields: department, personToMeet, staffName, staffPhone, officeIdDocument, visitingCardPhoto
- Creates notification for staff if `personToMeet` is specified

**Delivery Registration:**
- Required fields: deliveryPlatform, visitSubType, photo
- Optional fields: deliveryRecipient, orderReference
- No staff notification

### 9.4 File Storage

- All files are uploaded to GCP Storage
- File naming convention: `visitors/{visitorId}/{photo|govt-id|office-id|visiting-card}`
- FileService returns Base64 string for storage in database
- Max file size: 5MB per file
- Allowed MIME types: `image/jpeg`, `image/png`, `application/pdf`

### 9.5 Visit Status Flow

The created visit starts with status `PENDING`:
```
PENDING → (approved by staff) → APPROVED → (check-in) → CHECKED_IN → (check-out) → CHECKED_OUT
                     ↓
                 REJECTED
```

### 9.6 Visit Sub-Type Enums

**Meeting Sub-Types:**
- `MEDICAL_REPRESENTATIVE`
- `SALES_MARKETING`
- `CONSULTATION`
- `INTERVIEW`
- `OTHER`

**Delivery Sub-Types:**
- `PROFESSIONAL_GOODS`
- `PACKAGE_COURIER`
- `FOOD_DELIVERY`
- `OTHER`

### 9.7 Future Enhancements (Out of Scope)

- **Visit Scheduling**: Allow visitors to specify preferred visit time
- **Bulk Registration**: Register multiple visitors at once (group visits)
- **Pre-approval**: Some visit types could be auto-approved (e.g., recurring deliveries)
- **Document OCR**: Extract data from uploaded IDs automatically
- **Face Matching**: Match uploaded photo with live capture at gate

---

## 10. Related Tasks

- **Task 2.1:** Create `POST /public/visitors/send-otp` endpoint (Prerequisite)
- **Task 2.2:** Create `POST /public/visitors/verify-phone` endpoint (Prerequisite)
- **Task 2.4:** Create `GET /public/visits/:visitId/status` endpoint (Next step)
- **Task 4.4:** Create Delivery registration form (Frontend integration)
- **Task 4.5:** Create Meeting registration form (Frontend integration)
- **Task 5.1:** Create Delivery details step (Frontend integration)
- **Task 5.2:** Create Meeting details step (Frontend integration)

---

## 11. Acceptance Criteria

Task 2.3 is complete when:

1. ✅ `POST /public/visitors` endpoint exists and is public (no auth)
2. ✅ Accepts multipart/form-data with photo and registration data
3. ✅ Validates phone verification status (returns error if `phoneVerified = false`)
4. ✅ Validates visitor exists for phone + branchId (returns 404 if not found)
5. ✅ Defines `VisitCategory` enum with MEETING and DELIVERY values
6. ✅ Supports Meeting registration DTO with all required fields (email, designation, purpose, visitSubType, governmentIdDocument)
7. ✅ Supports Delivery registration DTO with all required fields (deliveryPlatform, visitSubType)
8. ✅ Updates visitor record with provided information
9. ✅ Uploads photo to GCP and stores Base64 in database
10. ✅ Uploads documents to GCP for meeting registrations
11. ✅ Creates Visit record with status `PENDING`
12. ✅ Creates Visit with appropriate fields based on visit category (meeting vs. delivery)
13. ✅ Sends notification to staff if meeting registration with `personToMeet` specified
14. ✅ Returns `VisitorRegistrationResponse` interface with explicit types
15. ✅ Returns HTTP 201 Created on success
16. ✅ Enforces file upload constraints: max 5MB, allowed MIME types (jpg/png/pdf)
17. ✅ Requires photo for both Meeting and Delivery registrations
18. ✅ Requires governmentIdDocument for Meeting registrations
19. ✅ Handles file upload errors (invalid format, too large, missing) with `FILE_UPLOAD_ERROR`
20. ✅ Handles missing visitor with `VISITOR_NOT_FOUND` error (404)
21. ✅ Handles unverified phone with `PHONE_NOT_VERIFIED` error (400)
22. ✅ All unit tests pass
23. ✅ All integration tests pass
24. ✅ E2E test with TEST_MODE passes

---

**End of Specification**
