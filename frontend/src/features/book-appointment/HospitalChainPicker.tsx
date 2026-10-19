'use client';

import * as React from 'react';
import Image from 'next/image';
import { ChevronRight, Building2 } from 'lucide-react';
import { AppointmentService, type PublicHospital } from '@/lib/services/appointmentService';
import {
  PARTNER_HOSPITALS,
  fallbackChainDisplayName,
  partnerHospitalByChainId,
  type PartnerHospital,
} from '@/lib/constants/partner-hospitals';
import { ConnitorLoader } from '@/components/ConnitorLoader';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export type HospitalChainOption = {
  chainId: string;
  name: string;
  city: string;
  logoSrc?: string;
  branchCount: number;
  partner?: PartnerHospital;
};

function buildChainOptions(branches: PublicHospital[]): HospitalChainOption[] {
  const byChain = new Map<string, PublicHospital[]>();
  for (const branch of branches) {
    const list = byChain.get(branch.hospitalChainId) ?? [];
    list.push(branch);
    byChain.set(branch.hospitalChainId, list);
  }

  const options: HospitalChainOption[] = [];
  // Prefer known partners in catalog order, then any other seeded chains.
  const seen = new Set<string>();
  for (const partner of PARTNER_HOSPITALS) {
    const list = byChain.get(partner.chainId);
    if (!list?.length) continue;
    seen.add(partner.chainId);
    options.push({
      chainId: partner.chainId,
      name: partner.name,
      city: partner.city,
      logoSrc: partner.logoSrc,
      branchCount: list.length,
      partner,
    });
  }
  for (const [chainId, list] of byChain) {
    if (seen.has(chainId)) continue;
    const known = partnerHospitalByChainId(chainId);
    options.push({
      chainId,
      name: known?.name ?? fallbackChainDisplayName(list.map((b) => b.name)),
      city: known?.city ?? list[0]?.city ?? '',
      logoSrc: known?.logoSrc,
      branchCount: list.length,
      partner: known,
    });
  }
  return options;
}

export type HospitalChainPickerProps = {
  onSelectChain: (option: HospitalChainOption) => void;
  /** When set, only these chain ids are offered (still requires bookable branches). */
  hospitals?: PublicHospital[];
};

export function HospitalChainPicker({ onSelectChain, hospitals: preloaded }: HospitalChainPickerProps) {
  const [hospitals, setHospitals] = React.useState<PublicHospital[]>(preloaded ?? []);
  const [loading, setLoading] = React.useState(!preloaded);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (preloaded) {
      setHospitals(preloaded);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    AppointmentService.listPublicHospitals()
      .then((list) => {
        setHospitals(list);
        if (!list.length) {
          setError(
            'No hospitals are available for online booking yet. Ensure the backend is running and booking data is seeded.',
          );
        }
      })
      .catch(() =>
        setError(
          'Failed to load hospitals. Check your connection and try again. If this persists, the booking API may be unreachable.',
        ),
      )
      .finally(() => setLoading(false));
  }, [preloaded]);

  const chains = React.useMemo(() => buildChainOptions(hospitals), [hospitals]);

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold text-foreground">Choose a hospital</h2>
        <p className="text-sm text-muted-foreground">
          Select a partner hospital to see its centres and continue booking.
        </p>
      </div>

      {loading && <ConnitorLoader variant="section" message="Loading hospitals…" className="min-h-[50vh]" />}

      {!loading && error && (
        <p className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          {error}
        </p>
      )}

      {!loading && !error && chains.length === 0 && (
        <p className="text-sm text-muted-foreground">No hospitals available for booking.</p>
      )}

      <ul className="space-y-3">
        {chains.map((chain) => (
          <li key={chain.chainId}>
            <Card className="overflow-hidden transition-shadow hover:shadow-md">
              <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 items-center gap-3">
                  {chain.logoSrc ? (
                    <div className="relative h-12 w-28 shrink-0">
                      <Image
                        src={chain.logoSrc}
                        alt={chain.name}
                        fill
                        className="object-contain object-left"
                        sizes="112px"
                      />
                    </div>
                  ) : (
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <Building2 className="h-6 w-6" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="font-semibold text-foreground">{chain.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {chain.city}
                      {chain.branchCount > 0
                        ? ` · ${chain.branchCount} centre${chain.branchCount === 1 ? '' : 's'}`
                        : ''}
                    </p>
                  </div>
                </div>
                <Button
                  type="button"
                  className="shrink-0 bg-secondary text-secondary-foreground"
                  onClick={() => onSelectChain(chain)}
                >
                  Select <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          </li>
        ))}
      </ul>
    </div>
  );
}
