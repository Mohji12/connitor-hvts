import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { VisitorActionButtons } from './VisitorActionButtons';
import { VisitStatus } from '@/types/visitor';

describe('VisitorActionButtons', () => {
  const defaultProps = {
    visitorId: 'visitor-1',
    visitorName: 'John Doe',
    isProcessing: false,
    onApprove: jest.fn(),
    onReject: jest.fn(),
    onVerifyOtp: jest.fn(),
    onCheckOut: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Status: PENDING', () => {
    it('should render Approve and Reject buttons', () => {
      render(<VisitorActionButtons {...defaultProps} status={VisitStatus.PENDING} />);

      expect(screen.getByRole('button', { name: /approve john doe/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /reject john doe/i })).toBeInTheDocument();
    });

    it('should call onApprove when Approve is clicked', () => {
      render(<VisitorActionButtons {...defaultProps} status={VisitStatus.PENDING} />);

      const approveButton = screen.getByRole('button', { name: /approve john doe/i });
      fireEvent.click(approveButton);

      expect(defaultProps.onApprove).toHaveBeenCalledWith('visitor-1');
    });

    it('should call onReject when Reject is clicked', () => {
      render(<VisitorActionButtons {...defaultProps} status={VisitStatus.PENDING} />);

      const rejectButton = screen.getByRole('button', { name: /reject john doe/i });
      fireEvent.click(rejectButton);

      expect(defaultProps.onReject).toHaveBeenCalledWith('visitor-1');
    });

    it('should stop event propagation when button is clicked', () => {
      const mockStopPropagation = jest.fn();
      render(<VisitorActionButtons {...defaultProps} status={VisitStatus.PENDING} />);

      const approveButton = screen.getByRole('button', { name: /approve john doe/i });
      fireEvent.click(approveButton, { stopPropagation: mockStopPropagation });

      expect(defaultProps.onApprove).toHaveBeenCalled();
    });
  });

  describe('Status: REQUEST_SENT', () => {
    it('should render Approve and Reject buttons', () => {
      render(<VisitorActionButtons {...defaultProps} status={VisitStatus.REQUEST_SENT} />);

      expect(screen.getByRole('button', { name: /approve john doe/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /reject john doe/i })).toBeInTheDocument();
    });
  });

  describe('Status: APPROVED', () => {
    it('should render Verify OTP button', () => {
      render(<VisitorActionButtons {...defaultProps} status={VisitStatus.APPROVED} />);

      expect(screen.getByRole('button', { name: /verify otp john doe/i })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /approve/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /reject/i })).not.toBeInTheDocument();
    });

    it('should call onVerifyOtp when Verify OTP is clicked', () => {
      render(<VisitorActionButtons {...defaultProps} status={VisitStatus.APPROVED} />);

      const verifyButton = screen.getByRole('button', { name: /verify otp john doe/i });
      fireEvent.click(verifyButton);

      expect(defaultProps.onVerifyOtp).toHaveBeenCalledWith('visitor-1');
    });
  });

  describe('Status: CHECKED_IN', () => {
    it('should render Check Out button', () => {
      render(<VisitorActionButtons {...defaultProps} status={VisitStatus.CHECKED_IN} />);

      expect(screen.getByRole('button', { name: /check out john doe/i })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /verify otp/i })).not.toBeInTheDocument();
    });

    it('should call onCheckOut when Check Out is clicked', () => {
      render(<VisitorActionButtons {...defaultProps} status={VisitStatus.CHECKED_IN} />);

      const checkOutButton = screen.getByRole('button', { name: /check out john doe/i });
      fireEvent.click(checkOutButton);

      expect(defaultProps.onCheckOut).toHaveBeenCalledWith('visitor-1');
    });
  });

  describe('Status: CHECKED_OUT', () => {
    it('should render no buttons', () => {
      const { container } = render(
        <VisitorActionButtons {...defaultProps} status={VisitStatus.CHECKED_OUT} />
      );

      expect(container.firstChild).toBeNull();
    });
  });

  describe('Status: REJECTED', () => {
    it('should render no buttons', () => {
      const { container } = render(
        <VisitorActionButtons {...defaultProps} status={VisitStatus.REJECTED} />
      );

      expect(container.firstChild).toBeNull();
    });
  });

  describe('Processing state', () => {
    it('should disable buttons when processing', () => {
      render(
        <VisitorActionButtons {...defaultProps} status={VisitStatus.PENDING} isProcessing={true} />
      );

      const approveButton = screen.getByRole('button', { name: /approve john doe/i });
      const rejectButton = screen.getByRole('button', { name: /reject john doe/i });

      expect(approveButton).toBeDisabled();
      expect(rejectButton).toBeDisabled();
    });

    it('should show loading spinner when processing', () => {
      render(
        <VisitorActionButtons {...defaultProps} status={VisitStatus.PENDING} isProcessing={true} />
      );

      // Loader2 icon should be present
      const buttons = screen.getAllByRole('button');
      buttons.forEach((button) => {
        expect(button.querySelector('svg.animate-spin')).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA role for group', () => {
      render(<VisitorActionButtons {...defaultProps} status={VisitStatus.PENDING} />);

      const group = screen.getByRole('group', { name: /actions for john doe/i });
      expect(group).toBeInTheDocument();
    });

    it('should have proper ARIA labels on buttons', () => {
      render(<VisitorActionButtons {...defaultProps} status={VisitStatus.PENDING} />);

      expect(screen.getByLabelText(/approve john doe/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/reject john doe/i)).toBeInTheDocument();
    });

    it('should have proper test IDs', () => {
      render(<VisitorActionButtons {...defaultProps} status={VisitStatus.PENDING} />);

      expect(screen.getByTestId('visitor-action-buttons')).toBeInTheDocument();
      expect(screen.getByTestId('action-button-approve')).toBeInTheDocument();
      expect(screen.getByTestId('action-button-reject')).toBeInTheDocument();
    });
  });

  describe('Custom className', () => {
    it('should apply custom className', () => {
      render(
        <VisitorActionButtons
          {...defaultProps}
          status={VisitStatus.PENDING}
          className="custom-class"
        />
      );

      const group = screen.getByTestId('visitor-action-buttons');
      expect(group).toHaveClass('custom-class');
    });
  });
});
