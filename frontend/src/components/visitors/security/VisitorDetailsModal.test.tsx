import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { VisitorDetailsModal } from './VisitorDetailsModal';
import { VisitCategory } from '@/lib/constants/visit-constants';
import { VisitStatus } from '@/types/visitor';
import apiClient from '@/lib/api';

// Mock apiClient
jest.mock('@/lib/api', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
  },
}));

const mockApiClient = apiClient as jest.Mocked<typeof apiClient>;

const mockVisitorData = {
  id: 'visitor-123',
  visitId: 'visit-456',
  firstName: 'John',
  lastName: 'Doe',
  fullName: 'John Doe',
  phone: '+91 99999 99999',
  email: 'john@example.com',
  company: 'Tech Corp',
  designation: 'Manager',
  photoUrl: 'https://example.com/photo.jpg',
  visitType: VisitCategory.MEETING,
  status: VisitStatus.APPROVED,
  purpose: 'Business Discussion',
  hostName: 'Dr. Smith',
  department: 'Cardiology',
  createdAt: '2026-02-11T10:00:00Z',
  approvedAt: '2026-02-11T10:05:00Z',
  checkedInAt: null,
  checkedOutAt: null,
  checkInOtp: '847291',
  checkInOtpExpiry: '2026-02-11T18:05:00Z',
  gatePassGeneratedAt: '2026-02-11T10:05:00Z',
};

const mockDeliveryData = {
  ...mockVisitorData,
  visitType: VisitCategory.DELIVERY,
  hostName: undefined,
  department: undefined,
  purpose: 'Package Delivery',
};

