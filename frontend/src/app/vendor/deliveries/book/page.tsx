'use client';

import Link from 'next/link';
import { DeliveryBookingWizard } from '@/features/distributor-delivery/DeliveryBookingWizard';
import { DeliveryPageShell } from '@/features/delivery-management/ui';
import { Button } from '@/components/ui/button';

export default function BookDeliveryPage(): React.ReactElement {
  return (
    <DeliveryPageShell
      title="Book delivery"
      subtitle="Choose hospital, slot, goods, vehicle, and driver. The driver receives full instructions and QR by email."
      actions={
        <Button asChild variant="outline">
          <Link href="/vendor/deliveries">Back to deliveries</Link>
        </Button>
      }
    >
      <DeliveryBookingWizard />
    </DeliveryPageShell>
  );
}
