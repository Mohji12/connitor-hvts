import { z } from 'zod';

export const basicInfoSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  phone: z
    .string()
    .regex(/^\d{10}$/, 'Enter a 10-digit mobile number'),
  email: z.string().email('Enter a valid email'),
  emailType: z.enum(['WORK', 'PERSONAL']),
});

export const professionalSchema = z.object({
  companyName: z.string().min(1, 'Company is required'),
  jobTitle: z.string().min(1, 'Job title is required'),
  linkedinUrl: z.string().url('Enter a valid URL').optional().or(z.literal('')),
});

export const passwordSchema = z
  .object({
    password: z
      .string()
      .min(8, 'At least 8 characters')
      .regex(/[A-Z]/, 'Include an uppercase letter')
      .regex(/[a-z]/, 'Include a lowercase letter')
      .regex(/\d/, 'Include a digit'),
    confirmPassword: z.string(),
    acceptTerms: z.literal(true, { errorMap: () => ({ message: 'You must accept the terms' }) }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export const verifyPhoneSchema = z.object({
  otp: z.string().min(4).max(8),
});

export type BasicInfoValues = z.infer<typeof basicInfoSchema>;
export type ProfessionalValues = z.infer<typeof professionalSchema>;
export type PasswordValues = z.infer<typeof passwordSchema>;

export interface VisitorPreviewData {
  accountId?: string;
  firstName?: string;
  lastName?: string;
  fullName?: string;
  phone?: string;
  email?: string;
  emailType?: 'WORK' | 'PERSONAL';
  companyName?: string;
  jobTitle?: string;
  headline?: string | null;
  linkedinUrl?: string | null;
  photoUrl?: string | null;
  photoBlobUrl?: string | null;
  emailVerified?: boolean;
  phoneVerified?: boolean;
  profileStatus?: string;
}
