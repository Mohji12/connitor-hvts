'use client';

import * as React from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Search,
  X,
  Building2,
  Mail,
  Clock,
  AlertCircle,
  Loader2,
  UserPlus,
  ExternalLink,
} from 'lucide-react';
import {
  searchVisitors,
  SearchVisitorsResponse,
  VisitorSearchData,
  ApiError,
} from '@/lib/api/visitors-api';

export interface PhoneLookupFlowProps {
  /** Branch ID for the search operation */
  branchId: string;
  /** Callback when visitor is found and selected */
  onVisitorFound: (visitor: VisitorSearchData) => void;
  /** Callback when user wants to go back */
  onBack: () => void;
  /** Additional CSS classes */
  className?: string;
}

type LookupState = 'idle' | 'loading' | 'found' | 'not_found' | 'error';

interface PhoneLookupFlowState {
  phoneValue: string;
  lookupState: LookupState;
  validationError?: string;
  visitorData: VisitorSearchData | null;
  apiError?: ApiError;
}

/**
 * PhoneLookupFlow - Component for searching visitors by phone number
 *
 * Features:
 * - Phone input with validation (10 digits)
 * - Search API integration
 * - Visitor found/not found states
 * - Accessibility with ARIA attributes and screen reader support
 * - Keyboard navigation (Enter to search, Escape to back)
 */
