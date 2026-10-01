import apiClient from '@/lib/api';

export interface ApprovalPreview {
  visitId: string;
  status: string;
  visitorName: string;
  doctorName: string | null;
  appointmentDate: string | null;
  purpose: string | null;
  appointmentMode: string;
  isCustomSlotRequest?: boolean;
  isOpenSlotRequest?: boolean;
  canAct: boolean;
  expired: boolean;
  used: boolean;
}

export const AppointmentApprovalApi = {
  async getPreview(token: string): Promise<ApprovalPreview> {
    const response = await apiClient.get<ApprovalPreview>(
      '/api/public/appointment-approval/preview',
      { params: { token } },
    );
    return response.data;
  },

  async approve(token: string): Promise<{ message: string; visitId: string; status: string }> {
    const response = await apiClient.post('/api/public/appointment-approval/approve', { token });
    return response.data;
  },

  async reject(token: string, reason?: string): Promise<{ message: string; visitId: string; status: string }> {
    const response = await apiClient.post('/api/public/appointment-approval/reject', {
      token,
      reason: reason ?? 'Declined via approval link',
    });
    return response.data;
  },
};
