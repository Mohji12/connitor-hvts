import apiClient from '@/lib/api';

export interface AttendantPatient {
  id: string;
  mrn: string;
  firstName: string;
  lastName: string;
  name: string;
}

export interface VisitingHours {
  admissionId?: string;
  date?: string;
  defaultWindow: {
    startTime: string;
    endTime: string;
    label?: string;
    everyDay?: boolean;
  };
  extraSlots?: VisitSlotRow[];
  summary?: string;
}

export interface VisitSlotRow {
  id: string;
  admissionId: string;
  branchId: string;
  visitDate?: string | null;
  startTime: string;
  endTime: string;
  label?: string | null;
  everyDay?: boolean;
  isActive?: boolean;
  patient?: { id: string; mrn: string; name: string } | null;
  wardName?: string | null;
  roomNumber?: string | null;
}

export interface AttendantAdmission {
  id: string;
  status: string;
  wardName?: string | null;
  roomNumber?: string | null;
  bedNumber?: string | null;
  department?: string | null;
  branchId: string;
  hasActivePass?: boolean;
  hasAttendantInside?: boolean;
  activePassId?: string | null;
  visitingHours?: VisitingHours;
  patient?: AttendantPatient | null;
}

export interface AttendantRow {
  id: string;
  name: string;
  email: string;
  phone: string;
  relationship?: string | null;
  photoUrl?: string | null;
  idProofType?: string | null;
  idProofUrl?: string | null;
  remarks?: string | null;
  specialPermissions?: string | null;
  maxEntries?: number | null;
  isEmergency?: boolean;
  status: string;
  admissionId: string;
  admission?: AttendantAdmission | null;
}

export interface AttendantPassRow {
  id: string;
  passNumber: string;
  status: string;
  attendantId: string;
  validFrom?: string | null;
  validTo?: string | null;
  expiresAt?: string | null;
  enteredAt?: string | null;
  exitedAt?: string | null;
  durationMinutes?: number | null;
  durationMinutesLive?: number | null;
  maxEntries?: number | null;
  entriesUsed?: number | null;
  isInside?: boolean;
  qrPayload?: string | null;
  qrSignature?: string | null;
  attendant?: AttendantRow | null;
  emailSent?: boolean;
}

export interface AmsDashboardSummary {
  stats: {
    patientsAdmitted: number;
    attendantsRegistered: number;
    currentlyInside: number;
    exitedToday: number;
    pendingApproval: number;
    emergencyPasses: number;
  };
  recentActivity: Array<{
    time?: string | null;
    name: string;
    patient: string;
    ward?: string | null;
    bed?: string | null;
    status: string;
    passNumber?: string;
    passId?: string;
  }>;
}

export interface AmsPassPolicy {
  id: string;
  branchId: string;
  maxPassesPerPatient: number;
  maxIcuAttendants: number;
  allowNightStay: boolean;
  qrValidityHours: number;
  defaultVisitStart: string;
  defaultVisitEnd: string;
  smsEnabled: boolean;
  whatsappEnabled: boolean;
  approvalRequired: boolean;
  idProofMandatory: boolean;
  photoMandatory: boolean;
  emergencySkipId: boolean;
}

export interface AttendantPassBranch {
  id: string;
  name: string;
  city: string;
  state: string;
  hospitalChainId: string;
  hospitalChainName?: string | null;
}

export interface AttendantAdmissionLookup {
  admissionId: string;
  patientFirstName: string;
  patientLastName?: string;
  patientName?: string;
  mrn?: string;
  wardName?: string | null;
  roomNumber?: string | null;
  hasActivePass: boolean;
  hasAttendantInside?: boolean;
  branchId: string;
  visitingHours?: VisitingHours;
}

