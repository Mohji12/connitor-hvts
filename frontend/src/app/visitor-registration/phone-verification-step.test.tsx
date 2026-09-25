/**
 * Tests for PhoneVerificationStep component
 * Task 4.2 - Phone Verification Step
 */

import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  PhoneVerificationStep,
  VisitorData,
  SendOtpResponse,
} from './phone-verification-step';
import '@testing-library/jest-dom';

// Mock API client
jest.mock('@/lib/api', () => ({
  __esModule: true,
  default: {
    post: jest.fn(),
  },
}));

import apiClient from '@/lib/api';

const mockApiPost = apiClient.post as jest.MockedFunction<
  typeof apiClient.post
>;

// Test wrapper with React Query provider
function renderWithQueryClient(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
        staleTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });
  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>,
  );
}

describe('PhoneVerificationStep', () => {
  const mockBranchId = '550e8400-e29b-41d4-a716-446655440000';
  const mockPhone = '9876543210';
  const mockOnSuccess = jest.fn();
  const mockOnCancel = jest.fn();

  const mockVisitorData: VisitorData = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    firstName: 'John',
    middleName: null,
    lastName: 'Doe',
    phone: '9876543210',
    email: 'john@example.com',
    company: 'Acme Inc',
    designation: 'Manager',
    phoneVerified: true,
  };

  // Helper function to type OTP
  async function typeOtp(value: string) {
    const user = userEvent.setup({ delay: null });
    // Find the actual input element (it's hidden but functional)
    const input = document.querySelector(
      'input[data-input-otp="true"]',
    ) as HTMLInputElement;
    if (!input) {
      throw new Error('OTP input not found');
    }
    await user.type(input, value);
  }

  beforeEach(() => {
    jest.clearAllMocks();
    mockApiPost.mockReset(); // Completely reset the mock
    localStorage.clear();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  describe('Rendering', () => {
    it('should render step indicator', () => {
      renderWithQueryClient(
        <PhoneVerificationStep
          phone={mockPhone}
          branchId={mockBranchId}
          onSuccess={mockOnSuccess}
        />,
      );
      expect(screen.getByText(/step 1 of 6/i)).toBeInTheDocument();
    });

    it('should render header text', () => {
      renderWithQueryClient(
        <PhoneVerificationStep
          phone={mockPhone}
          branchId={mockBranchId}
          onSuccess={mockOnSuccess}
        />,
      );
      expect(
        screen.getByRole('heading', { name: /verify your phone number/i }),
      ).toBeInTheDocument();
    });

    it('should display masked phone number', () => {
      renderWithQueryClient(
        <PhoneVerificationStep
          phone={mockPhone}
          branchId={mockBranchId}
          onSuccess={mockOnSuccess}
        />,
      );
      expect(
        screen.getByText(
          /we've sent a 6-digit code to \+91 987\*\*210 via sms/i,
        ),
      ).toBeInTheDocument();
    });

    it('should render OTP input group', () => {
      renderWithQueryClient(
        <PhoneVerificationStep
          phone={mockPhone}
          branchId={mockBranchId}
          onSuccess={mockOnSuccess}
        />,
      );
      const otpGroup = screen.getByRole('group', {
        name: /enter verification code/i,
      });
      expect(otpGroup).toBeInTheDocument();
    });

    it('should show countdown timer initially', () => {
      renderWithQueryClient(
        <PhoneVerificationStep
          phone={mockPhone}
          branchId={mockBranchId}
          onSuccess={mockOnSuccess}
        />,
      );
      expect(screen.getByText(/resend in 60s/i)).toBeInTheDocument();
    });

    it('should render change phone link when onCancel provided', () => {
      renderWithQueryClient(
        <PhoneVerificationStep
          phone={mockPhone}
          branchId={mockBranchId}
          onSuccess={mockOnSuccess}
          onCancel={mockOnCancel}
        />,
      );
      expect(
        screen.getByRole('button', { name: /change phone number/i }),
      ).toBeInTheDocument();
    });

    it('should not render change phone link when onCancel not provided', () => {
      renderWithQueryClient(
        <PhoneVerificationStep
          phone={mockPhone}
          branchId={mockBranchId}
          onSuccess={mockOnSuccess}
        />,
      );
      expect(
        screen.queryByRole('button', { name: /change phone number/i }),
      ).not.toBeInTheDocument();
    });
  });

  describe('Countdown Timer', () => {
    it('should decrement countdown every second', () => {
      renderWithQueryClient(
        <PhoneVerificationStep
          phone={mockPhone}
          branchId={mockBranchId}
          onSuccess={mockOnSuccess}
        />,
      );

      expect(screen.getByText(/resend in 60s/i)).toBeInTheDocument();

      // Advance by 1 second
      act(() => {
        jest.advanceTimersByTime(1000);
      });
      expect(screen.getByText(/resend in 59s/i)).toBeInTheDocument();

      // Advance by 10 seconds
      act(() => {
        jest.advanceTimersByTime(10000);
      });
      expect(screen.getByText(/resend in 49s/i)).toBeInTheDocument();
    });

    it('should enable resend button when countdown reaches 0', () => {
      renderWithQueryClient(
        <PhoneVerificationStep
          phone={mockPhone}
          branchId={mockBranchId}
          onSuccess={mockOnSuccess}
        />,
      );

      // Advance by 60 seconds
      act(() => {
        jest.advanceTimersByTime(60000);
      });

      expect(
        screen.getByRole('button', { name: /didn't receive\? resend/i }),
      ).toBeInTheDocument();
      expect(screen.queryByText(/resend in \d+s/i)).not.toBeInTheDocument();
    });

    it('should reset countdown after resend', async () => {
      const user = userEvent.setup({ delay: null });
      mockApiPost.mockResolvedValueOnce({
        data: { success: true, message: 'OTP sent', isNewVisitor: false },
      });

      renderWithQueryClient(
        <PhoneVerificationStep
          phone={mockPhone}
          branchId={mockBranchId}
          onSuccess={mockOnSuccess}
        />,
      );

      // Fast-forward to enable resend
      act(() => {
        jest.advanceTimersByTime(60000);
      });

      const resendButton = screen.getByRole('button', {
        name: /didn't receive\? resend/i,
      });
      await user.click(resendButton);

      await waitFor(() => {
        expect(mockApiPost).toHaveBeenCalledWith(
          '/api/public/visitors/send-otp',
          {
            phone: mockPhone,
            branchId: mockBranchId,
          },
        );
      });

      // Countdown should reset
      expect(screen.getByText(/resend in 60s/i)).toBeInTheDocument();
    });
  });

  describe('OTP Input and Verification', () => {
    it('should render OTP input', () => {
      renderWithQueryClient(
        <PhoneVerificationStep
          phone={mockPhone}
          branchId={mockBranchId}
          onSuccess={mockOnSuccess}
        />,
      );

      const otpInput = document.querySelector('input[data-input-otp="true"]');
      expect(otpInput).toBeInTheDocument();
    });

    it('should render Verify OTP button', () => {
      renderWithQueryClient(
        <PhoneVerificationStep
          phone={mockPhone}
          branchId={mockBranchId}
          onSuccess={mockOnSuccess}
        />,
      );

      const verifyButton = screen.getByRole('button', { name: /verify otp/i });
      expect(verifyButton).toBeInTheDocument();
    });

    it('should disable Verify button when OTP is incomplete', () => {
      renderWithQueryClient(
        <PhoneVerificationStep
          phone={mockPhone}
          branchId={mockBranchId}
          onSuccess={mockOnSuccess}
        />,
      );

      const verifyButton = screen.getByRole('button', { name: /verify otp/i });
      expect(verifyButton).toBeDisabled();
    });

    it('should enable Verify button when OTP is complete', async () => {
      renderWithQueryClient(
        <PhoneVerificationStep
          phone={mockPhone}
          branchId={mockBranchId}
          onSuccess={mockOnSuccess}
        />,
      );

      await typeOtp('123456');

      const verifyButton = screen.getByRole('button', { name: /verify otp/i });
      expect(verifyButton).toBeEnabled();
    });

    it('should call verify API when Verify button is clicked', async () => {
      const user = userEvent.setup({ delay: null });
      mockApiPost.mockResolvedValueOnce({
        data: {
          verified: true,
          isExistingVisitor: false,
          visitorData: mockVisitorData,
        },
      });

      renderWithQueryClient(
        <PhoneVerificationStep
          phone={mockPhone}
          branchId={mockBranchId}
          onSuccess={mockOnSuccess}
        />,
      );

      await typeOtp('123456');

      const verifyButton = screen.getByRole('button', { name: /verify otp/i });
      await user.click(verifyButton);

      // Wait for API call
      await waitFor(() => {
        expect(mockApiPost).toHaveBeenCalledWith(
          '/api/public/visitors/verify-phone',
          {
            phone: mockPhone,
            otp: '123456',
            branchId: mockBranchId,
          },
        );
      });
    });

    it('should NOT auto-submit when 6 digits are entered', async () => {
      mockApiPost.mockResolvedValueOnce({
        data: {
          verified: true,
          isExistingVisitor: false,
          visitorData: mockVisitorData,
        },
      });

      renderWithQueryClient(
        <PhoneVerificationStep
          phone={mockPhone}
          branchId={mockBranchId}
          onSuccess={mockOnSuccess}
        />,
      );

      await typeOtp('123456');

      // Wait a moment to ensure no auto-submit
      await act(async () => {
        jest.advanceTimersByTime(500);
      });

      // API should NOT be called automatically
      expect(mockApiPost).not.toHaveBeenCalled();
    });
  });

  describe('Success Flow', () => {
    it('should show success animation and call onSuccess for existing visitor', async () => {
      const user = userEvent.setup({ delay: null });

      const existingVisitorData = {
        ...mockVisitorData,
      };

      mockApiPost.mockResolvedValueOnce({
        data: {
          verified: true,
          isExistingVisitor: true,
          visitorData: existingVisitorData,
        },
      });

      renderWithQueryClient(
        <PhoneVerificationStep
          phone={mockPhone}
          branchId={mockBranchId}
          onSuccess={mockOnSuccess}
        />,
      );

      await typeOtp('123456');

      const verifyButton = screen.getByRole('button', { name: /verify otp/i });
      await user.click(verifyButton);

      // Wait for success animation
      await waitFor(() => {
        expect(
          screen.getByText(/phone verified successfully!/i),
        ).toBeInTheDocument();
      });

      // Fast-forward the 1s timeout
      act(() => {
        jest.advanceTimersByTime(1000);
      });

      // onSuccess should be called
      await waitFor(() => {
        expect(mockOnSuccess).toHaveBeenCalledWith({
          visitorData: existingVisitorData,
          isExistingVisitor: true,
          phone: mockPhone,
        });
      });
    });

    it('should display checkmark icon on success', async () => {
      const user = userEvent.setup({ delay: null });
      mockApiPost.mockResolvedValueOnce({
        data: {
          verified: true,
          isExistingVisitor: false,
          visitorData: mockVisitorData,
        },
      });

      renderWithQueryClient(
        <PhoneVerificationStep
          phone={mockPhone}
          branchId={mockBranchId}
          onSuccess={mockOnSuccess}
        />,
      );

      await typeOtp('123456');

      const verifyButton = screen.getByRole('button', { name: /verify otp/i });
      await user.click(verifyButton);

      await waitFor(() => {
        const checkIcon = screen.getByLabelText(/verification successful/i);
        expect(checkIcon).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('should show INVALID_OTP error message', async () => {
      const user = userEvent.setup({ delay: null });

      renderWithQueryClient(
        <PhoneVerificationStep
          phone={mockPhone}
          branchId={mockBranchId}
          onSuccess={mockOnSuccess}
        />,
      );

      // Setup mock AFTER rendering to avoid cache issues
      mockApiPost.mockRejectedValueOnce({
        response: {
          status: 400,
          data: {
            statusCode: 400,
            message: 'Invalid OTP',
            error: 'INVALID_OTP',
          },
        },
      });

      await typeOtp('999999');

      const verifyButton = screen.getByRole('button', { name: /verify otp/i });
      await user.click(verifyButton);

      const errorMessage = await screen.findByText(
        /invalid code\. please check and try again\./i,
      );
      expect(errorMessage).toBeInTheDocument();
    });

    it('should show INVALID_OTP error with attempts remaining', async () => {
      const user = userEvent.setup({ delay: null });

      renderWithQueryClient(
        <PhoneVerificationStep
          phone={mockPhone}
          branchId={mockBranchId}
          onSuccess={mockOnSuccess}
        />,
      );

      // Setup mock AFTER rendering to avoid cache issues
      mockApiPost.mockRejectedValueOnce({
        response: {
          status: 400,
          data: {
            statusCode: 400,
            message: 'Invalid OTP. 2 attempts remaining.',
            error: 'INVALID_OTP',
            attemptsRemaining: 2,
          },
        },
      });

      await typeOtp('999999');

      const verifyButton = screen.getByRole('button', { name: /verify otp/i });
      await user.click(verifyButton);

      const errorMessage = await screen.findByText(
        /invalid code\. please check and try again\. 2 attempts remaining\./i,
      );
      expect(errorMessage).toBeInTheDocument();
    });

    it('should show OTP_EXPIRED error message', async () => {
      const user = userEvent.setup({ delay: null });

      renderWithQueryClient(
        <PhoneVerificationStep
          phone={mockPhone}
          branchId={mockBranchId}
          onSuccess={mockOnSuccess}
        />,
      );

      // Setup mock AFTER rendering to avoid cache issues
      mockApiPost.mockRejectedValueOnce({
        response: {
          status: 400,
          data: {
            statusCode: 400,
            message: 'OTP has expired',
            error: 'OTP_EXPIRED',
          },
        },
      });

      await typeOtp('123456');

      const verifyButton = screen.getByRole('button', { name: /verify otp/i });
      await user.click(verifyButton);

      const errorMessage = await screen.findByText(
        /code expired\. please request a new code\./i,
      );
      expect(errorMessage).toBeInTheDocument();
    });

    it('should show OTP_LOCKED error message', async () => {
      const user = userEvent.setup({ delay: null });

      renderWithQueryClient(
        <PhoneVerificationStep
          phone={mockPhone}
          branchId={mockBranchId}
          onSuccess={mockOnSuccess}
        />,
      );

      // Setup mock AFTER rendering to avoid cache issues
      mockApiPost.mockRejectedValueOnce({
        response: {
          status: 400,
          data: {
            statusCode: 400,
            message: 'Account locked',
            error: 'OTP_LOCKED',
          },
        },
      });

      await typeOtp('123456');

      const verifyButton = screen.getByRole('button', { name: /verify otp/i });
      await user.click(verifyButton);

      const errorMessage = await screen.findByText(
        /too many failed attempts\. please try again after 15 minutes\./i,
      );
      expect(errorMessage).toBeInTheDocument();
    });

    it('should show network error message', async () => {
      const user = userEvent.setup({ delay: null });

      renderWithQueryClient(
        <PhoneVerificationStep
          phone={mockPhone}
          branchId={mockBranchId}
          onSuccess={mockOnSuccess}
        />,
      );

      // Setup mock AFTER rendering to avoid cache issues
      mockApiPost.mockRejectedValueOnce(new Error('Network Error'));

      await typeOtp('123456');

      const verifyButton = screen.getByRole('button', { name: /verify otp/i });
      await user.click(verifyButton);

      const errorMessage = await screen.findByText(
        /connection lost\. please check your internet and try again\./i,
      );
      expect(errorMessage).toBeInTheDocument();
    });

    it('should clear OTP on error', async () => {
      const user = userEvent.setup({ delay: null });

      renderWithQueryClient(
        <PhoneVerificationStep
          phone={mockPhone}
          branchId={mockBranchId}
          onSuccess={mockOnSuccess}
        />,
      );

      // Setup mock AFTER rendering to avoid cache issues
      mockApiPost.mockRejectedValueOnce({
        response: {
          status: 400,
          data: {
            statusCode: 400,
            message: 'Invalid OTP',
            error: 'INVALID_OTP',
          },
        },
      });

      await typeOtp('999999');

      const verifyButton = screen.getByRole('button', { name: /verify otp/i });
      await user.click(verifyButton);

      await waitFor(() => {
        expect(screen.getByText(/invalid code/i)).toBeInTheDocument();
      });

      // OTP should be cleared (value should be empty)
      const otpInput = document.querySelector(
        'input[data-input-otp="true"]',
      ) as HTMLInputElement;
      await waitFor(() => {
        expect(otpInput.value).toBe('');
      });
    });
  });

  describe('Resend OTP', () => {
    it('should call resend API when resend button is clicked', async () => {
      const user = userEvent.setup({ delay: null });

      renderWithQueryClient(
        <PhoneVerificationStep
          phone={mockPhone}
          branchId={mockBranchId}
          onSuccess={mockOnSuccess}
        />,
      );

      // Setup mock AFTER rendering
      mockApiPost.mockResolvedValueOnce({
        data: { success: true, message: 'OTP sent', isNewVisitor: false },
      });

      // Fast-forward to enable resend
      act(() => {
        jest.advanceTimersByTime(60000);
      });

      const resendButton = await screen.findByRole('button', {
        name: /didn't receive\? resend/i,
      });
      await user.click(resendButton);

      await waitFor(() => {
        expect(mockApiPost).toHaveBeenCalledWith(
          '/api/public/visitors/send-otp',
          {
            phone: mockPhone,
            branchId: mockBranchId,
          },
        );
      });
    });

    it('should store testOtp in localStorage when provided', async () => {
      const user = userEvent.setup({ delay: null });

      renderWithQueryClient(
        <PhoneVerificationStep
          phone={mockPhone}
          branchId={mockBranchId}
          onSuccess={mockOnSuccess}
        />,
      );

      // Setup mock AFTER rendering
      mockApiPost.mockResolvedValueOnce({
        data: {
          success: true,
          message: 'OTP sent',
          isNewVisitor: false,
          testOtp: '123456',
        },
      });

      act(() => {
        jest.advanceTimersByTime(60000);
      });

      const resendButton = await screen.findByRole('button', {
        name: /didn't receive\? resend/i,
      });
      await user.click(resendButton);

      await waitFor(() => {
        expect(localStorage.getItem('test_otp')).toBe('123456');
      });
    });

    it('should show loading state during resend', async () => {
      const user = userEvent.setup({ delay: null });

      renderWithQueryClient(
        <PhoneVerificationStep
          phone={mockPhone}
          branchId={mockBranchId}
          onSuccess={mockOnSuccess}
        />,
      );

      let resolvePromise: (value: unknown) => void;
      const promise = new Promise((resolve) => {
        resolvePromise = resolve;
      });

      // Setup mock AFTER rendering
      mockApiPost.mockReturnValueOnce(
        promise as Promise<{ data: SendOtpResponse }>,
      );

      act(() => {
        jest.advanceTimersByTime(60000);
      });

      const resendButton = await screen.findByRole('button', {
        name: /didn't receive\? resend/i,
      });
      await user.click(resendButton);

      // Check that button shows loading state during request
      await waitFor(() => {
        expect(screen.getByText(/sending\.\.\./i)).toBeInTheDocument();
      });

      // Resolve the promise
      await act(async () => {
        resolvePromise!({
          data: {
            success: true,
            message: 'OTP sent',
            isNewVisitor: false,
          },
        });
        // Wait for promise to settle
        await promise;
      });

      // Wait for countdown to reset (showing successful resend)
      await waitFor(() => {
        expect(screen.getByText(/resend in 60s/i)).toBeInTheDocument();
      });
    });
  });

  describe('Change Phone Number', () => {
    it('should call onCancel when change phone button is clicked', async () => {
      const user = userEvent.setup({ delay: null });
      renderWithQueryClient(
        <PhoneVerificationStep
          phone={mockPhone}
          branchId={mockBranchId}
          onSuccess={mockOnSuccess}
          onCancel={mockOnCancel}
        />,
      );

      const changePhoneButton = screen.getByRole('button', {
        name: /change phone number/i,
      });
      await user.click(changePhoneButton);

      expect(mockOnCancel).toHaveBeenCalled();
    });

    it('should call onCancel when Escape is pressed', async () => {
      const user = userEvent.setup({ delay: null });
      renderWithQueryClient(
        <PhoneVerificationStep
          phone={mockPhone}
          branchId={mockBranchId}
          onSuccess={mockOnSuccess}
          onCancel={mockOnCancel}
        />,
      );

      await user.keyboard('{Escape}');

      expect(mockOnCancel).toHaveBeenCalled();
    });
  });

  describe('Loading States', () => {
    it('should show loading announcement during verification', async () => {
      const user = userEvent.setup({ delay: null });
      mockApiPost.mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(
              () =>
                resolve({
                  data: {
                    verified: true,
                    isExistingVisitor: false,
                    visitorData: mockVisitorData,
                  },
                }),
              200,
            ),
          ),
      );

      renderWithQueryClient(
        <PhoneVerificationStep
          phone={mockPhone}
          branchId={mockBranchId}
          onSuccess={mockOnSuccess}
        />,
      );

      await typeOtp('123456');

      const verifyButton = screen.getByRole('button', { name: /verify otp/i });
      await user.click(verifyButton);

      // Wait briefly for loading state
      await waitFor(() => {
        expect(
          screen.getByText(/verifying otp, please wait\.\.\./i),
        ).toBeInTheDocument();
      });
    });

    it('should show loading state on Verify button during verification', async () => {
      const user = userEvent.setup({ delay: null });
      mockApiPost.mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(
              () =>
                resolve({
                  data: {
                    verified: true,
                    isExistingVisitor: false,
                    visitorData: mockVisitorData,
                  },
                }),
              200,
            ),
          ),
      );

      renderWithQueryClient(
        <PhoneVerificationStep
          phone={mockPhone}
          branchId={mockBranchId}
          onSuccess={mockOnSuccess}
        />,
      );

      await typeOtp('123456');

      const verifyButton = screen.getByRole('button', { name: /verify otp/i });
      await user.click(verifyButton);

      // Button should show "Verifying..." text
      await waitFor(() => {
        expect(
          screen.getByRole('button', { name: /verifying\.\.\./i }),
        ).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper role and aria-label on container', () => {
      renderWithQueryClient(
        <PhoneVerificationStep
          phone={mockPhone}
          branchId={mockBranchId}
          onSuccess={mockOnSuccess}
        />,
      );

      const container = screen.getByRole('group', {
        name: /phone verification/i,
      });
      expect(container).toBeInTheDocument();
    });

    it('should have step indicator with aria-label', () => {
      renderWithQueryClient(
        <PhoneVerificationStep
          phone={mockPhone}
          branchId={mockBranchId}
          onSuccess={mockOnSuccess}
        />,
      );

      const stepIndicator = screen.getByLabelText(
        /registration progress: step 1 of 6/i,
      );
      expect(stepIndicator).toBeInTheDocument();
    });

    it('should announce success with proper role and aria-live', async () => {
      const user = userEvent.setup({ delay: null });
      mockApiPost.mockResolvedValueOnce({
        data: {
          verified: true,
          isExistingVisitor: false,
          visitorData: mockVisitorData,
        },
      });

      renderWithQueryClient(
        <PhoneVerificationStep
          phone={mockPhone}
          branchId={mockBranchId}
          onSuccess={mockOnSuccess}
        />,
      );

      await typeOtp('123456');

      const verifyButton = screen.getByRole('button', { name: /verify otp/i });
      await user.click(verifyButton);

      await waitFor(() => {
        const successStatus = screen.getByRole('status');
        expect(successStatus).toBeInTheDocument();
      });
    });

    it('should announce countdown changes with aria-live', () => {
      renderWithQueryClient(
        <PhoneVerificationStep
          phone={mockPhone}
          branchId={mockBranchId}
          onSuccess={mockOnSuccess}
        />,
      );

      const countdownRegion = screen.getByText(/resend in 60s/i).parentElement;
      expect(countdownRegion).toHaveAttribute('aria-live', 'polite');
      expect(countdownRegion).toHaveAttribute('aria-atomic', 'true');
    });
  });
});
