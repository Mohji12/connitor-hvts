import * as React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export type AmsStats = {
  patientsAdmitted: number;
  attendantsRegistered: number;
  currentlyInside: number;
  exitedToday: number;
  pendingApproval: number;
  emergencyPasses: number;
};

const KPI_META: Array<{ key: keyof AmsStats; label: string }> = [
  { key: 'patientsAdmitted', label: 'Patients Admitted' },
  { key: 'attendantsRegistered', label: 'Attendants Registered' },
  { key: 'currentlyInside', label: 'Currently Inside' },
  { key: 'exitedToday', label: 'Exited Today' },
  { key: 'pendingApproval', label: 'Pending Approval' },
  { key: 'emergencyPasses', label: 'Emergency Passes' },
];

export function AmsKpiStrip({
  stats,
  className,
}: {
  stats: AmsStats;
  className?: string;
}): React.ReactElement {
  return (
    <div className={cn('grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-3 xl:grid-cols-6', className)}>
      {KPI_META.map((item) => (
        <Card key={item.key} className="rounded-xl border-[#0052CC]/15 bg-white shadow-sm max-lg:py-3">
          <CardContent className="pt-4 max-lg:px-3 max-lg:pt-0">
            <p className="text-xs font-medium uppercase tracking-wide text-[#0052CC]/80 max-lg:text-[10px] max-lg:leading-tight">
              {item.label}
            </p>
            <p className="mt-1 text-3xl font-bold text-slate-900 max-lg:text-2xl">{stats[item.key] ?? 0}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
