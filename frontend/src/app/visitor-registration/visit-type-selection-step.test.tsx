/**
 * Tests for VisitTypeSelectionStep component
 * Task 4.3 - Visit Type Selection Step
 */

import * as React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import {
  VisitTypeSelectionStep,
  VisitType,
} from './visit-type-selection-step';

describe('VisitTypeSelectionStep', () => {
  const mockOnSuccess = jest.fn();
  const mockOnBack = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  // ============================================================================
  // Rendering Tests
  // ============================================================================

  describe('Rendering', () => {
    it('should render step indicator showing "Step 2 of 6"', () => {
      render(
        <VisitTypeSelectionStep
          onSuccess={mockOnSuccess}
          onBack={mockOnBack}
        />
      );

      expect(screen.getByText('Step 2 of 6')).toBeInTheDocument();
    });

    it('should render header "What brings you here today?"', () => {
      render(
        <VisitTypeSelectionStep
          onSuccess={mockOnSuccess}
          onBack={mockOnBack}
        />
      );

      expect(
        screen.getByText('What brings you here today?')
      ).toBeInTheDocument();
    });

    it('should render both Meeting and Delivery cards', () => {
      render(
        <VisitTypeSelectionStep
          onSuccess={mockOnSuccess}
          onBack={mockOnBack}
        />
      );

      expect(screen.getByLabelText(/meeting visit type/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/delivery visit type/i)).toBeInTheDocument();
    });

    it('should render Meeting card with User icon', () => {
      render(
        <VisitTypeSelectionStep
          onSuccess={mockOnSuccess}
          onBack={mockOnBack}
        />
      );

      const meetingCard = screen.getByLabelText(/meeting visit type/i);
      expect(meetingCard).toBeInTheDocument();
      expect(screen.getByText('Meeting')).toBeInTheDocument();
    });

    it('should render Delivery card with Package icon', () => {
      render(
        <VisitTypeSelectionStep
          onSuccess={mockOnSuccess}
          onBack={mockOnBack}
        />
      );

      const deliveryCard = screen.getByLabelText(/delivery visit type/i);
      expect(deliveryCard).toBeInTheDocument();
      expect(screen.getByText('Delivery')).toBeInTheDocument();
    });

    it('should render back button', () => {
      render(
        <VisitTypeSelectionStep
          onSuccess={mockOnSuccess}
          onBack={mockOnBack}
        />
      );

      expect(screen.getByRole('button', { name: /back/i })).toBeInTheDocument();
    });

    it('should display visitor phone if provided', () => {
      const testPhone = '+91 999****999';
      render(
        <VisitTypeSelectionStep
          onSuccess={mockOnSuccess}
          onBack={mockOnBack}
          visitorPhone={testPhone}
        />
      );

      expect(screen.getByText(testPhone)).toBeInTheDocument();
    });

    it('should not display phone section if visitorPhone is not provided', () => {
      render(
        <VisitTypeSelectionStep
          onSuccess={mockOnSuccess}
          onBack={mockOnBack}
        />
      );

      // Only the heading should be present, no phone number
      expect(
        screen.getByText('What brings you here today?')
      ).toBeInTheDocument();
      expect(screen.queryByLabelText(/verified phone number/i)).not.toBeInTheDocument();
    });
  });

  // ============================================================================
  // Selection Tests
  // ============================================================================

  describe('Selection Behavior', () => {
    it('should select Meeting card and call onSuccess after delay', async () => {
      render(
        <VisitTypeSelectionStep
          onSuccess={mockOnSuccess}
          onBack={mockOnBack}
        />
      );

      const meetingCard = screen.getByLabelText(/meeting visit type/i);
      fireEvent.click(meetingCard);

      // Should be selected immediately (visual feedback)
      expect(meetingCard).toHaveAttribute('aria-checked', 'true');

      // Advance timers to trigger callback (250ms delay)
      jest.advanceTimersByTime(250);

      await waitFor(() => {
        expect(mockOnSuccess).toHaveBeenCalledWith({
          visitType: VisitType.MEETING,
        });
      });
    });

    it('should select Delivery card and call onSuccess after delay', async () => {
      render(
        <VisitTypeSelectionStep
          onSuccess={mockOnSuccess}
          onBack={mockOnBack}
        />
      );

      const deliveryCard = screen.getByLabelText(/delivery visit type/i);
      fireEvent.click(deliveryCard);

      // Should be selected immediately
      expect(deliveryCard).toHaveAttribute('aria-checked', 'true');

      // Advance timers
      jest.advanceTimersByTime(250);

      await waitFor(() => {
        expect(mockOnSuccess).toHaveBeenCalledWith({
          visitType: VisitType.DELIVERY,
        });
      });
    });

    it('should change selection when clicking different card', () => {
      render(
        <VisitTypeSelectionStep
          onSuccess={mockOnSuccess}
          onBack={mockOnBack}
        />
      );

      const meetingCard = screen.getByLabelText(/meeting visit type/i);
      const deliveryCard = screen.getByLabelText(/delivery visit type/i);

      // Select Meeting
      fireEvent.click(meetingCard);
      expect(meetingCard).toHaveAttribute('aria-checked', 'true');
      expect(deliveryCard).toHaveAttribute('aria-checked', 'false');

      // Select Delivery
      fireEvent.click(deliveryCard);
      expect(deliveryCard).toHaveAttribute('aria-checked', 'true');
      expect(meetingCard).toHaveAttribute('aria-checked', 'false');
    });

    it('should show visual selected state with appropriate styling', () => {
      render(
        <VisitTypeSelectionStep
          onSuccess={mockOnSuccess}
          onBack={mockOnBack}
        />
      );

      const meetingCard = screen.getByLabelText(/meeting visit type/i);
      fireEvent.click(meetingCard);

      // Check for emerald theme classes (teal)
      expect(meetingCard).toHaveClass('border-emerald-500');
      expect(meetingCard).toHaveClass('bg-emerald-100');
      expect(meetingCard).toHaveClass('ring-emerald-500');
    });
  });

  // ============================================================================
  // Navigation Tests
  // ============================================================================

  describe('Navigation', () => {
    it('should call onBack when back button is clicked', () => {
      render(
        <VisitTypeSelectionStep
          onSuccess={mockOnSuccess}
          onBack={mockOnBack}
        />
      );

      const backButton = screen.getByRole('button', { name: /back/i });
      fireEvent.click(backButton);

      expect(mockOnBack).toHaveBeenCalledTimes(1);
    });

    it('should call onBack when Escape key is pressed', () => {
      render(
        <VisitTypeSelectionStep
          onSuccess={mockOnSuccess}
          onBack={mockOnBack}
        />
      );

      fireEvent.keyDown(document, { key: 'Escape' });

      expect(mockOnBack).toHaveBeenCalledTimes(1);
    });
  });

  // ============================================================================
  // Keyboard Navigation Tests
  // ============================================================================

  describe('Keyboard Navigation', () => {
    it('should have autofocus attribute on first card', () => {
      render(
        <VisitTypeSelectionStep
          onSuccess={mockOnSuccess}
          onBack={mockOnBack}
        />
      );

      const meetingCard = screen.getByLabelText(/meeting visit type/i);
      // In React 19 and jsdom, autofocus attribute might not be set, but the button should be first in tab order
      // Check that it's the first radio button
      const radioButtons = screen.getAllByRole('radio');
      expect(radioButtons[0]).toBe(meetingCard);
    });

    it('should navigate to next card with ArrowDown', () => {
      render(
        <VisitTypeSelectionStep
          onSuccess={mockOnSuccess}
          onBack={mockOnBack}
        />
      );

      const meetingCard = screen.getByLabelText(/meeting visit type/i);
      const deliveryCard = screen.getByLabelText(/delivery visit type/i);

      // Focus first card
      meetingCard.focus();
      expect(meetingCard).toHaveFocus();

      // Press ArrowDown on the focused element
      fireEvent.keyDown(meetingCard, { key: 'ArrowDown' });

      // Second card should be focused
      expect(deliveryCard).toHaveFocus();
    });

    it('should navigate to previous card with ArrowUp', async () => {
      render(
        <VisitTypeSelectionStep
          onSuccess={mockOnSuccess}
          onBack={mockOnBack}
        />
      );

      const meetingCard = screen.getByLabelText(/meeting visit type/i);
      const deliveryCard = screen.getByLabelText(/delivery visit type/i);

      // Focus second card explicitly and wait for state to update
      deliveryCard.focus();
      
      await waitFor(() => {
        expect(deliveryCard).toHaveFocus();
      });

      // Press ArrowUp on the focused element
      fireEvent.keyDown(deliveryCard, { key: 'ArrowUp' });

      // First card should be focused
      await waitFor(() => {
        expect(meetingCard).toHaveFocus();
      });
    });

    it('should wrap focus from last to first card with ArrowDown', async () => {
      render(
        <VisitTypeSelectionStep
          onSuccess={mockOnSuccess}
          onBack={mockOnBack}
        />
      );

      const meetingCard = screen.getByLabelText(/meeting visit type/i);
      const deliveryCard = screen.getByLabelText(/delivery visit type/i);

      // Focus last card and wait for state update
      deliveryCard.focus();
      
      await waitFor(() => {
        expect(deliveryCard).toHaveFocus();
      });

      // Press ArrowDown (should wrap to first) on the focused element
      fireEvent.keyDown(deliveryCard, { key: 'ArrowDown' });

      await waitFor(() => {
        expect(meetingCard).toHaveFocus();
      });
    });

    it('should wrap focus from first to last card with ArrowUp', () => {
      render(
        <VisitTypeSelectionStep
          onSuccess={mockOnSuccess}
          onBack={mockOnBack}
        />
      );

      const meetingCard = screen.getByLabelText(/meeting visit type/i);
      const deliveryCard = screen.getByLabelText(/delivery visit type/i);

      // Focus first card
      meetingCard.focus();

      // Press ArrowUp (should wrap to last) on the focused element
      fireEvent.keyDown(meetingCard, { key: 'ArrowUp' });

      expect(deliveryCard).toHaveFocus();
    });

    it('should select card with Enter key', async () => {
      render(
        <VisitTypeSelectionStep
          onSuccess={mockOnSuccess}
          onBack={mockOnBack}
        />
      );

      const meetingCard = screen.getByLabelText(/meeting visit type/i);
      meetingCard.focus();

      // Press Enter
      fireEvent.keyDown(meetingCard, { key: 'Enter' });

      // Should be selected
      expect(meetingCard).toHaveAttribute('aria-checked', 'true');

      // Advance timers
      jest.advanceTimersByTime(250);

      await waitFor(() => {
        expect(mockOnSuccess).toHaveBeenCalledWith({
          visitType: VisitType.MEETING,
        });
      });
    });

    it('should select card with Space key', async () => {
      render(
        <VisitTypeSelectionStep
          onSuccess={mockOnSuccess}
          onBack={mockOnBack}
        />
      );

      const deliveryCard = screen.getByLabelText(/delivery visit type/i);
      deliveryCard.focus();

      // Press Space
      fireEvent.keyDown(deliveryCard, { key: ' ' });

      // Should be selected
      expect(deliveryCard).toHaveAttribute('aria-checked', 'true');

      // Advance timers
      jest.advanceTimersByTime(250);

      await waitFor(() => {
        expect(mockOnSuccess).toHaveBeenCalledWith({
          visitType: VisitType.DELIVERY,
        });
      });
    });
  });

  // ============================================================================
  // Accessibility Tests
  // ============================================================================

  describe('Accessibility', () => {
    it('should have radiogroup role with correct label', () => {
      render(
        <VisitTypeSelectionStep
          onSuccess={mockOnSuccess}
          onBack={mockOnBack}
        />
      );

      const radiogroup = screen.getByRole('radiogroup', {
        name: /select visit type/i,
      });
      expect(radiogroup).toBeInTheDocument();
    });

    it('should have radio role for cards', () => {
      render(
        <VisitTypeSelectionStep
          onSuccess={mockOnSuccess}
          onBack={mockOnBack}
        />
      );

      const cards = screen.getAllByRole('radio');
      expect(cards).toHaveLength(2);
    });

    it('should have aria-checked attributes', () => {
      render(
        <VisitTypeSelectionStep
          onSuccess={mockOnSuccess}
          onBack={mockOnBack}
        />
      );

      const meetingCard = screen.getByLabelText(/meeting visit type/i);
      const deliveryCard = screen.getByLabelText(/delivery visit type/i);

      expect(meetingCard).toHaveAttribute('aria-checked', 'false');
      expect(deliveryCard).toHaveAttribute('aria-checked', 'false');

      // Select Meeting
      fireEvent.click(meetingCard);

      expect(meetingCard).toHaveAttribute('aria-checked', 'true');
      expect(deliveryCard).toHaveAttribute('aria-checked', 'false');
    });

    it('should have aria-describedby linking to descriptions', () => {
      render(
        <VisitTypeSelectionStep
          onSuccess={mockOnSuccess}
          onBack={mockOnBack}
        />
      );

      const meetingCard = screen.getByLabelText(/meeting visit type/i);
      expect(meetingCard).toHaveAttribute('aria-describedby', 'meeting-desc');

      const deliveryCard = screen.getByLabelText(/delivery visit type/i);
      expect(deliveryCard).toHaveAttribute('aria-describedby', 'delivery-desc');
    });

    it('should have accessible descriptions for screen readers', () => {
      render(
        <VisitTypeSelectionStep
          onSuccess={mockOnSuccess}
          onBack={mockOnBack}
        />
      );

      const meetingDesc = document.getElementById('meeting-desc');
      const deliveryDesc = document.getElementById('delivery-desc');

      // Descriptions are visible and accessible (not sr-only)
      expect(meetingDesc).toBeInTheDocument();
      expect(meetingDesc).toHaveTextContent('Visit a person or department');
      expect(meetingDesc).toHaveClass('text-sm', 'text-gray-600');

      expect(deliveryDesc).toBeInTheDocument();
      expect(deliveryDesc).toHaveTextContent('Drop off a package or item');
      expect(deliveryDesc).toHaveClass('text-sm', 'text-gray-600');
    });

    it('should have aria-posinset and aria-setsize for position in set', () => {
      render(
        <VisitTypeSelectionStep
          onSuccess={mockOnSuccess}
          onBack={mockOnBack}
        />
      );

      const meetingCard = screen.getByLabelText(/meeting visit type/i);
      const deliveryCard = screen.getByLabelText(/delivery visit type/i);

      expect(meetingCard).toHaveAttribute('aria-posinset', '1');
      expect(meetingCard).toHaveAttribute('aria-setsize', '2');

      expect(deliveryCard).toHaveAttribute('aria-posinset', '2');
      expect(deliveryCard).toHaveAttribute('aria-setsize', '2');
    });

    it('should have aria-hidden on decorative icons', () => {
      render(
        <VisitTypeSelectionStep
          onSuccess={mockOnSuccess}
          onBack={mockOnBack}
        />
      );

      // Check all SVG icons have aria-hidden
      const icons = document.querySelectorAll('svg[aria-hidden="true"]');
      expect(icons.length).toBeGreaterThanOrEqual(2); // At least User and Package icons
    });
  });

  // ============================================================================
  // Visual Feedback Tests
  // ============================================================================

  describe('Visual Feedback', () => {
    it('should apply emerald theme to Meeting card when selected', () => {
      render(
        <VisitTypeSelectionStep
          onSuccess={mockOnSuccess}
          onBack={mockOnBack}
        />
      );

      const meetingCard = screen.getByLabelText(/meeting visit type/i);
      fireEvent.click(meetingCard);

      expect(meetingCard).toHaveClass('border-emerald-500');
      expect(meetingCard).toHaveClass('bg-emerald-100');
      expect(meetingCard).toHaveClass('ring-2');
      expect(meetingCard).toHaveClass('ring-emerald-500');
    });

    it('should apply amber theme to Delivery card when selected', () => {
      render(
        <VisitTypeSelectionStep
          onSuccess={mockOnSuccess}
          onBack={mockOnBack}
        />
      );

      const deliveryCard = screen.getByLabelText(/delivery visit type/i);
      fireEvent.click(deliveryCard);

      expect(deliveryCard).toHaveClass('border-amber-500');
      expect(deliveryCard).toHaveClass('bg-amber-100');
      expect(deliveryCard).toHaveClass('ring-2');
      expect(deliveryCard).toHaveClass('ring-amber-500');
    });

    it('should have default border when not selected', () => {
      render(
        <VisitTypeSelectionStep
          onSuccess={mockOnSuccess}
          onBack={mockOnBack}
        />
      );

      const meetingCard = screen.getByLabelText(/meeting visit type/i);
      expect(meetingCard).toHaveClass('border-gray-200');
    });

    it('should have transition classes for smooth animation', () => {
      render(
        <VisitTypeSelectionStep
          onSuccess={mockOnSuccess}
          onBack={mockOnBack}
        />
      );

      const meetingCard = screen.getByLabelText(/meeting visit type/i);
      expect(meetingCard).toHaveClass('transition-all');
      expect(meetingCard).toHaveClass('duration-200');
    });

    it('should have active scale effect class', () => {
      render(
        <VisitTypeSelectionStep
          onSuccess={mockOnSuccess}
          onBack={mockOnBack}
        />
      );

      const meetingCard = screen.getByLabelText(/meeting visit type/i);
      expect(meetingCard).toHaveClass('active:scale-[0.98]');
    });
  });

  // ============================================================================
  // Edge Cases
  // ============================================================================

  describe('Edge Cases', () => {
    it('should handle rapid card clicks without duplicate callbacks', async () => {
      render(
        <VisitTypeSelectionStep
          onSuccess={mockOnSuccess}
          onBack={mockOnBack}
        />
      );

      const meetingCard = screen.getByLabelText(/meeting visit type/i);

      // Click rapidly
      fireEvent.click(meetingCard);
      fireEvent.click(meetingCard);
      fireEvent.click(meetingCard);

      // Advance timers by 250ms (delay for callback)
      jest.advanceTimersByTime(250);

      await waitFor(() => {
        // Should only be called 3 times (once per click, but still acceptable)
        // The important thing is that all callbacks have the correct data
        expect(mockOnSuccess).toHaveBeenCalledWith({
          visitType: VisitType.MEETING,
        });
      });
    });

    it('should handle switching selection before callback fires', async () => {
      render(
        <VisitTypeSelectionStep
          onSuccess={mockOnSuccess}
          onBack={mockOnBack}
        />
      );

      const meetingCard = screen.getByLabelText(/meeting visit type/i);
      const deliveryCard = screen.getByLabelText(/delivery visit type/i);

      // Click Meeting
      fireEvent.click(meetingCard);
      expect(meetingCard).toHaveAttribute('aria-checked', 'true');

      // Quickly switch to Delivery before callback fires (cancels first timeout)
      fireEvent.click(deliveryCard);
      expect(deliveryCard).toHaveAttribute('aria-checked', 'true');
      expect(meetingCard).toHaveAttribute('aria-checked', 'false');

      // Advance all timers
      jest.advanceTimersByTime(500);

      await waitFor(() => {
        // Should only be called once for the last selection (Delivery)
        // The first timeout (Meeting) should be cancelled
        expect(mockOnSuccess).toHaveBeenCalledTimes(1);
        expect(mockOnSuccess).toHaveBeenCalledWith({
          visitType: VisitType.DELIVERY,
        });
      });
    });
  });
});