export const AttendantPassService = {
  async listAdmissions(branchId: string): Promise<AttendantAdmission[]> {
    const res = await apiClient.get('/api/attendant-passes/admissions', {
      params: { branchId },
    });
    return res.data.items ?? [];
  },

  async createPatient(data: {
    branchId?: string;
    mrn: string;
    firstName: string;
    lastName: string;
    phone?: string;
  }): Promise<{ id: string; mrn: string; name: string; branchId: string }> {
    const res = await apiClient.post('/api/attendant-passes/patients', data);
    return res.data;
  },

  async createAdmission(data: {
    patientId: string;
    branchId?: string;
    wardName?: string;
    roomNumber?: string;
    bedNumber?: string;
    department?: string;
  }): Promise<AttendantAdmission> {
    const res = await apiClient.post('/api/attendant-passes/admissions', data);
    return res.data;
  },

  async listAttendants(branchId: string, admissionId?: string): Promise<AttendantRow[]> {
    const res = await apiClient.get('/api/attendant-passes/attendants', {
      params: { branchId, admissionId },
    });
    return res.data.items ?? [];
  },

  async registerAttendant(data: {
    admissionId: string;
    name: string;
    email: string;
    phone: string;
    relationship?: string;
  }): Promise<AttendantRow> {
    const res = await apiClient.post('/api/attendant-passes/attendants', data);
    return res.data;
  },

  async approveAttendant(attendantId: string): Promise<AttendantRow> {
    const res = await apiClient.post(`/api/attendant-passes/attendants/${attendantId}/approve`);
    return res.data;
  },

  async listPasses(branchId: string): Promise<AttendantPassRow[]> {
    const res = await apiClient.get('/api/attendant-passes/passes', {
      params: { branchId },
    });
    return res.data.items ?? [];
  },

  async issuePass(
    attendantId: string,
    revokeExisting = false,
  ): Promise<AttendantPassRow & { emailSent?: boolean }> {
    const res = await apiClient.post(`/api/attendant-passes/passes/${attendantId}/issue`, {
      revokeExisting,
    });
    return res.data;
  },

  async revokePass(passId: string): Promise<AttendantPassRow> {
    const res = await apiClient.post(`/api/attendant-passes/passes/${passId}/revoke`);
    return res.data;
  },

  async listVisitSlots(
    branchId: string,
    admissionId?: string,
  ): Promise<{ defaultWindow: VisitingHours['defaultWindow']; items: VisitSlotRow[] }> {
    const res = await apiClient.get('/api/attendant-passes/visit-slots', {
      params: { branchId, admissionId },
    });
    return {
      defaultWindow: res.data.defaultWindow,
      items: res.data.items ?? [],
    };
  },

  async createVisitSlot(data: {
    admissionId: string;
    startTime: string;
    endTime: string;
    visitDate?: string;
    label?: string;
  }): Promise<VisitSlotRow> {
    const res = await apiClient.post('/api/attendant-passes/visit-slots', data);
    return res.data;
  },

  async deleteVisitSlot(slotId: string): Promise<void> {
    await apiClient.delete(`/api/attendant-passes/visit-slots/${slotId}`);
  },

  async listPublicBranches(): Promise<AttendantPassBranch[]> {
    const res = await apiClient.get('/api/public/attendant-passes/branches');
    return res.data ?? [];
  },

  async searchAdmissionsByName(
    branchId: string,
    query: string,
  ): Promise<AttendantAdmissionLookup[]> {
    const res = await apiClient.get('/api/public/attendant-passes/admissions/search', {
      params: { branchId, q: query },
    });
    return res.data.items ?? [];
  },

  async lookupAdmission(branchId: string, mrn: string): Promise<AttendantAdmissionLookup> {
    const res = await apiClient.get('/api/public/attendant-passes/admissions/lookup', {
      params: { branchId, mrn },
    });
    return res.data;
  },

  async publicApply(data: {
    admissionId: string;
    name: string;
    email: string;
    phone: string;
    relationship?: string;
  }): Promise<AttendantRow> {
    const res = await apiClient.post('/api/public/attendant-passes/apply', data);
    return res.data;
  },

  async scanPass(form: FormData): Promise<Record<string, unknown>> {
    const res = await apiClient.post('/api/attendant-passes/passes/scan', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  },

  async dashboardSummary(branchId: string): Promise<AmsDashboardSummary> {
    const res = await apiClient.get('/api/attendant-passes/dashboard/summary', {
      params: { branchId },
    });
    return res.data;
  },

  async search(branchId: string, q?: string, status?: string): Promise<AttendantPassRow[]> {
    const res = await apiClient.get('/api/attendant-passes/search', {
      params: { branchId, q, status },
    });
    return res.data.items ?? [];
  },

  async listActive(branchId: string, ward?: string): Promise<AttendantPassRow[]> {
    const res = await apiClient.get('/api/attendant-passes/active', {
      params: { branchId, ward },
    });
    return res.data.items ?? [];
  },

  async extendPass(passId: string, validTo: string): Promise<AttendantPassRow> {
    const res = await apiClient.post(`/api/attendant-passes/passes/${passId}/extend`, { validTo });
    return res.data;
  },

  async suspendPass(passId: string): Promise<AttendantPassRow> {
    const res = await apiClient.post(`/api/attendant-passes/passes/${passId}/suspend`);
    return res.data;
  },

  async forceExit(passId: string): Promise<AttendantPassRow> {
    const res = await apiClient.post(`/api/attendant-passes/passes/${passId}/force-exit`);
    return res.data;
  },

  async shiftChange(data: {
    admissionId: string;
    name: string;
    phone: string;
    email?: string;
    relationship?: string;
    remarks?: string;
    maxEntries?: number;
    validFrom?: string;
    validTo?: string;
  }): Promise<{ attendant: AttendantRow; pass: AttendantPassRow }> {
    const res = await apiClient.post('/api/attendant-passes/shift-change', data);
    return res.data;
  },

  async emergencyPass(data: {
    admissionId: string;
    name: string;
    phone: string;
    email?: string;
    reason?: string;
    relationship?: string;
    validityHours?: number;
    maxEntries?: number;
  }): Promise<{ attendant: AttendantRow; pass: AttendantPassRow }> {
    const res = await apiClient.post('/api/attendant-passes/emergency', data);
    return res.data;
  },

  async getPolicy(branchId: string): Promise<AmsPassPolicy> {
    const res = await apiClient.get('/api/attendant-passes/policy', { params: { branchId } });
    return res.data;
  },

  async updatePolicy(branchId: string, data: Partial<AmsPassPolicy>): Promise<AmsPassPolicy> {
    const res = await apiClient.put('/api/attendant-passes/policy', data, {
      params: { branchId },
    });
    return res.data;
  },

  async reportsSummary(
    branchId: string,
    period: 'daily' | 'weekly' | 'monthly' = 'daily',
  ): Promise<Record<string, unknown>> {
    const res = await apiClient.get('/api/attendant-passes/reports/summary', {
      params: { branchId, period },
    });
    return res.data;
  },

  async issuePassFull(
    attendantId: string,
    data?: {
      revokeExisting?: boolean;
      validFrom?: string;
      validTo?: string;
      maxEntries?: number;
    },
  ): Promise<AttendantPassRow> {
    const res = await apiClient.post(`/api/attendant-passes/passes/${attendantId}/issue`, data ?? {});
    return res.data;
  },

  async registerAttendantFull(data: {
    admissionId: string;
    name: string;
    email?: string;
    phone: string;
    relationship?: string;
    photoUrl?: string;
    idProofType?: string;
    idProofUrl?: string;
    remarks?: string;
    specialPermissions?: string[];
    maxEntries?: number;
    isEmergency?: boolean;
  }): Promise<AttendantRow> {
    const res = await apiClient.post('/api/attendant-passes/attendants', data);
    return res.data;
  },
};
