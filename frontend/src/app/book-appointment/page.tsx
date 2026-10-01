'use client';

import * as React from 'react';
import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { BookAppointmentWizard } from '@/features/book-appointment/BookAppointmentWizard';

function BookAppointmentContent() {
  const searchParams = useSearchParams();
  const branchId = searchParams.get('branchId') ?? undefined;
  const branchName = searchParams.get('branchName') ?? undefined;

  return (
    <BookAppointmentWizard
      initialBranchId={branchId}
      initialBranchName={branchName ?? undefined}
    />
  );
}

export default function BookAppointmentPage() {
  return (
    <div className="min-h-screen bg-[#F7F9FC] p-4 md:p-8">
      <div className="mx-auto max-w-lg">
        <Suspense fallback={<div className="py-12 text-center text-muted-foreground">Loading…</div>}>
          <BookAppointmentContent />
        </Suspense>
      </div>
    </div>
  );
}
