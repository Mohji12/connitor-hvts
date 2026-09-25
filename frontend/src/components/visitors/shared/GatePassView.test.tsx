import { render, screen } from '@testing-library/react';
import { GatePassView } from '@/components/visitors/shared/GatePassView';
import { VisitCategory } from '@/lib/constants/visit-constants';

// Helper to get a future date (2 hours from now) for testing valid gate passes
const getFutureDate = () => {
  const date = new Date();
  date.setHours(date.getHours() + 2);
  return date;
};

const mockMeetingVisitor = {
  id: '1',
  visitorName: 'John Doe',
  visitorPhone: '+91 12345 67890',
  visitorPhoto: 'https://example.com/photo.jpg',
  visitType: VisitCategory.MEETING,
  visitDate: new Date('2026-01-26'),
  visitTime: '10:00 AM',
  purpose: 'Consultation',
  host: {
    name: 'Dr. Smith',
    department: 'Cardiology',
  },
};

const mockDeliveryVisitor = {
  id: '2',
  visitorName: 'Jane Roe',
  visitorPhone: '+91 98765 43210',
  visitType: VisitCategory.DELIVERY,
  visitDate: new Date('2026-01-26'),
  visitTime: '11:30 AM',
  deliveryInfo: {
    platform: 'Zomato',
    recipient: 'Nursing Station',
  },
};

