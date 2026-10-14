'use client';

import { DemoRoleProvider } from '@/contexts/DemoRoleContext';
import { GlobalMutationLoader } from '@/components/GlobalMutationLoader';
import { PublicRoutePrefetcher } from '@/components/navigation/RoleRoutePrefetcher';
import { NativeBackBar } from '@/components/mobile/NativeBackBar';

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <DemoRoleProvider>
      <PublicRoutePrefetcher />
      <NativeBackBar />
      {children}
      <GlobalMutationLoader />
    </DemoRoleProvider>
  );
}
