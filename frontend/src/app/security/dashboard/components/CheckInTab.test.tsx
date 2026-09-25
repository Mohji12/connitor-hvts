import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CheckInTab } from './CheckInTab';
import * as visitorsApi from '@/lib/api/visitors-api';

// Mock QR scanner (uses camera APIs unavailable in Jest)
jest.mock('@/components/security/QrCheckInScanner', () => ({
  QrCheckInScanner: () => <div data-testid="qr-scanner">QR Scanner</div>,
}));

// Mock the visitors-api module
jest.mock('@/lib/api/visitors-api', () => ({
  ...jest.requireActual('@/lib/api/visitors-api'),
  verifyCheckInOtp: jest.fn(),
  scanCheckInQr: jest.fn(),
  mapErrorCodeToMessage: jest.fn((code: string) => {
    const messages: Record<string, string> = {
      INVALID_OTP: 'Invalid OTP. Please check and try again.',
      CHECKIN_OTP_EXPIRED: 'This OTP has expired. Please contact staff.',
      ALREADY_CHECKED_IN: 'Visitor is already checked in.',
      VISIT_NOT_FOUND: 'Visitor not found. Try phone lookup instead.',
    };
    return messages[code] || 'Verification failed. Please try again.';
  }),
  ApiError: class ApiError extends Error {
    statusCode: number;
    code: string;
    constructor({ statusCode, code, message }: { statusCode: number; code: string; message: string }) {
      super(message);
      this.statusCode = statusCode;
      this.code = code;
      this.name = 'ApiError';
    }
  },
}));

// Mock VisitorDetailsCard to simplify testing
jest.mock('./VisitorDetailsCard', () => ({
  VisitorDetailsCard: ({ visitorData, onCheckIn, onCancel, isCheckingIn }: {
    visitorData: { visitor: { firstName: string; lastName: string } };
    onCheckIn: () => void;
    onCancel: () => void;
    isCheckingIn?: boolean;
  }) => (
    <div data-testid="visitor-details-card">
      <div data-testid="visitor-name">{visitorData.visitor.firstName} {visitorData.visitor.lastName}</div>
      <button data-testid="check-in-button" onClick={onCheckIn} disabled={isCheckingIn}>
        {isCheckingIn ? 'Checking In...' : 'Check In'}
      </button>
      <button data-testid="cancel-button" onClick={onCancel}>Cancel / Verify Another</button>
    </div>
  ),
}));

// Mock VisitorService
jest.mock('@/lib/services/visitorService', () => ({
  VisitorService: {
    checkInVisit: jest.fn(),
  },
}));

// Mock sonner toast
jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

