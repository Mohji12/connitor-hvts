'use client';

/**
 * Test page for Meeting Details Step (Step 4 - Meeting)
 * Used for E2E testing the meeting details collection
 */

import { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  MeetingDetailsStep,
  MeetingDetailsFormData,
} from '@/components/visitors/steps/MeetingDetailsStep';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
    },
  },
});

export default function MeetingDetailsPage() {
  const [submittedData, setSubmittedData] =
    useState<MeetingDetailsFormData | null>(null);

  const handleSubmit = async (data: MeetingDetailsFormData) => {
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 100));
    setSubmittedData(data);
    console.log('Meeting details submitted:', data);
  };

  const handleBack = () => {
    console.log('Back button clicked');
    // In real flow, would navigate to Step 3
  };

  if (submittedData) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="max-w-md space-y-4 rounded-lg bg-white p-8 shadow-md">
          <h2 className="text-2xl font-bold text-green-600">Success!</h2>
          <p className="text-gray-600">Meeting details submitted</p>
          <div className="rounded-md bg-green-50 p-4">
            <p className="text-sm text-green-800">
              Department: {submittedData.department}
            </p>
            <p className="text-sm text-green-800">
              Host ID: {submittedData.hostId}
            </p>
            <p className="text-sm text-green-800">
              Purpose: {submittedData.purpose}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <MeetingDetailsStep
          branchId="test-branch-id"
          onSubmit={handleSubmit}
          onBack={handleBack}
        />
      </div>
    </QueryClientProvider>
  );
}
