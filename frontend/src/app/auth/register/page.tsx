'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AuthRegistrationForm } from '@/components/auth/AuthRegistrationForm';
import { AuthPageShell } from '@/components/auth/AuthPageShell';
import { getDemoHomePath, IS_DEMO_MODE } from '@/lib/demo-config';
import { useDemoRole } from '@/contexts/DemoRoleContext';

export default function RegisterPage() {
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
    <AuthPageShell>
      <AuthRegistrationForm />
    </AuthPageShell>
  );
}
