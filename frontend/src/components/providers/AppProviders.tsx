'use client';

import { SWRConfig } from 'swr';
import { DemoRoleProvider } from '@/contexts/DemoRoleContext';
import { GlobalMutationLoader } from '@/components/GlobalMutationLoader';
import { PublicRoutePrefetcher } from '@/components/navigation/RoleRoutePrefetcher';
import { defaultSwrConfig } from '@/lib/swr-config';

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <SWRConfig value={defaultSwrConfig}>
      <DemoRoleProvider>
        <PublicRoutePrefetcher />
        {children}
        <GlobalMutationLoader />
      </DemoRoleProvider>
    </SWRConfig>
  );
}
