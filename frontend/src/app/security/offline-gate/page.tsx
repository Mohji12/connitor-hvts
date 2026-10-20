'use client';

import { OfflineGateScanPanel } from '@/features/offline-gate/OfflineGateScanPanel';

export default function SecurityOfflineGatePage(): React.ReactElement {
  return (
    <div className="mx-auto max-w-3xl space-y-4 p-4">
      <h1 className="text-xl font-semibold text-[#001B71] max-lg:hidden">Offline gate</h1>
      <OfflineGateScanPanel />
    </div>
  );
}
