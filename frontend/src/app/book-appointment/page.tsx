'use client';

import * as React from 'react';
import { Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { BookAppointmentWizard } from '@/features/book-appointment/BookAppointmentWizard';
import { ConnitorLoader } from '@/components/ConnitorLoader';
import { AppointmentService } from '@/lib/services/appointmentService';
import { branchSlug } from '@/lib/branch-slug';

type ResolvedBranch =
  | { status: 'loading' }
  | { status: 'found'; id: string; name: string }
  | { status: 'not-found' };

function useBranchFromSlug(slug: string | undefined): ResolvedBranch | null {
  const [resolved, setResolved] = React.useState<ResolvedBranch | null>(
    slug ? { status: 'loading' } : null,
  );

  React.useEffect(() => {
    if (!slug) {
      setResolved(null);
      return;
    }
    let cancelled = false;
    setResolved({ status: 'loading' });
    AppointmentService.listPublicHospitals()
      .then((list) => {
        if (cancelled) return;
        const match = list.find((h) => branchSlug(h.name) === slug.toLowerCase());
        setResolved(match ? { status: 'found', id: match.id, name: match.name } : { status: 'not-found' });
      })
      .catch(() => {
        if (!cancelled) setResolved({ status: 'not-found' });
      });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  return resolved;
}

function BookAppointmentContent() {
  const searchParams = useSearchParams();
  const branchId = searchParams.get('branchId') ?? undefined;
  const branchName = searchParams.get('branchName') ?? undefined;
  const slug = branchId ? undefined : (searchParams.get('branch') ?? undefined);
  const resolved = useBranchFromSlug(slug);

  if (resolved?.status === 'loading') {
    return <ConnitorLoader variant="section" message="Loading hospital…" className="py-12" />;
  }

  if (resolved?.status === 'not-found') {
    return (
      <div className="mx-auto max-w-lg space-y-3 rounded-lg border bg-white p-6 text-center">
        <p className="font-semibold text-foreground">Hospital not found</p>
        <p className="text-sm text-muted-foreground">
          This booking link doesn&apos;t match any hospital. Please choose a hospital to continue.
        </p>
        <Link
          href="/book-appointment/"
          className="inline-block text-sm text-primary underline-offset-4 hover:underline"
        >
          Choose a hospital
        </Link>
      </div>
    );
  }

  if (resolved?.status === 'found') {
    return (
      <BookAppointmentWizard
        key={resolved.id}
        initialBranchId={resolved.id}
        initialBranchName={resolved.name}
      />
    );
  }

  return (
    <BookAppointmentWizard
      initialBranchId={branchId}
      initialBranchName={branchName ?? undefined}
    />
  );
}

export default function BookAppointmentPage() {
  return (
    <div className="pt-safe min-h-screen bg-[#F7F9FC] p-4 md:p-8">
      <div className="mx-auto max-w-4xl">
        <Suspense fallback={<div className="py-12 text-center text-muted-foreground">Loading…</div>}>
          <BookAppointmentContent />
        </Suspense>
      </div>
    </div>
  );
}
