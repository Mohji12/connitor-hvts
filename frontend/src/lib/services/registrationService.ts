import apiClient from '@/lib/api';
import {
  PublicBranchSchema,
  PublicHospitalChainSchema,
  SelfRegistrationFormSchema,
  type SelfRegistrationFormData,
} from '@/lib/schema/schema';
import { z } from 'zod';

export class RegistrationService {
  static async getHospitalChains() {
    const res = await apiClient.get('/api/public/registration/hospital-chains/');
    return z.array(PublicHospitalChainSchema).parse(res.data);
  }

  static async getBranches(chainId: string) {
    const res = await apiClient.get(
      `/api/public/registration/chains/${chainId}/branches/`,
    );
    return z.array(PublicBranchSchema).parse(res.data);
  }

  static async register(data: SelfRegistrationFormData) {
    const payload = SelfRegistrationFormSchema.parse(data);
    const body = {
      ...payload,
      email: payload.email.trim().toLowerCase(),
    };
    const res = await apiClient.post<{
      message: string;
      email: string;
      testOtp?: string;
    }>('/api/public/registration/register/', body);
    return res.data;
  }

  static async verifyOtp(email: string, otp: string) {
    const res = await apiClient.post<{ message: string; verified: boolean }>(
      '/api/public/registration/register/verify-otp/',
      { email: email.trim().toLowerCase(), otp: otp.trim() },
    );
    return res.data;
  }

  static async resendOtp(email: string) {
    const res = await apiClient.post<{ message: string; testOtp?: string }>(
      '/api/public/registration/register/resend-otp/',
      { email: email.trim().toLowerCase() },
    );
    return res.data;
  }
}
