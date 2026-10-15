import axios from 'axios';
import apiClient from '@/lib/api';
import {
  clearVisitorToken,
  getVisitorToken,
  setVisitorToken,
} from '@/lib/services/visitorPortalService';

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

  async requestLoginOtp(phone: string): Promise<{ message: string; testOtp?: string }> {
    const response = await apiClient.post('/api/public/visitor-auth/login-otp/request', { phone });
    return response.data;
  },

  async loginWithOtp(phone: string, otp: string): Promise<VisitorAuthLoginResponse> {
    const response = await apiClient.post<VisitorAuthLoginResponse>(
      '/api/public/visitor-auth/login-otp/verify',
      { phone, otp },
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

  /**
   * True when the saved visitor session still works. Expired sessions, or ones whose profile
   * was removed, are cleared. Network errors keep the session so offline users stay signed in.
   */
  async hasValidSession(): Promise<boolean> {
    const token = getVisitorToken();
    if (!token) return false;
    let payload: { sub?: unknown; exp?: unknown } = {};
    try {
      payload = JSON.parse(atob(token.split('.')[1] ?? ''));
    } catch {
      clearVisitorToken();
      return false;
    }
    if (typeof payload.exp === 'number' && payload.exp * 1000 <= Date.now()) {
      clearVisitorToken();
      return false;
    }
    if (!payload.sub || String(payload.sub).includes('@')) return true;
    try {
      await apiClient.get('/api/public/visitor-accounts/me', {
        headers: { Authorization: `Bearer ${token}` },
      });
      return true;
    } catch (error: unknown) {
      const status = axios.isAxiosError(error) ? error.response?.status : undefined;
      if (status === 401 || status === 403 || status === 404) {
        clearVisitorToken();
        return false;
      }
      return true;
    }
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