describe('GatePassView', () => {
  describe('Loading State', () => {
    it('should display skeleton loaders when loading', () => {
      render(
        <GatePassView
          visitor={mockMeetingVisitor}
          otp="123456"
          validityTimestamp={getFutureDate()}
          loading={true}
        />
      );

      // Check for skeleton elements
      const skeletons = document.querySelectorAll('[data-slot="skeleton"]');
      expect(skeletons.length).toBeGreaterThan(0);
    });
  });

  describe('Success State - Meeting', () => {
    it('should display visitor initials when photo is provided but not loaded', () => {
      render(
        <GatePassView
          visitor={mockMeetingVisitor}
          otp="123456"
          validityTimestamp={getFutureDate()}
        />
      );

      // Since the mock URL won't load in test environment, initials are shown
      expect(screen.getByText('JD')).toBeInTheDocument();
    });

    it('should display visitor name and phone', () => {
      render(
        <GatePassView
          visitor={mockMeetingVisitor}
          otp="123456"
          validityTimestamp={getFutureDate()}
        />
      );

      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('+91 12345 67890')).toBeInTheDocument();
    });

    it('should display host information for meeting visits', () => {
      render(
        <GatePassView
          visitor={mockMeetingVisitor}
          otp="123456"
          validityTimestamp={getFutureDate()}
        />
      );

      expect(screen.getByText('Host Information')).toBeInTheDocument();
      expect(screen.getByText('Dr. Smith')).toBeInTheDocument();
      expect(screen.getByText('Cardiology')).toBeInTheDocument();
    });

    it('should display OTP prominently', () => {
      render(
        <GatePassView
          visitor={mockMeetingVisitor}
          otp="847291"
          validityTimestamp={getFutureDate()}
        />
      );

      const otpElement = screen.getByText('847291');
      expect(otpElement).toBeInTheDocument();
      expect(otpElement).toHaveClass('font-mono');
    });

    it('should display approved badge', () => {
      render(
        <GatePassView
          visitor={mockMeetingVisitor}
          otp="123456"
          validityTimestamp={getFutureDate()}
        />
      );

      expect(screen.getByText('Approved')).toBeInTheDocument();
    });

    it('should display validity timestamp', () => {
      render(
        <GatePassView
          visitor={mockMeetingVisitor}
          otp="123456"
          validityTimestamp={getFutureDate()}
        />
      );

      expect(screen.getByText(/Valid until:/i)).toBeInTheDocument();
    });
  });

  describe('Success State - Delivery', () => {
    it('should not display host information for delivery visits', () => {
      render(
        <GatePassView
          visitor={mockDeliveryVisitor}
          otp="123456"
          validityTimestamp={getFutureDate()}
        />
      );

      expect(screen.queryByText('Host Information')).not.toBeInTheDocument();
    });

    it('should display delivery information', () => {
      render(
        <GatePassView
          visitor={mockDeliveryVisitor}
          otp="123456"
          validityTimestamp={getFutureDate()}
        />
      );

      expect(screen.getByText('Delivery Information')).toBeInTheDocument();
      expect(screen.getByText('Zomato')).toBeInTheDocument();
      expect(screen.getByText(/Recipient: Nursing Station/i)).toBeInTheDocument();
    });

    it('should display delivery badge', () => {
      render(
        <GatePassView
          visitor={mockDeliveryVisitor}
          otp="123456"
          validityTimestamp={getFutureDate()}
        />
      );

      expect(screen.getByText('Delivery')).toBeInTheDocument();
    });
  });

  describe('Error State', () => {
    it('should display error message', () => {
      render(
        <GatePassView
          visitor={mockMeetingVisitor}
          otp=""
          validityTimestamp={new Date()}
          error="Unable to load gate pass"
        />
      );

      expect(screen.getByText('Unable to Load Gate Pass')).toBeInTheDocument();
      expect(screen.getByText('Unable to load gate pass')).toBeInTheDocument();
    });

    it('should display error icon', () => {
      render(
        <GatePassView
          visitor={mockMeetingVisitor}
          otp=""
          validityTimestamp={new Date()}
          error="Error"
        />
      );

      const errorIcon = document.querySelector('svg');
      expect(errorIcon).toBeInTheDocument();
    });

    it('should take priority over expired state', () => {
      render(
        <GatePassView
          visitor={mockMeetingVisitor}
          otp=""
          validityTimestamp={new Date('2020-01-01')}
          error="Error occurred"
          expired={true}
        />
      );

      expect(screen.getByText('Unable to Load Gate Pass')).toBeInTheDocument();
      expect(screen.queryByText('Expired')).not.toBeInTheDocument();
    });
  });

  describe('Expired State', () => {
    it('should display expired message', () => {
      render(
        <GatePassView
          visitor={mockMeetingVisitor}
          otp="123456"
          validityTimestamp={new Date('2020-01-01')}
          expired={true}
        />
      );

      expect(screen.getByText('Expired')).toBeInTheDocument();
      expect(screen.getByText(/This gate pass has expired/i)).toBeInTheDocument();
    });

    it('should display visitor information with degraded styling', () => {
      render(
        <GatePassView
          visitor={mockMeetingVisitor}
          otp="123456"
          validityTimestamp={new Date('2020-01-01')}
          expired={true}
        />
      );

      expect(screen.getByText('John Doe')).toBeInTheDocument();
      const card = document.querySelector('[data-slot="card"]');
      expect(card).toHaveClass('opacity-75');
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA label for OTP', () => {
      render(
        <GatePassView
          visitor={mockMeetingVisitor}
          otp="847291"
          validityTimestamp={getFutureDate()}
        />
      );

      const otpElement = screen.getByText('847291');
      expect(otpElement).toHaveAttribute('aria-label', 'Check-in one time password: 847291');
    });

    it('should have proper error message structure', () => {
      render(
        <GatePassView
          visitor={mockMeetingVisitor}
          otp=""
          validityTimestamp={getFutureDate()}
          error="Error"
        />
      );

      const errorText = screen.getByText('Unable to Load Gate Pass');
      expect(errorText).toBeInTheDocument();
    });
  });

  describe('QR Code', () => {
    it('should display QR code placeholder when showQRCode is true', () => {
      render(
        <GatePassView
          visitor={mockMeetingVisitor}
          otp="123456"
          validityTimestamp={getFutureDate()}
          showQRCode={true}
        />
      );

      expect(screen.getByText('QR Code')).toBeInTheDocument();
    });

    it('should not display QR code when showQRCode is false', () => {
      render(
        <GatePassView
          visitor={mockMeetingVisitor}
          otp="123456"
          validityTimestamp={getFutureDate()}
          showQRCode={false}
        />
      );

      expect(screen.queryByText('QR Code')).not.toBeInTheDocument();
    });
  });

  describe('Avatar Fallback', () => {
    it('should display initials when photo is missing', () => {
      const visitorWithoutPhoto = { ...mockMeetingVisitor, visitorPhoto: undefined };
      render(
        <GatePassView
          visitor={visitorWithoutPhoto}
          otp="123456"
          validityTimestamp={getFutureDate()}
        />
      );

      expect(screen.getByText('JD')).toBeInTheDocument();
    });
  });
});
