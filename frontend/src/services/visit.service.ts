import apiClient from '@/lib/api';
import { AxiosError } from 'axios';

/**
 * Response from approve visit endpoint
 */
export interface ApproveVisitResponse {
  success: boolean;
  visit: {
    id: string;
    status: 'APPROVED';
    checkInOtp: string;
    checkInOtpExpiry: string;
  };
}

/**
 * Response from reject visit endpoint
 */
export interface RejectVisitResponse {
  success: boolean;
  visit: {
    id: string;
    status: 'REJECTED';
  };
}

/**
 * Error response structure from API
 */
interface ApiErrorResponse {
  success: false;
  code: string;
  message: string;
}

/**
 * Maps API error codes to user-friendly messages
 */
function mapErrorToMessage(code: string, defaultMessage: string): string {
  const errorMap: Record<string, string> = {
    VISIT_NOT_FOUND: 'Visit not found',
    VISIT_ALREADY_PROCESSED: 'Visit already processed',
    ALREADY_CHECKED_IN: 'Visitor already checked in',
    VALIDATION_FAILED: 'Invalid request data',
  };

  return errorMap[code] || defaultMessage;
}

/**
 * Approve a pending visit and generate Check-In OTP
 *
 * @param visitId - The ID of the visit to approve
 * @returns Promise resolving to approval response with OTP details
 * @throws Error with user-friendly message on failure
 *
 * Error codes:
 * - 400 VALIDATION_FAILED: Invalid request
 * - 404 VISIT_NOT_FOUND: Visit doesn't exist
 * - 409 VISIT_ALREADY_PROCESSED: Visit not in PENDING status
 * - 409 ALREADY_CHECKED_IN: Visitor already checked in
 */
export async function approveVisit(
  visitId: string,
): Promise<ApproveVisitResponse> {
  try {
    const response = await apiClient.patch<ApproveVisitResponse>(
      `/api/security/visits/${visitId}/approve`,
      {}, // Empty body as per spec
    );

    return response.data;
  } catch (error) {
    const axiosError = error as AxiosError<ApiErrorResponse>;

    if (axiosError.response?.data) {
      const { code, message } = axiosError.response.data;
      throw new Error(mapErrorToMessage(code, message));
    }

    // Network or other errors
    throw new Error('Connection error. Please try again.');
  }
}

/**
 * Reject a pending visit with reason
 *
 * @param visitId - The ID of the visit to reject
 * @param reason - Rejection reason (min 5 chars, max 500 chars)
 * @returns Promise resolving to rejection response
 * @throws Error with user-friendly message on failure
 *
 * Error codes:
 * - 400 VALIDATION_FAILED: Invalid reason format
 * - 404 VISIT_NOT_FOUND: Visit doesn't exist
 * - 409 VISIT_ALREADY_PROCESSED: Visit not in PENDING status
 */
export async function rejectVisit(
  visitId: string,
  reason: string,
): Promise<RejectVisitResponse> {
  try {
    const response = await apiClient.patch<RejectVisitResponse>(
      `/api/security/visits/${visitId}/reject`,
      { rejectionReason: reason },
    );

    return response.data;
  } catch (error) {
    const axiosError = error as AxiosError<ApiErrorResponse>;

    if (axiosError.response?.data) {
      const { code, message } = axiosError.response.data;
      throw new Error(mapErrorToMessage(code, message));
    }

    // Network or other errors
    throw new Error('Connection error. Please try again.');
  }
}
