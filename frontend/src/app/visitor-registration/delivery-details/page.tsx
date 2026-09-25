'use client';

/**
 * Test page for Delivery Details Step (Step 4 - Delivery)
 * Used for E2E testing the delivery details collection
 */

import { useState } from 'react';
import { DeliveryDetailsStep, DeliveryDetailsFormData } from '@/components/visitors/steps/DeliveryDetailsStep';

export default function DeliveryDetailsPage() {
  const [submittedData, setSubmittedData] = useState<DeliveryDetailsFormData | null>(null);

  const handleSubmit = async (data: DeliveryDetailsFormData) => {
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 100));
    setSubmittedData(data);
    console.log('Delivery details submitted:', data);
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
          <p className="text-gray-600">Delivery details submitted</p>
          <div className="rounded-md bg-green-50 p-4">
            <p className="text-sm text-green-800">Platform: {submittedData.platform}</p>
            <p className="text-sm text-green-800">Recipient: {submittedData.recipient}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <DeliveryDetailsStep
        onSubmit={handleSubmit}
        onBack={handleBack}
      />
    </div>
  );
}
