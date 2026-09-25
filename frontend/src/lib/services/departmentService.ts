import apiClient from '@/lib/api';
import type { Department, SubDepartment } from '@/lib/schema/schema';

export const DepartmentService = {
  async list(params?: { branchId?: string; chainId?: string }): Promise<Department[]> {
    const response = await apiClient.get<Department[]>('/api/departments', { params });
    return response.data;
  },

  async getById(id: string): Promise<Department> {
    const response = await apiClient.get<Department>(`/api/departments/${id}`);
    return response.data;
  },

  async create(data: Omit<Department, 'id' | 'isActive' | 'createdAt'>): Promise<Department> {
    const response = await apiClient.post<Department>('/api/departments', data);
    return response.data;
  },

  async update(id: string, data: Partial<Department>): Promise<Department> {
    const response = await apiClient.patch<Department>(`/api/departments/${id}`, data);
    return response.data;
  },

  async remove(id: string): Promise<Department> {
    const response = await apiClient.delete<Department>(`/api/departments/${id}`);
    return response.data;
  },
};

export const SubDepartmentService = {
  async list(params?: { departmentId?: string; branchId?: string }): Promise<SubDepartment[]> {
    const response = await apiClient.get<SubDepartment[]>('/api/sub-departments', { params });
    return response.data;
  },

  async getById(id: string): Promise<SubDepartment> {
    const response = await apiClient.get<SubDepartment>(`/api/sub-departments/${id}`);
    return response.data;
  },

  async create(
    data: Omit<SubDepartment, 'id' | 'isActive' | 'createdAt'>
  ): Promise<SubDepartment> {
    const response = await apiClient.post<SubDepartment>('/api/sub-departments', data);
    return response.data;
  },

  async update(id: string, data: Partial<SubDepartment>): Promise<SubDepartment> {
    const response = await apiClient.patch<SubDepartment>(`/api/sub-departments/${id}`, data);
    return response.data;
  },

  async remove(id: string): Promise<SubDepartment> {
    const response = await apiClient.delete<SubDepartment>(`/api/sub-departments/${id}`);
    return response.data;
  },
};
