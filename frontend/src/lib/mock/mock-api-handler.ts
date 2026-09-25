import type { AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import { mockStore } from './mock-store';

function sleep(ms = 120) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getRequestPath(config: InternalAxiosRequestConfig): string {
  const rawUrl = config.url ?? '';
  const base = (config.baseURL ?? '').replace(/\/$/, '');
  const joined = rawUrl.startsWith('http')
    ? rawUrl
    : `${base}${rawUrl.startsWith('/') ? '' : '/'}${rawUrl}`;

  try {
    const url = new URL(joined, 'http://mock.local');
    return `${url.pathname}${url.search}`;
  } catch {
    return rawUrl;
  }
}

function getSearchParams(path: string): URLSearchParams {
  const queryIndex = path.indexOf('?');
  if (queryIndex === -1) return new URLSearchParams();
  return new URLSearchParams(path.slice(queryIndex + 1));
}

function getPathname(path: string): string {
  const queryIndex = path.indexOf('?');
  const raw = queryIndex === -1 ? path : path.slice(0, queryIndex);
  if (raw.length > 1 && raw.endsWith('/')) {
    return raw.slice(0, -1);
  }
  return raw;
}

function parseBody(config: InternalAxiosRequestConfig): Record<string, unknown> {
  if (!config.data) return {};
  if (typeof config.data === 'string') {
    try {
      return JSON.parse(config.data) as Record<string, unknown>;
    } catch {
      return {};
    }
  }
  if (config.data instanceof FormData) {
    const result: Record<string, unknown> = {};
    config.data.forEach((value, key) => {
      result[key] = value;
    });
    return result;
  }
  return config.data as Record<string, unknown>;
}

function ok<T>(config: InternalAxiosRequestConfig, data: T, status = 200): AxiosResponse<T> {
  return {
    data,
    status,
    statusText: 'OK',
    headers: {},
    config,
  };
}

function getDemoUserId(config: InternalAxiosRequestConfig): string | undefined {
  const header = config.headers?.['x-demo-user-id'];
  if (typeof header === 'string') return header;
  return undefined;
}

function getVisitorEmailFromAuth(config: InternalAxiosRequestConfig): string | null {
  const auth = config.headers?.Authorization ?? config.headers?.authorization;
  if (typeof auth !== 'string') return null;
  const match = auth.match(/^Bearer visitor-mock-([A-Za-z0-9+/=]+)$/i);
  if (!match?.[1]) return null;
  try {
    return atob(match[1]).toLowerCase();
  } catch {
    return null;
  }
}

function handleRoute(
  config: InternalAxiosRequestConfig,
): AxiosResponse<unknown> {
  const fullPath = getRequestPath(config);
  const pathname = getPathname(fullPath);
  const params = getSearchParams(fullPath);
  const method = (config.method ?? 'get').toLowerCase();
  const body = parseBody(config);
  const demoUserId = getDemoUserId(config);
  const currentUser = mockStore.getCurrentUser(demoUserId);

  // Auth
  if (pathname === '/api/auth/login' && method === 'post') {
    return ok(config, { message: 'OTP sent', testOtp: '123456' });
  }
  if (pathname === '/api/auth/login-password' && method === 'post') {
    return ok(config, { access_token: 'demo-token' });
  }
  if (pathname === '/api/auth/verify-otp' && method === 'post') {
    return ok(config, { access_token: 'demo-token' });
  }

  // Notifications
  if (pathname === '/api/notifications/unread' && method === 'get') {
    return ok(config, mockStore.getUnreadNotifications(currentUser.id));
  }
  if (pathname.match(/^\/api\/notifications\/[^/]+\/read$/) && method === 'patch') {
    const id = pathname.split('/')[3];
    mockStore.markNotificationRead(id);
    return ok(config, { success: true });
  }

  // Users
  if (pathname === '/api/users' && method === 'get') {
    const query: Record<string, string | undefined> = {};
    params.forEach((value, key) => {
      query[key] = value;
    });
    return ok(config, mockStore.filterUsers(query));
  }
  if (pathname === '/api/users' && method === 'post') {
    return ok(config, mockStore.createUser(body), 201);
  }
  if (pathname.match(/^\/api\/users\/[^/]+$/) && method === 'get') {
    const id = pathname.split('/')[3];
    return ok(config, mockStore.getUserById(id) ?? null);
  }
  if (pathname.match(/^\/api\/users\/[^/]+$/) && method === 'put') {
    const id = pathname.split('/')[3];
    return ok(config, mockStore.updateUser(id, body));
  }
  if (pathname.match(/^\/api\/users\/[^/]+$/) && method === 'delete') {
    const id = pathname.split('/')[3];
    return ok(config, mockStore.deactivateUser(id));
  }
  if (pathname.match(/^\/api\/users\/staff\/by-branch\/[^/]+$/) && method === 'get') {
    const branchId = pathname.split('/')[5];
    return ok(config, mockStore.getStaffByBranch(branchId));
  }
  if (pathname.match(/^\/api\/users\/departments\/by-branch\/[^/]+$/) && method === 'get') {
    const branchId = pathname.split('/')[5];
    return ok(config, mockStore.getDepartmentsByBranch(branchId));
  }
  if (
    pathname.match(/^\/api\/users\/staff\/by-department\/[^/]+\/[^/]+$/) &&
    method === 'get'
  ) {
    const parts = pathname.split('/');
    return ok(
      config,
      mockStore.getStaffByDepartment(parts[5], decodeURIComponent(parts[6])),
    );
  }

  // Hospital chains
  if (pathname === '/api/hospital-chains' && method === 'get') {
    return ok(config, mockStore.chains);
  }
  if (pathname === '/api/hospital-chains' && method === 'post') {
    const chain = {
      ...body,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    };
    mockStore.chains.push(chain as never);
    return ok(config, chain, 201);
  }
  if (pathname.match(/^\/api\/hospital-chains\/[^/]+$/) && method === 'get') {
    const id = pathname.split('/')[3];
    return ok(config, mockStore.getChainById(id));
  }
  if (pathname.match(/^\/api\/hospital-chains\/[^/]+$/) && method === 'put') {
    const id = pathname.split('/')[3];
    const chain = mockStore.getChainById(id);
    if (chain) Object.assign(chain, body);
    return ok(config, chain);
  }
  if (pathname.match(/^\/api\/hospital-chains\/[^/]+$/) && method === 'delete') {
    const id = pathname.split('/')[3];
    mockStore.chains = mockStore.chains.filter((chain) => chain.id !== id);
    return ok(config, { success: true });
  }

  // Branches
  if (pathname === '/api/branches/all-branches' && method === 'get') {
    return ok(config, mockStore.branches);
  }
  if (pathname.match(/^\/api\/chain\/[^/]+\/branches$/) && method === 'get') {
    const chainId = pathname.split('/')[3];
    return ok(
      config,
      mockStore.branches.filter((branch) => branch.hospitalChainId === chainId),
    );
  }
  if (pathname.match(/^\/api\/chain\/[^/]+\/branches$/) && method === 'post') {
    const chainId = pathname.split('/')[3];
    const branch = {
      ...body,
      id: crypto.randomUUID(),
      hospitalChainId: chainId,
      createdAt: new Date().toISOString(),
    };
    mockStore.branches.push(branch as never);
    return ok(config, branch, 201);
  }
  if (pathname.match(/^\/api\/chain\/[^/]+\/branches\/[^/]+$/) && method === 'get') {
    const branchId = pathname.split('/')[5];
    return ok(config, mockStore.getBranchById(branchId));
  }
  if (pathname.match(/^\/api\/chain\/[^/]+\/branches\/[^/]+$/) && method === 'patch') {
    const branchId = pathname.split('/')[5];
    const branch = mockStore.getBranchById(branchId);
    if (branch) Object.assign(branch, body);
    return ok(config, branch);
  }
  if (pathname.match(/^\/api\/chain\/[^/]+\/branches\/[^/]+$/) && method === 'delete') {
    const branchId = pathname.split('/')[5];
    mockStore.branches = mockStore.branches.filter((branch) => branch.id !== branchId);
    return ok(config, { success: true });
  }
  if (
    pathname.match(/^\/api\/chain\/[^/]+\/branches\/[^/]+\/generate-qr$/) &&
    method === 'post'
  ) {
    const branchId = pathname.split('/')[5];
    const branch = mockStore.getBranchById(branchId);
    if (branch) branch.qrCode = `https://demo.hvts.local/register?branchId=${branchId}`;
    return ok(config, branch);
  }

  // Departments
  if (pathname === '/api/departments' && method === 'get') {
    const query: Record<string, string | undefined> = {};
    params.forEach((value, key) => {
      query[key] = value;
    });
    return ok(config, mockStore.filterDepartments(query, currentUser));
  }
  if (pathname === '/api/departments' && method === 'post') {
    return ok(config, mockStore.createDepartment(body), 201);
  }
  if (pathname.match(/^\/api\/departments\/[^/]+$/) && method === 'get') {
    const id = pathname.split('/')[3];
    return ok(config, mockStore.getDepartmentById(id) ?? null);
  }
  if (pathname.match(/^\/api\/departments\/[^/]+$/) && method === 'patch') {
    const id = pathname.split('/')[3];
    return ok(config, mockStore.updateDepartment(id, body));
  }
  if (pathname.match(/^\/api\/departments\/[^/]+$/) && method === 'delete') {
    const id = pathname.split('/')[3];
    return ok(config, mockStore.deactivateDepartment(id));
  }

  // Sub-departments
  if (pathname === '/api/sub-departments' && method === 'get') {
    const query: Record<string, string | undefined> = {};
    params.forEach((value, key) => {
      query[key] = value;
    });
    return ok(config, mockStore.filterSubDepartments(query, currentUser));
  }
  if (pathname === '/api/sub-departments' && method === 'post') {
    return ok(config, mockStore.createSubDepartment(body), 201);
  }
  if (pathname.match(/^\/api\/sub-departments\/[^/]+$/) && method === 'get') {
    const id = pathname.split('/')[3];
    return ok(config, mockStore.getSubDepartmentById(id) ?? null);
  }
  if (pathname.match(/^\/api\/sub-departments\/[^/]+$/) && method === 'patch') {
    const id = pathname.split('/')[3];
    return ok(config, mockStore.updateSubDepartment(id, body));
  }
  if (pathname.match(/^\/api\/sub-departments\/[^/]+$/) && method === 'delete') {
    const id = pathname.split('/')[3];
    return ok(config, mockStore.deactivateSubDepartment(id));
  }

  // Public appointments
  if (pathname === '/api/public/appointments/hospitals' && method === 'get') {
    return ok(config, mockStore.listPublicHospitals());
  }
  if (pathname === '/api/public/appointments/departments' && method === 'get') {
    const branchId = params.get('branchId') ?? '';
    return ok(config, mockStore.listPublicDepartments(branchId));
  }
  if (pathname === '/api/public/appointments/sub-departments' && method === 'get') {
    const departmentId = params.get('departmentId') ?? '';
    return ok(config, mockStore.listPublicSubDepartments(departmentId));
  }
  if (pathname === '/api/public/appointments/doctors' && method === 'get') {
    const subDepartmentId = params.get('subDepartmentId') ?? '';
    return ok(config, mockStore.listPublicDoctors(subDepartmentId));
  }
  if (pathname === '/api/public/appointments' && method === 'post') {
    try {
      return ok(config, mockStore.bookAppointment(body), 201);
    } catch {
      return ok(config, { message: 'Invalid booking selection' }, 400);
    }
  }
  if (pathname.match(/^\/api\/public\/appointments\/[^/]+\/status$/) && method === 'get') {
    const bookingId = pathname.split('/')[4];
    const phone = params.get('phone') ?? '';
    try {
      return ok(config, mockStore.getBookingStatus(bookingId, phone));
    } catch {
      return ok(config, { message: 'Booking not found' }, 404);
    }
  }
  if (pathname.match(/^\/api\/public\/appointments\/[^/]+\/whatsapp-simulation$/) && method === 'get') {
    const bookingId = pathname.split('/')[4];
    const phone = params.get('phone') ?? '';
    try {
      return ok(config, mockStore.getWhatsappSimulation(bookingId, phone));
    } catch {
      return ok(config, { message: 'Booking not found' }, 404);
    }
  }
  if (pathname === '/api/webhooks/whatsapp/simulate-reply' && method === 'post') {
    return ok(
      config,
      mockStore.simulateWhatsAppDoctorReply({
        fromPhone: String(body.from_phone ?? ''),
        buttonId: body.button_id ? String(body.button_id) : undefined,
        body: body.body ? String(body.body) : undefined,
      }),
    );
  }

  // Visitor portal (patient dashboard)
  if (pathname === '/api/public/visitor-portal/request-otp' && method === 'post') {
    try {
      return ok(config, mockStore.requestVisitorPortalOtp(String(body.email ?? '')));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Request failed';
      return ok(config, { message }, 404);
    }
  }
  if (pathname === '/api/public/visitor-portal/verify-otp' && method === 'post') {
    try {
      return ok(
        config,
        mockStore.verifyVisitorPortalOtp(
          String(body.email ?? ''),
          String(body.otp ?? ''),
        ),
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Invalid OTP';
      return ok(config, { message }, 401);
    }
  }
  if (pathname === '/api/public/visitor-portal/appointments' && method === 'get') {
    const email = getVisitorEmailFromAuth(config);
    if (!email) {
      return ok(config, { message: 'Unauthorized' }, 401);
    }
    try {
      return ok(config, mockStore.getVisitorPortalAppointments(email));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unauthorized';
      return ok(config, { message }, 401);
    }
  }

  // Authenticated appointments
  if (pathname === '/api/appointments' && method === 'get') {
    const query: Record<string, string | undefined> = {};
    params.forEach((value, key) => {
      query[key] = value;
    });
    return ok(config, mockStore.filterAppointments(query, currentUser));
  }

  // Analytics
  if (
    pathname === '/api/analytics/super-admin/dashboard' ||
    pathname === '/api/analytics/super-admin/dashboard/'
  ) {
    return ok(config, mockStore.getSuperAdminDashboard(params.get('period') ?? 'weekly'));
  }
  if (pathname === '/api/analytics/super-admin/overview') {
    return ok(config, mockStore.getAnalyticsOverview());
  }
  if (pathname === '/api/analytics/super-admin/visitor-trends') {
    return ok(config, mockStore.getTrendData(params.get('period') ?? 'weekly'));
  }
  if (pathname === '/api/analytics/super-admin/visit-status-distribution') {
    return ok(config, mockStore.getStatusDistribution());
  }
  if (pathname === '/api/analytics/super-admin/visit-category-distribution') {
    return ok(config, mockStore.getCategoryDistribution());
  }
  if (pathname === '/api/analytics/super-admin/user-role-distribution') {
    return ok(config, mockStore.getRoleDistribution());
  }
  if (pathname === '/api/analytics/super-admin/chains/stats') {
    return ok(
      config,
      mockStore.chains.map((chain) => mockStore.getChainStats(chain.id)),
    );
  }
  if (pathname === '/api/analytics/super-admin/branches/stats') {
    return ok(
      config,
      mockStore.branches.map((branch) => mockStore.getBranchStats(branch.id)),
    );
  }
  if (pathname.match(/^\/api\/analytics\/super-admin\/chain\/[^/]+\/stats$/)) {
    const chainId = pathname.split('/')[5];
    return ok(config, mockStore.getChainStats(chainId));
  }
  if (pathname.match(/^\/api\/analytics\/super-admin\/branch\/[^/]+\/stats$/)) {
    const branchId = pathname.split('/')[5];
    return ok(config, mockStore.getBranchStats(branchId));
  }
  if (pathname === '/api/analytics/super-admin/chains/growth') {
    return ok(config, mockStore.getGrowthData('chains'));
  }
  if (pathname === '/api/analytics/super-admin/branches/growth') {
    return ok(config, mockStore.getGrowthData('branches'));
  }
  if (pathname === '/api/analytics/chain-admin/overview') {
    const chainId = params.get('chainId') ?? currentUser.hospitalChainId ?? '';
    return ok(config, mockStore.getChainStats(chainId));
  }
  if (pathname === '/api/analytics/chain-admin/visitor-trends') {
    return ok(config, mockStore.getTrendData(params.get('period') ?? 'weekly'));
  }
  if (pathname === '/api/analytics/chain-admin/branches/stats') {
    const chainId = params.get('chainId') ?? currentUser.hospitalChainId ?? '';
    const branches = mockStore.branches.filter(
      (branch) => branch.hospitalChainId === chainId,
    );
    return ok(
      config,
      branches.map((branch) => mockStore.getBranchStats(branch.id)),
    );
  }
  if (pathname === '/api/analytics/branch-admin/visitor-trends') {
    return ok(config, mockStore.getTrendData(params.get('period') ?? 'hourly'));
  }
  if (pathname === '/api/analytics/security/visitor-trends') {
    return ok(config, mockStore.getTrendData(params.get('period') ?? 'hourly'));
  }
  if (pathname === '/api/analytics/staff/visitor-trends') {
    return ok(config, mockStore.getTrendData(params.get('period') ?? 'hourly'));
  }
  if (pathname === '/api/analytics/department-admin/overview') {
    const departmentId = currentUser.departmentId ?? '';
    return ok(config, mockStore.getDepartmentOverview(departmentId));
  }
  if (pathname === '/api/analytics/hospital-admin/overview') {
    const branchId = currentUser.branchId ?? '';
    return ok(config, mockStore.getBranchStats(branchId));
  }
  if (pathname === '/api/analytics/hospital-admin/visitor-trends') {
    return ok(config, mockStore.getTrendData(params.get('period') ?? 'weekly'));
  }
  if (pathname === '/api/analytics/hospital-admin/departments/stats') {
    const branchId = currentUser.branchId ?? '';
    return ok(config, mockStore.getDepartmentStatsForBranch(branchId));
  }
  if (pathname === '/api/analytics/sub-department-admin/overview') {
    const subDepartmentId = currentUser.subDepartmentId ?? '';
    return ok(config, mockStore.getSubDepartmentOverview(subDepartmentId));
  }
  if (pathname === '/api/analytics/department-admin/visitor-trends') {
    return ok(config, mockStore.getTrendData(params.get('period') ?? 'weekly'));
  }
  if (pathname === '/api/analytics/sub-department-admin/visitor-trends') {
    return ok(config, mockStore.getTrendData(params.get('period') ?? 'weekly'));
  }
  if (pathname === '/api/analytics/visit-duration') {
    return ok(config, mockStore.getVisitDurationStats(currentUser));
  }

  // Visitors
  if (pathname === '/api/visitors/active' && method === 'get') {
    const branchId = currentUser.branchId ?? '';
    const active = mockStore
      .visitsForBranch(branchId)
      .filter((visit) => visit.status === 'CHECKED_IN')
      .map((visit) => mockStore.toSummaryRow(visit));
    return ok(config, active);
  }
  if (pathname === '/api/visitors/summary' && method === 'get') {
    const branchId = params.get('branchId') ?? currentUser.branchId ?? '';
    const visits = mockStore.visitsForBranch(branchId).map((visit) =>
      mockStore.toSummaryRow(visit),
    );
    return ok(config, { data: visits, total: visits.length, page: 1, limit: visits.length });
  }
  if (pathname === '/api/visitors/check-by-phone' && method === 'get') {
    const phone = params.get('phone') ?? '';
    const branchId = params.get('branchId') ?? '';
    const visitor = mockStore.visitors.find(
      (item) => item.phone === phone && item.branchId === branchId,
    );
    return ok(config, visitor ? { exists: true, visitor } : { exists: false });
  }
  if (pathname.match(/^\/api\/visitors\/checkout\/[^/]+$/) && method === 'patch') {
    const visitId = pathname.split('/')[4];
    const result = mockStore.checkOutVisit(visitId);
    return ok(config, result ?? { success: false }, result ? 200 : 404);
  }
  if (pathname.match(/^\/api\/visitors\/checkin\/[^/]+$/) && method === 'post') {
    const visitId = pathname.split('/')[4];
    const result = mockStore.checkInVisit(visitId, currentUser.id);
    if ('error' in result) {
      return ok(
        config,
        { success: false, error: result.error, message: result.error },
        400,
      );
    }
    const visit = result.visit;
    const visitor = visit ? mockStore.getVisitorById(visit.visitorId) : undefined;
    return ok(config, {
      success: true,
      message: 'Checked in successfully',
      visitId,
      checkInTime: visit?.checkInTime,
      visitor: visitor
        ? { id: visitor.id, firstName: visitor.firstName, lastName: visitor.lastName }
        : null,
    });
  }
  if (
    pathname.match(/^\/api\/visitors\/download\/[^/]+\/[^/]+$/) &&
    method === 'get'
  ) {
    return ok(config, new Blob(['demo'], { type: 'application/pdf' }));
  }
  if (pathname.startsWith('/api/visitors/') && ['post', 'patch'].includes(method)) {
    return ok(config, { success: true, message: 'Saved successfully (demo mode)' });
  }

  // Public visitors
  if (pathname === '/api/public/visitors/branch-info' && method === 'get') {
    const branchId = params.get('branchId') ?? '';
    return ok(config, mockStore.getBranchInfo(branchId));
  }
  if (pathname === '/api/public/visitors/check-by-phone' && method === 'get') {
    const phone = params.get('phone') ?? '';
    const branchId = params.get('branchId') ?? '';
    const visitor = mockStore.visitors.find(
      (item) => item.phone === phone && item.branchId === branchId,
    );
    return ok(config, visitor ? { exists: true, visitor } : { exists: false });
  }
  if (pathname === '/api/public/visitors/send-otp' && method === 'post') {
    return ok(
      config,
      mockStore.sendOtp(String(body.phone ?? ''), String(body.branchId ?? '')),
    );
  }
  if (pathname === '/api/public/visitors/verify-phone' && method === 'post') {
    return ok(
      config,
      mockStore.verifyPhone(
        String(body.phone ?? ''),
        String(body.branchId ?? ''),
        String(body.otp ?? '123456'),
      ),
    );
  }
  if (pathname.match(/^\/api\/public\/visits\/[^/]+\/status$/) && method === 'get') {
    const visitId = pathname.split('/')[4];
    return ok(config, mockStore.getVisitStatusPayload(visitId));
  }
  if (pathname.startsWith('/api/public/visitors')) {
    return ok(config, {
      success: true,
      visitId: crypto.randomUUID(),
      message: 'Saved successfully (demo mode)',
    });
  }

  // Security
  if (pathname.match(/^\/api\/security\/visits\/[^/]+\/verify-id-proof$/) && method === 'post') {
    const visitId = pathname.split('/')[4];
    try {
      mockStore.verifyIdProof(
        visitId,
        currentUser.id,
        String(body.idProofType ?? 'AADHAAR'),
        String(body.idProofNumber ?? ''),
      );
      return ok(config, { message: 'ID proof verified successfully.' });
    } catch {
      return ok(config, { message: 'Verification failed' }, 400);
    }
  }
  if (pathname === '/api/security/appointments/today' && method === 'get') {
    const branchId = currentUser.branchId ?? '';
    return ok(config, mockStore.getTodayAppointments(branchId));
  }
  if (pathname === '/api/security/appointments/pending' && method === 'get') {
    const branchId = currentUser.branchId ?? '';
    return ok(config, mockStore.getPendingAppointments(branchId));
  }
  if (pathname === '/api/security/visitors/counts' && method === 'get') {
    const branchId = params.get('branchId') ?? currentUser.branchId ?? '';
    return ok(config, {
      success: true,
      data: mockStore.getSecurityCounts(branchId),
    });
  }
  if (pathname === '/api/security/visitors' && method === 'get') {
    const branchId = params.get('branchId') ?? currentUser.branchId ?? '';
    const statuses = params.getAll('status');
    let visits = mockStore.visitsForBranch(branchId);
    if (statuses.length > 0) {
      visits = visits.filter((visit) => statuses.includes(visit.status));
    }
    const visitors = visits.map((visit) => mockStore.toVisitorProfile(visit));
    return ok(config, {
      success: true,
      data: { visitors, totalCount: visitors.length },
    });
  }
  if (pathname.match(/^\/api\/security\/visits\/[^/]+\/approve$/) && method === 'patch') {
    const visitId = pathname.split('/')[4];
    return ok(config, mockStore.approveVisit(visitId));
  }
  if (pathname.match(/^\/api\/security\/visits\/[^/]+\/reject$/) && method === 'patch') {
    const visitId = pathname.split('/')[4];
    return ok(config, mockStore.rejectVisit(visitId, String(body.reason ?? 'Rejected')));
  }

  // Staff
  if (pathname === '/api/staff/pending-visits' && method === 'get') {
    return ok(config, mockStore.getStaffPendingVisits(currentUser.id));
  }
  if (pathname === '/api/staff/history' && method === 'get') {
    return ok(config, mockStore.getStaffHistory(currentUser.id));
  }
  if (pathname.match(/^\/api\/staff\/visits\/[^/]+\/approve$/) && method === 'patch') {
    const visitId = pathname.split('/')[4];
    const doctorFeedback =
      typeof body.doctorFeedback === 'string' ? body.doctorFeedback : undefined;
    return ok(config, mockStore.approveVisit(visitId, doctorFeedback));
  }
  if (pathname.match(/^\/api\/staff\/visits\/[^/]+\/reject$/) && method === 'patch') {
    const visitId = pathname.split('/')[4];
    return ok(config, mockStore.rejectVisit(visitId, String(body.reason ?? 'Rejected')));
  }

  // Visitor search / verify OTP
  if (pathname.startsWith('/api/visitors/search') && method === 'get') {
    const phone = params.get('phone') ?? '';
    const branchId = params.get('branchId') ?? '';
    const visits = mockStore
      .visitsForBranch(branchId)
      .filter((visit) => {
        const visitor = mockStore.getVisitorById(visit.visitorId);
        return visitor?.phone === phone;
      })
      .map((visit) => mockStore.toSummaryRow(visit));
    return ok(config, { data: visits });
  }
  if (pathname === '/api/visitors/verify-checkin-otp' && method === 'post') {
    const otp = String(body.otp ?? body.visitCode ?? '');
    const branchId = String(body.branchId ?? currentUser.branchId ?? '');
    const visit = mockStore.visits.find(
      (item) => item.visitCode === otp || item.checkInOtp === otp,
    );
    if (!visit) {
      return ok(config, { success: false, message: 'Invalid code' }, 400);
    }
    const payload = mockStore.buildVerifyOtpResponse(visit, branchId);
    if (!payload) {
      return ok(config, { success: false, message: 'Invalid code' }, 400);
    }
    return ok(config, payload);
  }

  console.warn('[mock-api] Unhandled route:', method.toUpperCase(), pathname);
  return ok(config, { success: true, message: 'Demo mock response' });
}

export async function handleMockRequest(
  config: InternalAxiosRequestConfig,
): Promise<AxiosResponse> {
  await sleep();
  return handleRoute(config);
}
