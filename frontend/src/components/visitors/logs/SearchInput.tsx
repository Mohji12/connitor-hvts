'use client';

import * as React from 'react';
import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

/**
 * SearchInput Component
 *
 * Reusable search input with clear button.
 * Handles basic search input UI - debouncing is managed by parent.
 */
export function SearchInput({
  value,
  onChange,
  placeholder = 'Search visitors...',
  disabled = false,
  className,
}: SearchInputProps): React.ReactElement {
  const inputRef = React.useRef<HTMLInputElement>(null);

  const handleClear = () => {
    onChange('');
    inputRef.current?.focus();
  };

  return (
    <div
      role="search"
      className={cn('relative w-full', className)}
      data-testid="search-input-container"
    >
      <div className="relative">
        <Search
          className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          size={16}
          aria-hidden="true"
        />
        <Input
          ref={inputRef}
          type="search"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          aria-label="Search visitors"
          aria-describedby={value ? 'search-clear-button' : undefined}
          className="pl-9 pr-9"
          data-testid="search-input"
        />
        {value && !disabled && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={handleClear}
            disabled={disabled}
            aria-label="Clear search"
            id="search-clear-button"
            className="absolute right-1 top-1/2 -translate-y-1/2 h-11 w-11 min-h-[44px] min-w-[44px]"
            data-testid="search-clear-button"
          >
            <X size={16} />
          </Button>
        )}
      </div>
    </div>
  );
}
