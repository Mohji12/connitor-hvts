'use client';

import MyVisitors from '@/components/myVisitors/MyVisitors';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthSession } from '@/hooks/useAuthSession';
import { getDashboardPathForRole } from '@/lib/auth-routing';
import type { User } from '@/lib/schema/schema';

export default function StaffPage() {
  const user = useAuthSession<User>();
  const router = useRouter();

  useEffect(() => {
    if (user && user.role !== 'STAFF') {
      router.replace(getDashboardPathForRole(user.role));
    }
  }, [user, router]);

  if (!user || user.role !== 'STAFF') return null;

  return <MyVisitors user={user} />;
}
