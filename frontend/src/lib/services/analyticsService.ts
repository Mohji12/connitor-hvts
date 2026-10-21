import apiClient from '@/lib/api';

// Type definitions
export interface SystemOverview {
  totalChains: number;
  totalBranches: number;
  totalDepartments?: number;
  totalSubDepartments?: number;
  totalStaff: number;
  totalVisitors: number;
  activeVisits: number;
  todayVisits: number;
}

export interface VisitorTrendDataPoint {
  label: string;
  visits: number;
  checkIns: number;
  checkOuts: number;
}

export interface VisitorTrends {
  period: string;
  data: VisitorTrendDataPoint[];
}

export interface VisitStatusDistribution {
  status: string;
  count: number;
}

export interface VisitCategoryDistribution {
  category: string;
  count: number;
}

export interface UserRoleDistribution {
  role: string;
  count: number;
}

export interface ChainStats {
  chainId: string;
  chainName: string;
  totalBranches: number;
  totalStaff: number;
  totalVisitors: number;
  activeVisits: number;
  todayVisits: number;
}

export interface BranchStats {
  branchId: string;
  branchName: string;
  totalStaff: number;
  departmentAdminCount?: number;
  totalVisitors: number;
  activeVisits: number;
  todayVisits: number;
}

export interface ChainBranchReport {
  generatedAt: string;
  chainName: string | null;
  branch: {
    id: string;
    name: string;
    email: string;
    phone: string;
    street: string;
    city: string;
    state: string;
    pinCode: string;
    country: string;
    slug: string | null;
  };
  stats: BranchStats;
  roleCounts: Record<string, number>;
  hospitalAdmins: Array<{
    id: string;
    name: string;
    email: string;
    phone: string;
    isActive: boolean;
  }>;
  departments: Array<{
    departmentId: string;
    departmentName: string;
    subDepartmentCount: number;
    staffCount: number;
    todayAppointments: number;
    pendingAppointments: number;
    activeVisits: number;
    completedAppointments: number;
  }>;
  attendants: {
    patientsAdmitted: number;
    attendantsRegistered: number;
    currentlyInside: number;
    pendingApproval: number;
  };
  recentVisits: Array<{
    id: string;
    visitor: string;
    purpose: string;
    staffName: string | null;
    status: string;
    when: string | null;
  }>;
}

export interface GrowthDataPoint {
  label: string;
  count: number;
}

export interface GrowthData {
  period: string;
  data: GrowthDataPoint[];
}

export type TrendPeriod = 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly';

export type TrendRangeQuery = { fromTime?: string; toTime?: string };

function trendQuery(period: TrendPeriod | 'custom', range?: TrendRangeQuery): Record<string, string | undefined> {
  return {
    period: period === 'custom' ? 'daily' : period,
    fromTime: range?.fromTime,
    toTime: range?.toTime,
  };
}

export interface VisitDurationStats {
  avgMinutes: number;
  minMinutes: number;
  maxMinutes: number;
  count: number;
}

export interface HierarchyOverview {
  departmentId?: string;
  departmentName?: string;
  subDepartmentId?: string;
  subDepartmentName?: string;
  subDepartmentCount?: number;
  staffCount: number;
  doctorCount?: number;
  todayAppointments: number;
  pendingAppointments: number;
  activeVisits: number;
  completedAppointments: number;
  statusBreakdown: Record<string, number>;
  visitDuration: VisitDurationStats;
}

export interface SuperAdminDashboardPayload {
  chains: unknown[];
  branches: unknown[];
  staff: unknown[];
  overview: SystemOverview;
  visitorTrends: VisitorTrends;
  visitStatusDistribution: VisitStatusDistribution[];
  visitCategoryDistribution: VisitCategoryDistribution[];
  userRoleDistribution: UserRoleDistribution[];
  chainStats: ChainStats[];
}

