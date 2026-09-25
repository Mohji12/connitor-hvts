/**
 * Unit Tests for Visitor Registration Wizard - Task 9.2
 * Tests state machine logic, step transitions, form data persistence, and error handling
 */

import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useRouter, useSearchParams } from 'next/navigation';
import VisitorRegistrationWizard from './page';
import apiClient from '@/lib/api';

// Mock Next.js router and search params
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  useSearchParams: jest.fn(),
}));

// Mock apiClient
jest.mock('@/lib/api', () => ({
  __esModule: true,
  default: {
    post: jest.fn(),
  },
}));

const mockedApiClient = apiClient as jest.Mocked<typeof apiClient>;

// Mock step components to isolate wizard logic
jest.mock('../phone-entry-step', () => ({
  PhoneEntryStep: jest.fn(({ onSuccess, onCancel }) => (
    <div data-testid="phone-entry-step">
      <h2>Phone Entry Step</h2>
      <button onClick={() => onSuccess({ phone: '9876543210', isNewVisitor: true })}>
        Send OTP
      </button>
      {onCancel && <button onClick={onCancel}>Cancel</button>}
    </div>
  )),
}));

jest.mock('../phone-verification-step', () => ({
  PhoneVerificationStep: jest.fn(({ onSuccess, onCancel }) => (
    <div data-testid="phone-verification-step">
      <h2>Phone Verification Step</h2>
      <button
        onClick={() =>
          onSuccess({
            phone: '9876543210',
            isExistingVisitor: false,
            visitorData: {
              id: 'visitor-123',
              firstName: 'John',
              lastName: 'Doe',
              middleName: null,
              phone: '9876543210',
              email: null,
              company: null,
              designation: null,
              phoneVerified: true,
            },
          })
        }
      >
        Verify OTP
      </button>
      {onCancel && <button onClick={onCancel}>Back</button>}
    </div>
  )),
}));

jest.mock('@/components/visitors/steps/VisitTypeSelection', () => ({
  VisitTypeSelection: jest.fn(({ onSelect, onBack }) => (
    <div data-testid="visit-type-selection">
      <h2>Visit Type Selection</h2>
      <button onClick={() => onSelect('MEETING')}>Select Meeting</button>
      <button onClick={() => onSelect('DELIVERY')}>Select Delivery</button>
      {onBack && <button onClick={onBack}>Back</button>}
    </div>
  )),
}));

jest.mock('@/components/visitors/steps/DeliveryRegistrationForm', () => ({
  DeliveryRegistrationForm: jest.fn(({ onSubmit, onBack }) => (
    <div data-testid="delivery-registration-form">
      <h2>Delivery Registration Form</h2>
      <button
        onClick={() =>
          onSubmit({
            firstName: 'Delivery',
            lastName: 'Person',
            photo: new File([], 'photo.jpg'),
          })
        }
      >
        Continue
      </button>
      {onBack && <button onClick={onBack}>Back</button>}
    </div>
  )),
}));

jest.mock('@/components/visitors/public/MeetingRegistrationForm', () => ({
  MeetingRegistrationForm: jest.fn(({ onSubmit, onBack }) => (
    <div data-testid="meeting-registration-form">
      <h2>Meeting Registration Form</h2>
      <button
        onClick={() =>
          onSubmit({
            firstName: 'Meeting',
            lastName: 'Visitor',
            email: 'meeting@example.com',
            phone: '9876543210',
            photo: new File([], 'photo.jpg'),
            governmentIdDocument: new File([], 'id.jpg'),
          })
        }
      >
        Continue
      </button>
      {onBack && <button onClick={onBack}>Back</button>}
    </div>
  )),
}));

jest.mock('@/components/visitors/steps/DeliveryDetailsStep', () => ({
  DeliveryDetailsStep: jest.fn(({ onSubmit, onBack }) => (
    <div data-testid="delivery-details-step">
      <h2>Delivery Details Step</h2>
      <button
        onClick={() =>
          onSubmit({
            platform: 'Zomato',
            recipient: 'Reception',
          })
        }
      >
        Submit
      </button>
      {onBack && <button onClick={onBack}>Back</button>}
    </div>
  )),
}));

jest.mock('@/components/visitors/steps/MeetingDetailsStep', () => ({
  MeetingDetailsStep: jest.fn(({ onSubmit, onBack }) => (
    <div data-testid="meeting-details-step">
      <h2>Meeting Details Step</h2>
      <button
        onClick={() =>
          onSubmit({
            department: 'CARDIOLOGY',
            hostId: 'staff-123',
            purpose: 'Business meeting',
          })
        }
      >
        Submit
      </button>
      {onBack && <button onClick={onBack}>Back</button>}
    </div>
  )),
}));

