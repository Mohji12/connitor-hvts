import apiClient from '@/lib/api';

export type MeetingConfirmStatus = 'started' | 'not_attended';

export interface MeetingConfirmPreview {
  passId: string;
  visitId: string;
  visitorName: string;
  doctorName: string;
  slotTime: string;
  meetingStatus: string | null;
  canAct: boolean;
  used: boolean;
  expired: boolean;
}

export const SalesMeetingConfirmApi = {
  async preview(passId: string, token: string): Promise<MeetingConfirmPreview> {
    const response = await apiClient.get<MeetingConfirmPreview>(
      `/api/pass/${passId}/confirm/preview`,
      { params: { token } },
    );
    return response.data;
  },

  async confirm(
    passId: string,
    token: string,
    status: MeetingConfirmStatus,
  ): Promise<{ message: string; meetingStatus: string; passId: string }> {
    const response = await apiClient.post(
      `/api/pass/${passId}/confirm`,
      {},
      { params: { token, status } },
    );
    return response.data;
  },
};
