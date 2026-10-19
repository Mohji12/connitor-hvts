'use client';

import { DemoRoleProvider } from '@/contexts/DemoRoleContext';
import { GlobalMutationLoader } from '@/components/GlobalMutationLoader';
import { PublicRoutePrefetcher } from '@/components/navigation/RoleRoutePrefetcher';
import { NativeBackBar } from '@/components/mobile/NativeBackBar';
import { NativeMarketingHomeBlock } from '@/components/mobile/NativeMarketingHomeBlock';

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <DemoRoleProvider>
      <PublicRoutePrefetcher />
      <NativeMarketingHomeBlock />
      <NativeBackBar />
      {children}
      <GlobalMutationLoader />
    </DemoRoleProvider>
  );
}
