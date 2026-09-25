import { VisitCategory } from '@/lib/constants/visit-constants';

/**
 * Unified Visit Status Enum
 * Used across all Security Dashboard Logs components (Tasks 7.1-7.5)
 *
 * Status flow:
 * PENDING → REQUEST_SENT (security user pending approval)
 * REQUEST_SENT → APPROVED (approved, OTP generated)
 * APPROVED → CHECKED_IN (visitor arrived, verified OTP)
 * CHECKED_IN → CHECKED_OUT (visitor left)
 * REQUEST_SENT → REJECTED (denied entry)
 */
export enum VisitStatus {
  PENDING = 'PENDING',
  REQUEST_SENT = 'REQUEST_SENT',
  APPROVED = 'APPROVED',
  CHECKED_IN = 'CHECKED_IN',
  CHECKED_OUT = 'CHECKED_OUT',
  REJECTED = 'REJECTED',
}

/**
 * UI-friendly filter names for the status pills.
 * Maps to VisitStatus enum values via visitStatuses field.
 */
export type StatusFilter = 'PENDING' | 'APPROVED' | 'IN' | 'OUT';

/**
 * Configuration for status filter pills
 */
export interface StatusFilterConfig {
  id: StatusFilter;
  label: string;
  visitStatuses: VisitStatus[];
  color: 'blue' | 'emerald' | 'purple' | 'gray';
}

/**
 * Visitor counts by status
 */
export interface VisitorCounts {
  pending: number;
  approved: number;
  checkedIn: number;
  checkedOut: number;
  rejected: number;
}

/**
 * Visitor profile data for the visitor list
 */
export interface VisitorProfile {
  id: string;
  visitorName: string;
  visitorPhone: string;
  visitorEmail?: string | null;
  visitorPhoto?: string | null;
  visitType?: VisitCategory;
  status: VisitStatus;
  personToMeet?: string;
  purpose?: string;
  checkInTime?: string | null;
  checkOutTime?: string | null;
}

/**
 * API Response for visitor counts
 */
export interface VisitorCountsResponse {
  success: boolean;
  data: VisitorCounts;
}

/**
 * API Response for visitor list
 */
export interface VisitorListResponse {
  success: boolean;
  data: {
    visitors: VisitorProfile[];
    totalCount: number;
  };
}

/**
 * Error response from API
 */
export interface ErrorResponse {
  success: false;
  code: string;
  message: string;
}
