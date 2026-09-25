'use client';

import { BookAppointmentWizard } from '@/features/book-appointment/BookAppointmentWizard';

export default function BookAppointmentPage() {
  return (
    <div className="min-h-screen bg-[#F7F9FC] p-4 md:p-8">
      <div className="mx-auto max-w-lg">
        <BookAppointmentWizard />
      </div>
    </div>
  );
}
