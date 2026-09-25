// Type definitions for Gate Pass Page
// Shared between page component and tests

import type { GatePassVisitorData } from '@/components/visitors/shared/GatePassView';

export interface GatePassPageProps {
  params: Promise<{
    visitId: string;
  }>;
}

export type PageState = 'loading' | 'error' | 'expired' | 'success';

export enum VisitStatus {
  REQUEST_SENT = 'REQUEST_SENT',
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  CHECKED_IN = 'CHECKED_IN',
  CHECKED_OUT = 'CHECKED_OUT',
}

export interface GatePassData {
  checkInOtp: string;
  validUntil: string;           // ISO 8601 timestamp
  gatePassUrl?: string;
  checkInQrCode?: string;
  generatedAt: string;
  sentViaWhatsApp: boolean;
  isUsed?: boolean;
}

export interface VisitStatusWithGatePass {
  visitId: string;
  status: VisitStatus;
  approvedAt: string;
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
    address?: string;
    phone?: string;
  };
  gatePass: GatePassData;
  meetingDetails?: {
    purpose?: string;
    department?: string;
    staffName?: string;
    staffPhone?: string;
  };
  deliveryDetails?: {
    platform?: string;
    recipient?: string;
    orderReference?: string;
  };
}

export interface VisitStatusRejected {
  visitId: string;
  status: VisitStatus.REJECTED;
  rejectedAt: string;
  rejectionReason?: string;
  visitor: {
    id: string;
    firstName: string;
    lastName: string;
    fullName: string;
    phone: string;
  };
  visitCategory: 'MEETING' | 'DELIVERY' | null;
  submittedAt: string;
  branch: {
    id: string;
    name: string;
  };
}

export interface VisitStatusCheckedIn {
  visitId: string;
  status: VisitStatus.CHECKED_IN;
  checkedInAt: string;
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
  };
  gatePass: GatePassData;
  meetingDetails?: {
    purpose?: string;
    department?: string;
    staffName?: string;
  };
  deliveryDetails?: {
    platform?: string;
    recipient?: string;
  };
}

export interface VisitStatusCheckedOut {
  visitId: string;
  status: VisitStatus.CHECKED_OUT;
  checkedInAt: string;
  checkedOutAt: string;
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
  };
  meetingDetails?: {
    purpose?: string;
    department?: string;
    staffName?: string;
  };
  deliveryDetails?: {
    platform?: string;
    recipient?: string;
  };
}

export interface VisitStatusApiResponse {
  success: true;
  data: VisitStatusWithGatePass | VisitStatusRejected | VisitStatusCheckedIn | VisitStatusCheckedOut;
}

export interface ApiError {
  code: 'VISIT_NOT_FOUND' | 'INVALID_VISIT_ID' | 'NETWORK_ERROR' | 'UNKNOWN_ERROR';
  message: string;
}

export interface GatePassState {
  pageState: PageState;
  visitor: GatePassVisitorData | null;
  otp: string;
  validityTimestamp: Date | null;
  error: string | null;
  errorCode?: string;
  isRetryable: boolean;
  branchPhone?: string;
  visitStatus: VisitStatus | null;
  qrCodeDataUrl?: string | null;
}

export type ErrorDisplayConfig = {
  icon: 'alert' | 'not-found' | 'invalid';
  title: string;
  message: string;
  showRetry: boolean;
  showContactSecurity: boolean;
};
