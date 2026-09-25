import apiClient from '@/lib/api';
import {
  RegisterVisitorSchema,
  CreateVisitRequestSchema,
  VerifyVisitCodeSchema,
  PublicRegisterVisitorSchema,
} from '@/lib/schema/schema';
import z from 'zod';

// Helper to convert object to FormData for file uploads
function toFormData(data: Record<string, unknown>): FormData {
  const formData = new FormData();
  Object.entries(data).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      formData.append(key, value as string | Blob);
    }
  });
  return formData;
}

export const VisitorService = {
  async checkByPhone(phone: string, branchId: string) {
    const response = await apiClient.get('/api/visitors/check-by-phone', {
      params: { phone, branchId },
    });
    return response.data;
  },

  async registerVisitor(
    visitorData: z.infer<typeof RegisterVisitorSchema>,
    files?: {
      photo?: File;
      governmentIdDocument?: File;
      officeIdDocument?: File;
    },
  ) {
    const validatedData = RegisterVisitorSchema.parse(visitorData);
    const formData = toFormData(validatedData);
    if (files?.photo) formData.append('photo', files.photo);
    if (files?.governmentIdDocument)
      formData.append('governmentIdDocument', files.governmentIdDocument);
    if (files?.officeIdDocument)
      formData.append('officeIdDocument', files.officeIdDocument);

    const response = await apiClient.post('/api/visitors/register', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  async createVisitRequest(
    visitRequestData: z.infer<typeof CreateVisitRequestSchema>,
  ) {
    const validatedData = CreateVisitRequestSchema.parse(visitRequestData);
    const response = await apiClient.post(
      '/api/visitors/request-visit',
      validatedData,
    );
    return response.data;
  },

  async verifyCode(data: z.infer<typeof VerifyVisitCodeSchema>) {
    const validatedData = VerifyVisitCodeSchema.parse(data);
    const response = await apiClient.post(
      '/api/visitors/verify-code',
      validatedData,
    );
    return response.data;
  },

  async scanQRCode(qrPayload: string) {
    const response = await apiClient.post('/api/visitors/scan-qr', { qrPayload });
    return response.data;
  },

  async checkOut(visitId: string) {
    const response = await apiClient.patch(`/api/visitors/checkout/${visitId}`);
    return response.data;
  },

  async getActiveVisitors() {
    const response = await apiClient.get('/api/visitors/active');
    return response.data;
  },

  async getVisitorSummary(params?: {
    date?: string;
    startDate?: string;
    endDate?: string;
    status?: string;
    personToMeet?: number;
    search?: string;
    page?: number;
    limit?: number;
    skip?: number;
    take?: number;
  }) {
    const response = await apiClient.get('/api/visitors/summary', { params });
    const payload = response.data ?? {};
    const rows = payload.data ?? payload.visits ?? [];
    return {
      ...payload,
      data: rows,
      total: payload.total ?? rows.length,
      page: payload.page ?? 1,
      limit: payload.limit ?? payload.take ?? rows.length,
    };
  },

  async updateVisitor(
    visitorId: string,
    visitorData: z.infer<typeof RegisterVisitorSchema>,
    files?: {
      photo?: File;
      governmentIdDocument?: File;
      officeIdDocument?: File;
    },
  ) {
    const validatedData = RegisterVisitorSchema.parse(visitorData);
    const formData = toFormData(validatedData);
    if (files?.photo) formData.append('photo', files.photo);
    if (files?.governmentIdDocument)
      formData.append('governmentIdDocument', files.governmentIdDocument);
    if (files?.officeIdDocument)
      formData.append('officeIdDocument', files.officeIdDocument);

    const response = await apiClient.patch(
      `/api/visitors/update/${visitorId}`,
      formData,
      {
        headers: { 'Content-Type': 'multipart/form-data' },
      },
    );
    return response.data;
  },

  async downloadDocument(visitorId: string, documentType: string) {
    const response = await apiClient.get(
      `/api/visitors/download/${visitorId}/${documentType}`,
      {
        responseType: 'blob',
      },
    );
    return response.data;
  },

  // ---------- PUBLIC ENDPOINTS ----------
  async publicCheckByPhone(phone: string, branchId: string) {
    const response = await apiClient.get(
      '/api/public/visitors/check-by-phone',
      {
        params: { phone, branchId },
      },
    );
    return response.data;
  },

  async getBranchInfo(branchId: string) {
    const response = await apiClient.get('/api/public/visitors/branch-info', {
      params: { branchId },
    });
    return response.data;
  },

  async publicRegisterVisitor(
    branchId: string,
    visitorData: z.infer<typeof PublicRegisterVisitorSchema>,
    files?: {
      photo?: File;
      governmentIdDocument?: File;
      officeIdDocument?: File;
    },
  ) {
    const validatedData = PublicRegisterVisitorSchema.parse(visitorData);
    const formData = toFormData(validatedData);
    if (files?.photo) formData.append('photo', files.photo);
    if (files?.governmentIdDocument)
      formData.append('governmentIdDocument', files.governmentIdDocument);
    if (files?.officeIdDocument)
      formData.append('officeIdDocument', files.officeIdDocument);

    const response = await apiClient.post(
      `/api/public/visitors/register?branchId=${branchId}`,
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } },
    );
    return response.data;
  },

  async publicCreateVisitRequest(
    branchId: string,
    visitRequestData: z.infer<typeof CreateVisitRequestSchema>,
  ) {
    const validatedData = CreateVisitRequestSchema.parse(visitRequestData);
    const response = await apiClient.post(
      `/api/public/visitors/request-visit?branchId=${branchId}`,
      validatedData,
    );
    return response.data;
  },

  async publicUpdateVisitor(
    visitorId: string,
    branchId: string,
    visitorData: z.infer<typeof PublicRegisterVisitorSchema>,
    files?: {
      photo?: File;
      governmentIdDocument?: File;
      officeIdDocument?: File;
    },
  ) {
    const validatedData = PublicRegisterVisitorSchema.parse(visitorData);
    const formData = toFormData(validatedData);
    if (files?.photo) formData.append('photo', files.photo);
    if (files?.governmentIdDocument)
      formData.append('governmentIdDocument', files.governmentIdDocument);
    if (files?.officeIdDocument)
      formData.append('officeIdDocument', files.officeIdDocument);

    const response = await apiClient.patch(
      `/api/public/visitors/update/${visitorId}?branchId=${branchId}`,
      formData,
      {
        headers: { 'Content-Type': 'multipart/form-data' },
      },
    );
    return response.data;
  },

  // ---------- NEW VISITOR WORKFLOW ENDPOINTS ----------

  /**
   * Quick registration for delivery visitors (minimal fields: name + phone)
   */
  async quickRegisterVisitor(
    branchId: string,
    visitorData: {
      phone: string;
      firstName: string;
      lastName: string;
    },
  ) {
    const response = await apiClient.post(
      `/api/public/visitors/quick-register?branchId=${branchId}`,
      visitorData,
    );
    return response.data;
  },

  /**
   * Complete visitor profile for meeting visits (upgrade from delivery profile)
   */
  async completeProfile(
    visitorId: string,
    branchId: string,
    profileData: {
      email: string;
      company: string;
      designation: string;
      middleName?: string;
      alternatePhone?: string;
      alternateEmail?: string;
      companyWebsite?: string;
      address?: string;
      reportingManagerName?: string;
      reportingManagerPhone?: string;
    },
    files?: {
      photo?: File;
      governmentIdDocument?: File;
      officeIdDocument?: File;
    },
  ) {
    const formData = toFormData(profileData);
    if (files?.photo) formData.append('photo', files.photo);
    if (files?.governmentIdDocument)
      formData.append('governmentIdDocument', files.governmentIdDocument);
    if (files?.officeIdDocument)
      formData.append('officeIdDocument', files.officeIdDocument);

    const response = await apiClient.patch(
      `/api/public/visitors/complete-profile/${visitorId}?branchId=${branchId}`,
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } },
    );
    return response.data;
  },

  /**
   * Create a delivery visit (auto-approved and checked in)
   */
  async createDeliveryVisit(
    branchId: string,
    visitData: {
      phone: string;
      visitSubType: string;
      deliveryPlatform: string;
      deliveryRecipient?: string;
      orderReference?: string;
    },
  ) {
    const response = await apiClient.post(
      `/api/public/visitors/delivery-visit?branchId=${branchId}`,
      visitData,
    );
    return response.data;
  },

  /**
   * Create a meeting visit request (requires staff approval)
   */
  async createMeetingVisitRequest(
    branchId: string,
    visitData: {
      phone: string;
      visitSubType: string;
      purpose: string;
      department?: string;
      personToMeet?: string;
      staffName?: string;
      staffPhone?: string;
      visitingCardPhoto?: string;
      visitorType?: 'GENERAL' | 'SALES_REPRESENTATIVE' | 'VENDOR';
      companyName?: string;
      companyEmail?: string;
    },
  ) {
    const response = await apiClient.post(
      `/api/public/visitors/meeting-visit?branchId=${branchId}`,
      visitData,
    );
    return response.data;
  },

  /**
   * Check-in visitor using visit ID from verified OTP.
   * Called after successful OTP verification (Task 6.2).
   *
   * @param visitId - Visit ID returned from verify-checkin-otp endpoint
   * @returns Check-in success response
   *
   * @throws ApiError with code 'VISIT_NOT_APPROVED': Visit is not in APPROVED state
   * @throws ApiError with code 'ALREADY_CHECKED_IN': Visit is already checked in
   * @throws ApiError with code 'VISIT_NOT_FOUND': Visit does not exist
   * @throws ApiError with code 'FORBIDDEN_BRANCH': User doesn't have access to visit's branch
   */
  async checkInVisit(visitId: string): Promise<{
    success: boolean;
    message: string;
    visitId: string;
    checkInTime: string;
    visitor: {
      id: string;
      firstName: string;
      lastName: string;
    };
    visitorPassId?: string | null;
  }> {
    const response = await apiClient.post(`/api/visitors/checkin/${visitId}`);
    return response.data;
  },
};

