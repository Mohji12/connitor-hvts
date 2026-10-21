import apiClient from '@/lib/api';

export interface PublicDistributor {
  id: string;
  vendorName: string;
  vendorCode: string | null;
  city: string | null;
  state: string | null;
  goodsDescription: string | null;
}

export interface DistributorVisitSlot {
  id: string;
  slotStart: string;
  slotEnd: string;
  isBooked: boolean;
  visitId: string | null;
  label: string;
}

export interface DistributorVisitRecord {
  id: string;
  bookingId: string;
  hostKind: 'DISTRIBUTOR';
  status: string;
  purpose: string | null;
  appointmentDate: string | null;
  vendorName: string | null;
  visitorName: string | null;
  visitorPhone: string | null;
  visitorEmail: string | null;
  companyName: string | null;
  visitCode: string | null;
  visitQRCode: string | null;
  checkInQrCode: string | null;
  checkInOtp: string | null;
  checkInTime?: string | null;
  checkOutTime?: string | null;
  rejectionReason: string | null;
  branchName: string | null;
  departmentName: string | null;
  createdAt: string | null;
}

export const DistributorVisitService = {
  async listPublicDistributors(query?: string): Promise<PublicDistributor[]> {
    const res = await apiClient.get<{ items: PublicDistributor[] }>(
      '/api/public/distributor-visits/distributors',
      { params: query ? { q: query } : undefined },
    );
    return res.data.items ?? [];
  },

  async listAvailableDates(distributorId: string, from: string, to: string): Promise<string[]> {
    const res = await apiClient.get<{ dates: string[] }>(
      `/api/public/distributor-visits/${distributorId}/available-dates`,
      { params: { from, to } },
    );
    return res.data.dates ?? [];
  },

  async listPublicSlots(distributorId: string, date: string): Promise<DistributorVisitSlot[]> {
    const res = await apiClient.get<{ items: DistributorVisitSlot[] }>(
      `/api/public/distributor-visits/${distributorId}/slots`,
      { params: { date } },
    );
    return res.data.items ?? [];
  },

  async book(payload: { distributorId: string; slotId: string; purpose: string }): Promise<DistributorVisitRecord> {
    const res = await apiClient.post<DistributorVisitRecord>('/api/public/distributor-visits', payload);
    return res.data;
  },

  async listVendorSlots(from: string, to: string): Promise<DistributorVisitSlot[]> {
    const res = await apiClient.get<{ items: DistributorVisitSlot[] }>('/api/delivery/distributor-visit-slots', {
      params: { from, to },
    });
    return res.data.items ?? [];
  },

  async createVendorSlots(payload: {
    date: string;
    startTime: string;
    endTime: string;
    slotMinutes?: number;
  }): Promise<{ items: DistributorVisitSlot[]; created: number }> {
    const res = await apiClient.post<{ items: DistributorVisitSlot[]; created: number }>(
      '/api/delivery/distributor-visit-slots',
      payload,
    );
    return res.data;
  },

  async deleteVendorSlot(slotId: string): Promise<void> {
    await apiClient.delete(`/api/delivery/distributor-visit-slots/${slotId}`);
  },

  async listVendorVisits(status?: string): Promise<DistributorVisitRecord[]> {
    const res = await apiClient.get<{ items: DistributorVisitRecord[] }>('/api/delivery/distributor-visits', {
      params: status ? { status } : undefined,
    });
    return res.data.items ?? [];
  },

  async getVendorVisit(id: string): Promise<DistributorVisitRecord> {
    const res = await apiClient.get<DistributorVisitRecord>(`/api/delivery/distributor-visits/${id}`);
    return res.data;
  },

  async approveVisit(id: string): Promise<DistributorVisitRecord> {
    const res = await apiClient.post<DistributorVisitRecord>(`/api/delivery/distributor-visits/${id}/approve`);
    return res.data;
  },

  async rejectVisit(id: string, reason?: string): Promise<DistributorVisitRecord> {
    const res = await apiClient.post<DistributorVisitRecord>(`/api/delivery/distributor-visits/${id}/reject`, {
      reason,
    });
    return res.data;
  },

  async scanPass(payload: string): Promise<DistributorVisitRecord> {
    const res = await apiClient.post<DistributorVisitRecord>('/api/delivery/distributor-visits/scan', { payload });
    return res.data;
  },

  async checkIn(id: string): Promise<DistributorVisitRecord> {
    const res = await apiClient.post<DistributorVisitRecord>(`/api/delivery/distributor-visits/${id}/check-in`);
    return res.data;
  },

  async checkOut(id: string): Promise<DistributorVisitRecord> {
    const res = await apiClient.post<DistributorVisitRecord>(`/api/delivery/distributor-visits/${id}/check-out`);
    return res.data;
  },

  async listSecurityStaff(): Promise<DistributorSecurityStaff[]> {
    const res = await apiClient.get<{ items: DistributorSecurityStaff[] }>('/api/delivery/distributor-security');
    return res.data.items ?? [];
  },

  async createSecurityStaff(payload: {
    name: string;
    email: string;
    phone: string;
    password: string;
  }): Promise<DistributorSecurityStaff> {
    const res = await apiClient.post<DistributorSecurityStaff>('/api/delivery/distributor-security', payload);
    return res.data;
  },

  async setSecurityStaffActive(id: string, isActive: boolean): Promise<DistributorSecurityStaff> {
    const res = await apiClient.post<DistributorSecurityStaff>(`/api/delivery/distributor-security/${id}/active`, {
      isActive,
    });
    return res.data;
  },
};

export interface DistributorSecurityStaff {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  isActive: boolean;
  role: string;
  createdAt: string | null;
}
