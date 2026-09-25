import { z } from 'zod';

// =================================================================
// Enums for Dropdowns
// =================================================================
export const UserTypes = [
  'DOCTOR',
  'NURSE',
  'SURGEON',
  'PHYSICIAN_ASSISTANT',
  'RESIDENT',
  'INTERN',
  'CONSULTANT',
  'CLINICAL_RESEARCHER',
  'SPECIALIST',
  'ANESTHESIOLOGIST',
  'RADIOLOGIST',
  'PATHOLOGIST',
  'PSYCHIATRIST',
  'PHYSIOTHERAPIST',
  'HEAD_NURSE',
  'STAFF_NURSE',
  'NURSE_PRACTITIONER',
  'MIDWIFE',
  'NURSING_ASSISTANT',
  'EMERGENCY_PHYSICIAN',
  'PARAMEDIC',
  'EMT',
  'ICU_SPECIALIST',
  'TRAUMA_SURGEON',
  'PHARMACIST',
  'LAB_TECHNICIAN',
  'LAB_ASSISTANT',
  'DIETICIAN',
  'NUTRITIONIST',
  'OCCUPATIONAL_THERAPIST',
  'SPEECH_THERAPIST',
  'RESPIRATORY_THERAPIST',
  'HOSPITAL_ADMINISTRATOR',
  'DEPARTMENT_HEAD',
  'MEDICAL_RECORDS_STAFF',
  'BILLING_STAFF',
  'RECEPTIONIST',
  'RADIOLOGY_TECHNICIAN',
  'ECG_TECHNICIAN',
  'MEDICAL_TECHNOLOGIST',
  'BIOMEDICAL_ENGINEER',
  'SECURITY_CHIEF',
  'SECURITY_GUARD',
  'FACILITY_MANAGER',
  'HOUSEKEEPING_STAFF',
  'CLEANING_STAFF',
  'MAINTENANCE_STAFF',
  'IT_SUPPORT',
  'PHARMACY_TECHNICIAN',
  'VOLUNTEER_COORDINATOR',
  'PATIENT_COORDINATOR',
] as const;

export const Departments = [
  'GENERAL_MEDICINE',
  'CARDIOLOGY',
  'NEUROLOGY',
  'PULMONOLOGY',
  'NEPHROLOGY',
  'GASTROENTEROLOGY',
  'ENDOCRINOLOGY',
  'ONCOLOGY',
  'HEMATOLOGY',
  'DERMATOLOGY',
  'INFECTIOUS_DISEASE',
  'RHEUMATOLOGY',
  'OPHTHALMOLOGY',
  'DENTISTRY',
  'PAIN_MANAGEMENT',
  'GENERAL_SURGERY',
  'ORTHOPEDICS',
  'NEUROSURGERY',
  'CARDIOTHORACIC_SURGERY',
  'ENT_SURGERY',
  'PLASTIC_RECONSTRUCTIVE_SURGERY',
  'UROLOGY',
  'OBSTETRICS_GYNECOLOGY',
  'PEDIATRICS',
  'NEONATOLOGY',
  'EMERGENCY',
  'INTENSIVE_CARE_UNIT',
  'CRITICAL_CARE_UNIT',
  'TRAUMA_CENTER',
  'RADIOLOGY',
  'PATHOLOGY',
  'PHARMACY',
  'BLOOD_BANK',
  'ANESTHESIOLOGY',
  'RESPIRATORY_CARE',
  'CENTRAL_SUPPLY',
  'NUTRITION_AND_DIETETICS',
  'MEDICAL_RECORDS',
  'SECURITY',
  'ADMINISTRATION',
  'HUMAN_RESOURCES',
  'FINANCE',
  'IT_SUPPORT',
  'LEGAL_COMPLIANCE',
] as const;

export const Roles = [
  'SUPER_ADMIN',
  'CHAIN_ADMIN',
  'BRANCH_ADMIN',
  'HOSPITAL_ADMIN',
  'DEPARTMENT_ADMIN',
  'SUB_DEPARTMENT_ADMIN',
  'SECURITY_SUPERVISOR',
  'SECURITY',
  'STAFF',
] as const;

export const VisitStatuses = [
  'REQUEST_SENT',
  'APPROVED',
  'REJECTED',
  'CHECKED_IN',
  'CHECKED_OUT',
] as const;

