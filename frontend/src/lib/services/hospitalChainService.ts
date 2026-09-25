import apiClient from '@/lib/api';
import {
  HospitalChainSchema,
  HospitalChainResponseSchema,
} from '@/lib/schema/schema';
import { z } from 'zod';

export const HospitalChainService = {
  async create(chainData: z.infer<typeof HospitalChainSchema>) {
    const validatedData = HospitalChainSchema.parse(chainData);
    const response = await apiClient.post(
      '/api/hospital-chains',
      validatedData,
    );
    console.log('[HospitalChainService.create] API response:', response.data);
    try {
      return HospitalChainResponseSchema.parse(response.data);
    } catch (err) {
      console.error('[HospitalChainService.create] Zod parse error:', err);
      throw new Error(
        'API response does not match expected HospitalChain schema. See console for details.',
      );
    }
  },

  async getAll() {
    const response = await apiClient.get('/api/hospital-chains');
    return z.array(HospitalChainResponseSchema).parse(response.data);
  },

  async getById(id: string) {
    const response = await apiClient.get(`/api/hospital-chains/${id}`);
    return HospitalChainResponseSchema.parse(response.data);
  },

  async update(
    id: string,
    chainData: Partial<z.infer<typeof HospitalChainSchema>>,
  ) {
    const validatedData = HospitalChainSchema.partial().parse(chainData);
    const response = await apiClient.put(
      `/api/hospital-chains/${id}`,
      validatedData,
    );
    return HospitalChainResponseSchema.parse(response.data);
  },

  async delete(id: string) {
    const response = await apiClient.delete(`/api/hospital-chains/${id}`);
    return response.data;
  },
};
