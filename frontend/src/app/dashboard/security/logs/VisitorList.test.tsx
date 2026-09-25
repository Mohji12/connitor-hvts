import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { VisitorList } from './VisitorList';
import { VisitStatus, VisitorProfile } from '@/types/visitor';
import { VisitCategory } from '@/lib/constants/visit-constants';
import { rejectVisit } from '@/services/visit.service';
import { toast } from 'sonner';

// Mock dependencies
jest.mock('@/services/visit.service');
jest.mock('sonner');

const mockedRejectVisit = rejectVisit as jest.MockedFunction<typeof rejectVisit>;
const mockedToast = toast as jest.Mocked<typeof toast>;

// Mock the child components
jest.mock('@/components/visitors/shared/VisitorProfileCard', () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  VisitorProfileCard: ({ visitor, onClick, actions }: any) => (
    <div
      data-testid={`visitor-card-${visitor.id}`}
      onClick={onClick}
      role="button"
      tabIndex={0}
    >
      <div>{visitor.visitorName}</div>
      <div>{visitor.visitorPhone}</div>
      {actions}
    </div>
  ),
}));

jest.mock('@/components/visitors/logs/SearchInput', () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  SearchInput: ({ value, onChange, disabled }: any) => (
    <input
      data-testid="search-input"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      placeholder="Search"
    />
  ),
}));

jest.mock('@/components/visitors/security/VisitorActionButtons', () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  VisitorActionButtons: ({ visitId, onReject, onActionComplete }: any) => (
    <div data-testid={`action-buttons-${visitId}`}>
      <button onClick={() => onActionComplete(visitId, 'APPROVED')}>Approve</button>
      <button onClick={() => onReject(visitId)}>Reject</button>
    </div>
  ),
}));

