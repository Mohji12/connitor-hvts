'use client';

import dynamic from 'next/dynamic';

const PreRegistrationWizard = dynamic(
  () =>
    import('@/features/visitor-pre-registration/wizard/PreRegistrationWizard').then(
      (mod) => mod.PreRegistrationWizard,
    ),
  {
    ssr: false,
    loading: () => (
      <p className="py-16 text-center text-muted-foreground">Loading registration form…</p>
    ),
  },
);

export function PreRegistrationWizardLoader() {
  return <PreRegistrationWizard />;
}
