'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { ConnitorLoader } from '@/components/ConnitorLoader';
import { MeetingRoom } from '@/features/meetings/MeetingRoom';

function MeetContent() {
  const params = useSearchParams();
  return <MeetingRoom joinToken={params.get('t')} />;
}

export default function MeetPage() {
  return (
    <Suspense fallback={<ConnitorLoader variant="fullscreen" message="Loading consultation…" />}>
      <MeetContent />
    </Suspense>
  );
}