/** Datetimes from Python/SQLAlchemy (e.g. 2026-06-03T17:33:27.909000) — no Z suffix. */
export const ApiDateTimeSchema = z.string();

// =================================================================
// Hospital Chain & Branch Schemas
// =================================================================

export const HospitalChainSchema = z.object({
  name: z.string().min(1, 'Chain name is required.'),
  phone: z.string().length(10, 'Phone number must be exactly 10 digits.'),
  email: z.string().email('Invalid email address.'),
  street: z.string().min(1, 'Street is required.'),
  city: z.string().min(1, 'City is required.'),
  state: z.string().min(1, 'State is required.'),
  pinCode: z.string().length(6, 'PIN code must be exactly 6 digits.'),
  country: z.string().min(1, 'Country is required.'),
});

export const BranchSchema = z.object({
  name: z.string().min(1, 'Branch name is required.'),
  email: z.string().email().describe('The contact email for the branch.'),
  phone: z.string().length(10, 'Phone number must be 10 digits.'),
  street: z.string().min(1, 'Street is required.'),
  city: z.string().min(1, 'City is required.'),
  state: z.string().min(1, 'State is required.'),
  pinCode: z.string().length(6, 'PIN code must be 6 digits.'),
  country: z.string().min(1, 'Country is required.'),
});

// Response schemas must accept seeded landline phones (e.g. 08040110001 = 11 chars).
// Create/update forms keep the stricter 10-digit rule above.
export const HospitalChainResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  phone: z.string().min(1),
  email: z.string().email(),
  street: z.string(),
  city: z.string(),
  state: z.string(),
  pinCode: z.string().min(1),
  country: z.string(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

export const BranchResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
  phone: z.string().min(1),
  street: z.string(),
  city: z.string(),
  state: z.string(),
  pinCode: z.string().min(1),
  country: z.string(),
  hospitalChainId: z.string(),
  hospitalChain: z
    .object({
      id: z.string(),
      name: z.string(),
    })
    .passthrough()
    .optional(),
  createdAt: z.string(),
  updatedAt: z.string().optional(),
  qrCode: z.string().nullable().optional(),
});

export type HospitalChain = z.infer<typeof HospitalChainResponseSchema>;
export type HospitalChainFormData = z.infer<typeof HospitalChainSchema>;
export type Branch = z.infer<typeof BranchResponseSchema>;
export type BranchFormData = z.infer<typeof BranchSchema>;

// =================================================================
// Department & Sub-Department Schemas
// =================================================================

export const DepartmentSchema = z.object({
  name: z.string().min(1, 'Department name is required.'),
  code: z.string().min(1, 'Department code is required.'),
  description: z.string().optional(),
  branchId: z.string({ required_error: 'Branch is required.' }),
  hospitalChainId: z.string({ required_error: 'Hospital chain is required.' }),
});

export const SubDepartmentSchema = z.object({
  name: z.string().min(1, 'Sub-department name is required.'),
  code: z.string().min(1, 'Sub-department code is required.'),
  description: z.string().optional(),
  departmentId: z.string({ required_error: 'Department is required.' }),
  branchId: z.string({ required_error: 'Branch is required.' }),
  hospitalChainId: z.string({ required_error: 'Hospital chain is required.' }),
});

export const DepartmentResponseSchema = DepartmentSchema.extend({
  id: z.string(),
  isActive: z.boolean(),
  createdAt: ApiDateTimeSchema,
});

export const SubDepartmentResponseSchema = SubDepartmentSchema.extend({
  id: z.string(),
  isActive: z.boolean(),
  createdAt: ApiDateTimeSchema,
});

export type Department = z.infer<typeof DepartmentResponseSchema>;
export type DepartmentFormData = z.infer<typeof DepartmentSchema>;
export type SubDepartment = z.infer<typeof SubDepartmentResponseSchema>;
export type SubDepartmentFormData = z.infer<typeof SubDepartmentSchema>;

// =================================================================
// User Schemas
// =================================================================

