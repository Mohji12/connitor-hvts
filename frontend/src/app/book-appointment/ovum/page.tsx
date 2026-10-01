'use client';

import { OvumBranchPicker } from '@/features/book-appointment/OvumBranchPicker';

export default function OvumBookAppointmentPage() {
  return (
    <div className="min-h-screen bg-[#F7F9FC] p-4 md:p-8">
      <div className="mx-auto max-w-lg">
        <OvumBranchPicker />
      </div>
    </div>
  );
}
