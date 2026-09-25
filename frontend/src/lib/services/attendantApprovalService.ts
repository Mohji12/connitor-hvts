import apiClient from '@/lib/api';

export interface AttendantApprovalPreview {
  attendantId: string;
  status: string;
  attendantName: string;
  attendantPhone: string;
  attendantEmail: string;
  relationship: string | null;
  patientName: string;
  patientMrn: string | null;
  wardName: string | null;
  roomNumber: string | null;
  hospitalName: string | null;
  canAct: boolean;
  expired: boolean;
  used: boolean;
}

export const AttendantApprovalApi = {
  async getPreview(token: string): Promise<AttendantApprovalPreview> {
    const response = await apiClient.get<AttendantApprovalPreview>(
      '/api/public/attendant-passes/approval/preview',
      { params: { token } },
    );
    return response.data;
  },

  async approve(token: string): Promise<{ message: string; attendantId: string; status: string }> {
    const response = await apiClient.post('/api/public/attendant-passes/approval/approve', {
      token,
    });
    return response.data;
  },

  async reject(
    token: string,
    reason?: string,
  ): Promise<{ message: string; attendantId: string; status: string }> {
    const response = await apiClient.post('/api/public/attendant-passes/approval/reject', {
      token,
      reason: reason ?? 'Declined via approval link',
    });
    return response.data;
  },
};
