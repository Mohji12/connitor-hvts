import apiClient from '@/lib/api';
import axios from 'axios';
import {
  UserFormSchema,
  UserResponseSchema,
  UserUpdateSchema,
  UserUpdateData,
} from '@/lib/schema/schema';
import z from 'zod';

function getApiErrorMessage(error: unknown, fallback: string): string {
  if (axios.isAxiosError(error) && error.response?.data) {
    const data = error.response.data as { message?: string; detail?: string };
    return data.message ?? data.detail ?? fallback;
  }
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return fallback;
}

export const UserService = {
  async create(userData: z.infer<typeof UserFormSchema> & { password?: string }) {
    const validatedData = UserFormSchema.parse(userData);
    try {
      const response = await apiClient.post<{
        credentialsEmailSent?: boolean;
        emailWarning?: string;
      }>('/api/users', {
        ...validatedData,
        password: userData.password,
      });
      const user = UserResponseSchema.parse(response.data);
      return {
        user,
        credentialsEmailSent: response.data.credentialsEmailSent === true,
        emailWarning: response.data.emailWarning,
      };
    } catch (error) {
      throw new Error(getApiErrorMessage(error, 'Failed to create user.'));
    }
  },

  async getAll(params?: {
    role?: string;
    isActive?: boolean;
    branchId?: string;
    department?: string;
    departmentId?: string;
    subDepartmentId?: string;
    chainId?: string;
  }) {
    // Convert isActive to string as expected by backend
    type QueryParams = {
      role?: string;
      isActive?: string;
      branchId?: string;
      department?: string;
      departmentId?: string;
      subDepartmentId?: string;
      chainId?: string;
    };
    const queryParams: QueryParams = {
      ...params,
      isActive:
        typeof params?.isActive === 'boolean'
          ? params.isActive
            ? 'true'
            : 'false'
          : params?.isActive,
    };
    if (params?.chainId !== undefined) {
      queryParams.chainId = params.chainId;
    }
    const response = await apiClient.get('/api/users', { params: queryParams });
    return z.array(UserResponseSchema).parse(response.data);
  },

  async getStaffByBranch(branchId: string) {
    const response = await apiClient.get(
      `/api/users/staff/by-branch/${branchId}`,
    );
    return response.data;
  },

  async getDepartmentsByBranch(branchId: string) {
    const response = await apiClient.get(
      `/api/users/departments/by-branch/${branchId}`,
    );
    return response.data;
  },

  async getStaffByDepartment(branchId: string, department: string) {
    const response = await apiClient.get(
      `/api/users/staff/by-department/${branchId}/${department}`,
    );
    return response.data;
  },

  async getById(id: string) {
    const response = await apiClient.get(`/api/users/${id}`);
    return UserResponseSchema.parse(response.data);
  },

  async update(id: string, userData: UserUpdateData) {
    const validatedData = UserUpdateSchema.parse(userData);
    try {
      const response = await apiClient.put(`/api/users/${id}`, validatedData);
      return UserResponseSchema.parse(response.data);
    } catch (error) {
      throw new Error(getApiErrorMessage(error, 'Failed to update user.'));
    }
  },

  async delete(id: string) {
    const response = await apiClient.delete(`/api/users/${id}`);
    return response.data;
  },
};
