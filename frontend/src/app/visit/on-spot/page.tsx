'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ConninterWordmark } from '@/components/brand/ConninterWordmark';
import { OnSpotVisitFlow } from '@/features/on-spot-visit/OnSpotVisitFlow';

function OnSpotContent() {
  const params = useSearchParams();
  const branchId = params.get('branchId');
  const branchName = params.get('name');

  if (!branchId) {
    return (
      <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-6 text-center text-sm">
        <p className="font-medium text-destructive">Invalid link</p>
        <p className="mt-2 text-muted-foreground">
          Scan the QR code at the hospital security desk to start your visit.
        </p>
        <Link href="/" className="mt-4 inline-block text-primary underline">
          Go home
        </Link>
      </div>
    );
  }

  return <OnSpotVisitFlow branchId={branchId} branchNameFromQuery={branchName} />;
}

export default function OnSpotVisitPage() {
  return (
    <div className="min-h-screen bg-[#F7F9FC]">
      <header className="border-b border-[#001B71]/08 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-lg items-center justify-between px-4 py-4">
          <ConninterWordmark size="sm" />
          <span className="text-xs text-muted-foreground">On-spot visit</span>
        </div>
      </header>
      <main className="mx-auto max-w-lg px-4 py-8">
        <Suspense
          fallback={
            <p className="text-center text-muted-foreground py-12">Loading…</p>
          }
        >
          <OnSpotContent />
        </Suspense>
      </main>
    </div>
  );
}
