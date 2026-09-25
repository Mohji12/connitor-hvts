/**
 * Type definitions for the Visitor Registration Wizard
 * Extracted from page.tsx to comply with Next.js 15 App Router page export constraints
 * Updated for Task 9.3 - Phone Authentication Integration
 * Updated for Task 9.4 - Forms Integration
 */

import { Departments } from '@/lib/schema/schema';

export type Department = typeof Departments[number];

export enum WizardStep {
  PHONE_ENTRY = 'phone-entry',
  PHONE_VERIFICATION = 'phone-verification',
  VISIT_TYPE_SELECTION = 'visit-type',
  VISITOR_REGISTRATION = 'visitor-registration',
  VISIT_DETAILS = 'visit-details',
  CONFIRMATION = 'confirmation',
}

export enum VisitType {
  MEETING = 'MEETING',
  DELIVERY = 'DELIVERY',
}

/**
 * Phone data structure as per Task 9.3 specification
 * Stores phone verification state and existing visitor data
 */
export interface PhoneData {
  phone: string;                 // 10-digit phone number (validated)
  branchId: string;               // UUID v4 from QR code
  isVerified: boolean;            // Phone verification status
  visitorId?: string;             // Visitor ID (populated after verification)
  isNewVisitor?: boolean;         // True if first-time visitor at branch
  otpExpiry?: string;             // OTP expiry timestamp (ISO 8601)
  attemptsRemaining?: number;     // OTP attempts remaining (max 3)
  // Legacy fields for backward compatibility
  countryCode?: string;           // Default: '+91'
  fullPhone?: string;             // Full phone with country code
  isExistingVisitor?: boolean;    // Inverse of isNewVisitor
  existingVisitorData?: ExistingVisitorData;
}

/**
 * Existing visitor data structure from verify-phone API
 * Used for pre-filling registration forms
 */
export interface ExistingVisitorData {
  id: string;
  firstName: string;
  middleName?: string | null;
  lastName: string;
  email?: string | null;
  company?: string | null;
  designation?: string | null;
  address?: string | null;
  phoneVerified: boolean;
}

export interface MeetingVisitorFormData {
  firstName: string;
  middleName?: string;
  lastName: string;
  email: string;
  company?: string;
  companyWebsite?: string;
  designation?: string;
  address?: string;
  phone: string;
  alternatePhone?: string;
  alternateEmail?: string;
  reportingManagerName?: string;
  reportingManagerPhone?: string;
  photo: File;
  governmentIdDocument: File;
  officeIdDocument?: File;
}

export interface DeliveryVisitorFormData {
  firstName: string;
  middleName?: string;
  lastName: string;
  photo: File;
  alternatePhone?: string;
  alternateEmail?: string;
  company?: string;
  companyWebsite?: string;
}

export interface MeetingVisitDetails {
  department: string;
  hostId?: string;
  purpose: string;
  staffName?: string;      // For manual entry when "Other" is selected
  staffPhone?: string;     // For manual entry when "Other" is selected
  visitorType?: 'GENERAL' | 'SALES_REPRESENTATIVE' | 'VENDOR';
  companyName?: string;
  companyEmail?: string;
}

export interface DeliveryVisitDetails {
  platform: string;
  recipient: string;
  orderReference?: string;
}

/**
 * StaffMember interface from Task 9.4 spec
 * Used for host selection in Meeting Details step
 */
export interface StaffMember {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  department: Department | null;
}

export interface WizardState {
  currentStep: WizardStep;
  visitType: VisitType | null;
  phoneData: PhoneData | null;
  visitorFormData: MeetingVisitorFormData | DeliveryVisitorFormData | null;
  visitDetails: MeetingVisitDetails | DeliveryVisitDetails | null;
  visitId: string | null;
  isSubmitting: boolean;
  apiError: string | null;
  // Additional state for form persistence (Task 9.4)
  deliveryFormData: DeliveryVisitorFormData | null;
  deliveryDetailsData: DeliveryVisitDetails | null;
  meetingFormData: MeetingVisitorFormData | null;
  meetingDetailsData: MeetingVisitDetails | null;
  selectedHost: StaffMember | null;
}

export interface StepCallbacks {
  onNext: () => void;
  onBack: () => void;
  onCancel: () => void;
}

// ============================================================================
// Session Storage Persistence Types (Mobile Photo Capture Bug Fix)
// ============================================================================

/**
 * Serializable version of WizardState that can be stored in sessionStorage.
 * File objects are replaced with base64 data URLs for JSON serialization.
 */
export interface SerializableWizardState {
  currentStep: WizardStep;
  visitType: VisitType | null;
  phoneData: PhoneData | null;
  visitId: string | null;
  apiError: string | null;
  // Delivery form data (text fields only, files stored as data URLs)
  deliveryFormData: Omit<DeliveryVisitorFormData, 'photo'> | null;
  deliveryDetailsData: DeliveryVisitDetails | null;
  // Meeting form data (text fields only, files stored as data URLs)
  meetingFormData: Omit<MeetingVisitorFormData, 'photo' | 'governmentIdDocument' | 'officeIdDocument'> | null;
  meetingDetailsData: MeetingVisitDetails | null;
  selectedHost: StaffMember | null;
  // File data URLs (base64-encoded) for surviving page refreshes
  photoDataUrl: string | null;
  govIdDataUrl: string | null;
  officeIdDataUrl: string | null;
  // Metadata
  savedAt: number; // Unix timestamp for expiry checks
}

/** The sessionStorage key for wizard state */
export const WIZARD_STORAGE_KEY = 'visitor-registration-wizard-state';

/** Auto-expire saved state after 30 minutes */
export const WIZARD_STATE_EXPIRY_MS = 30 * 60 * 1000;

/**
 * Convert a base64 data URL back to a File object.
 * Used when restoring wizard state from sessionStorage after a page refresh.
 */
export function dataUrlToFile(dataUrl: string, filename: string, mimeType: string): File {
  const arr = dataUrl.split(',');
  const bstr = atob(arr[1]);
  const u8arr = new Uint8Array(bstr.length);
  for (let i = 0; i < bstr.length; i++) {
    u8arr[i] = bstr.charCodeAt(i);
  }
  return new File([u8arr], filename, { type: mimeType });
}

/**
 * Convert a File to a base64 data URL string.
 * Returns a Promise that resolves with the data URL.
 */
export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}
