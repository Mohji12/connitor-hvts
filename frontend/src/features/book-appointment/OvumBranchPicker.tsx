'use client';

import * as React from 'react';
import Link from 'next/link';
import { MapPin, ChevronRight } from 'lucide-react';
import { AppointmentService, type PublicHospital } from '@/lib/services/appointmentService';
import { OvumHospitalLogo } from '@/components/brand/OvumHospitalLogo';
import { OVUM_CHAIN_DISPLAY_NAME, OVUM_CHAIN_ID } from '@/lib/constants/ovum';
import { ConnitorLoader } from '@/components/ConnitorLoader';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

function locationLabel(name: string): string {
  const parts = name.split('—');
  if (parts.length > 1) return parts[parts.length - 1].trim();
  return name;
}

export function OvumBranchPicker() {
  const [branches, setBranches] = React.useState<PublicHospital[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    setLoading(true);
    setError(null);
    AppointmentService.listPublicHospitals({ hospitalChainId: OVUM_CHAIN_ID })
      .then((list) => {
        setBranches(list);
        if (!list.length) {
          setError(
            'No Ovum centres are available for online booking yet. Run the Ovum seed on the backend database.',
          );
        }
      })
      .catch(() => {
        setError('Could not load Ovum centres. Check that the backend is running and reachable.');
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <OvumHospitalLogo size="lg" />
        <p className="text-sm text-muted-foreground">
          Choose a Bengaluru centre to book an appointment at {OVUM_CHAIN_DISPLAY_NAME}.
        </p>
      </div>

      {loading && <ConnitorLoader variant="section" message="Loading centres…" className="py-12" />}

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
                  <Button asChild className="shrink-0 bg-secondary text-secondary-foreground">
                    <Link href={`/book-appointment/?branchId=${branch.id}`}>
                      Book here <ChevronRight className="ml-1 h-4 w-4" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}

      <p className="text-center text-sm">
        <Link href="/book-appointment/" className="text-primary underline-offset-4 hover:underline">
          Book at another hospital
        </Link>
      </p>
    </div>
  );
}
