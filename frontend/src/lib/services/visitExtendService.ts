import apiClient from '@/lib/api';

export interface VisitExtendPreview {
  visitId: string;
  visitorName: string;
  doctorName: string;
  expectedEndTime: string | null;
  allottedMinutes: number | null;
  canAct: boolean;
  used: boolean;
  expired: boolean;
}

export const VisitExtendApi = {
  async preview(visitId: string, token: string): Promise<VisitExtendPreview> {
    const response = await apiClient.get<VisitExtendPreview>('/api/public/visit-extensions/preview', {
      params: { visitId, token },
    });
    return response.data;
  },

  async confirm(
    visitId: string,
    token: string,
    minutes: number,
  ): Promise<{
    message: string;
    expectedEndTime: string | null;
    extendedByMinutes: number;
  }> {
    const response = await apiClient.post('/api/public/visit-extensions/confirm', {
      visitId,
      token,
      minutes,
    });
    return response.data;
  },
};
