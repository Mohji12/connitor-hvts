'use client';

import * as React from 'react';
import { toast } from 'sonner';
import { CalendarClock, Upload } from 'lucide-react';
import { useAuthSession } from '@/hooks/useAuthSession';
import { todayIstDateIso } from '@/lib/datetime';
import {
  VisitSlotAllotmentService,
  type VisitSlotAllotmentRow,
  type VisitSlotDaySummary,
  type VisitSlotImportResult,
  type VisitSlotRoutineRow,
  type VisitSlotStaff,
} from '@/lib/services/visitSlotAllotmentService';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const WEEKDAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function apiErrorDetail(e: unknown): string {
  if (typeof e === 'object' && e && 'response' in e) {
    return String(
      (e as { response?: { data?: { detail?: string } } }).response?.data?.detail ?? '',
    );
  }
  return '';
}

function addDaysIso(iso: string, days: number): string {
  const d = new Date(`${iso}T12:00:00`);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export default function VisitSlotsPage(): React.ReactElement {
  const user = useAuthSession<{ branchId?: string; role?: string }>();
  const branchId = user?.branchId ?? '';
  const [date, setDate] = React.useState(todayIstDateIso());
  const [quota, setQuota] = React.useState(50);
  const [gapMinutes, setGapMinutes] = React.useState(5);
  const [summary, setSummary] = React.useState<VisitSlotDaySummary | null>(null);
  const [staff, setStaff] = React.useState<VisitSlotStaff[]>([]);
  const [routines, setRoutines] = React.useState<VisitSlotRoutineRow[]>([]);
  const [loading, setLoading] = React.useState(false);

  const [selectedStaffIds, setSelectedStaffIds] = React.useState<string[]>([]);
  const [startTime, setStartTime] = React.useState('09:00');
  const [endTime, setEndTime] = React.useState('10:00');
  const [slotCount, setSlotCount] = React.useState(3);

  const [routineStaffId, setRoutineStaffId] = React.useState('');
  const [routineStart, setRoutineStart] = React.useState('09:00');
  const [routineEnd, setRoutineEnd] = React.useState('10:00');
  const [routineCount, setRoutineCount] = React.useState(3);
  const [routineWeekdays, setRoutineWeekdays] = React.useState<number[]>([0, 1, 2, 3, 4, 5]);
  const [applyDays, setApplyDays] = React.useState(14);
  const [importFile, setImportFile] = React.useState<File | null>(null);
  const [importResult, setImportResult] = React.useState<VisitSlotImportResult | null>(null);

  const load = React.useCallback(async () => {
    if (!branchId) return;
    try {
      const [policy, day, staffRes, routineRes] = await Promise.all([
        VisitSlotAllotmentService.getPolicy(branchId),
        VisitSlotAllotmentService.listAllotments(branchId, date),
        VisitSlotAllotmentService.listStaff(branchId),
        VisitSlotAllotmentService.listRoutines(branchId),
      ]);
      setQuota(policy.dailyQuota);
      setGapMinutes(policy.gapMinutes ?? 5);
      setSummary(day);
      setStaff(staffRes.items);
      setRoutines(routineRes.items);
      setSelectedStaffIds((prev) =>
        prev.filter((id) => staffRes.items.some((s) => s.id === id)),
      );
      setRoutineStaffId((prev) => prev || staffRes.items[0]?.id || '');
    } catch {
      setSummary(null);
      toast.error('Could not load visit slots');
    }
  }, [branchId, date]);

  React.useEffect(() => {
    void load();
  }, [load]);

  const saveQuota = async () => {
    if (!branchId) return;
    try {
      const res = await VisitSlotAllotmentService.updatePolicy(branchId, quota, gapMinutes);
      setQuota(res.dailyQuota);
      setGapMinutes(res.gapMinutes ?? gapMinutes);
      toast.success('Visit slot settings saved');
      await load();
    } catch (e: unknown) {
      toast.error(apiErrorDetail(e) || 'Could not save quota');
    }
  };

  const toggleStaffSelection = (id: string, checked: boolean) => {
    setSelectedStaffIds((prev) => {
      if (checked) return prev.includes(id) ? prev : [...prev, id];
      return prev.filter((x) => x !== id);
    });
  };

  const createAllotment = async () => {
    if (!branchId || selectedStaffIds.length === 0) {
      toast.error('Select at least one staff member');
      return;
    }
    setLoading(true);
    let ok = 0;
    const errors: string[] = [];
    try {
      for (const id of selectedStaffIds) {
        try {
          await VisitSlotAllotmentService.createAllotment(branchId, {
            staffId: id,
            date,
            startTime,
            endTime,
            slotCount,
          });
          ok += 1;
        } catch (e: unknown) {
          const label = staff.find((s) => s.id === id)?.name ?? id;
          errors.push(`${label}: ${apiErrorDetail(e) || 'failed'}`);
        }
      }
      if (ok > 0) await load();
      if (ok > 0 && errors.length === 0) {
        toast.success(
          ok === 1
            ? `Allotted ${slotCount} slot${slotCount === 1 ? '' : 's'} for 1 staff member`
            : `Allotted ${slotCount} slot${slotCount === 1 ? '' : 's'} each for ${ok} staff members`,
        );
      } else if (ok > 0 && errors.length > 0) {
        toast.warning(`${ok} succeeded, ${errors.length} failed`);
      }
      if (errors.length) {
        toast.error(errors.slice(0, 3).join(' · ') + (errors.length > 3 ? '…' : ''));
      }
    } finally {
      setLoading(false);
    }
  };

  const downloadTemplate = async () => {
    if (!branchId) return;
    try {
      await VisitSlotAllotmentService.downloadTemplate(branchId);
      toast.success('Template downloaded');
    } catch (e: unknown) {
      toast.error(apiErrorDetail(e) || 'Could not download template');
    }
  };

  const importExcel = async () => {
    if (!branchId || !importFile) {
      toast.error('Choose an Excel file first');
      return;
    }
    setLoading(true);
    try {
      const res = await VisitSlotAllotmentService.importExcel(branchId, importFile);
      setImportResult(res);
      toast.success(
        `Import done: ${res.created} created, ${res.updated} updated, ${res.failed} failed`,
      );
      setImportFile(null);
      await load();
    } catch (e: unknown) {
      toast.error(apiErrorDetail(e) || 'Could not import Excel');
    } finally {
      setLoading(false);
    }
  };

  const removeAllotment = async (row: VisitSlotAllotmentRow) => {
    if (!branchId) return;
    setLoading(true);
    try {
      await VisitSlotAllotmentService.deleteAllotment(branchId, row.id);
      toast.success('Allotment deleted');
      await load();
    } catch (e: unknown) {
      toast.error(apiErrorDetail(e) || 'Could not delete allotment');
    } finally {
      setLoading(false);
    }
  };

  const createRoutine = async () => {
    if (!branchId || !routineStaffId) return;
    setLoading(true);
    try {
      await VisitSlotAllotmentService.createRoutine(branchId, {
        staffId: routineStaffId,
        weekdays: routineWeekdays,
        startTime: routineStart,
        endTime: routineEnd,
        slotCount: routineCount,
      });
      toast.success('Routine saved');
      await load();
    } catch (e: unknown) {
      toast.error(apiErrorDetail(e) || 'Could not save routine');
    } finally {
      setLoading(false);
    }
  };

  const applyRoutines = async () => {
    if (!branchId) return;
    setLoading(true);
    try {
      const fromDate = todayIstDateIso();
      const toDate = addDaysIso(fromDate, Math.max(1, applyDays) - 1);
      const res = await VisitSlotAllotmentService.applyRoutines(branchId, { fromDate, toDate });
      toast.success(
        `Applied routines: ${res.created} created, ${res.updated} updated, ${res.skipped} skipped`,
      );
      await load();
    } catch (e: unknown) {
      toast.error(apiErrorDetail(e) || 'Could not apply routines');
    } finally {
      setLoading(false);
    }
  };

  const toggleWeekday = (day: number) => {
    setRoutineWeekdays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort(),
    );
  };

  if (!branchId) {
    return (
      <div className="p-6 text-sm text-muted-foreground">
        Your account needs a branch to manage visit slots.
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <CalendarClock className="h-6 w-6 text-teal-700" />
          Visit slots
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Allot daily visit slots to staff within the hospital pool. Visits are split inside
          each window, with a gap between one visit ending and the next starting. Unused allotted
          slots still count toward the daily quota.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Daily quota and visit gap</CardTitle>
          <CardDescription>
            {summary
              ? `${summary.used} allotted / ${summary.dailyQuota} pool — ${summary.remaining} remaining on ${summary.date}`
              : 'Set how many visit slots this branch may allot per day, and the free minutes between visits.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-end gap-3">
          <div className="space-y-1">
            <Label htmlFor="quota">Daily quota</Label>
            <Input
              id="quota"
              type="number"
              min={1}
              max={5000}
              value={quota}
              onChange={(e) => setQuota(Number(e.target.value) || 1)}
              className="w-32"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="gap">Gap between visits (minutes)</Label>
            <Input
              id="gap"
              type="number"
              min={0}
              max={60}
              value={gapMinutes}
              onChange={(e) => setGapMinutes(Math.max(0, Number(e.target.value) || 0))}
              className="w-32"
            />
          </div>
          <Button type="button" onClick={() => void saveQuota()}>
            Save
          </Button>
        </CardContent>
      </Card>

      <Tabs defaultValue="day">
        <TabsList>
          <TabsTrigger value="day">Day allotments</TabsTrigger>
          <TabsTrigger value="defaults">Defaults</TabsTrigger>
        </TabsList>

        <TabsContent value="day" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Allot for a day</CardTitle>
              <CardDescription>
                Pick one or more staff, date, hours, and how many slots to place evenly in that
                window (same settings for each selected person).
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              <div className="space-y-1">
                <Label htmlFor="date">Date</Label>
                <Input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              </div>
              <div className="space-y-2 md:col-span-2 lg:col-span-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Label>Staff (select multiple)</Label>
                  <div className="flex gap-2 text-xs">
                    <button
                      type="button"
                      className="text-primary underline-offset-4 hover:underline"
                      onClick={() => setSelectedStaffIds(staff.map((s) => s.id))}
                    >
                      Select all
                    </button>
                    <button
                      type="button"
                      className="text-muted-foreground underline-offset-4 hover:underline"
                      onClick={() => setSelectedStaffIds([])}
                    >
                      Clear
                    </button>
                  </div>
                </div>
                <div className="max-h-48 space-y-2 overflow-y-auto rounded-md border border-input p-3">
                  {staff.length === 0 && (
                    <p className="text-sm text-muted-foreground">No visit-capable staff for this branch.</p>
                  )}
                  {staff.map((s) => {
                    const checked = selectedStaffIds.includes(s.id);
                    return (
                      <label
                        key={s.id}
                        className="flex cursor-pointer items-start gap-2 rounded-md px-1 py-0.5 hover:bg-muted/50"
                      >
                        <Checkbox
                          checked={checked}
                          onCheckedChange={(value) => toggleStaffSelection(s.id, value === true)}
                          aria-label={s.name ?? s.email ?? s.id}
                        />
                        <span className="text-sm leading-tight">
                          {s.name ?? s.email}
                          {s.userType ? (
                            <span className="text-muted-foreground"> ({s.userType})</span>
                          ) : null}
                        </span>
                      </label>
                    );
                  })}
                </div>
                {selectedStaffIds.length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    {selectedStaffIds.length} selected — each gets {slotCount} slot
                    {slotCount === 1 ? '' : 's'} between {startTime} and {endTime}
                    {slotCount > 1 ? `, with ${gapMinutes} min between visits` : ''}.
                  </p>
                )}
              </div>
              <div className="space-y-1">
                <Label htmlFor="start">Start</Label>
                <Input
                  id="start"
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="end">End</Label>
                <Input
                  id="end"
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="count">Slot count</Label>
                <Input
                  id="count"
                  type="number"
                  min={1}
                  max={500}
                  value={slotCount}
                  onChange={(e) => setSlotCount(Number(e.target.value) || 1)}
                />
              </div>
              <div className="md:col-span-2 lg:col-span-3">
                <Button
                  type="button"
                  disabled={loading || selectedStaffIds.length === 0}
                  onClick={() => void createAllotment()}
                >
                  Allot slots
                  {selectedStaffIds.length > 1 ? ` (${selectedStaffIds.length} staff)` : ''}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Import from Excel
              </CardTitle>
              <CardDescription>
                Columns: Date, StartTime, EndTime, SlotCount, StaffName, StaffEmail (optional).
                Staff get an email when their slots are allotted. Invalid rows are skipped; valid
                rows still apply.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <Button type="button" variant="outline" onClick={() => void downloadTemplate()}>
                  Download template
                </Button>
                <Input
                  type="file"
                  accept=".xlsx,.xlsm"
                  className="max-w-xs"
                  onChange={(e) => {
                    setImportFile(e.target.files?.[0] ?? null);
                    setImportResult(null);
                  }}
                />
                <Button
                  type="button"
                  disabled={loading || !importFile}
                  onClick={() => void importExcel()}
                >
                  Import Excel
                </Button>
              </div>
              {importFile ? (
                <p className="text-sm text-muted-foreground">Selected: {importFile.name}</p>
              ) : null}
              {importResult ? (
                <div className="rounded-md border p-3 text-sm space-y-2">
                  <p>
                    Created {importResult.created}, updated {importResult.updated}, failed{' '}
                    {importResult.failed}
                  </p>
                  {importResult.rows.filter((r) => !r.ok).length > 0 ? (
                    <ul className="list-disc pl-5 text-destructive space-y-1">
                      {importResult.rows
                        .filter((r) => !r.ok)
                        .slice(0, 12)
                        .map((r) => (
                          <li key={r.row}>
                            Row {r.row}: {r.error}
                          </li>
                        ))}
                    </ul>
                  ) : null}
                </div>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Allotments on {date}</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              {!summary?.items.length ? (
                <p className="text-sm text-muted-foreground">No allotments for this date.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-muted-foreground">
                      <th className="py-2 pr-3">Staff</th>
                      <th className="py-2 pr-3">Window</th>
                      <th className="py-2 pr-3">Slots</th>
                      <th className="py-2 pr-3">Open / Booked</th>
                      <th className="py-2 pr-3">Source</th>
                      <th className="py-2 pr-3">Times</th>
                      <th className="py-2"> </th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary.items.map((row) => (
                      <tr key={row.id} className="border-b last:border-0">
                        <td className="py-2 pr-3">
                          {row.staffName}
                          {row.staffUserType ? (
                            <span className="text-muted-foreground"> · {row.staffUserType}</span>
                          ) : null}
                        </td>
                        <td className="py-2 pr-3">
                          {row.windowStart}–{row.windowEnd}
                        </td>
                        <td className="py-2 pr-3">{row.slotCount}</td>
                        <td className="py-2 pr-3">
                          {row.open} / {row.booked}
                        </td>
                        <td className="py-2 pr-3">
                          <Badge variant="secondary">{row.source}</Badge>
                        </td>
                        <td className="py-2 pr-3 text-muted-foreground">
                          {row.previewTimes.join(', ') || '—'}
                        </td>
                        <td className="py-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={loading || row.booked > 0}
                            onClick={() => void removeAllotment(row)}
                          >
                            Delete
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="defaults" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Default routine</CardTitle>
              <CardDescription>
                Save recurring allotments, then apply them to upcoming days (skips MANUAL/OVERRIDE
                rows).
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              <div className="space-y-1 md:col-span-2">
                <Label htmlFor="r-staff">Staff</Label>
                <select
                  id="r-staff"
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                  value={routineStaffId}
                  onChange={(e) => setRoutineStaffId(e.target.value)}
                >
                  {staff.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name ?? s.email}
                      {s.userType ? ` (${s.userType})` : ''}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1 md:col-span-2 lg:col-span-3">
                <Label>Weekdays</Label>
                <div className="flex flex-wrap gap-2">
                  {WEEKDAY_LABELS.map((label, idx) => (
                    <Button
                      key={label}
                      type="button"
                      size="sm"
                      variant={routineWeekdays.includes(idx) ? 'default' : 'outline'}
                      onClick={() => toggleWeekday(idx)}
                    >
                      {label}
                    </Button>
                  ))}
                </div>
              </div>
              <div className="space-y-1">
                <Label htmlFor="r-start">Start</Label>
                <Input
                  id="r-start"
                  type="time"
                  value={routineStart}
                  onChange={(e) => setRoutineStart(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="r-end">End</Label>
                <Input
                  id="r-end"
                  type="time"
                  value={routineEnd}
                  onChange={(e) => setRoutineEnd(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="r-count">Slot count</Label>
                <Input
                  id="r-count"
                  type="number"
                  min={1}
                  value={routineCount}
                  onChange={(e) => setRoutineCount(Number(e.target.value) || 1)}
                />
              </div>
              <div className="md:col-span-2 lg:col-span-3 flex flex-wrap gap-2">
                <Button type="button" disabled={loading} onClick={() => void createRoutine()}>
                  Save routine
                </Button>
                <div className="flex items-center gap-2">
                  <Label htmlFor="apply-days" className="whitespace-nowrap">
                    Apply next
                  </Label>
                  <Input
                    id="apply-days"
                    type="number"
                    min={1}
                    max={60}
                    value={applyDays}
                    onChange={(e) => setApplyDays(Number(e.target.value) || 14)}
                    className="w-20"
                  />
                  <span className="text-sm text-muted-foreground">days</span>
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={loading}
                    onClick={() => void applyRoutines()}
                  >
                    Apply routines
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Saved routines</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {!routines.length ? (
                <p className="text-sm text-muted-foreground">No routines yet.</p>
              ) : (
                routines.map((r) => (
                  <div
                    key={r.id}
                    className="flex flex-wrap items-center justify-between gap-2 border-b py-2 last:border-0"
                  >
                    <div className="text-sm">
                      <div className="font-medium">{r.staffName}</div>
                      <div className="text-muted-foreground">
                        {r.windowStart}–{r.windowEnd} · {r.slotCount} slots ·{' '}
                        {r.weekdays.map((d) => WEEKDAY_LABELS[d]).join(', ')}
                        {!r.isActive ? ' · inactive' : ''}
                      </div>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={loading}
                      onClick={() =>
                        void VisitSlotAllotmentService.deleteRoutine(branchId, r.id)
                          .then(() => {
                            toast.success('Routine deleted');
                            return load();
                          })
                          .catch((e: unknown) =>
                            toast.error(apiErrorDetail(e) || 'Could not delete routine'),
                          )
                      }
                    >
                      Delete
                    </Button>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