export const AnalyticsService = {
  /** One request for the whole Super Admin overview (fast path). */
  async getSuperAdminDashboard(
    period: TrendPeriod | 'custom' = 'weekly',
    range?: TrendRangeQuery,
  ): Promise<SuperAdminDashboardPayload> {
    const response = await apiClient.get('/api/analytics/super-admin/dashboard/', {
      params: trendQuery(period, range),
    });
    return response.data;
  },

  // System overview metrics
  async getSystemOverview(): Promise<SystemOverview> {
    const response = await apiClient.get('/api/analytics/super-admin/overview');
    return response.data;
  },

  // Visitor trends
  async getVisitorTrends(
    period: TrendPeriod | 'custom' = 'weekly',
    range?: TrendRangeQuery,
  ): Promise<VisitorTrends> {
    const response = await apiClient.get('/api/analytics/super-admin/visitor-trends', {
      params: trendQuery(period, range),
    });
    return response.data;
  },

  // Visit status distribution
  async getVisitStatusDistribution(): Promise<VisitStatusDistribution[]> {
    const response = await apiClient.get('/api/analytics/super-admin/visit-status-distribution');
    return response.data;
  },

  // Visit category distribution (Meeting vs Delivery)
  async getVisitCategoryDistribution(): Promise<VisitCategoryDistribution[]> {
    const response = await apiClient.get('/api/analytics/super-admin/visit-category-distribution');
    return response.data;
  },

  // User role distribution
  async getUserRoleDistribution(): Promise<UserRoleDistribution[]> {
    const response = await apiClient.get('/api/analytics/super-admin/user-role-distribution');
    return response.data;
  },

  // All chains with stats
  async getAllChainsWithStats(): Promise<ChainStats[]> {
    const response = await apiClient.get('/api/analytics/super-admin/chains/stats');
    return response.data;
  },

  // All branches with stats
  async getAllBranchesWithStats(): Promise<BranchStats[]> {
    const response = await apiClient.get('/api/analytics/super-admin/branches/stats');
    return response.data;
  },

  // Single chain stats
  async getChainStats(chainId: string): Promise<ChainStats> {
    const response = await apiClient.get(`/api/analytics/super-admin/chain/${chainId}/stats`);
    return response.data;
  },

  // Single branch stats
  async getBranchStats(branchId: string): Promise<BranchStats> {
    const response = await apiClient.get(`/api/analytics/super-admin/branch/${branchId}/stats`);
    return response.data;
  },

  // Chain growth over time
  async getChainGrowth(): Promise<GrowthData> {
    const response = await apiClient.get('/api/analytics/super-admin/chains/growth');
    return response.data;
  },

  // Branch growth over time
  async getBranchGrowth(): Promise<GrowthData> {
    const response = await apiClient.get('/api/analytics/super-admin/branches/growth');
    return response.data;
  },

  // =================================================================
  // Chain Admin specific analytics
  // =================================================================

  // Chain Admin overview
  async getChainAdminOverview(chainId: string): Promise<ChainStats> {
    const response = await apiClient.get('/api/analytics/chain-admin/overview', {
      params: { chainId },
    });
    return response.data;
  },

  // Chain Admin visitor trends
  async getChainVisitorTrends(
    chainId: string,
    period: TrendPeriod | 'custom' = 'weekly',
    range?: TrendRangeQuery,
  ): Promise<VisitorTrends> {
    const response = await apiClient.get('/api/analytics/chain-admin/visitor-trends', {
      params: { chainId, ...trendQuery(period, range) },
    });
    return response.data;
  },

  // Chain Admin branches stats
  async getChainBranchesStats(chainId: string): Promise<BranchStats[]> {
    const response = await apiClient.get('/api/analytics/chain-admin/branches/stats', {
      params: { chainId },
    });
    return response.data;
  },

  async getChainBranchReport(branchId: string): Promise<ChainBranchReport> {
    const response = await apiClient.get(
      `/api/analytics/chain-admin/branches/${encodeURIComponent(branchId)}/report`,
    );
    return response.data;
  },

  // =================================================================
  // Branch Admin specific analytics
  // =================================================================

  // Branch Admin visitor trends (hourly, daily, weekly, monthly, yearly)
  async getBranchVisitorTrends(
    branchId: string,
    period: TrendPeriod | 'custom' = 'hourly',
    range?: TrendRangeQuery,
  ): Promise<VisitorTrends> {
    const response = await apiClient.get('/api/analytics/branch-admin/visitor-trends', {
      params: { branchId, ...trendQuery(period, range) },
    });
    return response.data;
  },

  // =================================================================
  // Security specific analytics
  // =================================================================

  async getSecurityVisitorTrends(
    branchId: string,
    period: TrendPeriod | 'custom' = 'hourly',
    range?: TrendRangeQuery,
  ): Promise<VisitorTrends> {
    const response = await apiClient.get('/api/analytics/security/visitor-trends', {
      params: { branchId, ...trendQuery(period, range) },
    });
    return response.data;
  },

  // =================================================================
  // Staff specific analytics
  // =================================================================

  async getStaffVisitorTrends(
    branchId: string,
    period: TrendPeriod | 'custom' = 'hourly',
    range?: TrendRangeQuery,
  ): Promise<VisitorTrends> {
    const response = await apiClient.get('/api/analytics/staff/visitor-trends', {
      params: { branchId, ...trendQuery(period, range) },
    });
    return response.data;
  },

  // =================================================================
  // Department / Sub-Department Admin analytics
  // =================================================================

  async getHospitalAdminOverview(): Promise<BranchStats> {
    const response = await apiClient.get('/api/analytics/hospital-admin/overview');
    return response.data;
  },

  async getHospitalAdminVisitorTrends(
    period: TrendPeriod | 'custom' = 'weekly',
    range?: TrendRangeQuery,
  ): Promise<VisitorTrends> {
    const response = await apiClient.get('/api/analytics/hospital-admin/visitor-trends', {
      params: trendQuery(period, range),
    });
    return response.data;
  },

  async getHospitalAdminDepartmentStats(): Promise<HierarchyOverview[]> {
    const response = await apiClient.get('/api/analytics/hospital-admin/departments/stats');
    return response.data;
  },

  async getDepartmentAdminOverview(): Promise<HierarchyOverview> {
    const response = await apiClient.get('/api/analytics/department-admin/overview');
    return response.data;
  },

  async getSubDepartmentAdminOverview(): Promise<HierarchyOverview> {
    const response = await apiClient.get('/api/analytics/sub-department-admin/overview');
    return response.data;
  },

  async getDepartmentVisitorTrends(
    period: TrendPeriod | 'custom' = 'weekly',
    range?: TrendRangeQuery,
  ): Promise<VisitorTrends> {
    const response = await apiClient.get('/api/analytics/department-admin/visitor-trends', {
      params: trendQuery(period, range),
    });
    return response.data;
  },

  async getSubDepartmentVisitorTrends(
    period: TrendPeriod | 'custom' = 'weekly',
    range?: TrendRangeQuery,
  ): Promise<VisitorTrends> {
    const response = await apiClient.get('/api/analytics/sub-department-admin/visitor-trends', {
      params: trendQuery(period, range),
    });
    return response.data;
  },

  async getVisitDurationStats(): Promise<VisitDurationStats> {
    const response = await apiClient.get('/api/analytics/visit-duration');
    return response.data;
  },
};
