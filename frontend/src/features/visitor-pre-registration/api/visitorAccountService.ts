import apiClient from '@/lib/api';
import type { BasicInfoValues, ProfessionalValues, VisitorPreviewData } from '../schemas/visitorAccountSchema';

const BASE = '/api/public/visitor-accounts';

export const VisitorAccountApi = {
  async createDraft(data: BasicInfoValues): Promise<{
    accountId: string;
    profileStatus: string;
    resumed?: boolean;
  }> {
    const response = await apiClient.post(BASE, data);
    return response.data;
  },

  async updateProfessional(
    accountId: string,
    data: ProfessionalValues,
  ): Promise<{ accountId: string; profileStatus: string }> {
    const response = await apiClient.patch(`${BASE}/${accountId}`, {
      companyName: data.companyName,
      jobTitle: data.jobTitle,
      linkedinUrl: data.linkedinUrl || null,
    });
    return response.data;
  },

  async setPassword(
    accountId: string,
    password: string,
    acceptTerms: boolean,
  ): Promise<{ message: string }> {
    const response = await apiClient.post(`${BASE}/${accountId}/password`, {
      password,
      acceptTerms,
      privacyPolicyVersion: '2026-06-01',
    });
    return response.data;
  },

  async uploadPhoto(accountId: string, file: File): Promise<{ photoStorageKey: string }> {
    const form = new FormData();
    form.append('photo', file);
    const response = await apiClient.post(`${BASE}/${accountId}/photo`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  async uploadGovernmentId(
    accountId: string,
    file: File,
    govtIdType: string,
    govtIdTypeOther?: string,
  ): Promise<{ storageKey: string; govtIdType: string }> {
    const form = new FormData();
    form.append('document', file);
    form.append('govtIdType', govtIdType);
    if (govtIdTypeOther) form.append('govtIdTypeOther', govtIdTypeOther);
    const response = await apiClient.post(`${BASE}/${accountId}/government-id`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  async sendPhoneOtp(accountId: string): Promise<{ message: string; testOtp?: string }> {
    const response = await apiClient.post(`${BASE}/${accountId}/send-phone-otp`);
    return response.data;
  },

  async verifyPhone(
    accountId: string,
    otp: string,
  ): Promise<{
    message: string;
    phoneVerified?: boolean;
    activated?: boolean;
    profileStatus?: string;
    accountId?: string;
  }> {
    const response = await apiClient.post(`${BASE}/${accountId}/verify-phone`, { otp });
    return response.data;
  },

  async sendEmailVerification(accountId: string): Promise<{
    message: string;
    testEmailOtp?: string;
  }> {
    const response = await apiClient.post(`${BASE}/${accountId}/send-email-verification`);
    return response.data;
  },

  async verifyEmail(
    accountId: string,
    otp: string,
  ): Promise<{
    message: string;
    emailVerified?: boolean;
    activated?: boolean;
    profileStatus?: string;
    accountId?: string;
  }> {
    const response = await apiClient.post(`${BASE}/${accountId}/verify-email`, { otp });
    return response.data;
  },

  async verifyEmailToken(token: string): Promise<{
    message: string;
    accountId: string;
    emailVerified?: boolean;
    activated?: boolean;
    profileStatus?: string;
  }> {
    const response = await apiClient.get(`${BASE}/verify-email`, { params: { token } });
    return response.data;
  },

  async activate(accountId: string): Promise<{ accountId: string; profileStatus: string }> {
    const response = await apiClient.post(`${BASE}/${accountId}/activate`);
    return response.data;
  },

  async getPreview(accountId: string): Promise<VisitorPreviewData> {
    const response = await apiClient.get(`${BASE}/${accountId}/preview`);
    return response.data;
  },

  async getMyProfile(token: string): Promise<VisitorPreviewData> {
    const response = await apiClient.get(`${BASE}/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  },

  async updateMyProfile(
    token: string,
    data: Partial<ProfessionalValues>,
  ): Promise<VisitorPreviewData> {
    const response = await apiClient.patch(`${BASE}/me`, data, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  },
};
