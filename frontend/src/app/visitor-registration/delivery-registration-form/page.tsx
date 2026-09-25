'use client';

/**
 * Placeholder page for Delivery Registration Form (Step 3)
 * Used for E2E testing navigation from visit type selection
 */

export default function DeliveryRegistrationFormPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="max-w-md space-y-4 rounded-lg bg-white p-8 shadow-md">
        <h1 className="text-2xl font-bold text-gray-900">
          Delivery Registration Form
        </h1>
        <p className="text-gray-600">Step 3 of 6 - Delivery Registration</p>
        <div className="rounded-md bg-amber-50 p-4">
          <p className="text-sm text-amber-800">
            ✓ You selected Delivery visit type
          </p>
        </div>
      </div>
    </div>
  );
}