describe('CheckInTab', () => {
  const mockBranchId = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';
  const mockOnCheckInSuccess = jest.fn();
  const mockVerifyCheckInOtp = visitorsApi.verifyCheckInOtp as jest.MockedFunction<typeof visitorsApi.verifyCheckInOtp>;
  let testKey = 0;

  async function openOtpMode() {
    renderCheckInTab({ branchId: mockBranchId });
    await userEvent.click(screen.getByRole('button', { name: /Enter OTP instead/i }));
  }

  beforeEach(() => {
    jest.clearAllMocks();
    mockVerifyCheckInOtp.mockReset();
    testKey++;
  });

  afterEach(() => {
    cleanup();
  });

  // Helper function to render with unique key
  const renderCheckInTab = (
    props: { branchId: string; onCheckInSuccess?: (visitId: string) => void },
    options?: { otpMode?: boolean },
  ) => {
    const result = render(<CheckInTab key={testKey} {...props} />);
    if (options?.otpMode) {
      fireEvent.click(screen.getByRole('button', { name: /Enter OTP instead/i }));
    }
    return result;
  };

  describe('Rendering', () => {
    it('should render the tab container', () => {
      renderCheckInTab({ branchId: mockBranchId });
      expect(screen.getByTestId('check-in-tab')).toBeInTheDocument();
    });

    it('should render title', () => {
      renderCheckInTab({ branchId: mockBranchId });
      expect(screen.getByText('Scan Visitor QR')).toBeInTheDocument();
    });

    it('should render QR scanner', () => {
      renderCheckInTab({ branchId: mockBranchId });
      expect(screen.getByTestId('qr-scanner')).toBeInTheDocument();
    });

    it('should render OTP input description after switching to OTP mode', async () => {
      await openOtpMode();
      expect(
        screen.getByText(/Fallback if QR scan is unavailable/)
      ).toBeInTheDocument();
    });

    it('should render OTP input field in OTP mode', async () => {
      await openOtpMode();
      expect(screen.getByTestId('otp-input')).toBeInTheDocument();
    });

    it('should render verify button in OTP mode', async () => {
      await openOtpMode();
      expect(screen.getByTestId('verify-otp-button')).toBeInTheDocument();
      expect(screen.getByText('Verify OTP')).toBeInTheDocument();
    });

    it('should render phone lookup button', () => {
      renderCheckInTab({ branchId: mockBranchId });
      expect(screen.getByTestId('phone-lookup-button')).toBeInTheDocument();
      expect(screen.getByText('Check Visitor by Phone')).toBeInTheDocument();
    });

    it('should render instructions section', () => {
      renderCheckInTab({ branchId: mockBranchId });
      expect(screen.getByText('Check-in steps')).toBeInTheDocument();
    });

    it('should render instruction items', () => {
      renderCheckInTab({ branchId: mockBranchId });
      expect(screen.getByText(/Visitor shows QR code from their portal/i)).toBeInTheDocument();
      expect(screen.getByText(/Scan the QR to load visitor/i)).toBeInTheDocument();
      expect(screen.getByText(/Verify government ID/i)).toBeInTheDocument();
      expect(screen.getByText(/Tap Check In to complete entry/i)).toBeInTheDocument();
    });

    it('should merge custom className', () => {
      render(<CheckInTab key={testKey} branchId={mockBranchId} className="custom-tab-class" />);
      const tab = screen.getByTestId('check-in-tab');
      expect(tab).toHaveClass('custom-tab-class');
    });
  });

  describe('Accessibility', () => {
    it('should have role="tabpanel"', () => {
      renderCheckInTab({ branchId: mockBranchId }, { otpMode: true });
      const tab = screen.getByTestId('check-in-tab');
      expect(tab).toHaveAttribute('role', 'tabpanel');
    });

    it('should have aria-labelledby attribute', () => {
      renderCheckInTab({ branchId: mockBranchId }, { otpMode: true });
      const tab = screen.getByTestId('check-in-tab');
      expect(tab).toHaveAttribute('aria-labelledby', 'tab-check-in');
    });

    it('should have correct id for aria-controls reference', () => {
      renderCheckInTab({ branchId: mockBranchId }, { otpMode: true });
      const tab = screen.getByTestId('check-in-tab');
      expect(tab).toHaveAttribute('id', 'check-in-tab-content');
    });

    it('should have aria-label on OTP input', () => {
      renderCheckInTab({ branchId: mockBranchId }, { otpMode: true });
      const otpInput = screen.getByLabelText('Visitor Check-In OTP');
      expect(otpInput).toBeInTheDocument();
    });

    it('should have aria-busy on verify button during loading', async () => {
      mockVerifyCheckInOtp.mockImplementation(() => new Promise(() => {})); // Never resolves
      renderCheckInTab({ branchId: mockBranchId }, { otpMode: true });
      
      const otpInput = screen.getByLabelText('Visitor Check-In OTP');
      await userEvent.type(otpInput, '123456');
      
      const verifyButton = screen.getByTestId('verify-otp-button');
      fireEvent.click(verifyButton);
      
      await waitFor(() => {
        expect(verifyButton).toHaveAttribute('aria-busy', 'true');
      });
    });

    it('should have role="alert" on error message', async () => {
      mockVerifyCheckInOtp.mockRejectedValue(new visitorsApi.ApiError({
        statusCode: 400,
        code: 'INVALID_OTP',
        message: 'Invalid OTP',
      }));
      
      renderCheckInTab({ branchId: mockBranchId }, { otpMode: true });
      
      const otpInput = screen.getByLabelText('Visitor Check-In OTP');
      await userEvent.type(otpInput, '123456');
      
      const verifyButton = screen.getByTestId('verify-otp-button');
      fireEvent.click(verifyButton);
      
      await waitFor(() => {
        const alert = screen.getByRole('alert');
        expect(alert).toBeInTheDocument();
      });
    });

    it('should have aria-live="polite" for screen reader announcements', () => {
      renderCheckInTab({ branchId: mockBranchId }, { otpMode: true });
      const liveRegions = screen.getAllByRole('status');
      expect(liveRegions.length).toBeGreaterThan(0);
      expect(liveRegions[0]).toHaveAttribute('aria-live', 'polite');
    });
  });

  describe('OTP Input', () => {
    it('should accept 6-digit OTP input', async () => {
      renderCheckInTab({ branchId: mockBranchId }, { otpMode: true });
      const otpInput = screen.getByLabelText('Visitor Check-In OTP');
      
      await userEvent.type(otpInput, '123456');
      
      expect(otpInput).toHaveValue('123456');
    });

    it('should disable verify button when OTP is incomplete', () => {
      renderCheckInTab({ branchId: mockBranchId }, { otpMode: true });
      const verifyButton = screen.getByTestId('verify-otp-button');
      
      expect(verifyButton).toBeDisabled();
    });

    it('should enable verify button when OTP is complete', async () => {
      renderCheckInTab({ branchId: mockBranchId }, { otpMode: true });
      const otpInput = screen.getByLabelText('Visitor Check-In OTP');
      const verifyButton = screen.getByTestId('verify-otp-button');
      
      await userEvent.type(otpInput, '123456');
      
      expect(verifyButton).not.toBeDisabled();
    });

    it('should clear error when user starts typing again', async () => {
      mockVerifyCheckInOtp.mockRejectedValue(new visitorsApi.ApiError({
        statusCode: 400,
        code: 'INVALID_OTP',
        message: 'Invalid OTP',
      }));
      
      renderCheckInTab({ branchId: mockBranchId }, { otpMode: true });
      
      const otpInput = screen.getByLabelText('Visitor Check-In OTP');
      await userEvent.type(otpInput, '123456');
      
      const verifyButton = screen.getByTestId('verify-otp-button');
      fireEvent.click(verifyButton);
      
      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
      });
      
      // Type again - error should be cleared
      await userEvent.clear(otpInput);
      await userEvent.type(otpInput, '1');
      
      await waitFor(() => {
        expect(screen.queryByRole('alert')).not.toBeInTheDocument();
      });
    });
  });

  describe('OTP Verification - Happy Path', () => {
    const mockVisitorData = {
      success: true,
      visitId: 'visit-123',
      visitorId: 'visitor-123',
      visitor: {
        id: 'visitor-123',
        firstName: 'John',
        lastName: 'Doe',
        phone: '+1234567890',
        email: 'john@example.com',
        photo: null,
        company: 'Acme Inc',
      },
      visit: {
        id: 'visit-123',
        visitCategory: 'MEETING' as const,
        visitSubType: 'Business',
        status: 'APPROVED',
        checkInOtp: '123456',
        checkInOtpExpiry: new Date(Date.now() + 3600000).toISOString(),
        purpose: 'Business Meeting',
        department: 'Engineering',
        staffName: 'Jane Smith',
        staffPhone: '+0987654321',
      },
      canCheckIn: true,
    };

    it('should call verifyCheckInOtp with correct parameters', async () => {
      mockVerifyCheckInOtp.mockResolvedValue(mockVisitorData);

      renderCheckInTab({ branchId: mockBranchId }, { otpMode: true });

      const otpInput = screen.getByLabelText('Visitor Check-In OTP');
      await userEvent.type(otpInput, '123456');

      // OTP auto-verifies when 6 digits are entered (onComplete callback)
      // Verify button click is not needed since typing triggers verification
      await waitFor(() => {
        expect(mockVerifyCheckInOtp).toHaveBeenCalledWith({
          otp: '123456',
          branchId: mockBranchId,
        });
      });

      // Verify the component transitioned to visitor details view
      // (verify-otp-button no longer exists after successful verification)
      await waitFor(() => {
        expect(screen.queryByTestId('verify-otp-button')).not.toBeInTheDocument();
        expect(screen.getByTestId('visitor-details-card')).toBeInTheDocument();
      });
    });

    it('should show loading state during verification', async () => {
      mockVerifyCheckInOtp.mockImplementation(() => new Promise(() => {}));
      
      renderCheckInTab({ branchId: mockBranchId }, { otpMode: true });
      
      const otpInput = screen.getByLabelText('Visitor Check-In OTP');
      await userEvent.type(otpInput, '123456');
      
      const verifyButton = screen.getByTestId('verify-otp-button');
      fireEvent.click(verifyButton);
      
      await waitFor(() => {
        expect(screen.getByText('Verifying...')).toBeInTheDocument();
      });
    });

    it('should display visitor details after successful verification', async () => {
      mockVerifyCheckInOtp.mockResolvedValue(mockVisitorData);

      renderCheckInTab({ branchId: mockBranchId }, { otpMode: true });

      const otpInput = screen.getByLabelText('Visitor Check-In OTP');
      await userEvent.type(otpInput, '123456');

      // OTP auto-verifies when 6 digits are entered (onComplete callback)
      // No need to click verify button - typing triggers verification automatically
      await waitFor(() => {
        expect(screen.getByTestId('visitor-details-card')).toBeInTheDocument();
      });

      expect(screen.getByTestId('visitor-name')).toHaveTextContent('John Doe');

      // Verify the OTP input and verify button are no longer visible
      expect(screen.queryByTestId('otp-input')).not.toBeInTheDocument();
      expect(screen.queryByTestId('verify-otp-button')).not.toBeInTheDocument();
    });

    it('should trigger onCheckInSuccess callback when Check In is clicked', async () => {
      // Mock the checkInVisit API call
      const { VisitorService } = await import('@/lib/services/visitorService');
      const mockCheckInResponse = {
        success: true,
        message: 'Visitor checked in successfully.',
        visitId: 'visit-123',
        checkInTime: new Date().toISOString(),
        visitor: {
          id: 'visitor-123',
          firstName: 'John',
          lastName: 'Doe',
        },
      };
      jest.spyOn(VisitorService, 'checkInVisit').mockResolvedValue(mockCheckInResponse);
      
      mockVerifyCheckInOtp.mockResolvedValue(mockVisitorData);

      renderCheckInTab({ branchId: mockBranchId, onCheckInSuccess: mockOnCheckInSuccess }, { otpMode: true });

      const otpInput = screen.getByLabelText('Visitor Check-In OTP');
      await userEvent.type(otpInput, '123456');

      // OTP auto-verifies when 6 digits are entered (onComplete callback)
      await waitFor(() => {
        expect(screen.getByTestId('visitor-details-card')).toBeInTheDocument();
      });

      const checkInButton = screen.getByTestId('check-in-button');
      fireEvent.click(checkInButton);

      await waitFor(() => {
        expect(mockOnCheckInSuccess).toHaveBeenCalledWith('visit-123');
      });
    });

    it('should reset to OTP view after successful check-in', async () => {
      // Mock the checkInVisit API call
      const { VisitorService } = await import('@/lib/services/visitorService');
      const mockCheckInResponse = {
        success: true,
        message: 'Visitor checked in successfully.',
        visitId: 'visit-123',
        checkInTime: new Date().toISOString(),
        visitor: {
          id: 'visitor-123',
          firstName: 'John',
          lastName: 'Doe',
        },
      };
      jest.spyOn(VisitorService, 'checkInVisit').mockResolvedValue(mockCheckInResponse);
      
      mockVerifyCheckInOtp.mockResolvedValue(mockVisitorData);

      renderCheckInTab({ branchId: mockBranchId, onCheckInSuccess: mockOnCheckInSuccess }, { otpMode: true });

      const otpInput = screen.getByLabelText('Visitor Check-In OTP');
      await userEvent.type(otpInput, '123456');

      // OTP auto-verifies when 6 digits are entered (onComplete callback)
      await waitFor(() => {
        expect(screen.getByTestId('visitor-details-card')).toBeInTheDocument();
      });

      const checkInButton = screen.getByTestId('check-in-button');
      fireEvent.click(checkInButton);

      // After check-in, component should reset to OTP view
      await waitFor(() => {
        expect(screen.getByText('Scan Visitor QR')).toBeInTheDocument();
        expect(screen.queryByTestId('visitor-details-card')).not.toBeInTheDocument();
      });

      // Verify OTP input is visible again after reset
      expect(screen.getByTestId('otp-input')).toBeInTheDocument();
      expect(screen.getByTestId('verify-otp-button')).toBeInTheDocument();
    });
  });

  describe('OTP Verification - Error Scenarios', () => {
    it('should display error message for invalid OTP', async () => {
      mockVerifyCheckInOtp.mockRejectedValue(new visitorsApi.ApiError({
        statusCode: 400,
        code: 'INVALID_OTP',
        message: 'Invalid OTP',
      }));
      
      renderCheckInTab({ branchId: mockBranchId }, { otpMode: true });
      
      const otpInput = screen.getByLabelText('Visitor Check-In OTP');
      await userEvent.type(otpInput, '123456');
      
      const verifyButton = screen.getByTestId('verify-otp-button');
      fireEvent.click(verifyButton);
      
      await waitFor(() => {
        const alerts = screen.getAllByText('Invalid OTP. Please check and try again.');
        expect(alerts.length).toBeGreaterThan(0);
      });
    });

    it('should display error message for expired OTP', async () => {
      mockVerifyCheckInOtp.mockRejectedValue(new visitorsApi.ApiError({
        statusCode: 400,
        code: 'CHECKIN_OTP_EXPIRED',
        message: 'OTP expired',
      }));
      
      renderCheckInTab({ branchId: mockBranchId }, { otpMode: true });
      
      const otpInput = screen.getByLabelText('Visitor Check-In OTP');
      await userEvent.type(otpInput, '123456');
      
      const verifyButton = screen.getByTestId('verify-otp-button');
      fireEvent.click(verifyButton);
      
      await waitFor(() => {
        const alerts = screen.getAllByText('This OTP has expired. Please contact staff.');
        expect(alerts.length).toBeGreaterThan(0);
      });
    });

    it('should display error message for already checked in visitor', async () => {
      mockVerifyCheckInOtp.mockRejectedValue(new visitorsApi.ApiError({
        statusCode: 400,
        code: 'ALREADY_CHECKED_IN',
        message: 'Already checked in',
      }));
      
      renderCheckInTab({ branchId: mockBranchId }, { otpMode: true });
      
      const otpInput = screen.getByLabelText('Visitor Check-In OTP');
      await userEvent.type(otpInput, '123456');
      
      const verifyButton = screen.getByTestId('verify-otp-button');
      fireEvent.click(verifyButton);
      
      await waitFor(() => {
        const alerts = screen.getAllByText('Visitor is already checked in.');
        expect(alerts.length).toBeGreaterThan(0);
      });
    });

    it('should display error message for visit not found', async () => {
      mockVerifyCheckInOtp.mockRejectedValue(new visitorsApi.ApiError({
        statusCode: 404,
        code: 'VISIT_NOT_FOUND',
        message: 'Visit not found',
      }));
      
      renderCheckInTab({ branchId: mockBranchId }, { otpMode: true });
      
      const otpInput = screen.getByLabelText('Visitor Check-In OTP');
      await userEvent.type(otpInput, '123456');
      
      const verifyButton = screen.getByTestId('verify-otp-button');
      fireEvent.click(verifyButton);
      
      await waitFor(() => {
        const alerts = screen.getAllByText('Visitor not found. Try phone lookup instead.');
        expect(alerts.length).toBeGreaterThan(0);
      });
    });

    it('should display generic error message for unknown errors', async () => {
      mockVerifyCheckInOtp.mockRejectedValue(new Error('Network error'));
      
      renderCheckInTab({ branchId: mockBranchId }, { otpMode: true });
      
      const otpInput = screen.getByLabelText('Visitor Check-In OTP');
      await userEvent.type(otpInput, '123456');
      
      const verifyButton = screen.getByTestId('verify-otp-button');
      fireEvent.click(verifyButton);
      
      await waitFor(() => {
        const alerts = screen.getAllByText('Verification failed. Please try again.');
        expect(alerts.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Cancel Action', () => {
    const mockVisitorData = {
      success: true,
      visitId: 'visit-123',
      visitorId: 'visitor-123',
      visitor: {
        id: 'visitor-123',
        firstName: 'John',
        lastName: 'Doe',
        phone: '+1234567890',
        email: null,
        photo: null,
        company: null,
      },
      visit: {
        id: 'visit-123',
        visitCategory: 'MEETING' as const,
        visitSubType: null,
        status: 'APPROVED',
        checkInOtp: '123456',
        checkInOtpExpiry: new Date(Date.now() + 3600000).toISOString(),
        purpose: null,
        department: null,
        staffName: null,
        staffPhone: null,
      },
      canCheckIn: true,
    };

    it('should reset to OTP view when Cancel is clicked', async () => {
      mockVerifyCheckInOtp.mockResolvedValue(mockVisitorData);

      renderCheckInTab({ branchId: mockBranchId }, { otpMode: true });

      const otpInput = screen.getByLabelText('Visitor Check-In OTP');
      await userEvent.type(otpInput, '123456');

      // OTP auto-verifies when 6 digits are entered (onComplete callback)
      await waitFor(() => {
        expect(screen.getByTestId('visitor-details-card')).toBeInTheDocument();
      });

      const cancelButton = screen.getByTestId('cancel-button');
      fireEvent.click(cancelButton);

      // After cancel, component should reset to OTP view
      await waitFor(() => {
        expect(screen.getByText('Scan Visitor QR')).toBeInTheDocument();
        expect(screen.queryByTestId('visitor-details-card')).not.toBeInTheDocument();
      });

      // Verify OTP input and verify button are visible again after reset
      expect(screen.getByTestId('otp-input')).toBeInTheDocument();
      expect(screen.getByTestId('verify-otp-button')).toBeInTheDocument();
    });
  });

  describe('Phone Lookup Navigation', () => {
    it('should navigate to phone lookup view when Check Visitor button is clicked', async () => {
      renderCheckInTab({ branchId: mockBranchId });

      const phoneLookupButton = screen.getByTestId('phone-lookup-button');
      fireEvent.click(phoneLookupButton);

      await waitFor(() => {
        expect(screen.getByText('Enter visitor phone number to search')).toBeInTheDocument();
        expect(screen.getByTestId('phone-input')).toBeInTheDocument();
      });
    });

    it('should navigate back to QR view from phone lookup', async () => {
      renderCheckInTab({ branchId: mockBranchId });

      const phoneLookupButton = screen.getByTestId('phone-lookup-button');
      fireEvent.click(phoneLookupButton);

      await waitFor(() => {
        expect(screen.getByText('Enter visitor phone number to search')).toBeInTheDocument();
      });

      const backButton = screen.getByTestId('back-button');
      fireEvent.click(backButton);

      await waitFor(() => {
        expect(screen.getByText('Scan Visitor QR')).toBeInTheDocument();
      });
    });
  });

  describe('Check-In API Integration (Task 6.5)', () => {
    const mockVisitorData = {
      success: true,
      visitId: 'visit-123',
      visitorId: 'visitor-123',
      visitor: {
        id: 'visitor-123',
        firstName: 'Jane',
        lastName: 'Smith',
        phone: '+1234567890',
        email: 'jane@example.com',
        photo: null,
        company: 'Tech Corp',
      },
      visit: {
        id: 'visit-123',
        visitCategory: 'MEETING' as const,
        visitSubType: null,
        status: 'APPROVED',
        checkInOtp: '654321',
        checkInOtpExpiry: new Date(Date.now() + 3600000).toISOString(),
        purpose: 'Business meeting',
        department: null,
        deliveryPlatform: null,
        deliveryRecipient: null,
        orderReference: null,
        staffName: 'Dr. Johnson',
        staffPhone: '+9876543210',
      },
      canCheckIn: true,
    };

    // Mock VisitorService
    let mockCheckInVisit: jest.Mock;

    beforeEach(() => {
      // Mock the VisitorService module
      mockCheckInVisit = jest.fn();
      jest.mock('@/lib/services/visitorService', () => ({
        VisitorService: {
          checkInVisit: mockCheckInVisit,
        },
      }));
    });

    it('should call checkInVisit API when Check In button is clicked', async () => {
      const { VisitorService } = await import('@/lib/services/visitorService');
      const mockCheckInResponse = {
        success: true,
        message: 'Visitor checked in successfully.',
        visitId: 'visit-123',
        checkInTime: new Date().toISOString(),
        visitor: {
          id: 'visitor-123',
          firstName: 'Jane',
          lastName: 'Smith',
        },
      };
      
      jest.spyOn(VisitorService, 'checkInVisit').mockResolvedValue(mockCheckInResponse);
      mockVerifyCheckInOtp.mockResolvedValue(mockVisitorData);

      renderCheckInTab({ branchId: mockBranchId, onCheckInSuccess: mockOnCheckInSuccess }, { otpMode: true });

      // Enter OTP and verify
      const otpInput = screen.getByLabelText('Visitor Check-In OTP');
      await userEvent.type(otpInput, '654321');

      await waitFor(() => {
        expect(screen.getByTestId('visitor-details-card')).toBeInTheDocument();
      });

      // Click check-in button
      const checkInButton = screen.getByTestId('check-in-button');
      fireEvent.click(checkInButton);

      await waitFor(() => {
        expect(VisitorService.checkInVisit).toHaveBeenCalledWith('visit-123');
      });
    });

    it('should show success toast and reset to OTP view after successful check-in', async () => {
      const { VisitorService } = await import('@/lib/services/visitorService');
      const { toast } = await import('sonner');
      
      const mockCheckInResponse = {
        success: true,
        message: 'Visitor checked in successfully.',
        visitId: 'visit-123',
        checkInTime: new Date().toISOString(),
        visitor: {
          id: 'visitor-123',
          firstName: 'Jane',
          lastName: 'Smith',
        },
      };
      
      jest.spyOn(VisitorService, 'checkInVisit').mockResolvedValue(mockCheckInResponse);
      jest.spyOn(toast, 'success');
      mockVerifyCheckInOtp.mockResolvedValue(mockVisitorData);

      renderCheckInTab({ branchId: mockBranchId }, { otpMode: true });

      const otpInput = screen.getByLabelText('Visitor Check-In OTP');
      await userEvent.type(otpInput, '654321');

      await waitFor(() => {
        expect(screen.getByTestId('visitor-details-card')).toBeInTheDocument();
      });

      const checkInButton = screen.getByTestId('check-in-button');
      fireEvent.click(checkInButton);

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith('Check-In Successful', {
          description: 'Jane Smith is now checked in.',
        });
      });

      // Should reset to OTP view
      await waitFor(() => {
        expect(screen.getByText('Scan Visitor QR')).toBeInTheDocument();
        expect(screen.queryByTestId('visitor-details-card')).not.toBeInTheDocument();
      });
    });

    it('should show error toast when check-in API fails with VISIT_NOT_APPROVED', async () => {
      const { VisitorService } = await import('@/lib/services/visitorService');
      const { toast } = await import('sonner');
      
      const apiError = {
        response: {
          data: {
            error: 'VISIT_NOT_APPROVED',
            message: 'Visit is not approved for check-in',
          },
        },
      };
      
      jest.spyOn(VisitorService, 'checkInVisit').mockRejectedValue(apiError);
      jest.spyOn(toast, 'error');
      mockVerifyCheckInOtp.mockResolvedValue(mockVisitorData);

      renderCheckInTab({ branchId: mockBranchId }, { otpMode: true });

      const otpInput = screen.getByLabelText('Visitor Check-In OTP');
      await userEvent.type(otpInput, '654321');

      await waitFor(() => {
        expect(screen.getByTestId('visitor-details-card')).toBeInTheDocument();
      });

      const checkInButton = screen.getByTestId('check-in-button');
      fireEvent.click(checkInButton);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Check-In Failed', {
          description: 'Visit is not approved for check-in.',
        });
      });
    });

    it('should show error toast when check-in API fails with ALREADY_CHECKED_IN', async () => {
      const { VisitorService } = await import('@/lib/services/visitorService');
      const { toast } = await import('sonner');
      
      const apiError = {
        response: {
          data: {
            error: 'ALREADY_CHECKED_IN',
            message: 'Visitor is already checked in',
          },
        },
      };
      
      jest.spyOn(VisitorService, 'checkInVisit').mockRejectedValue(apiError);
      jest.spyOn(toast, 'error');
      mockVerifyCheckInOtp.mockResolvedValue(mockVisitorData);

      renderCheckInTab({ branchId: mockBranchId }, { otpMode: true });

      const otpInput = screen.getByLabelText('Visitor Check-In OTP');
      await userEvent.type(otpInput, '654321');

      await waitFor(() => {
        expect(screen.getByTestId('visitor-details-card')).toBeInTheDocument();
      });

      const checkInButton = screen.getByTestId('check-in-button');
      fireEvent.click(checkInButton);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Check-In Failed', {
          description: 'Visitor is already checked in.',
        });
      });
    });

    it('should handle generic check-in API errors', async () => {
      const { VisitorService } = await import('@/lib/services/visitorService');
      const { toast } = await import('sonner');
      
      const genericError = new Error('Network error');
      
      jest.spyOn(VisitorService, 'checkInVisit').mockRejectedValue(genericError);
      jest.spyOn(toast, 'error');
      mockVerifyCheckInOtp.mockResolvedValue(mockVisitorData);

      renderCheckInTab({ branchId: mockBranchId }, { otpMode: true });

      const otpInput = screen.getByLabelText('Visitor Check-In OTP');
      await userEvent.type(otpInput, '654321');

      await waitFor(() => {
        expect(screen.getByTestId('visitor-details-card')).toBeInTheDocument();
      });

      const checkInButton = screen.getByTestId('check-in-button');
      fireEvent.click(checkInButton);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Check-In Failed', {
          description: 'Check-in failed. Please try again.',
        });
      });
    });

    it('should disable check-in button during API call', async () => {
      const { VisitorService } = await import('@/lib/services/visitorService');
      
      interface CheckInResponse {
        success: boolean;
        message: string;
        visitId: string;
        checkInTime: string;
        visitor: {
          id: string;
          firstName: string;
          lastName: string;
        };
      }

      // Create a promise that we can control
      let resolveCheckIn: ((value: CheckInResponse) => void) | undefined;
      const checkInPromise = new Promise<CheckInResponse>((resolve) => {
        resolveCheckIn = resolve;
      });
      
      jest.spyOn(VisitorService, 'checkInVisit').mockReturnValue(checkInPromise);
      mockVerifyCheckInOtp.mockResolvedValue(mockVisitorData);

      renderCheckInTab({ branchId: mockBranchId }, { otpMode: true });

      const otpInput = screen.getByLabelText('Visitor Check-In OTP');
      await userEvent.type(otpInput, '654321');

      await waitFor(() => {
        expect(screen.getByTestId('visitor-details-card')).toBeInTheDocument();
      });

      const checkInButton = screen.getByTestId('check-in-button');
      fireEvent.click(checkInButton);

      // Button should be disabled during API call
      await waitFor(() => {
        expect(checkInButton).toBeDisabled();
        expect(checkInButton).toHaveTextContent('Checking In...');
      });

      // Resolve the promise
      resolveCheckIn!({
        success: true,
        message: 'Visitor checked in successfully.',
        visitId: 'visit-123',
        checkInTime: new Date().toISOString(),
        visitor: {
          id: 'visitor-123',
          firstName: 'Jane',
          lastName: 'Smith',
        },
      });

      // Button should be enabled again after API call completes
      await waitFor(() => {
        expect(screen.queryByTestId('check-in-button')).not.toBeInTheDocument();
      });
    });
  });
});
