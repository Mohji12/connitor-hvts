'use client';

/**
 * Test page for Confirmation Step (Step 5)
 * Used for E2E testing the confirmation screen
 */

import { useState } from 'react';
import { ConfirmationStep } from '@/components/visitors/steps/ConfirmationStep';

type ActionType = 'done' | 'contact-security' | null;

export default function ConfirmationPage() {
  const [actionClicked, setActionClicked] = useState<ActionType>(null);

  const handleDone = () => {
    console.log('Done button clicked');
    setActionClicked('done');
  };

  const handleContactSecurity = () => {
    console.log('Contact Security clicked');
    setActionClicked('contact-security');
  };

  // Show success screen when Done is clicked
  if (actionClicked === 'done') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="max-w-md space-y-4 rounded-lg bg-white p-8 shadow-md">
          <h2 className="text-2xl font-bold text-green-600">Done Clicked!</h2>
          <p className="text-gray-600">Registration flow completed</p>
          <div className="rounded-md bg-green-50 p-4">
            <p className="text-sm text-green-800">
              User successfully completed the registration
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Show help screen when Contact Security is clicked
  if (actionClicked === 'contact-security') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="max-w-md space-y-4 rounded-lg bg-white p-8 shadow-md">
          <h2 className="text-2xl font-bold text-blue-600">Contact Security</h2>
          <p className="text-gray-600">Help requested</p>
          <div className="rounded-md bg-blue-50 p-4">
            <p className="text-sm text-blue-800">
              User requested to contact security for assistance
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <ConfirmationStep
        visitId="test-visit-id"
        visitType="MEETING"
        onDone={handleDone}
        onContactSecurity={handleContactSecurity}
        autoRedirectDelay={null}
      />
    </div>
  );
}
