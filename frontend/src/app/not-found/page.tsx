'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getDemoHomePath, IS_DEMO_MODE } from '@/lib/demo-config';
import { useDemoRole } from '@/contexts/DemoRoleContext';

export default function NotFoundRoutePage() {
  const router = useRouter();
  const { demoUser } = useDemoRole();

  useEffect(() => {
    if (IS_DEMO_MODE) {
      router.replace(getDemoHomePath(demoUser.role));
    }
  }, [router, demoUser.role]);

  if (IS_DEMO_MODE) {
    return null;
  }

  return (
    <div className="h-screen flex flex-col items-center justify-center gap-4">
      <h1 className="text-4xl font-bold">404 - Page Not Found</h1>
      <p className="text-gray-500">
        You are not authorized to access this page.
      </p>
      <Link href="/dashboard" className="text-blue-600 hover:underline">
        Go to dashboard
      </Link>
    </div>
  );
}
