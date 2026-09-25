import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { VisitorActionButtons } from './VisitorActionButtons';
import { VisitStatus } from '@/types/visitor';
import { approveVisit } from '@/services/visit.service';
import { toast } from 'sonner';

// Mock dependencies
jest.mock('@/services/visit.service');
jest.mock('sonner');

const mockedApproveVisit = approveVisit as jest.MockedFunction<typeof approveVisit>;
const mockedToast = toast as jest.Mocked<typeof toast>;

describe('VisitorActionButtons', () => {
  const defaultProps = {
    visitId: 'visit-1',
    visitorName: 'John Doe',
    currentStatus: VisitStatus.PENDING,
    onActionComplete: jest.fn(),
    onReject: jest.fn(),
    onVerifyOtp: jest.fn(),
    onCheckOut: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Status: PENDING', () => {
    it('should render Approve and Reject buttons', () => {
      render(<VisitorActionButtons {...defaultProps} />);

      expect(screen.getByRole('button', { name: /approve john doe/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /reject john doe/i })).toBeInTheDocument();
    });

    it('should call approveVisit API when Approve is clicked', async () => {
      const mockResponse = {
        success: true,
        visit: {
          id: 'visit-1',
          status: 'APPROVED' as const,
          checkInOtp: '123456',
          checkInOtpExpiry: '2026-02-11T12:00:00Z',
        },
      };
      mockedApproveVisit.mockResolvedValueOnce(mockResponse);

      render(<VisitorActionButtons {...defaultProps} />);

      const approveButton = screen.getByRole('button', { name: /approve john doe/i });
      fireEvent.click(approveButton);

      await waitFor(() => {
        expect(mockedApproveVisit).toHaveBeenCalledWith('visit-1');
        expect(defaultProps.onActionComplete).toHaveBeenCalledWith('visit-1', VisitStatus.APPROVED);
        expect(mockedToast.success).toHaveBeenCalledWith('Visit approved. Gate Pass sent.');
      });
    });

    it('should show error toast when approve fails', async () => {
      mockedApproveVisit.mockRejectedValueOnce(new Error('Visit not found'));

      render(<VisitorActionButtons {...defaultProps} />);

      const approveButton = screen.getByRole('button', { name: /approve john doe/i });
      fireEvent.click(approveButton);

      await waitFor(() => {
        expect(mockedToast.error).toHaveBeenCalledWith('Failed to approve. Visit not found');
        expect(defaultProps.onActionComplete).not.toHaveBeenCalled();
      });
    });

    it('should show loading state during approve', async () => {
      mockedApproveVisit.mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 100))
      );

      render(<VisitorActionButtons {...defaultProps} />);

      const approveButton = screen.getByRole('button', { name: /approve john doe/i });
      fireEvent.click(approveButton);

      // Should show loading spinner
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /approve john doe/i })).toBeDisabled();
        expect(document.querySelector('.animate-spin')).toBeInTheDocument();
      });
    });

    it('should call onReject when Reject is clicked', () => {
      render(<VisitorActionButtons {...defaultProps} />);

      const rejectButton = screen.getByRole('button', { name: /reject john doe/i });
      fireEvent.click(rejectButton);

      expect(defaultProps.onReject).toHaveBeenCalledWith('visit-1');
    });

    it('should stop event propagation when button is clicked', () => {
      const mockStopPropagation = jest.fn();
      render(<VisitorActionButtons {...defaultProps} />);

      const approveButton = screen.getByRole('button', { name: /approve john doe/i });
      const event = new MouseEvent('click', { bubbles: true });
      Object.defineProperty(event, 'stopPropagation', {
        value: mockStopPropagation,
      });

      fireEvent(approveButton, event);

      expect(mockStopPropagation).toHaveBeenCalled();
    });
  });

  describe('Status: REQUEST_SENT', () => {
    it('should render Approve and Reject buttons', () => {
      render(<VisitorActionButtons {...defaultProps} currentStatus={VisitStatus.REQUEST_SENT} />);

      expect(screen.getByRole('button', { name: /approve john doe/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /reject john doe/i })).toBeInTheDocument();
    });
  });

  describe('Status: APPROVED', () => {
    it('should render Verify OTP button', () => {
      render(<VisitorActionButtons {...defaultProps} currentStatus={VisitStatus.APPROVED} />);

      expect(screen.getByRole('button', { name: /verify otp john doe/i })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /approve/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /reject/i })).not.toBeInTheDocument();
    });

    it('should call onVerifyOtp when Verify OTP is clicked', () => {
      render(<VisitorActionButtons {...defaultProps} currentStatus={VisitStatus.APPROVED} />);

      const verifyButton = screen.getByRole('button', { name: /verify otp john doe/i });
      fireEvent.click(verifyButton);

      expect(defaultProps.onVerifyOtp).toHaveBeenCalledWith('visit-1');
    });
  });

  describe('Status: CHECKED_IN', () => {
    it('should render Check Out button', () => {
      render(<VisitorActionButtons {...defaultProps} currentStatus={VisitStatus.CHECKED_IN} />);

      expect(screen.getByRole('button', { name: /check out john doe/i })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /verify otp/i })).not.toBeInTheDocument();
    });

    it('should call onCheckOut when Check Out is clicked', () => {
      render(<VisitorActionButtons {...defaultProps} currentStatus={VisitStatus.CHECKED_IN} />);

      const checkOutButton = screen.getByRole('button', { name: /check out john doe/i });
      fireEvent.click(checkOutButton);

      expect(defaultProps.onCheckOut).toHaveBeenCalledWith('visit-1');
    });
  });

  describe('Status: CHECKED_OUT', () => {
    it('should render no buttons', () => {
      const { container } = render(
        <VisitorActionButtons {...defaultProps} currentStatus={VisitStatus.CHECKED_OUT} />
      );

      expect(container.firstChild).toBeNull();
    });
  });

  describe('Status: REJECTED', () => {
    it('should render no buttons', () => {
      const { container } = render(
        <VisitorActionButtons {...defaultProps} currentStatus={VisitStatus.REJECTED} />
      );

      expect(container.firstChild).toBeNull();
    });
  });

  describe('Disabled state', () => {
    it('should disable buttons when disabled prop is true', () => {
      render(<VisitorActionButtons {...defaultProps} disabled={true} />);

      const approveButton = screen.getByRole('button', { name: /approve john doe/i });
      const rejectButton = screen.getByRole('button', { name: /reject john doe/i });

      expect(approveButton).toBeDisabled();
      expect(rejectButton).toBeDisabled();
    });
  });

  describe('Compact mode', () => {
    it('should render icon-only buttons in compact mode', () => {
      render(<VisitorActionButtons {...defaultProps} compact={true} />);

      const buttons = screen.getAllByRole('button');
      buttons.forEach((button) => {
        // Icons should be present
        expect(button.querySelector('svg')).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA role for group', () => {
      render(<VisitorActionButtons {...defaultProps} />);

      const group = screen.getByRole('group', { name: /actions for john doe/i });
      expect(group).toBeInTheDocument();
    });

    it('should have proper ARIA labels on buttons', () => {
      render(<VisitorActionButtons {...defaultProps} />);

      expect(screen.getByLabelText(/approve john doe/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/reject john doe/i)).toBeInTheDocument();
    });

    it('should have proper test IDs', () => {
      render(<VisitorActionButtons {...defaultProps} />);

      expect(screen.getByTestId('visitor-action-buttons')).toBeInTheDocument();
      expect(screen.getByTestId('action-button-approve')).toBeInTheDocument();
      expect(screen.getByTestId('action-button-reject')).toBeInTheDocument();
    });
  });

  describe('Custom className', () => {
    it('should apply custom className', () => {
      render(<VisitorActionButtons {...defaultProps} className="custom-class" />);

      const group = screen.getByTestId('visitor-action-buttons');
      expect(group).toHaveClass('custom-class');
    });
  });

  describe('Error handling', () => {
    it('should handle network errors gracefully', async () => {
      mockedApproveVisit.mockRejectedValueOnce(new Error('Connection error. Please try again.'));

      render(<VisitorActionButtons {...defaultProps} />);

      const approveButton = screen.getByRole('button', { name: /approve john doe/i });
      fireEvent.click(approveButton);

      await waitFor(() => {
        expect(mockedToast.error).toHaveBeenCalledWith(
          'Failed to approve. Connection error. Please try again.'
        );
      });
    });

    it('should re-enable button after error', async () => {
      jest.useFakeTimers();
      mockedApproveVisit.mockRejectedValueOnce(new Error('Visit not found'));

      render(<VisitorActionButtons {...defaultProps} />);

      const approveButton = screen.getByRole('button', { name: /approve john doe/i });
      fireEvent.click(approveButton);

      // Fast-forward past the 3-second error timeout
      await waitFor(() => {
        expect(mockedToast.error).toHaveBeenCalled();
      });

      jest.advanceTimersByTime(3000);

      await waitFor(() => {
        expect(approveButton).not.toBeDisabled();
      });

      jest.useRealTimers();
    });
  });
});
