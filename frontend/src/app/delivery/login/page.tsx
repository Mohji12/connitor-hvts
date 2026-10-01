'use client';

import { Suspense } from 'react';
import { AuthPasswordLoginForm } from '@/components/auth/AuthPasswordLoginForm';
import { AuthPageShell } from '@/components/auth/AuthPageShell';

export default function DeliveryLoginPage() {
  return (
    <AuthPageShell>
      <Suspense fallback={null}>
        <AuthPasswordLoginForm forcedRole="DISTRIBUTOR" />
      </Suspense>
    </AuthPageShell>
  );
}
