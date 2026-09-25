/**
 * E2E Test Page for Visit Type Selection Step
 * This page renders the VisitTypeSelectionStep component in isolation
 * for E2E testing purposes.
 *
 * Route: /visitor-registration/visit-type-selection
 */
'use client';

import React, { Suspense } from 'react';
import {
  VisitTypeSelectionStep,
  VisitType,
} from '../visit-type-selection-step';
import { useRouter, useSearchParams } from 'next/navigation';

function VisitTypeSelectionContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Get visitor phone from URL params (optional)
  const visitorPhone = searchParams.get('phone') || undefined;

  // Handle successful visit type selection
  const handleSuccess = (data: { visitType: VisitType }) => {
    console.log('Visit type selected:', data.visitType);

    // In a real flow, this would navigate to the appropriate Step 3 form
    // For E2E testing, we'll just store the selection and navigate to a mock Step 3
    if (data.visitType === VisitType.MEETING) {
      router.push('/visitor-registration/meeting-registration-form?step=3');
    } else if (data.visitType === VisitType.DELIVERY) {
      router.push('/visitor-registration/delivery-registration-form?step=3');
    }
  };

  // Handle back navigation
  const handleBack = () => {
    console.log('Back button clicked');
    // Navigate back to phone verification step (Step 1b)
    router.push('/visitor-registration/phone-verification');
  };

  return (
    <VisitTypeSelectionStep
      onSuccess={handleSuccess}
      onBack={handleBack}
      visitorPhone={visitorPhone}
    />
  );
}

export default function VisitTypeSelectionTestPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <VisitTypeSelectionContent />
    </Suspense>
  );
}