describe('VisitorList', () => {
  const mockVisitors: VisitorProfile[] = [
    {
      id: 'visitor-1',
      visitorName: 'John Doe',
      visitorPhone: '+919876543210',
      visitorEmail: 'john@example.com',
      visitorPhoto: null,
      visitType: VisitCategory.MEETING,
      status: VisitStatus.PENDING,
      personToMeet: 'Dr. Smith',
      purpose: 'Consultation',
      checkInTime: null,
      checkOutTime: null,
    },
    {
      id: 'visitor-2',
      visitorName: 'Jane Smith',
      visitorPhone: '+919876543211',
      visitorEmail: null,
      visitorPhoto: null,
      visitType: VisitCategory.DELIVERY,
      status: VisitStatus.APPROVED,
      personToMeet: undefined,
      purpose: undefined,
      checkInTime: null,
      checkOutTime: null,
    },
  ];

  const defaultProps = {
    visitors: mockVisitors,
    isLoading: false,
    error: null,
    onSearch: jest.fn(),
    onActionComplete: jest.fn(),
    onVerifyOtp: jest.fn(),
    onCheckOut: jest.fn(),
    onViewDetails: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render visitor list with search input', () => {
      render(<VisitorList {...defaultProps} />);

      expect(screen.getByTestId('search-input')).toBeInTheDocument();
      expect(screen.getByTestId('visitor-list')).toBeInTheDocument();
    });

    it('should render all visitors', () => {
      render(<VisitorList {...defaultProps} />);

      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    });

    it('should render visitor cards with action buttons', () => {
      render(<VisitorList {...defaultProps} />);

      expect(screen.getByTestId('action-buttons-visitor-1')).toBeInTheDocument();
      expect(screen.getByTestId('action-buttons-visitor-2')).toBeInTheDocument();
    });
  });

  describe('Search functionality', () => {
    it('should update search input value', () => {
      render(<VisitorList {...defaultProps} />);

      const searchInput = screen.getByTestId('search-input');
      fireEvent.change(searchInput, { target: { value: 'John' } });

      expect(searchInput).toHaveValue('John');
    });

    it('should debounce search query and call onSearch', async () => {
      jest.useFakeTimers();
      render(<VisitorList {...defaultProps} />);

      const searchInput = screen.getByTestId('search-input');
      
      // Clear initial call
      defaultProps.onSearch.mockClear();
      
      fireEvent.change(searchInput, { target: { value: 'John' } });

      expect(defaultProps.onSearch).not.toHaveBeenCalled();

      jest.advanceTimersByTime(300);

      await waitFor(() => {
        expect(defaultProps.onSearch).toHaveBeenCalledWith('John');
      });

      jest.useRealTimers();
    });

    it('should filter visitors by name', () => {
      render(<VisitorList {...defaultProps} />);

      const searchInput = screen.getByTestId('search-input');
      fireEvent.change(searchInput, { target: { value: 'John' } });

      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.queryByText('Jane Smith')).not.toBeInTheDocument();
    });

    it('should filter visitors by phone', () => {
      render(<VisitorList {...defaultProps} />);

      const searchInput = screen.getByTestId('search-input');
      fireEvent.change(searchInput, { target: { value: '3210' } });

      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.queryByText('Jane Smith')).not.toBeInTheDocument();
    });

    it('should filter visitors by personToMeet', () => {
      render(<VisitorList {...defaultProps} />);

      const searchInput = screen.getByTestId('search-input');
      fireEvent.change(searchInput, { target: { value: 'Dr. Smith' } });

      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.queryByText('Jane Smith')).not.toBeInTheDocument();
    });

    it('should be case-insensitive when filtering', () => {
      render(<VisitorList {...defaultProps} />);

      const searchInput = screen.getByTestId('search-input');
      fireEvent.change(searchInput, { target: { value: 'JOHN' } });

      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });
  });

  describe('Loading state', () => {
    it('should show skeleton loaders when loading', () => {
      render(<VisitorList {...defaultProps} isLoading={true} />);

      const loadingContainer = screen.getByLabelText(/loading visitors/i);
      expect(loadingContainer).toHaveAttribute('aria-busy', 'true');
      expect(screen.queryByText('John Doe')).not.toBeInTheDocument();
    });

    it('should disable search input when loading', () => {
      render(<VisitorList {...defaultProps} isLoading={true} />);

      const searchInput = screen.getByTestId('search-input');
      expect(searchInput).toBeDisabled();
    });
  });

  describe('Error state', () => {
    it('should show error message when error occurs', () => {
      const error = new Error('Failed to load visitors');
      render(<VisitorList {...defaultProps} error={error} />);

      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByText(/error loading visitors/i)).toBeInTheDocument();
      expect(screen.getByText('Failed to load visitors')).toBeInTheDocument();
    });

    it('should show retry button when onRetry is provided', () => {
      const error = new Error('Network error');
      const onRetry = jest.fn();
      render(<VisitorList {...defaultProps} error={error} onRetry={onRetry} />);

      const retryButton = screen.getByRole('button', { name: /retry/i });
      expect(retryButton).toBeInTheDocument();

      fireEvent.click(retryButton);
      expect(onRetry).toHaveBeenCalled();
    });

    it('should not show visitors when error occurs', () => {
      const error = new Error('Failed to load');
      render(<VisitorList {...defaultProps} error={error} />);

      expect(screen.queryByText('John Doe')).not.toBeInTheDocument();
    });
  });

  describe('Empty states', () => {
    it('should show "No Visitors" when list is empty and no search query', () => {
      render(<VisitorList {...defaultProps} visitors={[]} />);

      expect(screen.getByText('No Visitors')).toBeInTheDocument();
      expect(
        screen.getByText(/no visitors in this category at the moment/i)
      ).toBeInTheDocument();
    });

    it('should show "No Results Found" when search yields no results', () => {
      render(<VisitorList {...defaultProps} />);

      const searchInput = screen.getByTestId('search-input');
      fireEvent.change(searchInput, { target: { value: 'NonexistentName' } });

      expect(screen.getByText(/no results found/i)).toBeInTheDocument();
      expect(screen.getByText(/no visitors match your search/i)).toBeInTheDocument();
    });

    it('should show clear search button in no results state', () => {
      render(<VisitorList {...defaultProps} />);

      const searchInput = screen.getByTestId('search-input');
      fireEvent.change(searchInput, { target: { value: 'NonexistentName' } });

      const clearButton = screen.getByRole('button', { name: /clear search/i });
      expect(clearButton).toBeInTheDocument();

      fireEvent.click(clearButton);
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });
  });

  describe('Action handlers', () => {
    it('should call onActionComplete when approve button is clicked', async () => {
      render(<VisitorList {...defaultProps} />);

      const approveButton = screen.getAllByText('Approve')[0];
      fireEvent.click(approveButton);

      await waitFor(() => {
        expect(defaultProps.onActionComplete).toHaveBeenCalledWith('visitor-1', 'APPROVED');
      });
    });

    it('should open reject dialog when reject button is clicked', async () => {
      render(<VisitorList {...defaultProps} />);

      const rejectButton = screen.getAllByText('Reject')[0];
      fireEvent.click(rejectButton);

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
        expect(screen.getByText(/reject visit request/i)).toBeInTheDocument();
        // Use getAllByText since "John Doe" appears both in card and dialog
        expect(screen.getAllByText(/john doe/i).length).toBeGreaterThan(0);
      });
    });

    it('should call onViewDetails when visitor card is clicked', () => {
      render(<VisitorList {...defaultProps} />);

      const visitorCard = screen.getByTestId('visitor-card-visitor-1');
      fireEvent.click(visitorCard);

      expect(defaultProps.onViewDetails).toHaveBeenCalledWith('visitor-1');
    });
  });

  describe('Reject dialog', () => {
    beforeEach(async () => {
      render(<VisitorList {...defaultProps} />);

      const rejectButton = screen.getAllByText('Reject')[0];
      fireEvent.click(rejectButton);

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });
    });

    it('should show reject dialog with visitor name', () => {
      expect(screen.getByText(/reject visit request/i)).toBeInTheDocument();
      // Use getAllByText since "John Doe" appears in both card and dialog
      const johnDoeElements = screen.getAllByText(/john doe/i);
      expect(johnDoeElements.length).toBeGreaterThan(0);
    });

    it('should have textarea for rejection reason', () => {
      const textarea = screen.getByRole('textbox', { name: /reason for rejection/i });
      expect(textarea).toBeInTheDocument();
      expect(textarea).toHaveAttribute('aria-label', 'Reason for rejection');
    });

    it('should disable confirm button when reason is empty', () => {
      const confirmButton = screen.getByRole('button', { name: /reject/i });
      expect(confirmButton).toBeInTheDocument();
    });

    it('should enable confirm button when reason is provided', async () => {
      const textarea = screen.getByRole('textbox', { name: /reason for rejection/i });
      fireEvent.change(textarea, { target: { value: 'Not authorized' } });

      const confirmButton = screen.getByRole('button', { name: /reject/i });
      expect(confirmButton).not.toBeDisabled();
    });

    it('should call rejectVisit service when confirm button is clicked', async () => {
      mockedRejectVisit.mockResolvedValueOnce({
        success: true,
        visit: {
          id: 'visitor-1',
          status: 'REJECTED',
        },
      });

      const textarea = screen.getByRole('textbox', { name: /reason for rejection/i });
      fireEvent.change(textarea, { target: { value: 'Not authorized' } });

      const confirmButton = screen.getByRole('button', { name: /reject/i });
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(mockedRejectVisit).toHaveBeenCalledWith('visitor-1', 'Not authorized');
        expect(defaultProps.onActionComplete).toHaveBeenCalledWith('visitor-1', VisitStatus.REJECTED);
        expect(mockedToast.success).toHaveBeenCalledWith('Visit rejected.');
      });
    });

    it('should close dialog after successful rejection', async () => {
      mockedRejectVisit.mockResolvedValueOnce({
        success: true,
        visit: {
          id: 'visitor-1',
          status: 'REJECTED',
        },
      });

      const textarea = screen.getByRole('textbox', { name: /reason for rejection/i });
      fireEvent.change(textarea, { target: { value: 'Not authorized' } });

      const confirmButton = screen.getByRole('button', { name: /reject/i });
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });
    });

    it('should close dialog when cancel button is clicked', () => {
      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      fireEvent.click(cancelButton);

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('should reset reason when dialog is closed', async () => {
      const textarea = screen.getByRole('textbox', { name: /reason for rejection/i });
      fireEvent.change(textarea, { target: { value: 'Test reason' } });

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      fireEvent.click(cancelButton);

      // Open dialog again
      const rejectButton = screen.getAllByText('Reject')[0];
      fireEvent.click(rejectButton);

      await waitFor(() => {
        const newTextarea = screen.getByRole('textbox', { name: /reason for rejection/i });
        expect(newTextarea).toHaveValue('');
      });
    });
  });

  describe('Processing state', () => {
    it('should handle async approval', async () => {
      render(<VisitorList {...defaultProps} />);

      const approveButton = screen.getAllByText('Approve')[0];
      fireEvent.click(approveButton);

      await waitFor(() => {
        expect(defaultProps.onActionComplete).toHaveBeenCalled();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper role for list', () => {
      render(<VisitorList {...defaultProps} />);

      const list = screen.getByRole('list', { name: /visitor list/i });
      expect(list).toBeInTheDocument();
    });

    it('should have proper aria-live for error messages', () => {
      const error = new Error('Test error');
      render(<VisitorList {...defaultProps} error={error} />);

      const alert = screen.getByRole('alert');
      expect(alert).toHaveAttribute('aria-live', 'assertive');
    });

    it('should have aria-busy on loading state', () => {
      render(<VisitorList {...defaultProps} isLoading={true} />);

      const loadingContainer = screen.getByLabelText(/loading visitors/i);
      expect(loadingContainer).toHaveAttribute('aria-busy', 'true');
    });

    it('should have aria-modal on dialog', async () => {
      render(<VisitorList {...defaultProps} />);

      const rejectButton = screen.getAllByText('Reject')[0];
      fireEvent.click(rejectButton);

      await waitFor(() => {
        const dialog = screen.getByRole('dialog');
        expect(dialog).toHaveAttribute('aria-modal', 'true');
      });
    });
  });
});
