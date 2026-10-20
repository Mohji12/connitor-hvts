'use client';

import { DemoRoleProvider } from '@/contexts/DemoRoleContext';
import { GlobalMutationLoader } from '@/components/GlobalMutationLoader';
import { PublicRoutePrefetcher } from '@/components/navigation/RoleRoutePrefetcher';
import { NativeBackBar } from '@/components/mobile/NativeBackBar';
import { NativeMarketingHomeBlock } from '@/components/mobile/NativeMarketingHomeBlock';
import { NativeSessionTracker } from '@/components/mobile/NativeSessionTracker';
import { NativeShellClass } from '@/components/mobile/NativeShellClass';

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <DemoRoleProvider>
      <NativeShellClass />
      <NativeSessionTracker />
      <PublicRoutePrefetcher />
      <NativeMarketingHomeBlock />
      <NativeBackBar />
      {children}
      <GlobalMutationLoader />
    </DemoRoleProvider>
  );
}
