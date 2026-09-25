import { approveVisit, rejectVisit, ApproveVisitResponse, RejectVisitResponse } from './visit.service';
import apiClient from '@/lib/api';
import { AxiosError } from 'axios';

// Mock the API client
jest.mock('@/lib/api');
const mockedApiClient = apiClient as jest.Mocked<typeof apiClient>;

describe('VisitService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('approveVisit', () => {
    const mockVisitId = 'visit-123';
    const mockSuccessResponse: ApproveVisitResponse = {
      success: true,
      visit: {
        id: mockVisitId,
        status: 'APPROVED',
        checkInOtp: '123456',
        checkInOtpExpiry: '2026-02-11T12:00:00Z',
      },
    };

    it('should successfully approve a visit', async () => {
      mockedApiClient.patch.mockResolvedValueOnce({ data: mockSuccessResponse });

      const result = await approveVisit(mockVisitId);

      expect(mockedApiClient.patch).toHaveBeenCalledWith(`/api/security/visits/${mockVisitId}/approve`, {});
      expect(result).toEqual(mockSuccessResponse);
      expect(result.visit.status).toBe('APPROVED');
      expect(result.visit.checkInOtp).toBe('123456');
    });

    it('should throw error when visit not found', async () => {
      const error = {
        response: {
          status: 404,
          data: {
            success: false,
            code: 'VISIT_NOT_FOUND',
            message: 'Visit not found',
          },
        },
      } as AxiosError;

      mockedApiClient.patch.mockRejectedValueOnce(error);

      await expect(approveVisit(mockVisitId)).rejects.toThrow('Visit not found');
    });

    it('should throw error when visit already processed', async () => {
      const error = {
        response: {
          status: 409,
          data: {
            success: false,
            code: 'VISIT_ALREADY_PROCESSED',
            message: 'Visit already processed',
          },
        },
      } as AxiosError;

      mockedApiClient.patch.mockRejectedValueOnce(error);

      await expect(approveVisit(mockVisitId)).rejects.toThrow('Visit already processed');
    });

    it('should throw error when visitor already checked in', async () => {
      const error = {
        response: {
          status: 409,
          data: {
            success: false,
            code: 'ALREADY_CHECKED_IN',
            message: 'Visitor already checked in',
          },
        },
      } as AxiosError;

      mockedApiClient.patch.mockRejectedValueOnce(error);

      await expect(approveVisit(mockVisitId)).rejects.toThrow('Visitor already checked in');
    });

    it('should throw error for validation failure', async () => {
      const error = {
        response: {
          status: 400,
          data: {
            success: false,
            code: 'VALIDATION_FAILED',
            message: 'Invalid request data',
          },
        },
      } as AxiosError;

      mockedApiClient.patch.mockRejectedValueOnce(error);

      await expect(approveVisit(mockVisitId)).rejects.toThrow('Invalid request data');
    });

    it('should throw generic error for network issues', async () => {
      const error = {
        message: 'Network Error',
      } as AxiosError;

      mockedApiClient.patch.mockRejectedValueOnce(error);

      await expect(approveVisit(mockVisitId)).rejects.toThrow('Connection error. Please try again.');
    });
  });

  describe('rejectVisit', () => {
    const mockVisitId = 'visit-123';
    const mockReason = 'Not on approved list';
    const mockSuccessResponse: RejectVisitResponse = {
      success: true,
      visit: {
        id: mockVisitId,
        status: 'REJECTED',
      },
    };

    it('should successfully reject a visit with reason', async () => {
      mockedApiClient.patch.mockResolvedValueOnce({ data: mockSuccessResponse });

      const result = await rejectVisit(mockVisitId, mockReason);

      expect(mockedApiClient.patch).toHaveBeenCalledWith(`/api/security/visits/${mockVisitId}/reject`, {
        rejectionReason: mockReason,
      });
      expect(result).toEqual(mockSuccessResponse);
      expect(result.visit.status).toBe('REJECTED');
    });

    it('should throw error when visit not found', async () => {
      const error = {
        response: {
          status: 404,
          data: {
            success: false,
            code: 'VISIT_NOT_FOUND',
            message: 'Visit not found',
          },
        },
      } as AxiosError;

      mockedApiClient.patch.mockRejectedValueOnce(error);

      await expect(rejectVisit(mockVisitId, mockReason)).rejects.toThrow('Visit not found');
    });

    it('should throw error when visit already processed', async () => {
      const error = {
        response: {
          status: 409,
          data: {
            success: false,
            code: 'VISIT_ALREADY_PROCESSED',
            message: 'Visit already processed',
          },
        },
      } as AxiosError;

      mockedApiClient.patch.mockRejectedValueOnce(error);

      await expect(rejectVisit(mockVisitId, mockReason)).rejects.toThrow('Visit already processed');
    });

    it('should throw error for invalid reason validation', async () => {
      const error = {
        response: {
          status: 400,
          data: {
            success: false,
            code: 'VALIDATION_FAILED',
            message: 'Reason must be at least 5 characters',
          },
        },
      } as AxiosError;

      mockedApiClient.patch.mockRejectedValueOnce(error);

      await expect(rejectVisit(mockVisitId, 'Too short')).rejects.toThrow(
        'Invalid request data'
      );
    });

    it('should throw generic error for network issues', async () => {
      const error = {
        message: 'Network Error',
      } as AxiosError;

      mockedApiClient.patch.mockRejectedValueOnce(error);

      await expect(rejectVisit(mockVisitId, mockReason)).rejects.toThrow(
        'Connection error. Please try again.'
      );
    });
  });
});
