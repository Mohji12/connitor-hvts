import { render, screen, fireEvent } from '@testing-library/react';
import { StatusFilterPills } from './StatusFilterPills';
import type { VisitorCounts } from '@/types/visitor';

describe('StatusFilterPills', () => {
  const mockCounts: VisitorCounts = {
    pending: 3,
    approved: 5,
    checkedIn: 8,
    checkedOut: 12,
    rejected: 1,
  };

  const mockOnFilterChange = jest.fn();

  beforeEach(() => {
    mockOnFilterChange.mockClear();
  });

  describe('Rendering', () => {
    it('should render 4 filter pills', () => {
      render(
        <StatusFilterPills
          selectedFilter="PENDING"
          counts={mockCounts}
          onFilterChange={mockOnFilterChange}
          disabled={false}
        />
      );

      expect(screen.getByTestId('filter-pill-pending')).toBeInTheDocument();
      expect(screen.getByTestId('filter-pill-approved')).toBeInTheDocument();
      expect(screen.getByTestId('filter-pill-in')).toBeInTheDocument();
      expect(screen.getByTestId('filter-pill-out')).toBeInTheDocument();
    });

    it('should display correct labels', () => {
      render(
        <StatusFilterPills
          selectedFilter="PENDING"
          counts={mockCounts}
          onFilterChange={mockOnFilterChange}
          disabled={false}
        />
      );

      expect(screen.getByText('Pending')).toBeInTheDocument();
      expect(screen.getByText('Approved')).toBeInTheDocument();
      expect(screen.getByText('In')).toBeInTheDocument();
      expect(screen.getByText('Out')).toBeInTheDocument();
    });

    it('should display count badges for non-zero counts', () => {
      render(
        <StatusFilterPills
          selectedFilter="PENDING"
          counts={mockCounts}
          onFilterChange={mockOnFilterChange}
          disabled={false}
        />
      );

      expect(screen.getByTestId('filter-count-pending')).toHaveTextContent('3');
      expect(screen.getByTestId('filter-count-approved')).toHaveTextContent('5');
      expect(screen.getByTestId('filter-count-in')).toHaveTextContent('8');
      expect(screen.getByTestId('filter-count-out')).toHaveTextContent('12');
    });

    it('should hide count badges when count is zero', () => {
      const zeroCounts: VisitorCounts = {
        pending: 0,
        approved: 0,
        checkedIn: 0,
        checkedOut: 0,
        rejected: 0,
      };

      render(
        <StatusFilterPills
          selectedFilter="PENDING"
          counts={zeroCounts}
          onFilterChange={mockOnFilterChange}
          disabled={false}
        />
      );

      expect(screen.queryByTestId('filter-count-pending')).not.toBeInTheDocument();
      expect(screen.queryByTestId('filter-count-approved')).not.toBeInTheDocument();
      expect(screen.queryByTestId('filter-count-in')).not.toBeInTheDocument();
      expect(screen.queryByTestId('filter-count-out')).not.toBeInTheDocument();
    });

    it('should hide count badges when counts is null (loading)', () => {
      render(
        <StatusFilterPills
          selectedFilter="PENDING"
          counts={null}
          onFilterChange={mockOnFilterChange}
          disabled={false}
        />
      );

      expect(screen.queryByTestId('filter-count-pending')).not.toBeInTheDocument();
      expect(screen.queryByTestId('filter-count-approved')).not.toBeInTheDocument();
      expect(screen.queryByTestId('filter-count-in')).not.toBeInTheDocument();
      expect(screen.queryByTestId('filter-count-out')).not.toBeInTheDocument();
    });
  });

  describe('Selected State', () => {
    it('should mark the selected filter as selected', () => {
      render(
        <StatusFilterPills
          selectedFilter="APPROVED"
          counts={mockCounts}
          onFilterChange={mockOnFilterChange}
          disabled={false}
        />
      );

      const approvedPill = screen.getByTestId('filter-pill-approved');
      expect(approvedPill).toHaveAttribute('aria-selected', 'true');
    });

    it('should not mark other filters as selected', () => {
      render(
        <StatusFilterPills
          selectedFilter="APPROVED"
          counts={mockCounts}
          onFilterChange={mockOnFilterChange}
          disabled={false}
        />
      );

      expect(screen.getByTestId('filter-pill-pending')).toHaveAttribute('aria-selected', 'false');
      expect(screen.getByTestId('filter-pill-in')).toHaveAttribute('aria-selected', 'false');
      expect(screen.getByTestId('filter-pill-out')).toHaveAttribute('aria-selected', 'false');
    });
  });

  describe('Disabled State', () => {
    it('should disable all pills when disabled prop is true', () => {
      render(
        <StatusFilterPills
          selectedFilter="PENDING"
          counts={mockCounts}
          onFilterChange={mockOnFilterChange}
          disabled={true}
        />
      );

      expect(screen.getByTestId('filter-pill-pending')).toBeDisabled();
      expect(screen.getByTestId('filter-pill-approved')).toBeDisabled();
      expect(screen.getByTestId('filter-pill-in')).toBeDisabled();
      expect(screen.getByTestId('filter-pill-out')).toBeDisabled();
    });

    it('should have aria-disabled attribute when disabled', () => {
      render(
        <StatusFilterPills
          selectedFilter="PENDING"
          counts={mockCounts}
          onFilterChange={mockOnFilterChange}
          disabled={true}
        />
      );

      expect(screen.getByTestId('filter-pill-pending')).toHaveAttribute('aria-disabled', 'true');
    });

    it('should not call onFilterChange when disabled pill is clicked', () => {
      render(
        <StatusFilterPills
          selectedFilter="PENDING"
          counts={mockCounts}
          onFilterChange={mockOnFilterChange}
          disabled={true}
        />
      );

      fireEvent.click(screen.getByTestId('filter-pill-approved'));
      expect(mockOnFilterChange).not.toHaveBeenCalled();
    });
  });

  describe('Click Handling', () => {
    it('should call onFilterChange when a pill is clicked', () => {
      render(
        <StatusFilterPills
          selectedFilter="PENDING"
          counts={mockCounts}
          onFilterChange={mockOnFilterChange}
          disabled={false}
        />
      );

      fireEvent.click(screen.getByTestId('filter-pill-approved'));
      expect(mockOnFilterChange).toHaveBeenCalledWith('APPROVED');
    });

    it('should call onFilterChange with correct filter for each pill', () => {
      render(
        <StatusFilterPills
          selectedFilter="PENDING"
          counts={mockCounts}
          onFilterChange={mockOnFilterChange}
          disabled={false}
        />
      );

      fireEvent.click(screen.getByTestId('filter-pill-in'));
      expect(mockOnFilterChange).toHaveBeenCalledWith('IN');

      mockOnFilterChange.mockClear();

      fireEvent.click(screen.getByTestId('filter-pill-out'));
      expect(mockOnFilterChange).toHaveBeenCalledWith('OUT');
    });
  });

  describe('Accessibility', () => {
    it('should have role="tablist" on container', () => {
      render(
        <StatusFilterPills
          selectedFilter="PENDING"
          counts={mockCounts}
          onFilterChange={mockOnFilterChange}
          disabled={false}
        />
      );

      const container = screen.getByRole('tablist');
      expect(container).toBeInTheDocument();
      expect(container).toHaveAttribute('aria-label', 'Visitor status filters');
    });

    it('should have role="tab" on each pill', () => {
      render(
        <StatusFilterPills
          selectedFilter="PENDING"
          counts={mockCounts}
          onFilterChange={mockOnFilterChange}
          disabled={false}
        />
      );

      const tabs = screen.getAllByRole('tab');
      expect(tabs).toHaveLength(4);
    });

    it('should have aria-label with count on each pill', () => {
      render(
        <StatusFilterPills
          selectedFilter="PENDING"
          counts={mockCounts}
          onFilterChange={mockOnFilterChange}
          disabled={false}
        />
      );

      expect(screen.getByTestId('filter-pill-pending')).toHaveAttribute(
        'aria-label',
        'Pending (3 visitors)'
      );
      expect(screen.getByTestId('filter-pill-approved')).toHaveAttribute(
        'aria-label',
        'Approved (5 visitors)'
      );
      expect(screen.getByTestId('filter-pill-in')).toHaveAttribute(
        'aria-label',
        'In (8 visitors)'
      );
      expect(screen.getByTestId('filter-pill-out')).toHaveAttribute(
        'aria-label',
        'Out (12 visitors)'
      );
    });

    it('should have correct tabIndex for keyboard navigation', () => {
      render(
        <StatusFilterPills
          selectedFilter="PENDING"
          counts={mockCounts}
          onFilterChange={mockOnFilterChange}
          disabled={false}
        />
      );

      // Selected pill should have tabIndex 0
      expect(screen.getByTestId('filter-pill-pending')).toHaveAttribute('tabIndex', '0');

      // Other pills should have tabIndex -1
      expect(screen.getByTestId('filter-pill-approved')).toHaveAttribute('tabIndex', '-1');
      expect(screen.getByTestId('filter-pill-in')).toHaveAttribute('tabIndex', '-1');
      expect(screen.getByTestId('filter-pill-out')).toHaveAttribute('tabIndex', '-1');
    });

    it('should handle Enter key press', () => {
      render(
        <StatusFilterPills
          selectedFilter="PENDING"
          counts={mockCounts}
          onFilterChange={mockOnFilterChange}
          disabled={false}
        />
      );

      const approvedPill = screen.getByTestId('filter-pill-approved');
      fireEvent.keyDown(approvedPill, { key: 'Enter', code: 'Enter' });

      expect(mockOnFilterChange).toHaveBeenCalledWith('APPROVED');
    });

    it('should handle Space key press', () => {
      render(
        <StatusFilterPills
          selectedFilter="PENDING"
          counts={mockCounts}
          onFilterChange={mockOnFilterChange}
          disabled={false}
        />
      );

      const approvedPill = screen.getByTestId('filter-pill-approved');
      fireEvent.keyDown(approvedPill, { key: ' ', code: 'Space' });

      expect(mockOnFilterChange).toHaveBeenCalledWith('APPROVED');
    });
  });

  describe('Keyboard Navigation', () => {
    it('should focus next pill on ArrowRight', () => {
      render(
        <StatusFilterPills
          selectedFilter="PENDING"
          counts={mockCounts}
          onFilterChange={mockOnFilterChange}
          disabled={false}
        />
      );

      const pendingPill = screen.getByTestId('filter-pill-pending');
      const approvedPill = screen.getByTestId('filter-pill-approved');

      pendingPill.focus();
      fireEvent.keyDown(pendingPill, { key: 'ArrowRight', code: 'ArrowRight' });

      expect(document.activeElement).toBe(approvedPill);
    });

    it('should focus previous pill on ArrowLeft', () => {
      render(
        <StatusFilterPills
          selectedFilter="PENDING"
          counts={mockCounts}
          onFilterChange={mockOnFilterChange}
          disabled={false}
        />
      );

      const approvedPill = screen.getByTestId('filter-pill-approved');
      const pendingPill = screen.getByTestId('filter-pill-pending');

      approvedPill.focus();
      fireEvent.keyDown(approvedPill, { key: 'ArrowLeft', code: 'ArrowLeft' });

      expect(document.activeElement).toBe(pendingPill);
    });

    it('should wrap to last pill on ArrowLeft from first pill', () => {
      render(
        <StatusFilterPills
          selectedFilter="PENDING"
          counts={mockCounts}
          onFilterChange={mockOnFilterChange}
          disabled={false}
        />
      );

      const pendingPill = screen.getByTestId('filter-pill-pending');
      const outPill = screen.getByTestId('filter-pill-out');

      pendingPill.focus();
      fireEvent.keyDown(pendingPill, { key: 'ArrowLeft', code: 'ArrowLeft' });

      expect(document.activeElement).toBe(outPill);
    });

    it('should wrap to first pill on ArrowRight from last pill', () => {
      render(
        <StatusFilterPills
          selectedFilter="PENDING"
          counts={mockCounts}
          onFilterChange={mockOnFilterChange}
          disabled={false}
        />
      );

      const outPill = screen.getByTestId('filter-pill-out');
      const pendingPill = screen.getByTestId('filter-pill-pending');

      outPill.focus();
      fireEvent.keyDown(outPill, { key: 'ArrowRight', code: 'ArrowRight' });

      expect(document.activeElement).toBe(pendingPill);
    });
  });
});
