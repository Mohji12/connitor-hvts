'use client';

import * as React from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { toast } from 'sonner';
import { ArrowLeft, Building2, Download, Printer, UserPlus } from 'lucide-react';
import { useAuthSession } from '@/hooks/useAuthSession';
import { ConnitorLoader } from '@/components/ConnitorLoader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  AnalyticsService,
  type ChainBranchReport,
} from '@/lib/services/analyticsService';
import { UserService } from '@/lib/services/userService';
import { getApiErrorMessage } from '@/lib/api-errors';
import { displayRole } from '@/lib/role-label';
import { chainBranchReportIdFromLocation } from '@/lib/static-export-route';

function formatWhen(value: string | null): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
}

function csvCell(value: string | number | null | undefined): string {
  return `"${String(value ?? '').replace(/"/g, '""')}"`;
}

function downloadReport(report: ChainBranchReport): void {
  const { branch, stats, attendants } = report;
  const rows: Array<Array<string | number>> = [
    ['Hospital', report.chainName ?? ''],
    ['Branch', branch.name],
    ['Address', `${branch.street}, ${branch.city}, ${branch.state} ${branch.pinCode}`],
    ['Email', branch.email],
    ['Phone', branch.phone],
    ['Generated', formatWhen(report.generatedAt)],
    [],
    ['Today visits', stats.todayVisits],
    ['Active visits', stats.activeVisits],
    ['Total visitors', stats.totalVisitors],
    ['Staff', stats.totalStaff],
    ['Patients admitted', attendants.patientsAdmitted],
    ['Attendants registered', attendants.attendantsRegistered],
    ['Attendants inside', attendants.currentlyInside],
    ['Attendants pending', attendants.pendingApproval],
    [],
    ['Hospital admins'],
    ['Name', 'Email', 'Phone', 'Active'],
    ...report.hospitalAdmins.map((admin) => [
      admin.name,
      admin.email,
      admin.phone,
      admin.isActive ? 'Yes' : 'No',
    ]),
    [],
    ['Departments'],
    ['Department', 'Sub-departments', 'Staff', 'Today', 'Pending', 'Inside', 'Completed'],
    ...report.departments.map((dept) => [
      dept.departmentName,
      dept.subDepartmentCount,
      dept.staffCount,
      dept.todayAppointments,
      dept.pendingAppointments,
      dept.activeVisits,
      dept.completedAppointments,
    ]),
    [],
    ['Recent visits'],
    ['When', 'Visitor', 'Purpose', 'Staff', 'Status'],
    ...report.recentVisits.map((visit) => [
      formatWhen(visit.when),
      visit.visitor,
      visit.purpose,
      visit.staffName ?? '',
      visit.status,
    ]),
  ];
  const csv = rows.map((row) => row.map(csvCell).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${branch.name.replace(/\s+/g, '-').toLowerCase()}-report.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

function printReport(report: ChainBranchReport): void {
  const popup = window.open('', '_blank', 'noopener,noreferrer');
  if (!popup) {
    toast.error('Allow pop-ups to print this report');
    return;
  }
  const { branch, stats, attendants } = report;
  const adminRows = report.hospitalAdmins
    .map(
      (admin) =>
        `<tr><td>${admin.name}</td><td>${admin.email}</td><td>${admin.phone}</td></tr>`,
    )
    .join('');
  const deptRows = report.departments
    .map(
      (dept) =>
        `<tr><td>${dept.departmentName}</td><td>${dept.staffCount}</td><td>${dept.todayAppointments}</td><td>${dept.pendingAppointments}</td><td>${dept.activeVisits}</td><td>${dept.completedAppointments}</td></tr>`,
    )
    .join('');
  const visitRows = report.recentVisits
    .map(
      (visit) =>
        `<tr><td>${formatWhen(visit.when)}</td><td>${visit.visitor}</td><td>${visit.purpose}</td><td>${visit.staffName ?? '—'}</td><td>${visit.status}</td></tr>`,
    )
    .join('');
  popup.document.write(`<!DOCTYPE html><html><head><title>${branch.name} report</title>
    <style>
      body { font-family: Arial, sans-serif; color: #0f172a; padding: 24px; }
      h1 { margin: 0 0 4px; } h2 { margin: 24px 0 8px; font-size: 16px; }
      p { margin: 0; color: #475569; }
      table { width: 100%; border-collapse: collapse; margin-top: 8px; }
      th, td { border: 1px solid #e2e8f0; padding: 6px 8px; text-align: left; font-size: 13px; }
      th { background: #f8fafc; }
      .kpis { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-top: 16px; }
      .kpi { border: 1px solid #e2e8f0; border-radius: 8px; padding: 8px; }
      .kpi strong { display: block; font-size: 20px; }
    </style></head><body>
    <h1>${branch.name}</h1>
    <p>${report.chainName ?? ''}</p>
    <p>${branch.street}, ${branch.city}, ${branch.state} ${branch.pinCode}</p>
    <p>${branch.email} · ${branch.phone}</p>
    <p>Generated ${formatWhen(report.generatedAt)}</p>
    <div class="kpis">
      <div class="kpi"><strong>${stats.todayVisits}</strong>Today's visits</div>
      <div class="kpi"><strong>${stats.activeVisits}</strong>Active visits</div>
      <div class="kpi"><strong>${stats.totalVisitors}</strong>Total visitors</div>
      <div class="kpi"><strong>${stats.totalStaff}</strong>Staff</div>
      <div class="kpi"><strong>${attendants.patientsAdmitted}</strong>Patients admitted</div>
      <div class="kpi"><strong>${attendants.attendantsRegistered}</strong>Attendants</div>
      <div class="kpi"><strong>${attendants.currentlyInside}</strong>Attendants inside</div>
      <div class="kpi"><strong>${attendants.pendingApproval}</strong>Pending approval</div>
    </div>
    <h2>Hospital admins</h2>
    <table><thead><tr><th>Name</th><th>Email</th><th>Phone</th></tr></thead><tbody>${adminRows || '<tr><td colspan="3">None yet</td></tr>'}</tbody></table>
    <h2>Departments</h2>
    <table><thead><tr><th>Department</th><th>Staff</th><th>Today</th><th>Pending</th><th>Inside</th><th>Completed</th></tr></thead><tbody>${deptRows || '<tr><td colspan="6">No departments</td></tr>'}</tbody></table>
    <h2>Recent visits</h2>
    <table><thead><tr><th>When</th><th>Visitor</th><th>Purpose</th><th>Staff</th><th>Status</th></tr></thead><tbody>${visitRows || '<tr><td colspan="5">No visits</td></tr>'}</tbody></table>
    </body></html>`);
  popup.document.close();
  popup.focus();
  popup.print();
}

export default function ChainBranchReportPage(): React.ReactElement {
  const params = useParams();
  const user = useAuthSession<{ role?: string; hospitalChainId?: string }>();
  const [branchId, setBranchId] = React.useState(() =>
    chainBranchReportIdFromLocation(
      typeof window === 'undefined' ? '' : window.location.pathname,
      params.branchId,
    ),
  );
  const [report, setReport] = React.useState<ChainBranchReport | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [creating, setCreating] = React.useState(false);
  const [adminName, setAdminName] = React.useState('');
  const [adminEmail, setAdminEmail] = React.useState('');
  const [adminPhone, setAdminPhone] = React.useState('');
  const [adminPassword, setAdminPassword] = React.useState('');

  React.useEffect(() => {
    setBranchId(chainBranchReportIdFromLocation(window.location.pathname, params.branchId));
  }, [params.branchId]);

  const load = React.useCallback(() => {
    if (!branchId || !user) return;
    if (user.role !== 'CHAIN_ADMIN') {
      setError('Only a hospital super admin can open this branch.');
      return;
    }
    setError(null);
    AnalyticsService.getChainBranchReport(branchId)
      .then(setReport)
      .catch(() => setError('Could not load this branch.'));
  }, [branchId, user]);

  React.useEffect(() => {
    load();
  }, [load]);

  const createAdmin = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!user?.hospitalChainId || !branchId) return;
    if (adminPhone.length !== 10) {
      toast.error('Phone must be 10 digits');
      return;
    }
    if (adminPassword.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    setCreating(true);
    try {
      await UserService.create({
        name: adminName.trim(),
        email: adminEmail.trim(),
        phone: adminPhone.trim(),
        password: adminPassword,
        role: 'HOSPITAL_ADMIN',
        hospitalChainId: user.hospitalChainId,
        branchId,
      });
      toast.success('Hospital admin profile created');
      setAdminName('');
      setAdminEmail('');
      setAdminPhone('');
      setAdminPassword('');
      load();
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Could not create the hospital admin'));
    } finally {
      setCreating(false);
    }
  };

  if (!user || (branchId && !report && !error)) {
    return (
      <ConnitorLoader variant="section" message="Loading branch…" className="min-h-[50vh] py-16" />
    );
  }

  if (error || !report) {
    return (
      <div className="p-4 lg:p-8">
        <p className="text-red-600">{error ?? 'Branch not found.'}</p>
        <Button asChild variant="outline" className="mt-4">
          <Link href="/dashboard/">Back to dashboard</Link>
        </Button>
      </div>
    );
  }

  const { branch } = report;
  const roleEntries = Object.entries(report.roleCounts);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 p-4 pb-8 lg:p-6">
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <Button asChild variant="ghost" className="mb-2 -ml-2 h-8 px-2 text-slate-600">
            <Link href="/dashboard/">
              <ArrowLeft className="mr-1 h-4 w-4" />
              All branches
            </Link>
          </Button>
          <h1 className="flex items-center gap-3 text-2xl font-bold text-slate-900 md:text-3xl">
            <span className="rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 p-2 shadow-lg">
              <Building2 className="h-6 w-6 text-white" />
            </span>
            {branch.name}
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            {report.chainName ? `${report.chainName} · ` : ''}
            {branch.street}, {branch.city}, {branch.state} {branch.pinCode}
          </p>
          <p className="text-sm text-slate-500">
            {branch.email} · {branch.phone}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" onClick={() => downloadReport(report)}>
            <Download className="mr-2 h-4 w-4" />
            Download report
          </Button>
          <Button type="button" onClick={() => printReport(report)}>
            <Printer className="mr-2 h-4 w-4" />
            Print report
          </Button>
        </div>
      </div>

      <section className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          ["Today's visits", report.stats.todayVisits],
          ['Active visits', report.stats.activeVisits],
          ['Total visitors', report.stats.totalVisitors],
          ['Staff', report.stats.totalStaff],
          ['Patients admitted', report.attendants.patientsAdmitted],
          ['Attendants', report.attendants.attendantsRegistered],
          ['Inside now', report.attendants.currentlyInside],
          ['Pending approval', report.attendants.pendingApproval],
        ].map(([label, value]) => (
          <Card key={String(label)} className="border-0 shadow-md">
            <CardContent className="p-4">
              <p className="text-2xl font-bold text-slate-900">{value}</p>
              <p className="mt-1 text-sm text-slate-500">{label}</p>
            </CardContent>
          </Card>
        ))}
      </section>

      <section className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="border-0 shadow-md">
          <CardHeader>
            <CardTitle className="text-lg">Hospital admin</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {report.hospitalAdmins.length === 0 ? (
              <p className="text-sm text-slate-500">No hospital admin for this branch yet.</p>
            ) : (
              <ul className="space-y-3">
                {report.hospitalAdmins.map((admin) => (
                  <li key={admin.id} className="rounded-lg bg-slate-50 p-3">
                    <p className="font-medium text-slate-900">{admin.name}</p>
                    <p className="text-sm text-slate-600">{admin.email}</p>
                    <p className="text-sm text-slate-600">{admin.phone}</p>
                  </li>
                ))}
              </ul>
            )}
            <form onSubmit={createAdmin} className="space-y-3 border-t border-slate-100 pt-4">
              <p className="flex items-center gap-2 text-sm font-medium text-slate-800">
                <UserPlus className="h-4 w-4 text-indigo-600" />
                Create hospital admin profile
              </p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label htmlFor="admin-name">Name</Label>
                  <Input id="admin-name" value={adminName} onChange={(e) => setAdminName(e.target.value)} required />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="admin-phone">Phone</Label>
                  <Input id="admin-phone" value={adminPhone} onChange={(e) => setAdminPhone(e.target.value)} inputMode="numeric" required />
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <Label htmlFor="admin-email">Email</Label>
                  <Input id="admin-email" type="email" value={adminEmail} onChange={(e) => setAdminEmail(e.target.value)} required />
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <Label htmlFor="admin-password">Password</Label>
                  <Input
                    id="admin-password"
                    type="password"
                    autoComplete="new-password"
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    placeholder="At least 8 characters — emailed to them"
                    required
                  />
                </div>
              </div>
              <Button type="submit" disabled={creating}>
                {creating ? 'Creating…' : 'Create profile'}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md">
          <CardHeader>
            <CardTitle className="text-lg">People at this branch</CardTitle>
          </CardHeader>
          <CardContent>
            {roleEntries.length === 0 ? (
              <p className="text-sm text-slate-500">No active users yet.</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {roleEntries.map(([role, count]) => (
                  <li key={role} className="flex items-center justify-between py-2 text-sm">
                    <span className="text-slate-700">{displayRole(role)}</span>
                    <span className="font-semibold text-slate-900">{count}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </section>

      <Card className="mb-6 border-0 shadow-md">
        <CardHeader>
          <CardTitle className="text-lg">Departments</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-slate-500">
                <th className="p-2 font-medium">Department</th>
                <th className="p-2 font-medium">Sub-departments</th>
                <th className="p-2 font-medium">Staff</th>
                <th className="p-2 font-medium">Today</th>
                <th className="p-2 font-medium">Pending</th>
                <th className="p-2 font-medium">Inside</th>
                <th className="p-2 font-medium">Completed</th>
              </tr>
            </thead>
            <tbody>
              {report.departments.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-6 text-center text-slate-400">
                    No departments
                  </td>
                </tr>
              ) : (
                report.departments.map((dept) => (
                  <tr key={dept.departmentId} className="border-b border-slate-100">
                    <td className="p-2 font-medium text-slate-900">{dept.departmentName}</td>
                    <td className="p-2">{dept.subDepartmentCount}</td>
                    <td className="p-2">{dept.staffCount}</td>
                    <td className="p-2">{dept.todayAppointments}</td>
                    <td className="p-2">{dept.pendingAppointments}</td>
                    <td className="p-2">{dept.activeVisits}</td>
                    <td className="p-2">{dept.completedAppointments}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Card className="border-0 shadow-md">
        <CardHeader>
          <CardTitle className="text-lg">Recent visits</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-slate-500">
                <th className="p-2 font-medium">When</th>
                <th className="p-2 font-medium">Visitor</th>
                <th className="p-2 font-medium">Purpose</th>
                <th className="p-2 font-medium">Staff</th>
                <th className="p-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {report.recentVisits.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-6 text-center text-slate-400">
                    No visits yet
                  </td>
                </tr>
              ) : (
                report.recentVisits.map((visit) => (
                  <tr key={visit.id} className="border-b border-slate-100">
                    <td className="p-2 whitespace-nowrap">{formatWhen(visit.when)}</td>
                    <td className="p-2">{visit.visitor}</td>
                    <td className="p-2">{visit.purpose}</td>
                    <td className="p-2">{visit.staffName || '—'}</td>
                    <td className="p-2">{visit.status}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
