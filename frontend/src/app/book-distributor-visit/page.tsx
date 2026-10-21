'use client';

import type { ReactElement } from 'react';
import { VisitorPortalShell } from '@/components/auth/VisitorPortalShell';
import { BookDistributorVisitWizard } from '@/features/book-distributor-visit/BookDistributorVisitWizard';

export default function BookDistributorVisitPage(): ReactElement {
  return (
    <VisitorPortalShell>
      <BookDistributorVisitWizard />
    </VisitorPortalShell>
  );
}
