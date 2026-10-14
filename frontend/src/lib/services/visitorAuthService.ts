import apiClient from '@/lib/api';
import { getVisitorToken, setVisitorToken } from '@/lib/services/visitorPortalService';

export interface VisitorAuthLoginResponse {
  access_token: string;
  token_type: string;
  accountId: string;
  name: string;
}

export const VisitorAuthService = {
  async login(identifier: string, password: string): Promise<VisitorAuthLoginResponse> {
    const response = await apiClient.post<VisitorAuthLoginResponse>(
      '/api/public/visitor-auth/login',
      { identifier, password },
    );
    setVisitorToken(response.data.access_token);
    return response.data;
  },

  async forgotPassword(phone: string): Promise<{ message: string; testOtp?: string }> {
    const response = await apiClient.post('/api/public/visitor-auth/forgot-password', { phone });
    return response.data;
  },

  async resetPassword(phone: string, otp: string, password: string): Promise<{ message: string }> {
    const response = await apiClient.post('/api/public/visitor-auth/reset-password', {
      phone,
      otp,
      password,
    });
    return response.data;
  },

  storeOAuthToken(token: string): void {
    setVisitorToken(token);
  },

  isAccountSession(): boolean {
    const token = getVisitorToken();
    if (!token) return false;
    try {
      const payload = JSON.parse(atob(token.split('.')[1] ?? ''));
      return Boolean(payload.sub && !String(payload.sub).includes('@'));
    } catch {
      return false;
    }
  },
};
