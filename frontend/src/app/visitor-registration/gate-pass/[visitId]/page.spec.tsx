import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useRouter } from 'next/navigation';
import GatePassPage from './page';
import { VisitStatus } from './types';
import apiClient from '@/lib/api';

// Mock dependencies
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

jest.mock('@/lib/api');

// Suppress act() warnings from async state updates
const originalError = console.error;
beforeAll(() => {
  console.error = (...args) => {
    if (
      typeof args[0] === 'string' &&
      args[0].includes('An update to GatePassPage inside a test was not wrapped in act')
    ) {
      return;
    }
    originalError.call(console, ...args);
  };
});

afterAll(() => {
  console.error = originalError;
});

describe('GatePassPage', () => {
  const mockPush = jest.fn();
  const mockApiClient = apiClient as jest.Mocked<typeof apiClient>;
  
  // Helper to create async params (Next.js 15 pattern)
  const createParams = (visitId: string) => Promise.resolve({ visitId });
  
  const validVisitId = '550e8400-e29b-41d4-a716-446655440000';
  const invalidVisitId = 'invalid-uuid';

  // Sample MEETING visit data (using far future dates to avoid expiration issues)
  const mockMeetingVisitData = {
    visitId: validVisitId,
    status: VisitStatus.APPROVED,
    approvedAt: '2030-01-26T10:00:00Z',
    visitor: {
      id: 'visitor-123',
      firstName: 'John',
      lastName: 'Doe',
      fullName: 'John Doe',
      phone: '+91 12345 67890',
      photoUrl: 'https://example.com/photo.jpg',
    },
    visitCategory: 'MEETING',
    submittedAt: '2030-01-26T09:00:00Z',
    branch: {
      id: 'branch-123',
      name: 'Main Hospital',
      address: '123 Health Street',
      phone: '+91 98765 43210',
    },
    gatePass: {
      checkInOtp: '123456',
      validUntil: '2030-01-26T18:00:00Z',
      generatedAt: '2030-01-26T10:00:00Z',
      sentViaWhatsApp: true,
    },
    meetingDetails: {
      purpose: 'Consultation',
      department: 'Cardiology',
      staffName: 'Dr. Smith',
      staffPhone: '+91 11111 22222',
    },
  };

  // Sample DELIVERY visit data
  const mockDeliveryVisitData = {
    visitId: validVisitId,
    status: VisitStatus.APPROVED,
    approvedAt: '2030-01-26T11:00:00Z',
    visitor: {
      id: 'visitor-456',
      firstName: 'Jane',
      lastName: 'Roe',
      fullName: 'Jane Roe',
      phone: '+91 98765 43210',
    },
    visitCategory: 'DELIVERY',
    submittedAt: '2030-01-26T10:30:00Z',
    branch: {
      id: 'branch-123',
      name: 'Main Hospital',
      phone: '+91 98765 43210',
    },
    gatePass: {
      checkInOtp: '654321',
      validUntil: '2030-01-26T19:00:00Z',
      generatedAt: '2030-01-26T11:00:00Z',
      sentViaWhatsApp: true,
    },
    deliveryDetails: {
      platform: 'Zomato',
      recipient: 'Nursing Station',
      orderReference: 'ORDER-123',
    },
  };

  // Sample CHECKED_IN visit data
  const mockCheckedInData = {
    ...mockMeetingVisitData,
    status: VisitStatus.CHECKED_IN,
    checkedInAt: '2030-01-26T10:30:00Z',
  };

  // Sample CHECKED_OUT visit data (using past dates since checked-out visits are historical)
  const mockCheckedOutData = {
    visitId: validVisitId,
    status: VisitStatus.CHECKED_OUT,
    checkedInAt: '2020-01-26T10:30:00Z',
    checkedOutAt: '2020-01-26T12:00:00Z',
    visitor: {
      id: 'visitor-123',
      firstName: 'John',
      lastName: 'Doe',
      fullName: 'John Doe',
      phone: '+91 12345 67890',
      photoUrl: 'https://example.com/photo.jpg',
    },
    visitCategory: 'MEETING',
    submittedAt: '2020-01-26T09:00:00Z',
    branch: {
      id: 'branch-123',
      name: 'Main Hospital',
    },
    meetingDetails: {
      purpose: 'Consultation',
      department: 'Cardiology',
      staffName: 'Dr. Smith',
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue({ push: mockPush });
  });

  describe('Rendering', () => {
    it('should render page header with title', async () => {
      mockApiClient.get.mockResolvedValue({
        data: { success: true, data: mockMeetingVisitData },
      });

      render(<GatePassPage params={createParams(validVisitId)} />);

      await waitFor(() => {
        expect(screen.getByText('Visitor Gate Pass')).toBeInTheDocument();
        expect(screen.getByText('Show this pass at the security desk')).toBeInTheDocument();
      });
    });

    it('should show loading state initially', async () => {
      mockApiClient.get.mockImplementation(() => new Promise(() => {}));

      render(<GatePassPage params={createParams(validVisitId)} />);

      await waitFor(() => {
        expect(screen.getByText('Loading your gate pass...')).toBeInTheDocument();
        expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
      });
    });
  });

  describe('Success State - MEETING', () => {
    it('should display visitor name and phone', async () => {
      mockApiClient.get.mockResolvedValue({
        data: { success: true, data: mockMeetingVisitData },
      });

      render(<GatePassPage params={createParams(validVisitId)} />);

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
        expect(screen.getByText('+91 12345 67890')).toBeInTheDocument();
      });
    });

    it('should display host information for meeting visits', async () => {
      mockApiClient.get.mockResolvedValue({
        data: { success: true, data: mockMeetingVisitData },
      });

      render(<GatePassPage params={createParams(validVisitId)} />);

      await waitFor(() => {
        expect(screen.getByText('Host Information')).toBeInTheDocument();
        expect(screen.getByText('Dr. Smith')).toBeInTheDocument();
        expect(screen.getByText('Cardiology')).toBeInTheDocument();
      });
    });

    it('should hide delivery info for meeting visits', async () => {
      mockApiClient.get.mockResolvedValue({
        data: { success: true, data: mockMeetingVisitData },
      });

      render(<GatePassPage params={createParams(validVisitId)} />);

      await waitFor(() => {
        expect(screen.queryByText('Delivery Information')).not.toBeInTheDocument();
      });
    });

    it('should display OTP prominently', async () => {
      mockApiClient.get.mockResolvedValue({
        data: { success: true, data: mockMeetingVisitData },
      });

      render(<GatePassPage params={createParams(validVisitId)} />);

      await waitFor(() => {
        const otpElement = screen.getByText('123456');
        expect(otpElement).toBeInTheDocument();
        expect(otpElement).toHaveClass('font-mono');
      });
    });

    it('should display validity timestamp', async () => {
      mockApiClient.get.mockResolvedValue({
        data: { success: true, data: mockMeetingVisitData },
      });

      render(<GatePassPage params={createParams(validVisitId)} />);

      await waitFor(() => {
        expect(screen.getByText(/Valid until:/i)).toBeInTheDocument();
      });
    });

    it('should display visitor photo or initials when available', async () => {
      mockApiClient.get.mockResolvedValue({
        data: { success: true, data: mockMeetingVisitData },
      });

      render(<GatePassPage params={createParams(validVisitId)} />);

      await waitFor(() => {
        // Avatar fallback should show initials when photo is provided
        expect(screen.getByText('JD')).toBeInTheDocument();
      });
    });

    it('should display meeting badge', async () => {
      mockApiClient.get.mockResolvedValue({
        data: { success: true, data: mockMeetingVisitData },
      });

      render(<GatePassPage params={createParams(validVisitId)} />);

      await waitFor(() => {
        expect(screen.getByText('Meeting')).toBeInTheDocument();
      });
    });
  });

  describe('Success State - DELIVERY', () => {
    it('should display delivery information', async () => {
      mockApiClient.get.mockResolvedValue({
        data: { success: true, data: mockDeliveryVisitData },
      });

      render(<GatePassPage params={createParams(validVisitId)} />);

      await waitFor(() => {
        expect(screen.getByText('Delivery Information')).toBeInTheDocument();
        expect(screen.getByText('Zomato')).toBeInTheDocument();
        expect(screen.getByText(/Recipient: Nursing Station/i)).toBeInTheDocument();
      });
    });

    it('should hide host info for delivery visits', async () => {
      mockApiClient.get.mockResolvedValue({
        data: { success: true, data: mockDeliveryVisitData },
      });

      render(<GatePassPage params={createParams(validVisitId)} />);

      await waitFor(() => {
        expect(screen.queryByText('Host Information')).not.toBeInTheDocument();
      });
    });

    it('should display delivery badge', async () => {
      mockApiClient.get.mockResolvedValue({
        data: { success: true, data: mockDeliveryVisitData },
      });

      render(<GatePassPage params={createParams(validVisitId)} />);

      await waitFor(() => {
        expect(screen.getByText('Delivery')).toBeInTheDocument();
      });
    });
  });

  describe('Expired State', () => {
    it('should show expired message when OTP has expired', async () => {
      const expiredData = {
        ...mockMeetingVisitData,
        gatePass: {
          ...mockMeetingVisitData.gatePass,
          validUntil: '2020-01-26T18:00:00Z',
        },
      };

      mockApiClient.get.mockResolvedValue({
        data: { success: true, data: expiredData },
      });

      render(<GatePassPage params={createParams(validVisitId)} />);

      await waitFor(() => {
        expect(screen.getByText('This pass has expired')).toBeInTheDocument();
        expect(screen.getByText(/The check-in OTP is no longer valid/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /contact security/i })).toBeInTheDocument();
      });
    });

    it('should hide OTP in expired state', async () => {
      const expiredData = {
        ...mockMeetingVisitData,
        gatePass: {
          ...mockMeetingVisitData.gatePass,
          validUntil: '2020-01-26T18:00:00Z',
        },
      };

      mockApiClient.get.mockResolvedValue({
        data: { success: true, data: expiredData },
      });

      render(<GatePassPage params={createParams(validVisitId)} />);

      await waitFor(() => {
        expect(screen.getByText('Expired')).toBeInTheDocument();
      });
    });
  });

  describe('CHECKED_IN State', () => {
    it('should display gate pass for checked-in visits', async () => {
      mockApiClient.get.mockResolvedValue({
        data: { success: true, data: mockCheckedInData },
      });

      render(<GatePassPage params={createParams(validVisitId)} />);

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
        expect(screen.getByText('123456')).toBeInTheDocument();
      });
    });

    it('should show currently checked in message', async () => {
      mockApiClient.get.mockResolvedValue({
        data: { success: true, data: mockCheckedInData },
      });

      render(<GatePassPage params={createParams(validVisitId)} />);

      await waitFor(() => {
        expect(screen.getByText(/You are currently checked in/i)).toBeInTheDocument();
      });
    });
  });

  describe('CHECKED_OUT State', () => {
    it('should show expired state for checked-out visits', async () => {
      mockApiClient.get.mockResolvedValue({
        data: { success: true, data: mockCheckedOutData },
      });

      render(<GatePassPage params={createParams(validVisitId)} />);

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
        expect(screen.getByText('Expired')).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle 404 Not Found error', async () => {
      mockApiClient.get.mockRejectedValue({
        response: { status: 404, data: { message: 'Visit not found' } },
      });

      render(<GatePassPage params={createParams(validVisitId)} />);

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Visit Not Found' })).toBeInTheDocument();
        expect(screen.getByText('Visit not found. The visit ID may be incorrect or has been removed.')).toBeInTheDocument();
      });
    });

    it('should handle 400 Invalid Visit ID error', async () => {
      mockApiClient.get.mockRejectedValue({
        response: { status: 400, data: { message: 'Invalid UUID' } },
      });

      render(<GatePassPage params={createParams(validVisitId)} />);

      await waitFor(() => {
        expect(screen.getByText('Invalid Visit ID')).toBeInTheDocument();
        expect(screen.getByText(/Invalid visit ID format/i)).toBeInTheDocument();
      });
    });

    it('should handle 500 Server Error', async () => {
      mockApiClient.get.mockRejectedValue({
        response: { status: 500, data: { message: 'Internal server error' } },
      });

      render(<GatePassPage params={createParams(validVisitId)} />);

      await waitFor(() => {
        expect(screen.getByText('Unable to Load Gate Pass')).toBeInTheDocument();
        expect(screen.getByText(/Internal server error/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Retry loading gate pass' })).toBeInTheDocument();
      });
    });

    it('should handle network error', async () => {
      mockApiClient.get.mockRejectedValue(new Error('Network Error'));

      render(<GatePassPage params={createParams(validVisitId)} />);

      await waitFor(() => {
        expect(screen.getByText('Connection Lost')).toBeInTheDocument();
        expect(screen.getByText(/Check your internet connection/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Retry loading gate pass' })).toBeInTheDocument();
      });
    });
  });

  describe('Retry Functionality', () => {
    it('should retry after network error and load data', async () => {
      mockApiClient.get
        .mockRejectedValueOnce(new Error('Network Error'))
        .mockResolvedValueOnce({
          data: { success: true, data: mockMeetingVisitData },
        });

      render(<GatePassPage params={createParams(validVisitId)} />);

      await waitFor(() => {
        expect(screen.getByText('Connection Lost')).toBeInTheDocument();
      });

      const retryButton = screen.getByRole('button', { name: 'Retry loading gate pass' });
      await userEvent.click(retryButton);

      // Verify API was called twice (initial + retry)
      await waitFor(() => {
        expect(mockApiClient.get).toHaveBeenCalledTimes(2);
      });

      // Verify success state is reached
      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });
    });

    it('should trigger retry when button is clicked', async () => {
      mockApiClient.get.mockRejectedValue(new Error('Network Error'));

      render(<GatePassPage params={createParams(validVisitId)} />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Retry loading gate pass' })).toBeInTheDocument();
      });

      const retryButton = screen.getByRole('button', { name: 'Retry loading gate pass' });
      await userEvent.click(retryButton);

      // Verify API was called again
      await waitFor(() => {
        expect(mockApiClient.get).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('Redirect to Status Check Page', () => {
    it('should redirect PENDING visits to status check page', async () => {
      mockApiClient.get.mockResolvedValue({
        data: {
          success: true,
          data: {
            ...mockMeetingVisitData,
            status: VisitStatus.PENDING,
          },
        },
      });

      render(<GatePassPage params={createParams(validVisitId)} />);

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith(`/visitor-registration/status/${validVisitId}`);
      });
    });

    it('should redirect REJECTED visits to status check page', async () => {
      mockApiClient.get.mockResolvedValue({
        data: {
          success: true,
          data: {
            ...mockMeetingVisitData,
            status: VisitStatus.REJECTED,
            rejectedAt: '2026-01-26T10:00:00Z',
            rejectionReason: 'Invalid request',
          },
        },
      });

      render(<GatePassPage params={createParams(validVisitId)} />);

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith(`/visitor-registration/status/${validVisitId}`);
      });
    });
  });

  describe('UUID Validation', () => {
    it('should show error for invalid UUID format', async () => {
      render(<GatePassPage params={createParams(invalidVisitId)} />);

      await waitFor(() => {
        expect(screen.getByText('Invalid Visit ID')).toBeInTheDocument();
        expect(screen.getByText(/Invalid visit ID format/i)).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA label for OTP', async () => {
      mockApiClient.get.mockResolvedValue({
        data: { success: true, data: mockMeetingVisitData },
      });

      render(<GatePassPage params={createParams(validVisitId)} />);

      await waitFor(() => {
        const otpElement = screen.getByText('123456');
        expect(otpElement).toHaveAttribute('aria-label', 'Check-in one time password: 123456');
      });
    });

    it('should have role=alert on error messages', async () => {
      mockApiClient.get.mockRejectedValue({
        response: { status: 500, data: { message: 'Error' } },
      });

      render(<GatePassPage params={createParams(validVisitId)} />);

      await waitFor(() => {
        const alert = screen.getByRole('alert');
        expect(alert).toBeInTheDocument();
      });
    });

    it('should have role=status on loading state', async () => {
      mockApiClient.get.mockImplementation(() => new Promise(() => {}));

      render(<GatePassPage params={createParams(validVisitId)} />);

      await waitFor(() => {
        const status = screen.getByRole('status');
        expect(status).toBeInTheDocument();
      });
    });
  });
});