export function PhoneLookupFlow({
  branchId,
  onVisitorFound,
  onBack,
  className,
}: PhoneLookupFlowProps): React.ReactElement {
  const [state, setState] = React.useState<PhoneLookupFlowState>({
    phoneValue: '',
    lookupState: 'idle',
    visitorData: null,
  });

  const phoneInputRef = React.useRef<HTMLInputElement>(null);
  const errorAlertRef = React.useRef<HTMLDivElement>(null);
  const visitorCardRef = React.useRef<HTMLDivElement>(null);

  // Focus phone input on mount
  React.useEffect(() => {
    if (state.lookupState === 'idle') {
      const timer = setTimeout(() => {
        phoneInputRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [state.lookupState]);

  // Focus error alert when error occurs
  React.useEffect(() => {
    if (state.lookupState === 'error' && state.apiError) {
      const timer = setTimeout(() => {
        errorAlertRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [state.lookupState, state.apiError]);

  // Focus visitor card when found
  React.useEffect(() => {
    if (state.lookupState === 'found' && state.visitorData) {
      const timer = setTimeout(() => {
        visitorCardRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [state.lookupState, state.visitorData]);

  /**
   * Announces status to screen readers
   */
  const announceStatus = React.useCallback((message: string): void => {
    const announcement = document.createElement('div');
    announcement.setAttribute('role', 'status');
    announcement.setAttribute('aria-live', 'polite');
    announcement.setAttribute('aria-atomic', 'true');
    announcement.className = 'sr-only';
    announcement.textContent = message;
    document.body.appendChild(announcement);
    setTimeout(() => {
      document.body.removeChild(announcement);
    }, 1000);
  }, []);

  /**
   * Handles phone input changes with validation
   */
  const handlePhoneChange = React.useCallback((value: string): void => {
    // Remove non-digit characters
    const cleaned = value.replace(/\D/g, '');
    // Limit to 10 digits
    const limited = cleaned.slice(0, 10);

    setState((prev) => ({
      ...prev,
      phoneValue: limited,
      validationError: undefined,
      lookupState: limited.length === 10 ? 'idle' : 'idle',
    }));
  }, []);

  /**
   * Handles lookup button click or Enter key
   */
  const handleLookup = React.useCallback(async (): Promise<void> => {
    if (state.phoneValue.length !== 10) {
      setState((prev) => ({
        ...prev,
        validationError: 'Please enter a valid 10-digit phone number',
      }));
      return;
    }

    setState((prev) => ({
      ...prev,
      lookupState: 'loading',
      apiError: undefined,
    }));

    try {
      const response: SearchVisitorsResponse = await searchVisitors({
        phone: state.phoneValue,
        branchId,
      });

      if (response.found && response.visitor) {
        setState((prev) => ({
          ...prev,
          visitorData: response.visitor!,
          lookupState: 'found',
        }));
        announceStatus('Visitor found.');
      } else {
        setState((prev) => ({
          ...prev,
          visitorData: null,
          lookupState: 'not_found',
        }));
        announceStatus('Visitor not found.');
      }
    } catch (error) {
      setState((prev) => ({
        ...prev,
        apiError: error as ApiError,
        lookupState: 'error',
      }));
      announceStatus('Search failed. Please try again.');
    }
  }, [state.phoneValue, branchId, announceStatus]);

  /**
   * Handles visitor selection
   */
  const handleSelectVisitor = React.useCallback((): void => {
    if (state.visitorData) {
      onVisitorFound(state.visitorData);
    }
  }, [state.visitorData, onVisitorFound]);

  /**
   * Handles search another - resets to initial state
   */
  const handleSearchAnother = React.useCallback((): void => {
    setState({
      phoneValue: '',
      lookupState: 'idle',
      visitorData: null,
    });
    // Focus phone input
    setTimeout(() => {
      phoneInputRef.current?.focus();
    }, 100);
  }, []);

  /**
   * Handles keyboard events
   */
  const handleKeyDown = React.useCallback(
    (event: React.KeyboardEvent): void => {
      if (event.key === 'Enter' && state.phoneValue.length === 10 && state.lookupState !== 'loading') {
        void handleLookup();
      } else if (event.key === 'Escape') {
        onBack();
      }
    },
    [state.phoneValue.length, state.lookupState, handleLookup, onBack],
  );

  const isLookupDisabled = state.phoneValue.length !== 10 || state.lookupState === 'loading';

  return (
    <div className={cn('space-y-6', className)}>
      {/* Screen reader announcements */}
      <div
        className="sr-only"
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        {state.lookupState === 'loading' && 'Searching...'}
        {state.lookupState === 'found' && 'Visitor found.'}
        {state.lookupState === 'not_found' && 'Visitor not found.'}
        {state.lookupState === 'error' && 'Search failed. Please try again.'}
      </div>

      {state.lookupState === 'found' && state.visitorData ? (
        <VisitorFoundDisplay
          ref={visitorCardRef}
          visitor={state.visitorData}
          branchId={branchId}
          onSelect={handleSelectVisitor}
          onSearchAnother={handleSearchAnother}
        />
      ) : state.lookupState === 'not_found' ? (
        <VisitorNotFoundDisplay
          phone={state.phoneValue}
          branchId={branchId}
          onSearchAnother={handleSearchAnother}
        />
      ) : (
        // Phone input form
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Quick Check-In</CardTitle>
            <p className="text-sm text-gray-500">
              Enter visitor phone number to search
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label
                htmlFor="phone-input"
                className="block text-sm font-medium text-gray-700"
              >
                Visitor Phone
              </label>
              <div className="flex">
                <span className="inline-flex items-center px-3 text-sm text-gray-900 bg-gray-200 border border-r-0 border-gray-300 rounded-l-md">
                  +91
                </span>
                <Input
                  id="phone-input"
                  ref={phoneInputRef}
                  type="tel"
                  placeholder="Enter 10-digit number"
                  value={state.phoneValue}
                  onChange={(e) => handlePhoneChange(e.target.value)}
                  onKeyDown={handleKeyDown}
                  maxLength={10}
                  className={cn(
                    'rounded-l-none',
                    state.validationError && 'border-red-500 focus:ring-red-200',
                  )}
                  aria-label="Visitor phone number"
                  aria-describedby={state.validationError ? 'phone-error' : undefined}
                  aria-invalid={!!state.validationError}
                  data-testid="phone-input"
                />
              </div>
              {state.validationError && (
                <p
                  id="phone-error"
                  className="text-sm text-red-600"
                  role="alert"
                  aria-live="polite"
                >
                  {state.validationError}
                </p>
              )}
            </div>

            {state.lookupState === 'error' && state.apiError && (
              <Alert
                ref={errorAlertRef}
                variant="destructive"
                role="alert"
                aria-live="assertive"
                tabIndex={-1}
              >
                <AlertCircle className="h-4 w-4" aria-hidden="true" />
                <AlertDescription>
                  {state.apiError.message}
                </AlertDescription>
              </Alert>
            )}

            <div className="flex gap-3">
              <Button
                className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                onClick={() => void handleLookup()}
                disabled={isLookupDisabled}
                aria-label="Search visitor"
                aria-busy={state.lookupState === 'loading'}
                data-testid="lookup-button"
              >
                {state.lookupState === 'loading' ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" aria-hidden="true" />
                    Searching...
                  </>
                ) : (
                  <>
                    <Search className="h-4 w-4 mr-2" aria-hidden="true" />
                    Check Visitor
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                onClick={onBack}
                aria-label="Back to OTP verification"
                data-testid="back-button"
              >
                <X className="h-4 w-4" aria-hidden="true" />
                Back
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

/**
 * Sub-component for displaying found visitor
 */
interface VisitorFoundDisplayProps {
  visitor: VisitorSearchData;
  branchId: string;
  onSelect: () => void;
  onSearchAnother: () => void;
}

const VisitorFoundDisplay = React.forwardRef<HTMLDivElement, VisitorFoundDisplayProps>(
  ({ visitor, branchId, onSelect, onSearchAnother }, ref) => {
    const initials = `${visitor.firstName.charAt(0)}${visitor.lastName.charAt(0)}`.toUpperCase();

    return (
      <Card ref={ref} tabIndex={-1}>
        <CardHeader>
          <CardTitle className="text-lg">Visitor Found</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16 border-2 border-emerald-100">
              {visitor.photo ? (
                <AvatarImage
                  src={visitor.photo}
                  alt={`${visitor.firstName} ${visitor.lastName}`}
                  className="object-cover"
                />
              ) : null}
              <AvatarFallback className="bg-emerald-100 text-emerald-700 text-lg font-semibold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-semibold text-gray-900 truncate">
                {visitor.firstName} {visitor.lastName}
              </h3>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline" className="text-xs">
                  {visitor.phone}
                </Badge>
              </div>
            </div>
          </div>

          <div className="grid gap-2 text-sm">
            {visitor.email && (
              <div className="flex items-center gap-2 text-gray-600">
                <Mail className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
                <span className="truncate">{visitor.email}</span>
              </div>
            )}
            {visitor.company && (
              <div className="flex items-center gap-2 text-gray-600">
                <Building2 className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
                <span>{visitor.company}</span>
              </div>
            )}
            {visitor.lastVisit && (
              <div className="flex items-center gap-2 text-gray-600">
                <Clock className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
                <span>Last visit: {new Date(visitor.lastVisit.visitDate).toLocaleDateString()}</span>
                <Badge variant="secondary" className="text-xs">
                  {visitor.lastVisit.status}
                </Badge>
              </div>
            )}
          </div>

          <div className="flex gap-3">
            <Button
              className="flex-1 bg-emerald-600 hover:bg-emerald-700"
              onClick={onSelect}
              aria-label="Select this visitor"
              data-testid="select-visitor-button"
            >
              Select
            </Button>
            <Button
              variant="outline"
              className="flex-1"
              onClick={onSearchAnother}
              aria-label="Search for another visitor"
              data-testid="search-another-button"
            >
              Search Another
            </Button>
          </div>

          <div className="mt-3 pt-3 border-t">
            <Link
              href={`/visitor-registration?branchId=${branchId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-blue-600 hover:text-blue-800 flex items-center justify-center gap-1"
              aria-label="Register a new visit for this visitor (opens in new tab)"
            >
              Register New Visit
              <ExternalLink className="h-3 w-3" aria-hidden="true" />
            </Link>
          </div>
        </CardContent>
      </Card>
    );
  },
);

VisitorFoundDisplay.displayName = 'VisitorFoundDisplay';

/**
 * Sub-component for displaying visitor not found
 */
interface VisitorNotFoundDisplayProps {
  phone: string;
  branchId: string;
  onSearchAnother: () => void;
}

function VisitorNotFoundDisplay({
  phone,
  branchId,
  onSearchAnother,
}: VisitorNotFoundDisplayProps): React.ReactElement {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Visitor Not Found</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-center space-y-2">
          <AlertCircle className="h-12 w-12 text-amber-500 mx-auto" aria-hidden="true" />
          <p className="text-gray-600">
            We couldn&apos;t find a visitor with phone number <strong>+91 {phone}</strong>.
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <Link
            href={`/visit/on-spot?branchId=${branchId}`}
            className="flex-1 inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all bg-emerald-600 hover:bg-emerald-700 text-white h-10 px-4 py-2"
            aria-label="Register as new visitor (opens in new tab)"
            data-testid="register-new-button"
          >
            <UserPlus className="h-4 w-4" aria-hidden="true" />
            Register as new visitor
          </Link>
          <Button
            variant="outline"
            className="flex-1"
            onClick={onSearchAnother}
            aria-label="Search for another visitor"
            data-testid="search-another-not-found-button"
          >
            Search Another
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}