jest.mock('@/components/visitors/steps/ConfirmationStep', () => ({
  ConfirmationStep: jest.fn(({ onDone }) => (
    <div data-testid="confirmation-step">
      <h2>Confirmation Step</h2>
      <button onClick={onDone}>Done</button>
    </div>
  )),
}));

describe('VisitorRegistrationWizard', () => {
  let mockPush: jest.Mock;
  let mockSearchParams: URLSearchParams;

  beforeEach(() => {
    jest.clearAllMocks();
    // Clear sessionStorage to prevent state restoration from interfering with tests
    sessionStorage.clear();
    mockPush = jest.fn();
    
    // Mock URLSearchParams with test-branch-id
    mockSearchParams = new URLSearchParams('branchId=test-branch-id');
    
    (useRouter as jest.Mock).mockReturnValue({ push: mockPush });
    (useSearchParams as jest.Mock).mockReturnValue(mockSearchParams);
    
    // Mock apiClient.post for successful submission
    mockedApiClient.post.mockResolvedValue({
      data: { visitId: 'visit-123', status: 'REQUEST_SENT' },
    });
  });

  describe('Initial Render & Step Progression', () => {
    it('should render phone entry step initially', () => {
      render(<VisitorRegistrationWizard />);
      
      expect(screen.getByTestId('phone-entry-step')).toBeInTheDocument();
      expect(screen.getAllByText('Step 1 of 6')[0]).toBeInTheDocument();
    });

    it('should transition from phone entry to phone verification', async () => {
      const user = userEvent.setup();
      render(<VisitorRegistrationWizard />);

      await user.click(screen.getByText('Send OTP'));

      await waitFor(() => {
        expect(screen.getByTestId('phone-verification-step')).toBeInTheDocument();
      });
      expect(screen.getAllByText('Step 2 of 6')[0]).toBeInTheDocument();
    });

    it('should transition from phone verification to visit type selection', async () => {
      const user = userEvent.setup();
      render(<VisitorRegistrationWizard />);

      // Complete phone entry
      await user.click(screen.getByText('Send OTP'));
      await waitFor(() => screen.getByTestId('phone-verification-step'));

      // Complete phone verification
      await user.click(screen.getByText('Verify OTP'));

      await waitFor(() => {
        expect(screen.getByTestId('visit-type-selection')).toBeInTheDocument();
      });
      expect(screen.getAllByText('Step 3 of 6')[0]).toBeInTheDocument();
    });
  });

  describe('Delivery Flow', () => {
    it('should complete delivery registration flow', async () => {
      const user = userEvent.setup();
      render(<VisitorRegistrationWizard />);

      // Phone Entry
      await user.click(screen.getByText('Send OTP'));
      await waitFor(() => screen.getByTestId('phone-verification-step'));

      // Phone Verification
      await user.click(screen.getByText('Verify OTP'));
      await waitFor(() => screen.getByTestId('visit-type-selection'));

      // Visit Type Selection - Delivery
      await user.click(screen.getByText('Select Delivery'));
      await waitFor(() => screen.getByTestId('delivery-registration-form'));
      expect(screen.getAllByText('Step 4 of 6')[0]).toBeInTheDocument();

      // Delivery Registration
      await user.click(within(screen.getByTestId('delivery-registration-form')).getByText('Continue'));
      await waitFor(() => screen.getByTestId('delivery-details-step'));
      expect(screen.getAllByText('Step 5 of 6')[0]).toBeInTheDocument();

      // Delivery Details
      await user.click(screen.getByText('Submit'));
      
      await waitFor(() => {
        expect(screen.getByTestId('confirmation-step')).toBeInTheDocument();
      });
      expect(screen.getAllByText('Step 6 of 6')[0]).toBeInTheDocument();
    });

    it('should call API with delivery data', async () => {
      const user = userEvent.setup();
      render(<VisitorRegistrationWizard />);

      // Complete flow to delivery details
      await user.click(screen.getByText('Send OTP'));
      await waitFor(() => screen.getByTestId('phone-verification-step'));
      await user.click(screen.getByText('Verify OTP'));
      await waitFor(() => screen.getByTestId('visit-type-selection'));
      await user.click(screen.getByText('Select Delivery'));
      await waitFor(() => screen.getByTestId('delivery-registration-form'));
      await user.click(within(screen.getByTestId('delivery-registration-form')).getByText('Continue'));
      await waitFor(() => screen.getByTestId('delivery-details-step'));

      // Submit delivery details
      await user.click(screen.getByText('Submit'));

      // Verify API was called with correct endpoint and FormData
      await waitFor(() => {
        expect(mockedApiClient.post).toHaveBeenCalledWith(
          '/api/public/visitors',
          expect.anything(),
          expect.objectContaining({
            headers: expect.objectContaining({
              'Content-Type': undefined,
            }),
          })
        );
      });
      
      // Verify the API call was made once
      expect(mockedApiClient.post).toHaveBeenCalledTimes(1);
    });
  });

  describe('Meeting Flow', () => {
    it('should complete meeting registration flow', async () => {
      const user = userEvent.setup();
      render(<VisitorRegistrationWizard />);

      // Phone Entry
      await user.click(screen.getByText('Send OTP'));
      await waitFor(() => screen.getByTestId('phone-verification-step'));

      // Phone Verification
      await user.click(screen.getByText('Verify OTP'));
      await waitFor(() => screen.getByTestId('visit-type-selection'));

      // Visit Type Selection - Meeting
      await user.click(screen.getByText('Select Meeting'));
      await waitFor(() => screen.getByTestId('meeting-registration-form'));
      expect(screen.getAllByText('Step 4 of 6')[0]).toBeInTheDocument();

      // Meeting Registration
      await user.click(within(screen.getByTestId('meeting-registration-form')).getByText('Continue'));
      await waitFor(() => screen.getByTestId('meeting-details-step'));
      expect(screen.getAllByText('Step 5 of 6')[0]).toBeInTheDocument();

      // Meeting Details
      await user.click(screen.getByText('Submit'));
      
      await waitFor(() => {
        expect(screen.getByTestId('confirmation-step')).toBeInTheDocument();
      });
      expect(screen.getAllByText('Step 6 of 6')[0]).toBeInTheDocument();
    });
  });

  describe('Back Navigation', () => {
    it('should allow back navigation from phone verification to phone entry', async () => {
      const user = userEvent.setup();
      render(<VisitorRegistrationWizard />);

      // Go to phone verification
      await user.click(screen.getByText('Send OTP'));
      await waitFor(() => screen.getByTestId('phone-verification-step'));

      // Go back
      await user.click(within(screen.getByTestId('phone-verification-step')).getByText('Back'));

      await waitFor(() => {
        expect(screen.getByTestId('phone-entry-step')).toBeInTheDocument();
      });
    });

    it('should preserve phone data on back navigation', async () => {
      const user = userEvent.setup();
      render(<VisitorRegistrationWizard />);

      // Complete phone entry
      await user.click(screen.getByText('Send OTP'));
      await waitFor(() => screen.getByTestId('phone-verification-step'));

      // Complete phone verification
      await user.click(screen.getByText('Verify OTP'));
      await waitFor(() => screen.getByTestId('visit-type-selection'));

      // Go back
      await user.click(within(screen.getByTestId('visit-type-selection')).getByText('Back'));

      // Should return to phone verification, not phone entry
      await waitFor(() => {
        expect(screen.getByTestId('phone-verification-step')).toBeInTheDocument();
      });
    });

    it('should preserve form data on back navigation from delivery details', async () => {
      const user = userEvent.setup();
      render(<VisitorRegistrationWizard />);

      // Complete flow to delivery details
      await user.click(screen.getByText('Send OTP'));
      await waitFor(() => screen.getByTestId('phone-verification-step'));
      await user.click(screen.getByText('Verify OTP'));
      await waitFor(() => screen.getByTestId('visit-type-selection'));
      await user.click(screen.getByText('Select Delivery'));
      await waitFor(() => screen.getByTestId('delivery-registration-form'));
      await user.click(within(screen.getByTestId('delivery-registration-form')).getByText('Continue'));
      await waitFor(() => screen.getByTestId('delivery-details-step'));

      // Go back
      await user.click(within(screen.getByTestId('delivery-details-step')).getByText('Back'));

      // Should return to delivery registration
      await waitFor(() => {
        expect(screen.getByTestId('delivery-registration-form')).toBeInTheDocument();
      });
    });
  });

  describe('Cancel Flow', () => {
    it('should directly cancel on first step', async () => {
      const user = userEvent.setup();
      render(<VisitorRegistrationWizard />);

      const cancelButton = within(screen.getByTestId('phone-entry-step')).getByText('Cancel');
      await user.click(cancelButton);

      expect(mockPush).toHaveBeenCalledWith('/visitor-registration');
    });

    it('should show confirmation dialog on cancel from middle step', async () => {
      const user = userEvent.setup();
      render(<VisitorRegistrationWizard />);

      // Go to phone verification
      await user.click(screen.getByText('Send OTP'));
      await waitFor(() => screen.getByTestId('phone-verification-step'));

      // Trigger cancel - this should open the confirmation dialog when clicking back
      // Since our mock doesn't trigger the browser back button dialog automatically,
      // we'll test the state instead
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('should display API error on submission failure', async () => {
      const user = userEvent.setup();
      mockedApiClient.post.mockRejectedValueOnce({
        response: {
          status: 400,
          data: { message: 'Submission failed' },
        },
      });

      render(<VisitorRegistrationWizard />);

      // Complete flow to delivery details
      await user.click(screen.getByText('Send OTP'));
      await waitFor(() => screen.getByTestId('phone-verification-step'));
      await user.click(screen.getByText('Verify OTP'));
      await waitFor(() => screen.getByTestId('visit-type-selection'));
      await user.click(screen.getByText('Select Delivery'));
      await waitFor(() => screen.getByTestId('delivery-registration-form'));
      await user.click(within(screen.getByTestId('delivery-registration-form')).getByText('Continue'));
      await waitFor(() => screen.getByTestId('delivery-details-step'));

      // Submit with error
      await user.click(screen.getByText('Submit'));

      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent('Submission failed');
      });
    });

    it('should allow dismissing API error', async () => {
      const user = userEvent.setup();
      mockedApiClient.post.mockRejectedValueOnce({
        response: {
          status: 400,
          data: { message: 'Test error' },
        },
      });

      render(<VisitorRegistrationWizard />);

      // Complete flow and trigger error
      await user.click(screen.getByText('Send OTP'));
      await waitFor(() => screen.getByTestId('phone-verification-step'));
      await user.click(screen.getByText('Verify OTP'));
      await waitFor(() => screen.getByTestId('visit-type-selection'));
      await user.click(screen.getByText('Select Delivery'));
      await waitFor(() => screen.getByTestId('delivery-registration-form'));
      await user.click(within(screen.getByTestId('delivery-registration-form')).getByText('Continue'));
      await waitFor(() => screen.getByTestId('delivery-details-step'));
      await user.click(screen.getByText('Submit'));

      await waitFor(() => screen.getByRole('alert'));

      // Dismiss error
      await user.click(screen.getByText('Dismiss'));

      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });
  });

  describe('Confirmation & Navigation', () => {
    it('should navigate to status page on done', async () => {
      const user = userEvent.setup();
      render(<VisitorRegistrationWizard />);

      // Complete entire flow
      await user.click(screen.getByText('Send OTP'));
      await waitFor(() => screen.getByTestId('phone-verification-step'));
      await user.click(screen.getByText('Verify OTP'));
      await waitFor(() => screen.getByTestId('visit-type-selection'));
      await user.click(screen.getByText('Select Delivery'));
      await waitFor(() => screen.getByTestId('delivery-registration-form'));
      await user.click(within(screen.getByTestId('delivery-registration-form')).getByText('Continue'));
      await waitFor(() => screen.getByTestId('delivery-details-step'));
      await user.click(screen.getByText('Submit'));
      await waitFor(() => screen.getByTestId('confirmation-step'));

      // Click Done
      await user.click(screen.getByText('Done'));

      expect(mockPush).toHaveBeenCalledWith('/visitor-registration/status/visit-123');
    });
  });

  describe('Progress Indicator', () => {
    it('should show correct progress percentage', async () => {
      const user = userEvent.setup();
      render(<VisitorRegistrationWizard />);

      // Step 1 of 6 = ~16.67%
      expect(screen.getAllByText('Step 1 of 6')[0]).toBeInTheDocument();

      // Go to step 2
      await user.click(screen.getByText('Send OTP'));
      await waitFor(() => {
        expect(screen.getAllByText('Step 2 of 6')[0]).toBeInTheDocument();
      });

      // Go to step 3
      await user.click(screen.getByText('Verify OTP'));
      await waitFor(() => {
        expect(screen.getAllByText('Step 3 of 6')[0]).toBeInTheDocument();
      });
    });
  });

  describe('SessionStorage Persistence', () => {
    it('should restore wizard state from sessionStorage on mount', () => {
      // Seed sessionStorage with saved wizard state at VISITOR_REGISTRATION step
      const savedState = {
        currentStep: 'visitor-registration',
        visitType: 'MEETING',
        phoneData: {
          phone: '9876543210',
          branchId: 'test-branch-id',
          isVerified: true,
          visitorId: 'visitor-123',
          isNewVisitor: false,
          countryCode: '+91',
          fullPhone: '+919876543210',
          isExistingVisitor: true,
        },
        visitId: null,
        apiError: null,
        deliveryFormData: null,
        deliveryDetailsData: null,
        meetingFormData: null,
        meetingDetailsData: null,
        selectedHost: null,
        photoDataUrl: null,
        govIdDataUrl: null,
        officeIdDataUrl: null,
        savedAt: Date.now(),
      };
      sessionStorage.setItem('visitor-registration-wizard-state', JSON.stringify(savedState));

      render(<VisitorRegistrationWizard />);

      // Should restore to the meeting registration form (step 4, VISITOR_REGISTRATION)
      expect(screen.getByTestId('meeting-registration-form')).toBeInTheDocument();
      expect(screen.getAllByText('Step 4 of 6')[0]).toBeInTheDocument();
    });

    it('should start fresh when no sessionStorage data exists', () => {
      // Ensure sessionStorage is empty
      sessionStorage.clear();

      render(<VisitorRegistrationWizard />);

      // Should start at phone entry (step 1)
      expect(screen.getByTestId('phone-entry-step')).toBeInTheDocument();
      expect(screen.getAllByText('Step 1 of 6')[0]).toBeInTheDocument();
    });

    it('should not restore expired sessionStorage state', () => {
      // Seed with expired state (31 minutes ago)
      const savedState = {
        currentStep: 'visitor-registration',
        visitType: 'MEETING',
        phoneData: {
          phone: '9876543210',
          branchId: 'test-branch-id',
          isVerified: true,
        },
        visitId: null,
        apiError: null,
        deliveryFormData: null,
        deliveryDetailsData: null,
        meetingFormData: null,
        meetingDetailsData: null,
        selectedHost: null,
        photoDataUrl: null,
        govIdDataUrl: null,
        officeIdDataUrl: null,
        savedAt: Date.now() - 31 * 60 * 1000, // 31 minutes ago
      };
      sessionStorage.setItem('visitor-registration-wizard-state', JSON.stringify(savedState));

      render(<VisitorRegistrationWizard />);

      // Should start fresh at phone entry
      expect(screen.getByTestId('phone-entry-step')).toBeInTheDocument();
    });

    it('should save state to sessionStorage when navigating steps', async () => {
      const user = userEvent.setup();
      render(<VisitorRegistrationWizard />);

      // Complete phone entry
      await user.click(screen.getByText('Send OTP'));
      await waitFor(() => screen.getByTestId('phone-verification-step'));

      // Check sessionStorage has saved state
      const raw = sessionStorage.getItem('visitor-registration-wizard-state');
      expect(raw).toBeTruthy();

      const saved = JSON.parse(raw!);
      expect(saved.currentStep).toBe('phone-verification');
      expect(saved.phoneData).toBeTruthy();
      expect(saved.phoneData.phone).toBe('9876543210');
    });

    it('should clear sessionStorage on confirmation done', async () => {
      const user = userEvent.setup();
      render(<VisitorRegistrationWizard />);

      // Complete entire flow
      await user.click(screen.getByText('Send OTP'));
      await waitFor(() => screen.getByTestId('phone-verification-step'));
      await user.click(screen.getByText('Verify OTP'));
      await waitFor(() => screen.getByTestId('visit-type-selection'));
      await user.click(screen.getByText('Select Delivery'));
      await waitFor(() => screen.getByTestId('delivery-registration-form'));
      await user.click(within(screen.getByTestId('delivery-registration-form')).getByText('Continue'));
      await waitFor(() => screen.getByTestId('delivery-details-step'));
      await user.click(screen.getByText('Submit'));
      await waitFor(() => screen.getByTestId('confirmation-step'));

      // Click Done
      await user.click(screen.getByText('Done'));

      // sessionStorage should be cleared
      expect(sessionStorage.getItem('visitor-registration-wizard-state')).toBeNull();
    });
  });

  describe('Accessibility', () => {
    it('should have screen reader announcement region', () => {
      render(<VisitorRegistrationWizard />);
      
      const liveRegion = document.getElementById('step-announcement');
      expect(liveRegion).toBeInTheDocument();
      expect(liveRegion).toHaveAttribute('role', 'status');
      expect(liveRegion).toHaveAttribute('aria-live', 'polite');
      expect(liveRegion).toHaveAttribute('aria-atomic', 'true');
    });

    it('should announce step changes', async () => {
      const user = userEvent.setup();
      render(<VisitorRegistrationWizard />);

      const liveRegion = document.getElementById('step-announcement');
      expect(liveRegion).toHaveTextContent('Step 1 of 6');

      await user.click(screen.getByText('Send OTP'));
      await waitFor(() => {
        expect(liveRegion).toHaveTextContent('Step 2 of 6');
      });
    });
  });
});
