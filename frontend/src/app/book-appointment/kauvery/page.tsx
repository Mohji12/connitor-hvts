'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ConnitorLoader } from '@/components/ConnitorLoader';

/** Legacy deep link — shared booking flow with Kauvery pre-selected. */
export default function KauveryBookAppointmentPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/book-appointment/?chain=kauvery');
  }, [router]);

  return (
    <ConnitorLoader variant="section" message="Opening Kauvery booking…" className="min-h-[70vh]" />
  );
}