const UserBaseSchema = z.object({
  name: z.string().min(1, 'Name is required.'),
  phone: z.string().length(10, 'Phone must be 10 digits.'),
  email: z.string().email('Invalid email format.'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters.')
    .optional()
    .or(z.literal('')),
});

export const UserFormSchema = z.discriminatedUnion('role', [
  UserBaseSchema.extend({
    role: z.literal('SUPER_ADMIN'),
    hospitalChainId: z.string().optional(),
    branchId: z.string().optional(),
  }),
  UserBaseSchema.extend({
    role: z.literal('CHAIN_ADMIN'),
    hospitalChainId: z.string({
      required_error: 'Hospital Chain is required.',
    }),
    branchId: z.string().optional(),
  }),
  UserBaseSchema.extend({
    role: z.literal('BRANCH_ADMIN'),
    hospitalChainId: z.string({
      required_error: 'Hospital Chain is required.',
    }),
    branchId: z.string({ required_error: 'Branch is required.' }),
  }),
  UserBaseSchema.extend({
    role: z.literal('HOSPITAL_ADMIN'),
    hospitalChainId: z.string({ required_error: 'Hospital Chain is required.' }),
    branchId: z.string({ required_error: 'Branch is required.' }),
  }),
  UserBaseSchema.extend({
    role: z.literal('DEPARTMENT_ADMIN'),
    hospitalChainId: z.string({ required_error: 'Hospital Chain is required.' }),
    branchId: z.string({ required_error: 'Branch is required.' }),
    departmentId: z.string({ required_error: 'Department is required.' }),
  }),
  UserBaseSchema.extend({
    role: z.literal('SUB_DEPARTMENT_ADMIN'),
    hospitalChainId: z.string({ required_error: 'Hospital Chain is required.' }),
    branchId: z.string({ required_error: 'Branch is required.' }),
    departmentId: z.string({ required_error: 'Department is required.' }),
    subDepartmentId: z.string({ required_error: 'Sub-department is required.' }),
  }),
  UserBaseSchema.extend({
    role: z.literal('STAFF'),
    hospitalChainId: z.string({
      required_error: 'Hospital Chain is required.',
    }),
    branchId: z.string({ required_error: 'Branch is required.' }),
    departmentId: z.string({ required_error: 'Department is required.' }),
    subDepartmentId: z.string({ required_error: 'Sub-department is required.' }),
    userType: z.enum(UserTypes, { required_error: 'User Type is required.' }),
    department: z.enum(Departments, {
      required_error: 'Department is required.',
    }),
    location: z.string().optional(),
  }),
  UserBaseSchema.extend({
    role: z.literal('SECURITY'),
    hospitalChainId: z.string({
      required_error: 'Hospital Chain is required.',
    }),
    branchId: z.string({ required_error: 'Branch is required.' }),
    departmentId: z.string({ required_error: 'Department is required.' }),
    subDepartmentId: z.string({ required_error: 'Sub-department is required.' }),
    userType: z.enum(UserTypes).optional(),
    department: z.enum(Departments).optional(),
    location: z.string().optional(),
  }),
  UserBaseSchema.extend({
    role: z.literal('SECURITY_SUPERVISOR'),
    hospitalChainId: z.string({
      required_error: 'Hospital Chain is required.',
    }),
    branchId: z.string({ required_error: 'Branch is required.' }),
    departmentId: z.string({ required_error: 'Department is required.' }),
    subDepartmentId: z.string({ required_error: 'Sub-department is required.' }),
    userType: z.enum(UserTypes).optional(),
    department: z.enum(Departments).optional(),
    location: z.string().optional(),
  }),
]);

export const UserUpdateSchema = UserBaseSchema.extend({
  role: z.enum(Roles).optional(),
  hospitalChainId: z.string().optional(),
  branchId: z.string().optional(),
  departmentId: z.string().optional(),
  subDepartmentId: z.string().optional(),
  userType: z.enum(UserTypes).optional(),
  department: z.enum(Departments).optional(),
  location: z.string().optional(),
  isActive: z.boolean().optional(),
}).partial();

export const UserResponseSchema = UserBaseSchema.extend({
  id: z.string(),
  role: z.enum(Roles),
  isActive: z.boolean(),
  hospitalChainId: z.string().nullable(),
  branchId: z.string().nullable(),
  departmentId: z.string().nullable(),
  subDepartmentId: z.string().nullable(),
  userType: z.enum(UserTypes).nullable(),
  department: z.enum(Departments).nullable(),
  location: z.string().nullable(),
  createdAt: ApiDateTimeSchema,
});

export const AppointmentBookingSchema = z.object({
  branchId: z.string(),
  departmentId: z.string(),
  subDepartmentId: z.string(),
  doctorId: z.string(),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  phone: z.string().length(10),
  email: z.string().email().optional().or(z.literal('')),
  appointmentDate: z.string(),
  purpose: z.string().min(1),
});

export type UserFormData = z.infer<typeof UserFormSchema>;
export type UserUpdateData = z.infer<typeof UserUpdateSchema>;
export type User = z.infer<typeof UserResponseSchema>;

export const SelfRegisterRoles = [
  'CHAIN_ADMIN',
  'BRANCH_ADMIN',
  'SECURITY_SUPERVISOR',
  'SECURITY',
  'STAFF',
] as const;

const SelfRegisterBaseSchema = z.object({
  name: z.string().min(1, 'Name is required.'),
  phone: z.string().length(10, 'Phone must be 10 digits.'),
  email: z.string().email('Invalid email format.'),
});

export const RegistrationProfileStepSchema = SelfRegisterBaseSchema;

export type RegistrationProfileStepData = z.infer<typeof RegistrationProfileStepSchema>;

export const SelfRegistrationFormSchema = z.discriminatedUnion('role', [
  SelfRegisterBaseSchema.extend({
    role: z.literal('CHAIN_ADMIN'),
    hospitalChainId: z.string({ required_error: 'Hospital chain is required.' }),
    branchId: z.string().optional(),
  }),
  SelfRegisterBaseSchema.extend({
    role: z.literal('BRANCH_ADMIN'),
    hospitalChainId: z.string({ required_error: 'Hospital chain is required.' }),
    branchId: z.string({ required_error: 'Branch is required.' }),
  }),
  SelfRegisterBaseSchema.extend({
    role: z.literal('STAFF'),
    hospitalChainId: z.string({ required_error: 'Hospital chain is required.' }),
    branchId: z.string({ required_error: 'Branch is required.' }),
    userType: z.enum(UserTypes, { required_error: 'User type is required.' }),
    department: z.enum(Departments, { required_error: 'Department is required.' }),
    location: z.string().optional(),
  }),
  SelfRegisterBaseSchema.extend({
    role: z.literal('SECURITY'),
    hospitalChainId: z.string({ required_error: 'Hospital chain is required.' }),
    branchId: z.string({ required_error: 'Branch is required.' }),
    location: z.string().optional(),
  }),
  SelfRegisterBaseSchema.extend({
    role: z.literal('SECURITY_SUPERVISOR'),
    hospitalChainId: z.string({ required_error: 'Hospital chain is required.' }),
    branchId: z.string({ required_error: 'Branch is required.' }),
    location: z.string().optional(),
  }),
]);

export type SelfRegistrationFormData = z.infer<typeof SelfRegistrationFormSchema>;

export const PublicHospitalChainSchema = z.object({
  id: z.string(),
  name: z.string(),
});

export const PublicBranchSchema = z.object({
  id: z.string(),
  name: z.string(),
  hospitalChainId: z.string(),
});

export type PublicHospitalChain = z.infer<typeof PublicHospitalChainSchema>;
export type PublicBranch = z.infer<typeof PublicBranchSchema>;

// =================================================================
// Visitor Schemas
// =================================================================

// Add Visitor schema that matches Prisma model
export const VisitorSchema = z.object({
  id: z.string(),
  firstName: z.string(),
  middleName: z.string().nullable(),
  lastName: z.string(),
  phone: z.string(),
  alternatePhone: z.string().nullable(),
  email: z.string().nullable(),
  alternateEmail: z.string().nullable(),
  address: z.string().nullable(),
  company: z.string().nullable(),
  companyWebsite: z.string().nullable(),
  designation: z.string().nullable(),
  photo: z.string().nullable(),
  governmentIdDocument: z.string().nullable(),
  officeIdDocument: z.string().nullable(),
  reportingManagerName: z.string().nullable(),
  reportingManagerPhone: z.string().nullable(),
  branchId: z.string(),
  createdAt: ApiDateTimeSchema,
  updatedAt: ApiDateTimeSchema,
});

export const CreateVisitBySecuritySchema = z.object({
  firstName: z.string().min(1, 'First name is required.'),
  middleName: z.string().optional(),
  lastName: z.string().min(1, 'Last name is required.'),
  phone: z.string().length(10, 'Phone number must be exactly 10 digits.'),
  alternatePhone: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  alternateEmail: z.string().optional(),
  address: z.string().optional(),
  company: z.string().optional(),
  companyWebsite: z.string().optional(),
  designation: z.string().optional(),
  photo: z.string().optional(),
  purpose: z.string().min(3, 'Purpose of visit is required.'),
  department: z.enum(Departments).optional(),
  personToMeet: z.string().optional(),
  staffName: z.string().optional(),
  staffPhone: z.string().optional(),
  visitingCardPhoto: z.string().optional(),
});

export const CreateVisitSchema = z.object({
  firstName: z.string().min(1, 'First name is required.'),
  middleName: z.string().optional(),
  lastName: z.string().min(1, 'Last name is required.'),
  phone: z.string().length(10, 'Phone number must be exactly 10 digits.'),
  email: z.string().email().optional().or(z.literal('')),
  purpose: z.string().min(3, 'Purpose of visit is required.'),
  department: z.enum(Departments).optional(),
  staffId: z.string().optional(),
  branchId: z.string({ required_error: 'Branch ID is required.' }),
  staffName: z.string().optional(),
  staffPhone: z.string().optional(),
  visitingCardPhoto: z.string().optional(),
});

export const VerifyVisitCodeSchema = z.object({
  phone: z.string().length(10, 'Phone must be 10 digits.'),
  visitCode: z.string().min(1, 'Visit code is required.'),
});

export const RejectVisitFormSchema = z.object({
  rejectionReason: z.string().min(1, 'A reason for rejection is required.'),
});

export const VisitorSummarySchema = z.object({
  id: z.string(),
  visitorName: z.string(),
  visitorPhone: z.string(),
  personToMeet: z.string(),
  purpose: z.string(),
  visitorPhoto: z.string().nullable(),
  status: z.enum([
    'PENDING',
    'REQUEST_SENT',
    'APPROVED',
    'CHECKED_IN',
    'CHECKED_OUT',
    'REJECTED',
  ]),
  checkInTime: ApiDateTimeSchema.nullable(),
  checkOutTime: ApiDateTimeSchema.nullable(),
  createdAt: ApiDateTimeSchema,
  checkedInBy: z.string().optional().nullable(),
  checkedInLocation: z.string().optional().nullable(),
  checkedOutLocation: z.string().optional().nullable(),
  checkedOutBy: z.string().optional().nullable(),
  visitorEmail: z.string().optional().nullable(),
  visitorAddress: z.string().optional().nullable(),
  rejectionReason: z.string().optional().nullable(),
  visitCode: z.string().optional().nullable(),
  visitQRCode: z.string().optional().nullable(),
});

export const VisitorSummaryResponseSchema = z.object({
  data: z.array(VisitorSummarySchema),
  total: z.number(),
  page: z.number().optional().default(1),
  limit: z.number().optional().default(20),
});

// Updated StaffVisitorSchema to match the nested structure expected by MyVisitors.tsx
export const StaffVisitorSchema = z.object({
  id: z.string(),
  purpose: z.string().nullable(),
  department: z.enum(Departments).nullable(),
  checkInTime: ApiDateTimeSchema.nullable(),
  checkOutTime: ApiDateTimeSchema.nullable(),
  durationMinutes: z.number().nullable(),
  status: z.enum(VisitStatuses),
  rejectionReason: z.string().nullable(),
  appointmentDate: ApiDateTimeSchema.nullable().optional(),
  appointmentMode: z.string().optional(),
  meetingProvider: z.string().nullable().optional(),
  meetingJoinUrl: z.string().nullable().optional(),
  meetingHostUrl: z.string().nullable().optional(),
  zoomJoinUrl: z.string().nullable().optional(),
  zoomStartUrl: z.string().nullable().optional(),
  staffName: z.string().nullable(),
  staffPhone: z.string().nullable(),
  visitingCardPhoto: z.string().nullable(),
  visitor: VisitorSchema,
  branchId: z.string(),
  createdAt: ApiDateTimeSchema,
  updatedAt: ApiDateTimeSchema,
});

export const StaffVisitorResponseSchema = z.array(StaffVisitorSchema);

export type StaffVisitor = z.infer<typeof StaffVisitorSchema>;
export type RejectVisitFormData = z.infer<typeof RejectVisitFormSchema>;
export type VisitorSummary = z.infer<typeof VisitorSummarySchema>;
export type ReturningVisitorFormData = z.infer<
  typeof CreateVisitBySecuritySchema
>;
export type VerifyVisitCodeFormData = z.infer<typeof VerifyVisitCodeSchema>;
export type Visitor = z.infer<typeof VisitorSchema>;

// =================================================================
// Security Check-in Schema
// =================================================================

export const SecurityCheckInSchema = z.object({
  phone: z.string().length(10, 'Phone number must be exactly 10 digits.'),
  branchId: z.string(),
  firstName: z.string().min(1, 'First name is required.'),
  middleName: z.string().optional(),
  lastName: z.string().min(1, 'Last name is required.'),
  alternatePhone: z.string().optional(),
  email: z.string().email().optional(),
  alternateEmail: z.string().email().optional(),
  address: z.string().optional(),
  company: z.string().optional(),
  companyWebsite: z.string().optional(),
  designation: z.string().optional(),
  photo: z.string().optional(),
  purpose: z.string().min(3, 'Purpose of visit is required.'),
  department: z.enum(Departments).optional(),
  personToMeet: z.string().optional(),
  staffName: z.string().optional(),
  staffPhone: z.string().optional(),
  visitingCardPhoto: z.string().optional(),
  reportingManagerName: z.string().optional(),
  reportingManagerPhone: z.string().optional(),
});

export type SecurityCheckInFormData = z.infer<typeof SecurityCheckInSchema>;

// =================================================================
// Visitor Registration Schema
// =================================================================

export const RegisterVisitorSchema = z.object({
  phone: z.string().length(10, 'Phone number must be 10 digits'),
  branchId: z.string(),
  firstName: z.string().min(1, 'First name is required.'),
  middleName: z.string().optional(),
  lastName: z.string().min(1, 'Last name is required.'),
  email: z.string().email().optional().or(z.literal('')),
  alternateEmail: z.string().email().optional().or(z.literal('')),
  address: z.string().optional().or(z.literal('')),
  company: z.string().optional().or(z.literal('')),
  companyWebsite: z.string().optional().or(z.literal('')),
  designation: z.string().optional().or(z.literal('')),
  alternatePhone: z.string().optional().or(z.literal('')),
  reportingManagerName: z.string().optional().or(z.literal('')),
  reportingManagerPhone: z.string().optional().or(z.literal('')),
  photo: z.string().optional(),
  governmentIdDocument: z.string().optional(),
  officeIdDocument: z.string().optional(),
});

export const CreateVisitRequestSchema = z.object({
  phone: z.string().length(10, 'Phone number must be exactly 10 digits.'),
  purpose: z.string().min(3, 'Purpose of visit is required.'),
  department: z.enum(Departments).optional(),
  personToMeet: z.string().optional(),
  staffName: z.string().optional(),
  staffPhone: z.string().optional(),
  visitingCardPhoto: z.string().optional(),
});

// Public visitor registration schema (for QR code flow)
export const PublicRegisterVisitorSchema = z.object({
  phone: z.string().length(10, 'Phone number must be exactly 10 digits.'),
  firstName: z.string().min(1, 'First name is required.'),
  middleName: z.string().optional(),
  lastName: z.string().min(1, 'Last name is required.'),
  alternatePhone: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  alternateEmail: z.string().email().optional().or(z.literal('')),
  address: z.string().optional(),
  company: z.string().optional(),
  companyWebsite: z.string().optional(),
  designation: z.string().optional(),
  reportingManagerName: z.string().optional(),
  reportingManagerPhone: z.string().optional(),
  photo: z.string().optional(),
  governmentIdDocument: z.string().optional(),
  officeIdDocument: z.string().optional(),
});

export type RegisterVisitorFormData = z.infer<typeof RegisterVisitorSchema>;
export type CreateVisitRequestFormData = z.infer<
  typeof CreateVisitRequestSchema
>;
export type PublicRegisterVisitorFormData = z.infer<
  typeof PublicRegisterVisitorSchema
>;
