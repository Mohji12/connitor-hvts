'use client';

/**
 * VisitTypeSelectionStep - Step 2 of visitor registration
 * Allows visitors to select between Meeting or Delivery visit types
 * Task 4.3 - Visit Type Selection Step
 */

import * as React from 'react';
import { User, Package, ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

// ============================================================================
// Types & Interfaces
// ============================================================================

export interface VisitTypeSelectionStepProps {
  /** Callback triggered on visit type selection */
  onSuccess: (data: VisitTypeSelectionData) => void;
  /** Callback for back navigation */
  onBack: () => void;
  /** Optional visitor phone number for display */
  visitorPhone?: string;
}

export interface VisitTypeSelectionData {
  visitType: VisitType;
}

export enum VisitType {
  MEETING = 'MEETING',
  DELIVERY = 'DELIVERY',
}

export type VisitTypeOption = 'MEETING' | 'DELIVERY';

export interface VisitTypeCardConfig {
  type: VisitType;
  label: string;
  icon: React.ComponentType<{ className?: string; 'aria-hidden'?: boolean }>;
  description: string;
  colorTheme: 'teal' | 'amber';
}

export type NavigationHandler = () => void;
export type SelectionHandler = (data: VisitTypeSelectionData) => void;

// ============================================================================
// Card Configurations
// ============================================================================

const VISIT_TYPE_CONFIGS: VisitTypeCardConfig[] = [
  {
    type: VisitType.MEETING,
    label: 'Meeting',
    icon: User,
    description: 'Visit a person or department',
    colorTheme: 'teal',
  },
  {
    type: VisitType.DELIVERY,
    label: 'Delivery',
    icon: Package,
    description: 'Drop off a package or item',
    colorTheme: 'amber',
  },
];

// ============================================================================
// Child Components
// ============================================================================

interface VisitTypeCardProps {
  config: VisitTypeCardConfig;
  isSelected: boolean;
  onSelect: () => void;
  index: number;
  totalCards: number;
  autoFocus?: boolean;
}

const VisitTypeCard = React.forwardRef<
  HTMLButtonElement,
  VisitTypeCardProps & { onFocus?: () => void }
>(
  (
    { config, isSelected, onSelect, index, totalCards, autoFocus, onFocus },
    ref
  ) => {
    const Icon = config.icon;

    // Color theme classes
    const themeClasses = React.useMemo(() => {
      if (config.colorTheme === 'teal') {
        return {
          default: 'text-emerald-600 bg-emerald-50',
          hover: 'hover:border-emerald-300 hover:bg-emerald-50',
          selected:
            'border-emerald-500 bg-emerald-100 ring-2 ring-emerald-500',
          focus: 'focus-visible:ring-2 focus-visible:ring-blue-500',
        };
      } else {
        return {
          default: 'text-amber-600 bg-amber-50',
          hover: 'hover:border-amber-300 hover:bg-amber-50',
          selected: 'border-amber-500 bg-amber-100 ring-2 ring-amber-500',
          focus: 'focus-visible:ring-2 focus-visible:ring-blue-500',
        };
      }
    }, [config.colorTheme]);

    return (
      <button
        ref={ref}
        type="button"
        role="radio"
        aria-checked={isSelected}
        aria-label={`${config.label} visit type`}
        aria-describedby={`${config.type.toLowerCase()}-desc`}
        aria-posinset={index + 1}
        aria-setsize={totalCards}
        onClick={onSelect}
        onFocus={onFocus}
        autoFocus={autoFocus}
        className={cn(
          'w-full min-h-[120px] rounded-lg border-2 transition-all duration-200',
          'cursor-pointer active:scale-[0.98]',
          'flex flex-col items-center justify-center gap-3 p-6',
          themeClasses.default,
          themeClasses.hover,
          themeClasses.focus,
          isSelected ? themeClasses.selected : 'border-gray-200 shadow-sm',
          'outline-none'
        )}
      >
        {/* Icon */}
        <Icon className="h-12 w-12" aria-hidden />

        {/* Label */}
        <div className="text-center">
          <span className="text-lg font-semibold text-gray-900">
            {config.label}
          </span>
          <p
            id={`${config.type.toLowerCase()}-desc`}
            className="mt-1 text-sm text-gray-600"
          >
            {config.description}
          </p>
        </div>
      </button>
    );
  }
);

VisitTypeCard.displayName = 'VisitTypeCard';

// ============================================================================
// Main Component
// ============================================================================

/**
 * VisitTypeSelectionStep - Renders two large cards for visit type selection.
 * Supports keyboard navigation and ARIA radiogroup pattern.
 */
export function VisitTypeSelectionStep({
  onSuccess,
  onBack,
  visitorPhone,
}: VisitTypeSelectionStepProps): React.ReactElement {
  // State
  const [selectedVisitType, setSelectedVisitType] =
    React.useState<VisitType | null>(null);

  // Refs for keyboard navigation and timeout cleanup
  const cardRefs = React.useRef<(HTMLButtonElement | null)[]>([]);
  const [focusedIndex, setFocusedIndex] = React.useState(0);
  const timeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  // Handle visit type selection
  const handleVisitTypeSelect = React.useCallback(
    (visitType: VisitType): void => {
      setSelectedVisitType(visitType);

      // Clear any existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      // Short delay for visual feedback, then trigger callback
      timeoutRef.current = setTimeout(() => {
        onSuccess({ visitType });
        timeoutRef.current = null;
      }, 250);
    },
    [onSuccess]
  );

  // Cleanup timeout on unmount
  React.useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  // Handle back navigation
  const handleBack = React.useCallback((): void => {
    onBack();
  }, [onBack]);

  // Keyboard event handler for arrow keys and Escape
  React.useEffect(() => {
    function handleKeyDown(event: KeyboardEvent): void {
      // Escape key - go back
      if (event.key === 'Escape') {
        onBack();
        return;
      }

      // Arrow key navigation (radiogroup pattern)
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        // Only handle if focus is on a radio button
        if (
          event.target instanceof HTMLButtonElement &&
          event.target.getAttribute('role') === 'radio'
        ) {
          event.preventDefault();

          const totalCards = VISIT_TYPE_CONFIGS.length;
          let newIndex = focusedIndex;

          if (event.key === 'ArrowDown') {
            newIndex = (focusedIndex + 1) % totalCards;
          } else {
            newIndex = (focusedIndex - 1 + totalCards) % totalCards;
          }

          setFocusedIndex(newIndex);
          cardRefs.current[newIndex]?.focus();
        }
      }

      // Enter or Space - select focused card
      if (
        (event.key === 'Enter' || event.key === ' ') &&
        event.target instanceof HTMLButtonElement &&
        event.target.getAttribute('role') === 'radio'
      ) {
        event.preventDefault();
        // Find which card is focused
        const focusedCard = event.target;
        const cardIndex = cardRefs.current.findIndex((ref) => ref === focusedCard);
        if (cardIndex !== -1) {
          const visitType = VISIT_TYPE_CONFIGS[cardIndex].type;
          handleVisitTypeSelect(visitType);
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [focusedIndex, onBack, handleVisitTypeSelect]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-8">
      <div
        className="w-full max-w-[480px] space-y-6"
        role="group"
        aria-label="Visit type selection"
        data-testid="visit-type-container"
      >
        {/* Step Indicator */}
        <div
          className="text-center text-sm text-gray-500"
          aria-label="Registration progress: Step 2 of 6"
        >
          Step 2 of 6
        </div>

        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold text-gray-900">
            What brings you here today?
          </h1>
          {visitorPhone && (
            <p className="text-sm text-gray-600" aria-label="Verified phone number">
              {visitorPhone}
            </p>
          )}
        </div>

        {/* Visit Type Cards (Radiogroup) */}
        <div
          role="radiogroup"
          aria-label="Select visit type"
          className="flex flex-col gap-4"
        >
          {VISIT_TYPE_CONFIGS.map((config, index) => (
            <VisitTypeCard
              key={config.type}
              ref={(el) => {
                cardRefs.current[index] = el;
              }}
              config={config}
              isSelected={selectedVisitType === config.type}
              onSelect={() => handleVisitTypeSelect(config.type)}
              onFocus={() => setFocusedIndex(index)}
              index={index}
              totalCards={VISIT_TYPE_CONFIGS.length}
              autoFocus={index === 0}
            />
          ))}
        </div>

        {/* Back Button */}
        <div className="flex justify-center">
          <Button
            type="button"
            variant="ghost"
            onClick={handleBack}
            className="text-gray-600 hover:text-gray-900 min-h-[44px] px-6"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
        </div>
      </div>
    </div>
  );
}
