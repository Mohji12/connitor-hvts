import apiClient from '@/lib/api';

export type VisitorPassStatus = 'UNASSIGNED' | 'ASSIGNED' | 'VOID';

export interface VisitorPassRow {
  id: string;
  passId: string;
  branchId: string;
  date: string | null;
  sequence: number;
  status: VisitorPassStatus;
  source: string;
  createdByHospital: boolean;
  visitId: string | null;
  visitorName: string | null;
  visitorPhone: string | null;
  doctorName: string | null;
  appointmentDate: string | null;
  purpose: string | null;
  visitStatus: string | null;
  assignedAt: string | null;
}

export interface VisitorPassList {
  date: string;
  dailyQuota: number;
  allotted: number;
  unused: number;
  assigned: number;
  items: VisitorPassRow[];
}

export const VisitorPassService = {
  async getPolicy(branchId: string): Promise<{ branchId: string; dailyQuota: number }> {
    const response = await apiClient.get(`/api/branches/${branchId}/visitor-pass-policy`);
    return response.data;
  },

  async updatePolicy(
    branchId: string,
    dailyQuota: number,
  ): Promise<{ branchId: string; dailyQuota: number }> {
    const response = await apiClient.put(`/api/branches/${branchId}/visitor-pass-policy`, {
      dailyQuota,
    });
    return response.data;
  },

  async issue(
    branchId: string,
    data?: { date?: string; count?: number },
  ): Promise<VisitorPassList & { created: number; items: VisitorPassRow[] }> {
    const response = await apiClient.post(
      `/api/branches/${branchId}/visitor-passes/issue`,
      data ?? {},
    );
    return response.data;
  },

  async list(
    branchId: string,
    params?: { date?: string; q?: string },
  ): Promise<VisitorPassList> {
    const response = await apiClient.get(`/api/branches/${branchId}/visitor-passes`, { params });
    return response.data;
  },

  async listForSecurity(params?: {
    date?: string;
    q?: string;
    branchId?: string;
  }): Promise<VisitorPassList> {
    const response = await apiClient.get('/api/security/visitor-passes', { params });
    return response.data;
  },

  async assign(
    passId: string,
    data: {
      firstName: string;
      lastName: string;
      phone: string;
      purpose: string;
      doctorId?: string;
      appointmentDate?: string;
    },
  ): Promise<{ message: string; pass: VisitorPassRow }> {
    const response = await apiClient.post(`/api/visitor-passes/${passId}/assign`, data);
    return response.data;
  },
};
