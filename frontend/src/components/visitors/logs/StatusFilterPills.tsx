'use client';

import React, { useRef } from 'react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { StatusFilter, StatusFilterConfig, VisitorCounts } from '@/types/visitor';
import { VisitStatus } from '@/types/visitor';

/**
 * Status Filter Configuration
 * Mapping between UI filter labels and actual VisitStatus values
 */
const STATUS_FILTER_CONFIGS: StatusFilterConfig[] = [
  {
    id: 'PENDING',
    label: 'Pending',
    visitStatuses: [VisitStatus.PENDING, VisitStatus.REQUEST_SENT],
    color: 'blue',
  },
  {
    id: 'APPROVED',
    label: 'Approved',
    visitStatuses: [VisitStatus.APPROVED],
    color: 'emerald',
  },
  {
    id: 'IN',
    label: 'In',
    visitStatuses: [VisitStatus.CHECKED_IN],
    color: 'purple',
  },
  {
    id: 'OUT',
    label: 'Out',
    visitStatuses: [VisitStatus.CHECKED_OUT],
    color: 'gray',
  },
];

export interface StatusFilterPillsProps {
  selectedFilter: StatusFilter;
  counts: VisitorCounts | null;
  onFilterChange: (filter: StatusFilter) => void;
  disabled: boolean;
}

/**
 * Get the count for a specific filter from the counts object
 */
function getCountForFilter(filter: StatusFilter, counts: VisitorCounts | null): number {
  if (!counts) return 0;

  const mapping: Record<StatusFilter, keyof VisitorCounts> = {
    PENDING: 'pending',
    APPROVED: 'approved',
    IN: 'checkedIn',
    OUT: 'checkedOut',
  };

  return counts[mapping[filter]] || 0;
}

/**
 * Get the pill variant based on color and state
 */
function getPillClasses(
  color: StatusFilterConfig['color'],
  isSelected: boolean,
  isDisabled: boolean
): string {
  const baseClasses = 'px-4 py-2.5 rounded-full font-medium text-sm transition-all cursor-pointer';
  const heightClasses = 'min-h-[44px] md:min-h-[48px]';
  const widthClasses = 'min-w-[80px]';

  if (isDisabled) {
    return cn(
      baseClasses,
      heightClasses,
      widthClasses,
      'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed opacity-50'
    );
  }

  if (isSelected) {
    const selectedColors: Record<StatusFilterConfig['color'], string> = {
      blue: 'bg-blue-600 text-white border-blue-600 shadow-md',
      emerald: 'bg-emerald-600 text-white border-emerald-600 shadow-md',
      purple: 'bg-purple-600 text-white border-purple-600 shadow-md',
      gray: 'bg-gray-600 text-white border-gray-600 shadow-md',
    };
    return cn(baseClasses, heightClasses, widthClasses, 'border', selectedColors[color]);
  }

  return cn(
    baseClasses,
    heightClasses,
    widthClasses,
    'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50 hover:border-gray-300'
  );
}

/**
 * StatusFilterPills Component
 *
 * Displays horizontal scrollable filter pills for visitor status filtering.
 * Shows count badges for each status category.
 */
export function StatusFilterPills({
  selectedFilter,
  counts,
  onFilterChange,
  disabled,
}: StatusFilterPillsProps): React.ReactElement {
  const containerRef = useRef<HTMLDivElement>(null);

  // Handle keyboard navigation
  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLButtonElement>,
    filter: StatusFilter,
    index: number
  ) => {
    if (disabled) return;

    const pills = containerRef.current?.querySelectorAll('[role="tab"]');
    if (!pills) return;

    let targetIndex = index;

    switch (e.key) {
      case 'ArrowLeft':
        e.preventDefault();
        targetIndex = index > 0 ? index - 1 : pills.length - 1;
        (pills[targetIndex] as HTMLElement).focus();
        return;
      case 'ArrowRight':
        e.preventDefault();
        targetIndex = index < pills.length - 1 ? index + 1 : 0;
        (pills[targetIndex] as HTMLElement).focus();
        return;
      case 'Enter':
      case ' ':
        e.preventDefault();
        onFilterChange(filter);
        return;
      default:
        return;
    }
  };

  return (
    <nav
      ref={containerRef}
      role="tablist"
      aria-label="Visitor status filters"
      className={cn(
        'flex gap-2 md:gap-3 overflow-x-auto overflow-y-hidden',
        'snap-x snap-mandatory md:snap-none',
        'pb-2 mb-4',
        // Hide scrollbar
        '[&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]'
      )}
    >
      {STATUS_FILTER_CONFIGS.map((config, index) => {
        const count = getCountForFilter(config.id, counts);
        const isSelected = selectedFilter === config.id;
        const isLoading = counts === null;

        return (
          <button
            key={config.id}
            role="tab"
            type="button"
            aria-label={`${config.label} (${count} visitors)`}
            aria-selected={isSelected}
            aria-disabled={disabled}
            data-testid={`filter-pill-${config.id.toLowerCase()}`}
            tabIndex={isSelected ? 0 : -1}
            disabled={disabled}
            className={cn(
              getPillClasses(config.color, isSelected, disabled),
              'snap-start',
              'flex items-center gap-2 justify-center',
              'relative',
              'focus:outline-none focus:ring-2 focus:ring-offset-2',
              config.color === 'blue' && 'focus:ring-blue-500',
              config.color === 'emerald' && 'focus:ring-emerald-500',
              config.color === 'purple' && 'focus:ring-purple-500',
              config.color === 'gray' && 'focus:ring-gray-500'
            )}
            onClick={() => !disabled && onFilterChange(config.id)}
            onKeyDown={(e) => handleKeyDown(e, config.id, index)}
          >
            <span className="whitespace-nowrap">{config.label}</span>

            {/* Count Badge */}
            {!isLoading && count > 0 && (
              <Badge
                variant="secondary"
                className={cn(
                  'h-5 w-5 md:h-6 md:w-6 p-0 flex items-center justify-center text-xs rounded-full',
                  isSelected
                    ? 'bg-white/20 text-white border-white/30'
                    : 'bg-gray-100 text-gray-700 border-gray-200'
                )}
                data-testid={`filter-count-${config.id.toLowerCase()}`}
              >
                {count}
              </Badge>
            )}
          </button>
        );
      })}
    </nav>
  );
}
