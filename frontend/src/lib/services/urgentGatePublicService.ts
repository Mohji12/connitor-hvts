import apiClient from '@/lib/api';
import { getVisitorToken } from '@/lib/services/visitorPortalService';

export type UrgentGateSession = {
  passcodeId: string;
  status: string;
  branchId: string;
  branchName?: string | null;
  departmentId?: string | null;
  subDepartmentId?: string | null;
  theme?: string | null;
  purpose?: string | null;
  visitTime?: string | null;
  note?: string | null;
  host: {
    id: string;
    name?: string | null;
    phone?: string | null;
    email?: string | null;
  };
  gateTokenExpiresAt?: string;
};

export type UrgentGateBookResult = {
  success: boolean;
  bookingId: string;
  visitId: string;
  status: string;
  appointmentDate?: string | null;
  host: { id: string; name?: string | null };
  entryQrPayload: string;
  exitQrPayload: string;
  checkInOtp?: string | null;
  message: string;
};

function authHeaders(): Record<string, string> {
  const token = getVisitorToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export const UrgentGatePublicService = {
  async getSession(token: string): Promise<UrgentGateSession> {
    const res = await apiClient.get<UrgentGateSession>('/api/public/urgent-passcodes/session', {
      params: { token },
    });
    return res.data;
  },

  async book(payload: {
    token: string;
    slotId?: string;
    appointmentDate?: string;
    purpose?: string;
  }): Promise<UrgentGateBookResult> {
    const res = await apiClient.post<UrgentGateBookResult>(
      '/api/public/urgent-passcodes/book',
      payload,
      { headers: authHeaders() },
    );
    return res.data;
  },
};
