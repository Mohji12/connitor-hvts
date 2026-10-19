'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ConnitorLoader } from '@/components/ConnitorLoader';

/** Legacy deep link — shared booking flow with Ovum pre-selected. */
export default function OvumBookAppointmentPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/book-appointment/?chain=ovum');
  }, [router]);

  return <ConnitorLoader variant="section" message="Opening Ovum booking…" className="min-h-[70vh]" />;
}
