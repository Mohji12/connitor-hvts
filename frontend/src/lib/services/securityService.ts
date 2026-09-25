import apiClient from '@/lib/api';
import { RejectVisitFormData } from '@/lib/schema/schema';

export const SecurityService = {
  async approveVisit(visitId: string) {
    const response = await apiClient.patch(
      `/api/security/visits/${visitId}/approve`,
    );
    return response.data;
  },

  async rejectVisit(visitId: string, data: RejectVisitFormData) {
    const response = await apiClient.patch(
      `/api/security/visits/${visitId}/reject`,
      data,
    );
    return response.data;
  },
};
