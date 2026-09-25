'use client';

import { Suspense } from 'react';
import { AuthPasswordLoginForm } from '@/components/auth/AuthPasswordLoginForm';
import { AuthPageShell } from '@/components/auth/AuthPageShell';

export default function LoginPage() {
  return (
    <AuthPageShell>
      <Suspense fallback={null}>
        <AuthPasswordLoginForm />
      </Suspense>
    </AuthPageShell>
  );
}
