import axios from 'axios';
import apiClient from '@/lib/api';

/**
 * API Error class for handling API errors with specific error codes
 */
export class ApiError extends Error {
  statusCode: number;
  code: string;

  constructor({
    statusCode,
    code,
    message,
  }: {
    statusCode: number;
    code: string;
    message: string;
  }) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.name = 'ApiError';
  }
}

/**
 * Request type for OTP verification
 */
export interface VerifyCheckInOtpRequest {
  /** 6-digit OTP string */
  otp: string;
  /** Branch ID where the check-in is happening */
  branchId: string;
}

/**
 * Request type for visitor search
 */
export interface SearchVisitorsRequest {
  /** 10-digit phone number to search for */
  phone: string;
  /** Branch ID to filter visitors */
  branchId: string;
}

/**
 * Visitor information in the OTP verification response
 */
export interface VisitorInfo {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email?: string | null;
  photo?: string | null;
  company?: string | null;
}

/**
 * Visit information in the OTP verification response
 */
export interface VisitInfo {
  id: string;
  visitCategory: 'MEETING' | 'DELIVERY';
  visitSubType?: string | null;
  status: string;
  checkInOtp: string;
  checkInOtpExpiry: string;
  purpose?: string | null;
  department?: string | null;
  deliveryPlatform?: string | null;
  deliveryRecipient?: string | null;
  orderReference?: string | null;
  appointmentDate?: string | null;
  idProofVerified?: boolean;
  idProofType?: string | null;
  staffName?: string | null;
  staffPhone?: string | null;
  visitorPassId?: string | null;
}

/**
 * Response type for OTP verification
 */
export interface VerifyCheckInOtpResponse {
  success: boolean;
  visitId: string;
  visitorId: string;
  visitor: VisitorInfo;
  visit: VisitInfo;
  canCheckIn: boolean;
  canCheckOut?: boolean;
}

/**
 * Visitor data from search response
 */
export interface VisitorSearchData {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email?: string | null;
  photo?: string | null;
  company?: string | null;
  designation?: string | null;
  lastVisit?: {
    visitDate: string;
    status: string;
  } | null;
}

/**
 * Response type for visitor search
 */
export interface SearchVisitorsResponse {
  found: boolean;
  visitor?: VisitorSearchData;
}

/**
 * Maps error codes to user-friendly messages
 * @param code - The error code from the API
 * @returns User-friendly error message
 */
export function mapErrorCodeToMessage(code: string): string {
  if (code.startsWith('SLOT_NOT_STARTED')) {
    const rest = code.replace(/^SLOT_NOT_STARTED:?\s*/, '').trim();
    return rest || 'Meeting has not started yet. Do not check in this visitor yet.';
  }
  if (code.startsWith('HOLD_CURRENT_VISIT')) {
    const rest = code.replace(/^HOLD_CURRENT_VISIT:?\s*/, '').trim();
    return rest || 'Hold this visitor — the current appointment for this doctor is still in progress.';
  }
  switch (code) {
    case 'INVALID_OTP':
      return 'Invalid OTP. Please check and try again.';
    case 'CHECKIN_OTP_EXPIRED':
      return 'This OTP has expired. Please contact staff.';
    case 'ALREADY_CHECKED_IN':
      return 'Visitor is already checked in.';
    case 'VISIT_NOT_FOUND':
      return 'Visitor not found. Try phone lookup instead.';
    case 'INVALID_QR_CODE':
      return 'Invalid QR code. Ask the visitor to show their approval QR.';
    case 'VISIT_NOT_APPROVED':
      return 'This visit is not approved for check-in yet.';
    case 'QR_CODE_ALREADY_USED':
      return 'This QR code was already used for check-in.';
    default:
      return 'Verification failed. Please try again.';
  }
}

/**
 * Verifies a check-in OTP with the backend
 * @param request - The OTP verification request containing otp and branchId
 * @returns Promise resolving to the verification response
 * @throws ApiError when verification fails with specific error codes:
 *   - 'INVALID_OTP': OTP does not match
 *   - 'CHECKIN_OTP_EXPIRED': OTP has expired
 *   - 'ALREADY_CHECKED_IN': Visit is already checked in
 *   - 'VISIT_NOT_FOUND': No visit found with matching OTP
 */
export async function verifyCheckInOtp(
  request: VerifyCheckInOtpRequest,
): Promise<VerifyCheckInOtpResponse> {
  try {
    const response = await apiClient.post<VerifyCheckInOtpResponse>(
      '/api/visitors/verify-checkin-otp',
      request,
    );

    if (!response.data.success) {
      throw new ApiError({
        statusCode: 400,
        code: 'VERIFICATION_FAILED',
        message: 'Verification failed. Please try again.',
      });
    }

    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.data) {
      const detail = (error.response.data as { detail?: string | { msg?: string }[] }).detail;
      const code =
        typeof detail === 'string'
          ? detail
          : Array.isArray(detail)
            ? detail[0]?.msg ?? 'VERIFICATION_FAILED'
            : 'VERIFICATION_FAILED';
      throw new ApiError({
        statusCode: error.response.status,
        code,
        message: mapErrorCodeToMessage(code),
      });
    }
    throw error;
  }
}

/**
 * Verifies a visitor check-in QR code scanned by security.
 */
export async function scanCheckInQr(qrPayload: string): Promise<VerifyCheckInOtpResponse> {
  try {
    const response = await apiClient.post<VerifyCheckInOtpResponse>(
      '/api/visitors/scan-qr',
      { qrPayload },
    );

    if (!response.data.success) {
      throw new ApiError({
        statusCode: 400,
        code: 'VERIFICATION_FAILED',
        message: 'QR verification failed. Please try again.',
      });
    }

    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.data) {
      const detail = (error.response.data as { detail?: string | { msg?: string }[] }).detail;
      const code =
        typeof detail === 'string'
          ? detail
          : Array.isArray(detail)
            ? detail[0]?.msg ?? 'VERIFICATION_FAILED'
            : 'VERIFICATION_FAILED';
      throw new ApiError({
        statusCode: error.response.status,
        code,
        message: mapErrorCodeToMessage(code),
      });
    }
    throw error;
  }
}

/**
 * Searches for a visitor by phone number
 * @param request - The search request containing phone and branchId
 * @returns Promise resolving to the search response
 * @throws ApiError when search fails with specific error codes:
 *   - 'INVALID_PHONE_FORMAT': Phone number format is invalid
 *   - 'NETWORK_ERROR': Connection issues
 *   - 'SERVER_ERROR': Server-side errors
 */
export async function searchVisitors(
  request: SearchVisitorsRequest,
): Promise<SearchVisitorsResponse> {
  const response = await apiClient.get<SearchVisitorsResponse>(
    `/api/visitors/search?phone=${encodeURIComponent(request.phone)}&branchId=${encodeURIComponent(request.branchId)}`,
  );

  return response.data;
}

/**
 * Type for OTP verification state
 */
export type OtpVerificationState = 'idle' | 'loading' | 'success' | 'error';

/**
 * Type for phone lookup state
 */
export type PhoneLookupState = 'idle' | 'loading' | 'found' | 'not_found' | 'error';

/**
 * Type for tab view mode
 */
export type TabViewMode = 'qr' | 'otp' | 'phone' | 'visitor_details';
