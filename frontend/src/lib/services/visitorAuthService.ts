import apiClient from '@/lib/api';
import { getBackendApiPrefix } from '@/lib/backend-url';
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

  async forgotPassword(email: string): Promise<{ message: string; testResetLink?: string }> {
    const response = await apiClient.post('/api/public/visitor-auth/forgot-password', { email });
    return response.data;
  },

  async resetPassword(token: string, password: string): Promise<{ message: string }> {
    const response = await apiClient.post('/api/public/visitor-auth/reset-password', {
      token,
      password,
    });
    return response.data;
  },

  getGoogleAuthUrl(): string {
    return `${getBackendApiPrefix()}/api/public/visitor-auth/google`;
  },

  getLinkedInAuthUrl(): string {
    return `${getBackendApiPrefix()}/api/public/visitor-auth/linkedin`;
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
