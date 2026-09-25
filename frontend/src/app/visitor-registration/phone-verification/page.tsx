'use client';

/**
 * Placeholder page for Phone Verification Step (Step 1b)
 * Used for E2E testing back navigation from visit type selection
 */

export default function PhoneVerificationPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="max-w-md space-y-4 rounded-lg bg-white p-8 shadow-md">
        <h1 className="text-2xl font-bold text-gray-900">Phone Verification</h1>
        <p className="text-gray-600">Step 1b of 6 - Verify OTP</p>
        <div className="rounded-md bg-blue-50 p-4">
          <p className="text-sm text-blue-800">
            ✓ Back navigation from visit type selection
          </p>
        </div>
      </div>
    </div>
  );
}
