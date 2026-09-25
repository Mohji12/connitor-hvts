// Type definitions for Status Check Page
// Shared between page component and tests

export interface StatusPageProps {
  params: Promise<{
    visitId: string;
  }>;
}

export enum VisitStatus {
  REQUEST_SENT = 'REQUEST_SENT',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  CHECKED_IN = 'CHECKED_IN',
  CHECKED_OUT = 'CHECKED_OUT',
}

export interface VisitStatusData {
  visitId: string;
  status: VisitStatus;
  visitor: {
    id: string;
    firstName: string;
    lastName: string;
    fullName: string;
    phone: string;
    photoUrl?: string;
  };
  visitCategory: 'MEETING' | 'DELIVERY' | null;
  submittedAt: string;
  branch: {
    id: string;
    name: string;
    phone?: string;
  };
  meetingDetails?: {
    purpose?: string;
    department?: string;
    staffName?: string;
  };
  deliveryDetails?: {
    platform?: string;
    recipient?: string;
    orderReference?: string;
  };
  approvedAt?: string;
  gatePass?: {
    checkInOtp: string;
    validUntil: string;
    gatePassUrl?: string;
    generatedAt: string;
    sentViaWhatsApp: boolean;
  };
  rejectedAt?: string;
  rejectionReason?: string;
}

export interface VisitStatusResponse {
  success: boolean;
  data: VisitStatusData | null;
  error?: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

export type PollingStatus = 'idle' | 'polling' | 'approved' | 'rejected' | 'error';

export interface PollingState {
  status: PollingStatus;
  data: VisitStatusData | null;
  error: string | null;
  pollCount: number;
  lastPollTime: Date | null;
  isRetryable: boolean;
}
