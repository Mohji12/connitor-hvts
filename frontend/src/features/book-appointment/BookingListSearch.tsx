'use client';

import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

/** Filter kicks in once the visitor has typed this many characters. */
export const BOOKING_SEARCH_MIN_CHARS = 3;

export function filterBySearchName<T>(
  items: T[],
  query: string,
  getName: (item: T) => string,
): T[] {
  const q = query.trim().toLowerCase();
  if (q.length < BOOKING_SEARCH_MIN_CHARS) return items;
  return items.filter((item) => getName(item).toLowerCase().includes(q));
}

type BookingListSearchProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  className?: string;
  disabled?: boolean;
};

export function BookingListSearch({
  value,
  onChange,
  placeholder,
  className,
  disabled,
}: BookingListSearchProps) {
  const typed = value.trim().length;
  const filtering = typed >= BOOKING_SEARCH_MIN_CHARS;

  return (
    <div className={cn('space-y-1.5', className)}>
      <div className="relative">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <Input
          type="search"
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete="off"
          className="h-11 rounded-xl pl-9 max-lg:min-h-12"
          aria-label={placeholder}
        />
      </div>
      {typed > 0 && !filtering && (
        <p className="text-xs text-muted-foreground">
          Type at least {BOOKING_SEARCH_MIN_CHARS} letters to filter the list
        </p>
      )}
      {filtering && (
        <p className="text-xs text-muted-foreground">Showing matches for “{value.trim()}”</p>
      )}
    </div>
  );
}
