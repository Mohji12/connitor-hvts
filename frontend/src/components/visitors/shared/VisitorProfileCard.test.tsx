import { render, screen, fireEvent } from '@testing-library/react';
import { VisitorProfileCard } from '@/components/visitors/shared/VisitorProfileCard';
import { VisitCategory } from '@/lib/constants/visit-constants';

const mockVisitor = {
  id: '1',
  visitorName: 'John Doe',
  visitorPhone: '+91 12345 67890',
  visitorEmail: 'john@example.com',
  visitorPhoto: 'https://example.com/photo.jpg',
  visitType: VisitCategory.MEETING,
  status: 'APPROVED' as const,
  personToMeet: 'Dr. Smith',
  purpose: 'Consultation',
};

describe('VisitorProfileCard', () => {
  describe('Compact Layout', () => {
    it('should render visitor name and phone', () => {
      render(<VisitorProfileCard visitor={mockVisitor} compact />);
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('+91 12345 67890')).toBeInTheDocument();
    });

    it('should render person to meet', () => {
      render(<VisitorProfileCard visitor={mockVisitor} compact />);
      expect(screen.getByText(/Meeting Dr\. Smith/i)).toBeInTheDocument();
    });

    it('should render visit type badge', () => {
      render(<VisitorProfileCard visitor={mockVisitor} compact />);
      expect(screen.getByText('Meeting')).toBeInTheDocument();
    });

    it('should render status badge', () => {
      render(<VisitorProfileCard visitor={mockVisitor} compact />);
      expect(screen.getByText('Approved')).toBeInTheDocument();
    });
  });

  describe('Full Layout', () => {
    it('should render all visitor details', () => {
      render(<VisitorProfileCard visitor={mockVisitor} />);
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('+91 12345 67890')).toBeInTheDocument();
      expect(screen.getByText('john@example.com')).toBeInTheDocument();
      expect(screen.getByText(/Meeting:/)).toBeInTheDocument();
      expect(screen.getByText('Dr. Smith')).toBeInTheDocument();
      expect(screen.getByText(/Purpose:/)).toBeInTheDocument();
      expect(screen.getByText('Consultation')).toBeInTheDocument();
    });

    it('should have card structure', () => {
      const { container } = render(<VisitorProfileCard visitor={mockVisitor} />);
      const card = container.querySelector('[data-slot="card"]');
      expect(card).toBeInTheDocument();
    });
  });

  describe('Avatar', () => {
    it('should display visitor initials when photo is not loaded', () => {
      render(<VisitorProfileCard visitor={mockVisitor} compact />);

      // Since mock URL won't load, initials are shown
      expect(screen.getByText('JD')).toBeInTheDocument();
    });

    it('should display initials when photo is missing', () => {
      const visitorWithoutPhoto = { ...mockVisitor, visitorPhoto: undefined };
      render(<VisitorProfileCard visitor={visitorWithoutPhoto} compact />);

      // Check that initials are displayed
      expect(screen.getByText('JD')).toBeInTheDocument();
    });
  });

  describe('Status Variants', () => {
    it('should render pending status', () => {
      const visitor = { ...mockVisitor, status: 'PENDING' as const };
      render(<VisitorProfileCard visitor={visitor} compact />);
      expect(screen.getByText('Pending')).toBeInTheDocument();
    });

    it('should render rejected status', () => {
      const visitor = { ...mockVisitor, status: 'REJECTED' as const };
      render(<VisitorProfileCard visitor={visitor} compact />);
      expect(screen.getByText('Rejected')).toBeInTheDocument();
    });

    it('should render checked-in status', () => {
      const visitor = { ...mockVisitor, status: 'CHECKED_IN' as const };
      render(<VisitorProfileCard visitor={visitor} compact />);
      expect(screen.getByText('Checked In')).toBeInTheDocument();
    });

    it('should render checked-out status', () => {
      const visitor = { ...mockVisitor, status: 'CHECKED_OUT' as const };
      render(<VisitorProfileCard visitor={visitor} compact />);
      expect(screen.getByText('Checked Out')).toBeInTheDocument();
    });
  });

  describe('Visit Type', () => {
    it('should render meeting type', () => {
      render(<VisitorProfileCard visitor={mockVisitor} compact />);
      expect(screen.getByText('Meeting')).toBeInTheDocument();
    });

    it('should render delivery type', () => {
      const visitor = { ...mockVisitor, visitType: VisitCategory.DELIVERY };
      render(<VisitorProfileCard visitor={visitor} compact />);
      expect(screen.getByText('Delivery')).toBeInTheDocument();
    });
  });

  describe('Actions', () => {
    it('should render action buttons when provided', () => {
      const actions = <button>Check Out</button>;
      render(<VisitorProfileCard visitor={mockVisitor} compact actions={actions} />);
      expect(screen.getByText('Check Out')).toBeInTheDocument();
    });
  });

  describe('Interactivity', () => {
    it('should call onClick when card is clicked', () => {
      const onClick = jest.fn();
      const { container } = render(<VisitorProfileCard visitor={mockVisitor} compact onClick={onClick} />);

      const card = container.querySelector('[role="button"]');
      expect(card).toBeInTheDocument();
      if (card) {
        fireEvent.click(card);
        expect(onClick).toHaveBeenCalledTimes(1);
      }
    });

    it('should have correct role when onClick is provided', () => {
      const onClick = jest.fn();
      const { container } = render(<VisitorProfileCard visitor={mockVisitor} compact onClick={onClick} />);

      const card = container.querySelector('[role="button"]');
      expect(card).toBeInTheDocument();
      expect(card).toHaveAttribute('tabIndex', '0');
    });

    it('should trigger onClick on Enter key', () => {
      const onClick = jest.fn();
      const { container } = render(<VisitorProfileCard visitor={mockVisitor} compact onClick={onClick} />);

      const card = container.querySelector('[role="button"]');
      expect(card).toBeInTheDocument();
      if (card) {
        fireEvent.keyDown(card, { key: 'Enter', code: 'Enter' });
        expect(onClick).toHaveBeenCalledTimes(1);
      }
    });

    it('should trigger onClick on Space key', () => {
      const onClick = jest.fn();
      const { container } = render(<VisitorProfileCard visitor={mockVisitor} compact onClick={onClick} />);

      const card = container.querySelector('[role="button"]');
      expect(card).toBeInTheDocument();
      if (card) {
        fireEvent.keyDown(card, { key: ' ', code: 'Space' });
        expect(onClick).toHaveBeenCalledTimes(1);
      }
    });
  });
});
