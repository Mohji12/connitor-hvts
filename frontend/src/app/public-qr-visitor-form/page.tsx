'use client';

import { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Skeleton } from '@/components/ui/skeleton';

function LegacyQrRedirect() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const branchId = searchParams.get('branchId');
    if (branchId) {
      const params = new URLSearchParams({ branchId });
      const name = searchParams.get('name');
      if (name) params.set('name', name);
      router.replace(`/visit/on-spot?${params.toString()}`);
    }
  }, [router, searchParams]);

  const branchId = searchParams.get('branchId');
  if (branchId) {
    return (
      <div className="min-h-screen bg-muted/40 p-4 flex items-center justify-center">
        <p className="text-sm text-muted-foreground">Redirecting to visit booking…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/40 p-4 flex items-center justify-center">
      <div className="max-w-md text-center space-y-4 p-6">
        <p className="font-medium">This form has moved</p>
        <p className="text-sm text-muted-foreground">
          Scan the QR code at the hospital security desk to book a doctor appointment, or use the
          visitor portal online.
        </p>
        <a href="/visit/on-spot" className="text-teal-700 underline text-sm">
          Open on-spot visit page
        </a>
      </div>
    </div>
  );
}

export default function PublicQRVisitorPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-muted/40 p-4 flex items-center justify-center">
          <div className="w-full max-w-2xl mx-auto">
            <div className="bg-white rounded-lg shadow-lg p-6 space-y-4">
              <Skeleton className="h-12 w-12 mx-auto" />
              <Skeleton className="h-8 w-3/4 mx-auto" />
              <Skeleton className="h-4 w-1/2 mx-auto" />
            </div>
          </div>
        </div>
      }
    >
      <LegacyQrRedirect />
    </Suspense>
  );
}
