'use client';

import * as React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { MapPin, ChevronRight, ChevronLeft } from 'lucide-react';
import { AppointmentService, type PublicHospital } from '@/lib/services/appointmentService';
import { ConnitorLoader } from '@/components/ConnitorLoader';
import { branchSlug } from '@/lib/branch-slug';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ConninterWordmark } from '@/components/brand/ConninterWordmark';
import { cn } from '@/lib/utils';

function locationLabel(name: string): string {
  const parts = name.split('—');
  if (parts.length > 1) return parts[parts.length - 1].trim();
  return name;
}

export type ChainBranchPickerProps = {
  chainId: string;
  displayName: string;
  logoSrc?: string;
  /** Extra classes for the Book here button */
  bookButtonClassName?: string;
  /** Called instead of navigating when provided (in-wizard use). */
  onSelectBranch?: (branch: PublicHospital) => void;
  /** Optional back control (e.g. change hospital). */
  onBack?: () => void;
  backLabel?: string;
};

export function ChainBranchPicker({
  chainId,
  displayName,
  logoSrc,
  bookButtonClassName,
  onSelectBranch,
  onBack,
  backLabel = 'Change hospital',
}: ChainBranchPickerProps) {
  const [branches, setBranches] = React.useState<PublicHospital[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    setLoading(true);
    setError(null);
    AppointmentService.listPublicHospitals({ hospitalChainId: chainId })
      .then((list) => {
        setBranches(list);
        if (!list.length) {
          setError(
            `No ${displayName} centres are available for online booking yet. Run the hospital seed on the backend database.`,
          );
        }
      })
      .catch(() => {
        setError(`Could not load ${displayName} centres. Check that the backend is running and reachable.`);
      })
      .finally(() => setLoading(false));
  }, [chainId, displayName]);

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        {onBack && (
          <Button type="button" variant="ghost" size="sm" className="-ml-2" onClick={onBack}>
            <ChevronLeft className="mr-1 h-4 w-4" /> {backLabel}
          </Button>
        )}
        {logoSrc ? (
          <div className="flex items-center gap-3">
            <div className="relative h-14 w-[14rem]">
              <Image
                src={logoSrc}
                alt={displayName}
                fill
                className="object-contain object-left"
                sizes="224px"
                priority
              />
            </div>
            <span className="h-8 w-px bg-slate-200" aria-hidden />
            <ConninterWordmark href={null} size="sm" />
          </div>
        ) : (
          <h2 className="text-xl font-bold text-foreground">{displayName}</h2>
        )}
        <p className="text-sm text-muted-foreground">
          Choose a centre to book an appointment at {displayName}.
        </p>
      </div>

      {loading && <ConnitorLoader variant="section" message="Loading centres…" className="min-h-[55vh]" />}

      {!loading && error && (
        <p className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          {error}
        </p>
      )}

      {!loading && !error && branches.length > 0 && (
        <ul className="space-y-3">
          {branches.map((branch) => (
            <li key={branch.id}>
              <Card className="overflow-hidden transition-shadow hover:shadow-md">
                <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="font-semibold text-foreground">{locationLabel(branch.name)}</p>
                    <p className="flex items-center gap-1 text-sm text-muted-foreground">
                      <MapPin className="h-3.5 w-3.5 shrink-0" />
                      {branch.city}
                      {branch.state ? `, ${branch.state}` : ''}
                    </p>
                  </div>
                  {onSelectBranch ? (
                    <Button
                      type="button"
                      className={cn('shrink-0 bg-secondary text-secondary-foreground', bookButtonClassName)}
                      onClick={() => onSelectBranch(branch)}
                    >
                      Book here <ChevronRight className="ml-1 h-4 w-4" />
                    </Button>
                  ) : (
                    <Button
                      asChild
                      className={cn('shrink-0 bg-secondary text-secondary-foreground', bookButtonClassName)}
                    >
                      <Link href={`/book-appointment/?branch=${branchSlug(branch.name)}`}>
                        Book here <ChevronRight className="ml-1 h-4 w-4" />
                      </Link>
                    </Button>
                  )}
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
