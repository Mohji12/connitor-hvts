import apiClient from '@/lib/api';

export type UrgentPasscodeItem = {
  id: string;
  code: string;
  status: string;
  note?: string | null;
  purpose?: string | null;
  theme?: string | null;
  visitTime?: string | null;
  recipientName?: string | null;
  recipientPhone?: string | null;
  recipientEmail?: string | null;
  expiresAt: string;
  createdAt: string;
  redeemedAt?: string | null;
  visitId?: string | null;
  hostName?: string | null;
  validForHours: number;
};

export type UrgentPasscodePayload = {
  note?: string;
  purpose?: string;
  theme?: string;
  visitTime?: string;
  recipientName?: string;
  recipientPhone?: string;
  recipientEmail?: string;
};

export type ShareUrgentPasscodePayload = {
  channels: Array<'sms' | 'email'>;
  recipientName?: string;
  phone?: string;
  email?: string;
};

export type ShareUrgentPasscodeResponse = {
  id: string;
  code: string;
  sent: string[];
  failed: string[];
  recipientName?: string | null;
  recipientPhone?: string | null;
  recipientEmail?: string | null;
};

export type VerifyUrgentPasscodeResponse = {
  passcodeId: string;
  code: string;
  expiresAt: string;
  note?: string | null;
  purpose?: string | null;
  theme?: string | null;
  visitTime?: string | null;
  host: {
    id: string;
    name?: string | null;
    phone?: string | null;
    email?: string | null;
  };
  departmentId?: string | null;
  subDepartmentId?: string | null;
};

export type ConfirmVerifyUrgentPasscodeResponse = VerifyUrgentPasscodeResponse & {
  status: string;
  gateToken: string;
  registerUrl: string;
  gateTokenExpiresInMinutes: number;
  branchId?: string;
};

export type RedeemUrgentPasscodeResponse = {
  success: boolean;
  visitId: string;
  visitorId: string;
  checkInTime?: string | null;
  visitor: {
    firstName: string;
    lastName: string;
    email?: string | null;
    phone: string;
  };
  host: { name?: string | null };
};

function mapPasscodeError(detail: unknown): string {
  const code = typeof detail === 'string' ? detail : '';
  const messages: Record<string, string> = {
    PASSCODE_NOT_FOUND: 'Passcode not found. Check the digits and try again.',
    PASSCODE_ALREADY_USED: 'This passcode was already used.',
    PASSCODE_REVOKED: 'This passcode was cancelled by the doctor.',
    PASSCODE_EXPIRED: 'This passcode has expired. Ask the doctor for a new one.',
    PASSCODE_INVALID: 'Invalid passcode.',
    GATE_TOKEN_INVALID: 'Registration link expired. Ask security to verify the passcode again.',
  };
  return messages[code] || (typeof detail === 'string' ? detail : 'Could not verify passcode.');
}

export const UrgentPasscodeService = {
  async issue(payload: UrgentPasscodePayload = {}): Promise<UrgentPasscodeItem> {
    const res = await apiClient.post<UrgentPasscodeItem>('/api/staff/urgent-passcodes', {
      note: payload.note || undefined,
      purpose: payload.purpose || undefined,
      theme: payload.theme || undefined,
      visitTime: payload.visitTime || undefined,
      recipientName: payload.recipientName || undefined,
      recipientPhone: payload.recipientPhone || undefined,
      recipientEmail: payload.recipientEmail || undefined,
    });
    return res.data;
  },

  async update(id: string, payload: UrgentPasscodePayload): Promise<UrgentPasscodeItem> {
    const res = await apiClient.patch<UrgentPasscodeItem>(`/api/staff/urgent-passcodes/${id}`, {
      note: payload.note || undefined,
      purpose: payload.purpose || undefined,
      theme: payload.theme || undefined,
      visitTime: payload.visitTime || undefined,
      recipientName: payload.recipientName || undefined,
      recipientPhone: payload.recipientPhone || undefined,
      recipientEmail: payload.recipientEmail || undefined,
    });
    return res.data;
  },

  async share(id: string, payload: ShareUrgentPasscodePayload): Promise<ShareUrgentPasscodeResponse> {
    const res = await apiClient.post<ShareUrgentPasscodeResponse>(
      `/api/staff/urgent-passcodes/${id}/share`,
      payload,
    );
    return res.data;
  },

  async list(): Promise<UrgentPasscodeItem[]> {
    const res = await apiClient.get<{ items: UrgentPasscodeItem[] }>('/api/staff/urgent-passcodes');
    return res.data.items ?? [];
  },

  async revoke(id: string): Promise<void> {
    await apiClient.post(`/api/staff/urgent-passcodes/${id}/revoke`);
  },

  async verify(code: string): Promise<VerifyUrgentPasscodeResponse> {
    try {
      const res = await apiClient.post<VerifyUrgentPasscodeResponse>(
        '/api/security/urgent-passcodes/verify',
        { code },
      );
      return res.data;
    } catch (e: unknown) {
      const detail =
        typeof e === 'object' && e && 'response' in e
          ? (e as { response?: { data?: { detail?: string } } }).response?.data?.detail
          : undefined;
      throw new Error(mapPasscodeError(detail));
    }
  },

  async confirmVerify(code: string): Promise<ConfirmVerifyUrgentPasscodeResponse> {
    try {
      const res = await apiClient.post<ConfirmVerifyUrgentPasscodeResponse>(
        '/api/security/urgent-passcodes/confirm-verify',
        { code },
      );
      return res.data;
    } catch (e: unknown) {
      const detail =
        typeof e === 'object' && e && 'response' in e
          ? (e as { response?: { data?: { detail?: string } } }).response?.data?.detail
          : undefined;
      throw new Error(mapPasscodeError(detail));
    }
  },

  async redeem(payload: {
    code: string;
    firstName: string;
    lastName?: string;
    email: string;
    phone: string;
    reason: string;
  }): Promise<RedeemUrgentPasscodeResponse> {
    try {
      const res = await apiClient.post<RedeemUrgentPasscodeResponse>(
        '/api/security/urgent-passcodes/redeem',
        payload,
      );
      return res.data;
    } catch (e: unknown) {
      const detail =
        typeof e === 'object' && e && 'response' in e
          ? (e as { response?: { data?: { detail?: string } } }).response?.data?.detail
          : undefined;
      throw new Error(mapPasscodeError(detail) || 'Check-in failed.');
    }
  },
};
