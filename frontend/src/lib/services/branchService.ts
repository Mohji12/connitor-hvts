import apiClient from '@/lib/api';
import { BranchSchema, BranchResponseSchema } from '@/lib/schema/schema';
import { z } from 'zod';

export const BranchService = {
  async create(chainId: string, branchData: z.infer<typeof BranchSchema>) {
    const validatedData = BranchSchema.parse(branchData);
    const response = await apiClient.post(
      `/api/chain/${chainId}/branches`,
      validatedData,
    );
    return BranchResponseSchema.parse(response.data);
  },

  async getAll(chainId: string) {
    const response = await apiClient.get(`/api/chain/${chainId}/branches`);
    return z.array(BranchResponseSchema).parse(response.data);
  },

  async getById(chainId: string, branchId: string) {
    const response = await apiClient.get(
      `/api/chain/${chainId}/branches/${branchId}`,
    );
    return BranchResponseSchema.parse(response.data);
  },

  async update(
    chainId: string,
    branchId: string,
    branchData: Partial<z.infer<typeof BranchSchema>>,
  ) {
    const validatedData = BranchSchema.partial().parse(branchData);
    const response = await apiClient.patch(
      `/api/chain/${chainId}/branches/${branchId}`,
      validatedData,
    );
    return BranchResponseSchema.parse(response.data);
  },

  async delete(chainId: string, branchId: string) {
    const response = await apiClient.delete(
      `/api/chain/${chainId}/branches/${branchId}`,
    );
    return response.data;
  },

  async getAllBranches() {
    const response = await apiClient.get('/api/branches/all-branches');
    return z.array(BranchResponseSchema).parse(response.data);
  },

  async generateQR(chainId: string, branchId: string) {
    const response = await apiClient.post(
      `/api/chain/${chainId}/branches/${branchId}/generate-qr`,
    );
    return response.data;
  },
};
