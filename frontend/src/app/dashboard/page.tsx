'use client';

import DashboardClient, { User } from './DashboardClient';
import { ConnitorLoader } from '@/components/ConnitorLoader';
import { useAuthSession } from '@/hooks/useAuthSession';

export default function DashboardPage() {
  const user = useAuthSession<User>();

  if (!user) {
    return (
      <ConnitorLoader
        variant="section"
        message="Loading dashboard…"
        className="min-h-[50vh] py-16"
      />
    );
  }

  return <DashboardClient user={user} />;
}
