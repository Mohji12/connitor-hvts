import { render, screen, fireEvent } from '@testing-library/react';
import { VisitorDetailsCard } from './VisitorDetailsCard';
import type { VerifyCheckInOtpResponse } from '@/lib/api/visitors-api';

describe('VisitorDetailsCard', () => {
  const mockOnCheckIn = jest.fn();
  const mockOnCancel = jest.fn();

  const mockMeetingVisitorData: VerifyCheckInOtpResponse = {
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
      visitCategory: 'MEETING',
      visitSubType: 'Business',
      status: 'APPROVED',
      checkInOtp: '123456',
      checkInOtpExpiry: new Date(Date.now() + 3600000).toISOString(),
      purpose: 'Business Meeting',
      department: 'Engineering',
      deliveryPlatform: null,
      deliveryRecipient: null,
      orderReference: null,
      staffName: 'Jane Smith',
      staffPhone: '+0987654321',
    },
    canCheckIn: true,
  };

  const mockDeliveryVisitorData: VerifyCheckInOtpResponse = {
    success: true,
    visitId: 'visit-456',
    visitorId: 'visitor-456',
    visitor: {
      id: 'visitor-456',
      firstName: 'Alice',
      lastName: 'Smith',
      phone: '+9876543210',
      email: null,
      photo: null,
      company: null,
    },
    visit: {
      id: 'visit-456',
      visitCategory: 'DELIVERY',
      visitSubType: 'Food',
      status: 'APPROVED',
      checkInOtp: '654321',
      checkInOtpExpiry: new Date(Date.now() + 3600000).toISOString(),
      purpose: null,
      department: null,
      deliveryPlatform: 'Swiggy',
      deliveryRecipient: 'Bob Johnson',
      orderReference: 'ORD-12345',
      staffName: null,
      staffPhone: null,
    },
    canCheckIn: true,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render the visitor details card', () => {
      render(
        <VisitorDetailsCard
          visitorData={mockMeetingVisitorData}
          onCheckIn={mockOnCheckIn}
          onCancel={mockOnCancel}
        />,
      );
      expect(screen.getByTestId('visitor-details-card')).toBeInTheDocument();
    });

    it('should render visitor name', () => {
      render(
        <VisitorDetailsCard
          visitorData={mockMeetingVisitorData}
          onCheckIn={mockOnCheckIn}
          onCancel={mockOnCancel}
        />,
      );
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    it('should render visitor phone', () => {
      render(
        <VisitorDetailsCard
          visitorData={mockMeetingVisitorData}
          onCheckIn={mockOnCheckIn}
          onCancel={mockOnCancel}
        />,
      );
      expect(screen.getByText('+1234567890')).toBeInTheDocument();
    });

    it('should render visitor email when available', () => {
      render(
        <VisitorDetailsCard
          visitorData={mockMeetingVisitorData}
          onCheckIn={mockOnCheckIn}
          onCancel={mockOnCancel}
        />,
      );
      expect(screen.getByText('john@example.com')).toBeInTheDocument();
    });

    it('should render visitor company when available', () => {
      render(
        <VisitorDetailsCard
          visitorData={mockMeetingVisitorData}
          onCheckIn={mockOnCheckIn}
          onCancel={mockOnCancel}
        />,
      );
      expect(screen.getByText('Acme Inc')).toBeInTheDocument();
    });

    it('should render visit type badge', () => {
      render(
        <VisitorDetailsCard
          visitorData={mockMeetingVisitorData}
          onCheckIn={mockOnCheckIn}
          onCancel={mockOnCancel}
        />,
      );
      expect(screen.getByText('Meeting')).toBeInTheDocument();
    });

    it('should render status badge', () => {
      render(
        <VisitorDetailsCard
          visitorData={mockMeetingVisitorData}
          onCheckIn={mockOnCheckIn}
          onCancel={mockOnCancel}
        />,
      );
      expect(screen.getByText('APPROVED')).toBeInTheDocument();
    });

    it('should render check-in OTP', () => {
      render(
        <VisitorDetailsCard
          visitorData={mockMeetingVisitorData}
          onCheckIn={mockOnCheckIn}
          onCancel={mockOnCancel}
        />,
      );
      expect(screen.getByText('123456')).toBeInTheDocument();
    });

    it('should render Check In button', () => {
      render(
        <VisitorDetailsCard
          visitorData={mockMeetingVisitorData}
          onCheckIn={mockOnCheckIn}
          onCancel={mockOnCancel}
        />,
      );
      expect(screen.getByRole('button', { name: /Check In/i })).toBeInTheDocument();
    });

    it('should render Cancel button', () => {
      render(
        <VisitorDetailsCard
          visitorData={mockMeetingVisitorData}
          onCheckIn={mockOnCheckIn}
          onCancel={mockOnCancel}
        />,
      );
      expect(screen.getByRole('button', { name: /Cancel/i })).toBeInTheDocument();
    });
  });

  describe('Meeting Visit Details', () => {
    it('should render purpose for meeting visits', () => {
      render(
        <VisitorDetailsCard
          visitorData={mockMeetingVisitorData}
          onCheckIn={mockOnCheckIn}
          onCancel={mockOnCancel}
        />,
      );
      expect(screen.getByText('Business Meeting')).toBeInTheDocument();
    });

    it('should render department for meeting visits', () => {
      render(
        <VisitorDetailsCard
          visitorData={mockMeetingVisitorData}
          onCheckIn={mockOnCheckIn}
          onCancel={mockOnCancel}
        />,
      );
      expect(screen.getByText('Engineering')).toBeInTheDocument();
    });

    it('should render host name for meeting visits', () => {
      render(
        <VisitorDetailsCard
          visitorData={mockMeetingVisitorData}
          onCheckIn={mockOnCheckIn}
          onCancel={mockOnCancel}
        />,
      );
      expect(screen.getByText(/Host: Jane Smith/)).toBeInTheDocument();
    });

    it('should render host phone for meeting visits', () => {
      render(
        <VisitorDetailsCard
          visitorData={mockMeetingVisitorData}
          onCheckIn={mockOnCheckIn}
          onCancel={mockOnCancel}
        />,
      );
      expect(screen.getByText(/\+0987654321/)).toBeInTheDocument();
    });
  });

  describe('Delivery Visit Details', () => {
    it('should render delivery platform', () => {
      render(
        <VisitorDetailsCard
          visitorData={mockDeliveryVisitorData}
          onCheckIn={mockOnCheckIn}
          onCancel={mockOnCancel}
        />,
      );
      expect(screen.getByText(/Swiggy/)).toBeInTheDocument();
    });

    it('should render delivery recipient', () => {
      render(
        <VisitorDetailsCard
          visitorData={mockDeliveryVisitorData}
          onCheckIn={mockOnCheckIn}
          onCancel={mockOnCancel}
        />,
      );
      expect(screen.getByText(/Bob Johnson/)).toBeInTheDocument();
    });

    it('should render order reference', () => {
      render(
        <VisitorDetailsCard
          visitorData={mockDeliveryVisitorData}
          onCheckIn={mockOnCheckIn}
          onCancel={mockOnCancel}
        />,
      );
      expect(screen.getByText(/ORD-12345/)).toBeInTheDocument();
    });

    it('should show Delivery badge for delivery visits', () => {
      render(
        <VisitorDetailsCard
          visitorData={mockDeliveryVisitorData}
          onCheckIn={mockOnCheckIn}
          onCancel={mockOnCancel}
        />,
      );
      expect(screen.getByText('Delivery')).toBeInTheDocument();
    });
  });

  describe('Check In Button State', () => {
    it('should enable Check In button when canCheckIn is true', () => {
      render(
        <VisitorDetailsCard
          visitorData={mockMeetingVisitorData}
          onCheckIn={mockOnCheckIn}
          onCancel={mockOnCancel}
        />,
      );
      const checkInButton = screen.getByRole('button', { name: /Check In/i });
      expect(checkInButton).not.toBeDisabled();
    });

    it('should disable Check In button when canCheckIn is false', () => {
      const cannotCheckInData = {
        ...mockMeetingVisitorData,
        canCheckIn: false,
      };
      render(
        <VisitorDetailsCard
          visitorData={cannotCheckInData}
          onCheckIn={mockOnCheckIn}
          onCancel={mockOnCancel}
        />,
      );
      const checkInButton = screen.getByRole('button', { name: /Check In/i });
      expect(checkInButton).toBeDisabled();
    });

    it('should show loading state when isCheckingIn is true', () => {
      render(
        <VisitorDetailsCard
          visitorData={mockMeetingVisitorData}
          onCheckIn={mockOnCheckIn}
          onCancel={mockOnCancel}
          isCheckingIn={true}
        />,
      );
      expect(screen.getByText('Checking In...')).toBeInTheDocument();
      const checkInButton = screen.getByRole('button', { name: /Check in visitor/i });
      expect(checkInButton).toBeDisabled();
    });

    it('should disable Cancel button when isCheckingIn is true', () => {
      render(
        <VisitorDetailsCard
          visitorData={mockMeetingVisitorData}
          onCheckIn={mockOnCheckIn}
          onCancel={mockOnCancel}
          isCheckingIn={true}
        />,
      );
      const cancelButton = screen.getByRole('button', { name: /Cancel/i });
      expect(cancelButton).toBeDisabled();
    });
  });

  describe('Button Actions', () => {
    it('should call onCheckIn when Check In button is clicked', () => {
      render(
        <VisitorDetailsCard
          visitorData={mockMeetingVisitorData}
          onCheckIn={mockOnCheckIn}
          onCancel={mockOnCancel}
        />,
      );
      const checkInButton = screen.getByRole('button', { name: /Check In/i });
      fireEvent.click(checkInButton);
      expect(mockOnCheckIn).toHaveBeenCalledTimes(1);
    });

    it('should call onCancel when Cancel button is clicked', () => {
      render(
        <VisitorDetailsCard
          visitorData={mockMeetingVisitorData}
          onCheckIn={mockOnCheckIn}
          onCancel={mockOnCancel}
        />,
      );
      const cancelButton = screen.getByRole('button', { name: /Cancel/i });
      fireEvent.click(cancelButton);
      expect(mockOnCancel).toHaveBeenCalledTimes(1);
    });
  });

  describe('Cannot Check In Alert', () => {
    it('should show alert when canCheckIn is false', () => {
      const cannotCheckInData = {
        ...mockMeetingVisitorData,
        canCheckIn: false,
      };
      render(
        <VisitorDetailsCard
          visitorData={cannotCheckInData}
          onCheckIn={mockOnCheckIn}
          onCancel={mockOnCancel}
        />,
      );
      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(
        screen.getByText(/This visitor cannot be checked in/i),
      ).toBeInTheDocument();
    });

    it('should not show alert when canCheckIn is true', () => {
      render(
        <VisitorDetailsCard
          visitorData={mockMeetingVisitorData}
          onCheckIn={mockOnCheckIn}
          onCancel={mockOnCancel}
        />,
      );
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have role="dialog" for visitor details', () => {
      render(
        <VisitorDetailsCard
          visitorData={mockMeetingVisitorData}
          onCheckIn={mockOnCheckIn}
          onCancel={mockOnCancel}
        />,
      );
      const card = screen.getByTestId('visitor-details-card');
      expect(card).toHaveAttribute('role', 'dialog');
    });

    it('should have aria-label for visitor details', () => {
      render(
        <VisitorDetailsCard
          visitorData={mockMeetingVisitorData}
          onCheckIn={mockOnCheckIn}
          onCancel={mockOnCancel}
        />,
      );
      const card = screen.getByTestId('visitor-details-card');
      expect(card).toHaveAttribute('aria-label', 'Visitor details');
    });

    it('should have aria-label on Check In button', () => {
      render(
        <VisitorDetailsCard
          visitorData={mockMeetingVisitorData}
          onCheckIn={mockOnCheckIn}
          onCancel={mockOnCancel}
        />,
      );
      const checkInButton = screen.getByRole('button', { name: /Check In/i });
      expect(checkInButton).toHaveAttribute('aria-label', 'Check in visitor');
    });

    it('should have aria-label on Cancel button', () => {
      render(
        <VisitorDetailsCard
          visitorData={mockMeetingVisitorData}
          onCheckIn={mockOnCheckIn}
          onCancel={mockOnCancel}
        />,
      );
      const cancelButton = screen.getByRole('button', { name: /Cancel/i });
      expect(cancelButton).toHaveAttribute('aria-label', 'Cancel and verify another visitor');
    });

    it('should have aria-busy on Check In button during loading', () => {
      render(
        <VisitorDetailsCard
          visitorData={mockMeetingVisitorData}
          onCheckIn={mockOnCheckIn}
          onCancel={mockOnCancel}
          isCheckingIn={true}
        />,
      );
      // The accessible name comes from aria-label="Check in visitor", not the visible text
      const checkInButton = screen.getByRole('button', { name: /Check in visitor/i });
      expect(checkInButton).toHaveAttribute('aria-busy', 'true');
    });
  });

  describe('Custom Styling', () => {
    it('should merge custom className', () => {
      render(
        <VisitorDetailsCard
          visitorData={mockMeetingVisitorData}
          onCheckIn={mockOnCheckIn}
          onCancel={mockOnCancel}
          className="custom-card-class"
        />,
      );
      const card = screen.getByTestId('visitor-details-card');
      expect(card).toHaveClass('custom-card-class');
    });
  });

  describe('Visitor with Missing Optional Fields', () => {
    const minimalVisitorData: VerifyCheckInOtpResponse = {
      success: true,
      visitId: 'visit-789',
      visitorId: 'visitor-789',
      visitor: {
        id: 'visitor-789',
        firstName: 'Minimal',
        lastName: 'User',
        phone: '+1111111111',
        email: null,
        photo: null,
        company: null,
      },
      visit: {
        id: 'visit-789',
        visitCategory: 'MEETING',
        visitSubType: null,
        status: 'PENDING',
        checkInOtp: '111111',
        checkInOtpExpiry: new Date(Date.now() + 3600000).toISOString(),
        purpose: null,
        department: null,
        deliveryPlatform: null,
        deliveryRecipient: null,
        orderReference: null,
        staffName: null,
        staffPhone: null,
      },
      canCheckIn: true,
    };

    it('should render without email', () => {
      render(
        <VisitorDetailsCard
          visitorData={minimalVisitorData}
          onCheckIn={mockOnCheckIn}
          onCancel={mockOnCancel}
        />,
      );
      expect(screen.getByText('Minimal User')).toBeInTheDocument();
      expect(screen.queryByText(/@/)).not.toBeInTheDocument();
    });

    it('should render without company', () => {
      render(
        <VisitorDetailsCard
          visitorData={minimalVisitorData}
          onCheckIn={mockOnCheckIn}
          onCancel={mockOnCancel}
        />,
      );
      expect(screen.queryByText('Company')).not.toBeInTheDocument();
    });

    it('should render without purpose', () => {
      render(
        <VisitorDetailsCard
          visitorData={minimalVisitorData}
          onCheckIn={mockOnCheckIn}
          onCancel={mockOnCancel}
        />,
      );
      // Should not crash and should still render the card
      expect(screen.getByTestId('visitor-details-card')).toBeInTheDocument();
    });
  });
});