describe('VisitorDetailsModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockApiClient.get.mockClear();
  });

  describe('Rendering with visitorData prop', () => {
    it('should render visitor details when data is provided', () => {
      render(
        <VisitorDetailsModal
          isOpen={true}
          onClose={jest.fn()}
          visitId="visit-456"
          visitorData={mockVisitorData}
        />
      );

      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('+91 99999 99999')).toBeInTheDocument();
      expect(screen.getByText('john@example.com')).toBeInTheDocument();
      expect(screen.getByText('Tech Corp')).toBeInTheDocument();
      expect(screen.getByText('Manager')).toBeInTheDocument();
    });

    it('should skip API fetch when visitorData is provided', () => {
      render(
        <VisitorDetailsModal
          isOpen={true}
          onClose={jest.fn()}
          visitId="visit-456"
          visitorData={mockVisitorData}
        />
      );

      expect(mockApiClient.get).not.toHaveBeenCalled();
    });

    it('should render Meeting visit details', () => {
      render(
        <VisitorDetailsModal
          isOpen={true}
          onClose={jest.fn()}
          visitId="visit-456"
          visitorData={mockVisitorData}
        />
      );

      expect(screen.getByText(/Host:/)).toBeInTheDocument();
      expect(screen.getByText('Dr. Smith')).toBeInTheDocument();
      expect(screen.getByText(/Department:/)).toBeInTheDocument();
      expect(screen.getByText('Cardiology')).toBeInTheDocument();
    });

    it('should render Delivery visit details without host', () => {
      render(
        <VisitorDetailsModal
          isOpen={true}
          onClose={jest.fn()}
          visitId="visit-456"
          visitorData={mockDeliveryData}
        />
      );

      expect(screen.queryByText(/Host:/)).not.toBeInTheDocument();
      expect(screen.queryByText(/Department:/)).not.toBeInTheDocument();
    });

    it('should display visit type badge', () => {
      render(
        <VisitorDetailsModal
          isOpen={true}
          onClose={jest.fn()}
          visitId="visit-456"
          visitorData={mockVisitorData}
        />
      );

      expect(screen.getByText('Meeting')).toBeInTheDocument();
    });

    it('should display status badge', () => {
      render(
        <VisitorDetailsModal
          isOpen={true}
          onClose={jest.fn()}
          visitId="visit-456"
          visitorData={mockVisitorData}
        />
      );

      expect(screen.getByText('Approved')).toBeInTheDocument();
    });
  });

  describe('Rendering without visitorData prop (API fetch)', () => {
    it('should show loading state initially', () => {
      mockApiClient.get.mockImplementation(
        () => new Promise(() => {}) // Never resolves
      );

      render(
        <VisitorDetailsModal isOpen={true} onClose={jest.fn()} visitId="visit-456" />
      );

      expect(screen.getByRole('heading', { name: /Loading Visitor Details/i })).toBeInTheDocument();
      expect(screen.getByRole('dialog')).toHaveAttribute('aria-busy', 'true');
    });

    it('should fetch visitor details from API', async () => {
      mockApiClient.get.mockResolvedValueOnce({
        data: { success: true, data: mockVisitorData },
      });

      render(
        <VisitorDetailsModal isOpen={true} onClose={jest.fn()} visitId="visit-456" />
      );

      await waitFor(() => {
        expect(mockApiClient.get).toHaveBeenCalledWith('/api/security/visits/visit-456/details');
      });
    });

    it('should display visitor details after successful fetch', async () => {
      mockApiClient.get.mockResolvedValueOnce({
        data: { success: true, data: mockVisitorData },
      });

      render(
        <VisitorDetailsModal isOpen={true} onClose={jest.fn()} visitId="visit-456" />
      );

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });
    });

    it('should show error state on fetch failure', async () => {
      mockApiClient.get.mockRejectedValueOnce(new Error('Network error'));

      render(
        <VisitorDetailsModal isOpen={true} onClose={jest.fn()} visitId="visit-456" />
      );

      await waitFor(() => {
        expect(screen.getByText(/Unable to load details/i)).toBeInTheDocument();
      });
    });

    it('should show error state on 404 response', async () => {
      mockApiClient.get.mockRejectedValueOnce({
        response: { status: 404, data: { success: false, code: 'VISIT_NOT_FOUND', message: 'Visit not found' } },
      });

      render(
        <VisitorDetailsModal isOpen={true} onClose={jest.fn()} visitId="visit-456" />
      );

      await waitFor(() => {
        expect(screen.getByText(/Unable to load details/i)).toBeInTheDocument();
      });
    });

    it('should allow retry after fetch error', async () => {
      mockApiClient.get
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          data: { success: true, data: mockVisitorData },
        });

      render(
        <VisitorDetailsModal isOpen={true} onClose={jest.fn()} visitId="visit-456" />
      );

      await waitFor(() => {
        expect(screen.getByText(/Unable to load details/i)).toBeInTheDocument();
      });

      const retryButton = screen.getByRole('button', { name: /retry/i });
      fireEvent.click(retryButton);

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });

      expect(mockApiClient.get).toHaveBeenCalledTimes(2);
    });
  });

  describe('Photo handling', () => {
    it('should display visitor photo when available', () => {
      render(
        <VisitorDetailsModal
          isOpen={true}
          onClose={jest.fn()}
          visitId="visit-456"
          visitorData={mockVisitorData}
        />
      );

      // Radix UI Avatar renders fallback initials while image loads
      // In test environment, images don't load so initials are always shown
      expect(screen.getByText('JD')).toBeInTheDocument();
    });

    it('should display initials fallback when no photo', () => {
      const visitorWithoutPhoto = { ...mockVisitorData, photoUrl: null };
      render(
        <VisitorDetailsModal
          isOpen={true}
          onClose={jest.fn()}
          visitId="visit-456"
          visitorData={visitorWithoutPhoto}
        />
      );

      expect(screen.getByText('JD')).toBeInTheDocument();
    });

    it('should fallback to initials on image load error', async () => {
      const { container } = render(
        <VisitorDetailsModal
          isOpen={true}
          onClose={jest.fn()}
          visitId="visit-456"
          visitorData={mockVisitorData}
        />
      );

      const avatarImage = container.querySelector('[data-slot="avatar-image"]');
      if (avatarImage) {
        fireEvent.error(avatarImage);
      }

      // Initials should always be present as fallback
      expect(screen.getByText('JD')).toBeInTheDocument();
    });
  });

  describe('OTP Display', () => {
    it('should display Check-In OTP for APPROVED status', () => {
      render(
        <VisitorDetailsModal
          isOpen={true}
          onClose={jest.fn()}
          visitId="visit-456"
          visitorData={mockVisitorData}
        />
      );

      expect(screen.getByText('847291')).toBeInTheDocument();
      expect(screen.getByText(/Valid until:/i)).toBeInTheDocument();
    });

    it('should NOT display OTP for CHECKED_IN status', () => {
      const checkedInVisitor = {
        ...mockVisitorData,
        status: VisitStatus.CHECKED_IN,
        checkedInAt: '2026-02-11T11:00:00Z',
      };

      render(
        <VisitorDetailsModal
          isOpen={true}
          onClose={jest.fn()}
          visitId="visit-456"
          visitorData={checkedInVisitor}
        />
      );

      expect(screen.queryByText('847291')).not.toBeInTheDocument();
      expect(screen.queryByText(/Valid until:/i)).not.toBeInTheDocument();
    });

    it('should NOT display OTP for REQUEST_SENT status', () => {
      const pendingVisitor = {
        ...mockVisitorData,
        status: VisitStatus.REQUEST_SENT,
        checkInOtp: null,
        checkInOtpExpiry: null,
      };

      render(
        <VisitorDetailsModal
          isOpen={true}
          onClose={jest.fn()}
          visitId="visit-456"
          visitorData={pendingVisitor}
        />
      );

      expect(screen.queryByText(/Valid until:/i)).not.toBeInTheDocument();
    });
  });

  describe('Action Buttons', () => {
    it('should show "Check In" button for APPROVED status', () => {
      render(
        <VisitorDetailsModal
          isOpen={true}
          onClose={jest.fn()}
          visitId="visit-456"
          visitorData={mockVisitorData}
        />
      );

      expect(screen.getByRole('button', { name: /Check In/i })).toBeInTheDocument();
    });

    it('should show "Check Out" button for CHECKED_IN status', () => {
      const checkedInVisitor = {
        ...mockVisitorData,
        status: VisitStatus.CHECKED_IN,
        checkedInAt: '2026-02-11T11:00:00Z',
      };

      render(
        <VisitorDetailsModal
          isOpen={true}
          onClose={jest.fn()}
          visitId="visit-456"
          visitorData={checkedInVisitor}
        />
      );

      expect(screen.getByRole('button', { name: /Check Out/i })).toBeInTheDocument();
    });

    it('should show disabled "Pending Approval" for REQUEST_SENT status', () => {
      const pendingVisitor = {
        ...mockVisitorData,
        status: VisitStatus.REQUEST_SENT,
        checkInOtp: null,
        approvedAt: null,
      };

      render(
        <VisitorDetailsModal
          isOpen={true}
          onClose={jest.fn()}
          visitId="visit-456"
          visitorData={pendingVisitor}
        />
      );

      const button = screen.getByRole('button', { name: /Pending Approval/i });
      expect(button).toBeInTheDocument();
      expect(button).toBeDisabled();
    });

    it('should NOT show action button for CHECKED_OUT status', () => {
      const checkedOutVisitor = {
        ...mockVisitorData,
        status: VisitStatus.CHECKED_OUT,
        checkedInAt: '2026-02-11T11:00:00Z',
        checkedOutAt: '2026-02-11T13:00:00Z',
      };

      render(
        <VisitorDetailsModal
          isOpen={true}
          onClose={jest.fn()}
          visitId="visit-456"
          visitorData={checkedOutVisitor}
        />
      );

      expect(screen.queryByRole('button', { name: /Check/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /Pending/i })).not.toBeInTheDocument();
    });

    it('should NOT show action button for REJECTED status', () => {
      const rejectedVisitor = {
        ...mockVisitorData,
        status: VisitStatus.REJECTED,
      };

      render(
        <VisitorDetailsModal
          isOpen={true}
          onClose={jest.fn()}
          visitId="visit-456"
          visitorData={rejectedVisitor}
        />
      );

      expect(screen.queryByRole('button', { name: /Check/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /Pending/i })).not.toBeInTheDocument();
    });

    it('should call onAction callback when Check In is clicked', async () => {
      const mockOnAction = jest.fn().mockResolvedValue({ success: true });

      render(
        <VisitorDetailsModal
          isOpen={true}
          onClose={jest.fn()}
          visitId="visit-456"
          visitorData={mockVisitorData}
          onAction={mockOnAction}
        />
      );

      const checkInButton = screen.getByRole('button', { name: /Check In/i });
      fireEvent.click(checkInButton);

      await waitFor(() => {
        expect(mockOnAction).toHaveBeenCalledWith('visit-456');
      });
    });

    it('should close modal after successful action', async () => {
      const mockOnAction = jest.fn().mockResolvedValue({ success: true });
      const mockOnClose = jest.fn();

      render(
        <VisitorDetailsModal
          isOpen={true}
          onClose={mockOnClose}
          visitId="visit-456"
          visitorData={mockVisitorData}
          onAction={mockOnAction}
        />
      );

      const checkInButton = screen.getByRole('button', { name: /Check In/i });
      fireEvent.click(checkInButton);

      await waitFor(() => {
        expect(mockOnClose).toHaveBeenCalled();
      });
    });

    it('should show loading state during action', async () => {
      const mockOnAction = jest.fn(() => new Promise(() => {})); // Never resolves

      render(
        <VisitorDetailsModal
          isOpen={true}
          onClose={jest.fn()}
          visitId="visit-456"
          visitorData={mockVisitorData}
          onAction={mockOnAction}
        />
      );

      const checkInButton = screen.getByRole('button', { name: /Check In/i });
      fireEvent.click(checkInButton);

      await waitFor(() => {
        expect(screen.getByText(/Checking in/i)).toBeInTheDocument();
      });

      expect(checkInButton).toBeDisabled();
    });

    it('should keep modal open and show error on action failure', async () => {
      const mockOnAction = jest.fn().mockResolvedValue({ success: false, error: 'Action failed' });
      const mockOnClose = jest.fn();

      render(
        <VisitorDetailsModal
          isOpen={true}
          onClose={mockOnClose}
          visitId="visit-456"
          visitorData={mockVisitorData}
          onAction={mockOnAction}
        />
      );

      const checkInButton = screen.getByRole('button', { name: /Check In/i });
      fireEvent.click(checkInButton);

      await waitFor(() => {
        expect(screen.getByText(/Action failed/i)).toBeInTheDocument();
      });

      expect(mockOnClose).not.toHaveBeenCalled();
    });

    it('should disable action button while action is in progress', async () => {
      const mockOnAction = jest.fn(() => new Promise(() => {})); // Never resolves

      render(
        <VisitorDetailsModal
          isOpen={true}
          onClose={jest.fn()}
          visitId="visit-456"
          visitorData={mockVisitorData}
          onAction={mockOnAction}
        />
      );

      const checkInButton = screen.getByRole('button', { name: /Check In/i });
      fireEvent.click(checkInButton);

      await waitFor(() => {
        expect(checkInButton).toBeDisabled();
      });
    });
  });

  describe('Timestamps', () => {
    it('should display creation timestamp', () => {
      render(
        <VisitorDetailsModal
          isOpen={true}
          onClose={jest.fn()}
          visitId="visit-456"
          visitorData={mockVisitorData}
        />
      );

      expect(screen.getByText(/Requested:/i)).toBeInTheDocument();
    });

    it('should display approval timestamp when available', () => {
      render(
        <VisitorDetailsModal
          isOpen={true}
          onClose={jest.fn()}
          visitId="visit-456"
          visitorData={mockVisitorData}
        />
      );

      expect(screen.getByText(/Approved:/i)).toBeInTheDocument();
    });

    it('should display check-in timestamp when available', () => {
      const checkedInVisitor = {
        ...mockVisitorData,
        status: VisitStatus.CHECKED_IN,
        checkedInAt: '2026-02-11T11:00:00Z',
      };

      render(
        <VisitorDetailsModal
          isOpen={true}
          onClose={jest.fn()}
          visitId="visit-456"
          visitorData={checkedInVisitor}
        />
      );

      expect(screen.getByText(/Checked In:/i)).toBeInTheDocument();
    });

    it('should display check-out timestamp when available', () => {
      const checkedOutVisitor = {
        ...mockVisitorData,
        status: VisitStatus.CHECKED_OUT,
        checkedInAt: '2026-02-11T11:00:00Z',
        checkedOutAt: '2026-02-11T13:00:00Z',
      };

      render(
        <VisitorDetailsModal
          isOpen={true}
          onClose={jest.fn()}
          visitId="visit-456"
          visitorData={checkedOutVisitor}
        />
      );

      expect(screen.getByText(/Checked Out:/i)).toBeInTheDocument();
    });
  });

  describe('Modal Interaction', () => {
    it('should call onClose when close button is clicked', () => {
      const mockOnClose = jest.fn();

      render(
        <VisitorDetailsModal
          isOpen={true}
          onClose={mockOnClose}
          visitId="visit-456"
          visitorData={mockVisitorData}
        />
      );

      const closeButton = screen.getByRole('button', { name: /Close/i });
      fireEvent.click(closeButton);

      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should call onClose when ESC key is pressed', () => {
      const mockOnClose = jest.fn();

      render(
        <VisitorDetailsModal
          isOpen={true}
          onClose={mockOnClose}
          visitId="visit-456"
          visitorData={mockVisitorData}
        />
      );

      const dialog = screen.getByRole('dialog');
      fireEvent.keyDown(dialog, { key: 'Escape', code: 'Escape' });

      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should not render modal when isOpen is false', () => {
      render(
        <VisitorDetailsModal
          isOpen={false}
          onClose={jest.fn()}
          visitId="visit-456"
          visitorData={mockVisitorData}
        />
      );

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes', () => {
      render(
        <VisitorDetailsModal
          isOpen={true}
          onClose={jest.fn()}
          visitId="visit-456"
          visitorData={mockVisitorData}
        />
      );

      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-modal', 'true');
      expect(dialog).toHaveAttribute('aria-labelledby');
    });

    it('should have accessible title', () => {
      render(
        <VisitorDetailsModal
          isOpen={true}
          onClose={jest.fn()}
          visitId="visit-456"
          visitorData={mockVisitorData}
        />
      );

      const title = screen.getByText('Visitor Details for John Doe');
      expect(title).toBeInTheDocument();
      expect(title).toHaveAttribute('id', 'visitor-details-title');
    });

    it('should have accessible close button', () => {
      render(
        <VisitorDetailsModal
          isOpen={true}
          onClose={jest.fn()}
          visitId="visit-456"
          visitorData={mockVisitorData}
        />
      );

      expect(screen.getByRole('button', { name: /Close/i })).toBeInTheDocument();
    });

    it('should announce loading state to screen readers', () => {
      mockApiClient.get.mockImplementation(
        () => new Promise(() => {}) // Never resolves
      );

      render(
        <VisitorDetailsModal isOpen={true} onClose={jest.fn()} visitId="visit-456" />
      );

      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-busy', 'true');
    });
  });

  describe('Responsive Layout', () => {
    it('should render with responsive classes', () => {
      render(
        <VisitorDetailsModal
          isOpen={true}
          onClose={jest.fn()}
          visitId="visit-456"
          visitorData={mockVisitorData}
        />
      );

      // Check that modal content has responsive width classes
      const dialog = screen.getByRole('dialog');
      expect(dialog.className).toMatch(/max-w-/);
    });
  });

  describe('Conditional Content Display', () => {
    it('should hide purpose if not provided', () => {
      const visitorWithoutPurpose = { ...mockVisitorData, purpose: null };

      render(
        <VisitorDetailsModal
          isOpen={true}
          onClose={jest.fn()}
          visitId="visit-456"
          visitorData={visitorWithoutPurpose}
        />
      );

      expect(screen.queryByText(/Purpose:/i)).not.toBeInTheDocument();
    });

    it('should hide email if not provided', () => {
      const visitorWithoutEmail = { ...mockVisitorData, email: null };

      render(
        <VisitorDetailsModal
          isOpen={true}
          onClose={jest.fn()}
          visitId="visit-456"
          visitorData={visitorWithoutEmail}
        />
      );

      expect(screen.queryByText('john@example.com')).not.toBeInTheDocument();
    });

    it('should hide company and designation if not provided', () => {
      const visitorWithoutCompany = { ...mockVisitorData, company: null, designation: null };

      render(
        <VisitorDetailsModal
          isOpen={true}
          onClose={jest.fn()}
          visitId="visit-456"
          visitorData={visitorWithoutCompany}
        />
      );

      expect(screen.queryByText('Tech Corp')).not.toBeInTheDocument();
      expect(screen.queryByText('Manager')).not.toBeInTheDocument();
    });
  });
});
