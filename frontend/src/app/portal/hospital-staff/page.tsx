'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

/** Legacy / docs URL — hospital staff sign-in is /staff/login */
export default function HospitalStaffPortalRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/staff/login/');
  }, [router]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-[#F7F9FC] p-6 text-center">
      <p className="text-muted-foreground">Redirecting to hospital staff sign-in…</p>
      <Link href="/staff/login/" className="text-sm font-medium text-primary underline-offset-4 hover:underline">
        Open staff login
      </Link>
    </div>
  );
}
