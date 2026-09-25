'use client';

import * as React from 'react';
import { toast } from 'sonner';
import { useAuthSession } from '@/hooks/useAuthSession';
import { AttendantPassService } from '@/lib/services/attendantPassService';
import { AmsPageShell } from '@/features/attendant-management/ui';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

type Period = 'daily' | 'weekly' | 'monthly';

export default function AmsReportsPage(): React.ReactElement {
  const user = useAuthSession<{ branchId?: string }>();
  const branchId = user?.branchId;
  const [period, setPeriod] = React.useState<Period>('daily');
  const [report, setReport] = React.useState<Record<string, unknown> | null>(null);

  const load = React.useCallback(async () => {
    if (!branchId) return;
    try {
      const data = await AttendantPassService.reportsSummary(branchId, period);
      setReport(data);
    } catch {
      toast.error('Could not load reports');
    }
  }, [branchId, period]);

  React.useEffect(() => {
    void load();
  }, [load]);

  const exportCsv = () => {
    if (!report) return;
    const byWard = (report.byWard as Record<string, number>) || {};
    const lines = ['metric,value', `totalPasses,${report.totalPasses}`, `averageStayMinutes,${report.averageStayMinutes}`, `emergencyPasses,${report.emergencyPasses}`, `expiredPasses,${report.expiredPasses}`, `overstay,${report.overstay}`];
    Object.entries(byWard).forEach(([k, v]) => lines.push(`ward:${k},${v}`));
    const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ams-report-${period}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <AmsPageShell title="Reports" subtitle="Daily, weekly, and monthly attendant analytics.">
      <div className="flex flex-wrap gap-2">
        {(['daily', 'weekly', 'monthly'] as Period[]).map((p) => (
          <Button
            key={p}
            size="sm"
            variant={period === p ? 'default' : 'outline'}
            className={period === p ? 'bg-[#0052CC]' : ''}
            onClick={() => setPeriod(p)}
          >
            {p}
          </Button>
        ))}
        <Button size="sm" variant="outline" onClick={exportCsv}>
          Export CSV
        </Button>
      </div>

      {report && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ['Total passes', report.totalPasses],
            ['Avg stay (min)', report.averageStayMinutes],
            ['Emergency', report.emergencyPasses],
            ['Expired', report.expiredPasses],
            ['Overstay (>4h)', report.overstay],
          ].map(([label, value]) => (
            <Card key={String(label)} className="rounded-xl">
              <CardContent className="pt-4">
                <p className="text-xs uppercase text-muted-foreground">{String(label)}</p>
                <p className="text-2xl font-bold">{String(value ?? 0)}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="rounded-xl">
          <CardHeader>
            <CardTitle>By ward</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            {Object.entries((report?.byWard as Record<string, number>) || {}).map(([k, v]) => (
              <div key={k} className="flex justify-between border-b py-1">
                <span>{k}</span>
                <span className="font-medium">{v}</span>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card className="rounded-xl">
          <CardHeader>
            <CardTitle>By relationship</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            {Object.entries((report?.byRelationship as Record<string, number>) || {}).map(
              ([k, v]) => (
                <div key={k} className="flex justify-between border-b py-1">
                  <span>{k}</span>
                  <span className="font-medium">{v}</span>
                </div>
              ),
            )}
          </CardContent>
        </Card>
      </div>
    </AmsPageShell>
  );
}
