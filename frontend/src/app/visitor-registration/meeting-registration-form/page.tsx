'use client';

/**
 * E2E Test Page for Meeting Registration Form (Step 3)
 * This page renders the MeetingRegistrationForm component in isolation
 * for E2E testing purposes.
 *
 * Route: /visitor-registration/meeting-registration-form
 */

import React, { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  MeetingRegistrationForm,
  type MeetingFormData,
  type ExistingVisitorData,
} from '@/components/visitors/public/MeetingRegistrationForm';

function MeetingRegistrationFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);

  // Get params from URL
  const phone = searchParams.get('phone') || '+91 99999 99999';
  const branchId = searchParams.get('branchId') || 'test-branch-id';
  const isExisting = searchParams.get('isExisting') === 'true';
  const isLoadingParam = searchParams.get('isLoading') === 'true';
  
  // Parse existing visitor data if provided
  let existingVisitorData: ExistingVisitorData | null = null;
  const existingDataParam = searchParams.get('existingData');
  if (existingDataParam) {
    try {
      existingVisitorData = JSON.parse(existingDataParam);
    } catch (error) {
      console.error('Failed to parse existing visitor data:', error);
    }
  }

  // Handle form submission
  const handleSubmit = async (data: MeetingFormData) => {
    console.log('Form submitted with data:', data);
    setIsLoading(true);
    
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000));
    
    setIsLoading(false);
    
    // In a real flow, this would navigate to Step 4
    // For E2E testing, we'll just log and stay on the page
    console.log('Submission complete');
  };

  // Handle back navigation
  const handleBack = () => {
    console.log('Back button clicked');
    router.push('/visitor-registration/visit-type-selection');
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 py-8">
      <MeetingRegistrationForm
        phone={phone}
        branchId={branchId}
        isExistingVisitor={isExisting}
        existingVisitorData={existingVisitorData}
        onSubmit={handleSubmit}
        onBack={handleBack}
        isLoading={isLoading || isLoadingParam}
      />
    </div>
  );
}

export default function MeetingRegistrationFormPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <MeetingRegistrationFormContent />
    </Suspense>
  );
}
