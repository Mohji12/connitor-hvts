import apiClient from '@/lib/api';

export interface VisitSlotStaff {
  id: string;
  name: string | null;
  email: string | null;
  userType: string | null;
  departmentId: string | null;
  subDepartmentId: string | null;
}

export interface VisitSlotAllotmentRow {
  id: string;
  branchId: string;
  staffId: string;
  staffName: string | null;
  staffUserType: string | null;
  allotmentDate: string;
  windowStart: string;
  windowEnd: string;
  slotCount: number;
  source: string;
  booked: number;
  open: number;
  previewTimes: string[];
}

export interface VisitSlotDaySummary {
  date: string;
  dailyQuota: number;
  used: number;
  remaining: number;
  items: VisitSlotAllotmentRow[];
}

export interface VisitSlotRoutineRow {
  id: string;
  branchId: string;
  staffId: string;
  staffName: string | null;
  weekdays: number[];
  windowStart: string;
  windowEnd: string;
  slotCount: number;
  isActive: boolean;
}

export interface VisitSlotImportResult {
  created: number;
  updated: number;
  failed: number;
  rows: Array<{
    row: number;
    ok: boolean;
    action?: string;
    error?: string;
    staffName?: string | null;
    date?: string;
    windowStart?: string;
    windowEnd?: string;
    slotCount?: number;
  }>;
}

export const VisitSlotAllotmentService = {
  async getPolicy(branchId: string): Promise<{ branchId: string; dailyQuota: number }> {
    const response = await apiClient.get(`/api/branches/${branchId}/visit-slot-policy`);
    return response.data;
  },

  async updatePolicy(
    branchId: string,
    dailyQuota: number,
  ): Promise<{ branchId: string; dailyQuota: number }> {
    const response = await apiClient.put(`/api/branches/${branchId}/visit-slot-policy`, {
      dailyQuota,
    });
    return response.data;
  },

  async listStaff(branchId: string): Promise<{ items: VisitSlotStaff[] }> {
    const response = await apiClient.get(`/api/branches/${branchId}/visit-slot-staff`);
    return response.data;
  },

  async listAllotments(branchId: string, date: string): Promise<VisitSlotDaySummary> {
    const response = await apiClient.get(`/api/branches/${branchId}/visit-slot-allotments`, {
      params: { date },
    });
    return response.data;
  },

  async downloadTemplate(branchId: string): Promise<void> {
    const response = await apiClient.get(`/api/branches/${branchId}/visit-slot-allotments/template`, {
      responseType: 'blob',
    });
    const blob = new Blob([response.data], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'visit-slot-allotments-template.xlsx';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  },

  async importExcel(branchId: string, file: File): Promise<VisitSlotImportResult> {
    const form = new FormData();
    form.append('file', file);
    const response = await apiClient.post(
      `/api/branches/${branchId}/visit-slot-allotments/import`,
      form,
      {
        headers: { 'Content-Type': 'multipart/form-data' },
      },
    );
    return response.data;
  },

  async createAllotment(
    branchId: string,
    body: {
      staffId: string;
      date: string;
      startTime: string;
      endTime: string;
      slotCount: number;
    },
  ): Promise<VisitSlotAllotmentRow> {
    const response = await apiClient.post(`/api/branches/${branchId}/visit-slot-allotments`, body);
    return response.data;
  },

  async updateAllotment(
    branchId: string,
    allotmentId: string,
    body: { startTime?: string; endTime?: string; slotCount?: number },
  ): Promise<VisitSlotAllotmentRow> {
    const response = await apiClient.patch(
      `/api/branches/${branchId}/visit-slot-allotments/${allotmentId}`,
      body,
    );
    return response.data;
  },

  async deleteAllotment(branchId: string, allotmentId: string): Promise<{ deleted: boolean }> {
    const response = await apiClient.delete(
      `/api/branches/${branchId}/visit-slot-allotments/${allotmentId}`,
    );
    return response.data;
  },

  async listRoutines(branchId: string): Promise<{ items: VisitSlotRoutineRow[] }> {
    const response = await apiClient.get(`/api/branches/${branchId}/visit-slot-routines`);
    return response.data;
  },

  async createRoutine(
    branchId: string,
    body: {
      staffId: string;
      weekdays: number[];
      startTime: string;
      endTime: string;
      slotCount: number;
    },
  ): Promise<VisitSlotRoutineRow> {
    const response = await apiClient.post(`/api/branches/${branchId}/visit-slot-routines`, body);
    return response.data;
  },

  async deleteRoutine(branchId: string, routineId: string): Promise<{ deleted: boolean }> {
    const response = await apiClient.delete(
      `/api/branches/${branchId}/visit-slot-routines/${routineId}`,
    );
    return response.data;
  },

  async applyRoutines(
    branchId: string,
    body: { fromDate: string; toDate: string },
  ): Promise<{ created: number; updated: number; skipped: number }> {
    const response = await apiClient.post(
      `/api/branches/${branchId}/visit-slot-routines/apply`,
      body,
    );
    return response.data;
  },
};
