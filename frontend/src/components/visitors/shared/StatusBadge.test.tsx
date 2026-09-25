import { render, screen } from '@testing-library/react';
import { StatusBadge } from '@/components/visitors/shared/StatusBadge';

describe('StatusBadge', () => {
  describe('Variant Rendering', () => {
    it('should render pending variant with blue colors', () => {
      render(<StatusBadge variant="pending" />);
      const badge = screen.getByText('Pending');
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveClass('bg-blue-100', 'text-blue-700', 'border-blue-200');
    });

    it('should render approved variant with emerald colors', () => {
      render(<StatusBadge variant="approved" />);
      const badge = screen.getByText('Approved');
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveClass('bg-emerald-100', 'text-emerald-700', 'border-emerald-200');
    });

    it('should render rejected variant with red colors', () => {
      render(<StatusBadge variant="rejected" />);
      const badge = screen.getByText('Rejected');
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveClass('bg-red-100', 'text-red-700', 'border-red-200');
    });

    it('should render checked-in variant with purple colors', () => {
      render(<StatusBadge variant="checked-in" />);
      const badge = screen.getByText('Checked In');
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveClass('bg-purple-100', 'text-purple-700', 'border-purple-200');
    });

    it('should render checked-out variant with gray colors', () => {
      render(<StatusBadge variant="checked-out" />);
      const badge = screen.getByText('Checked Out');
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveClass('bg-gray-100', 'text-gray-700', 'border-gray-200');
    });
  });

  describe('Custom Labels', () => {
    it('should display custom text when children prop is provided', () => {
      render(<StatusBadge variant="approved">Visit Confirmed</StatusBadge>);
      const badge = screen.getByText('Visit Confirmed');
      expect(badge).toBeInTheDocument();
    });

    it('should display default label when children prop is omitted', () => {
      render(<StatusBadge variant="pending" />);
      expect(screen.getByText('Pending')).toBeInTheDocument();
    });
  });

  describe('Class Merging', () => {
    it('should merge className prop with variant classes', () => {
      render(<StatusBadge variant="approved" className="text-xs" />);
      const badge = screen.getByText('Approved');
      expect(badge).toHaveClass('text-xs');
      expect(badge).toHaveClass('bg-emerald-100'); // variant class still present
    });
  });

  describe('Accessibility', () => {
    it('should render as semantic span element', () => {
      render(<StatusBadge variant="pending" />);
      const badge = screen.getByText('Pending');
      expect(badge.tagName).toBe('SPAN');
    });
  });
});
