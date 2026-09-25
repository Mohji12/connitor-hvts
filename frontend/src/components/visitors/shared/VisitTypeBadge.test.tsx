import { render, screen } from '@testing-library/react';
import { VisitTypeBadge } from '@/components/visitors/shared/VisitTypeBadge';
import { VisitCategory } from '@/lib/constants/visit-constants';

describe('VisitTypeBadge', () => {
  describe('Meeting Variant', () => {
    it('should render meeting badge with correct text', () => {
      render(<VisitTypeBadge visitType={VisitCategory.MEETING} />);
      const badge = screen.getByText('Meeting');
      expect(badge).toBeInTheDocument();
    });

    it('should render meeting badge with emerald colors', () => {
      render(<VisitTypeBadge visitType={VisitCategory.MEETING} />);
      const badge = screen.getByText('Meeting');
      expect(badge).toHaveClass('border-emerald-600', 'text-emerald-600');
    });

    it('should have correct aria-label for meeting type', () => {
      render(<VisitTypeBadge visitType={VisitCategory.MEETING} />);
      const badge = screen.getByText('Meeting');
      expect(badge).toHaveAttribute('aria-label', 'Visit type: meeting');
    });
  });

  describe('Delivery Variant', () => {
    it('should render delivery badge with correct text', () => {
      render(<VisitTypeBadge visitType={VisitCategory.DELIVERY} />);
      const badge = screen.getByText('Delivery');
      expect(badge).toBeInTheDocument();
    });

    it('should render delivery badge with amber colors', () => {
      render(<VisitTypeBadge visitType={VisitCategory.DELIVERY} />);
      const badge = screen.getByText('Delivery');
      expect(badge).toHaveClass('border-amber-600', 'text-amber-600');
    });

    it('should have correct aria-label for delivery type', () => {
      render(<VisitTypeBadge visitType={VisitCategory.DELIVERY} />);
      const badge = screen.getByText('Delivery');
      expect(badge).toHaveAttribute('aria-label', 'Visit type: delivery');
    });
  });

  describe('Accessibility', () => {
    it('should have aria-hidden icon', () => {
      render(<VisitTypeBadge visitType={VisitCategory.MEETING} />);
      const icon = document.querySelector('[aria-hidden="true"]');
      expect(icon).toBeInTheDocument();
    });
  });

  describe('Custom className', () => {
    it('should merge custom className with base styles', () => {
      render(<VisitTypeBadge visitType={VisitCategory.MEETING} className="text-xs" />);
      const badge = screen.getByText('Meeting');
      expect(badge).toHaveClass('text-xs');
      expect(badge).toHaveClass('border-emerald-600'); // variant class still present
    });
  });
});
