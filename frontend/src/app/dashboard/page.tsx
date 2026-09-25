'use client';

import DashboardClient, { User } from './DashboardClient';
import { useAuthSession } from '@/hooks/useAuthSession';

export default function DashboardPage() {
  const user = useAuthSession<User>();

  if (!user) {
    return null;
  }

  return <DashboardClient user={user} />;
}
