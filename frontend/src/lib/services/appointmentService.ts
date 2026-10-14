import apiClient from '@/lib/api';
import { ensureArray } from '@/lib/ensure-array';
import { getVisitorToken } from '@/lib/services/visitorPortalService';
import type { RazorpayOrder } from '@/lib/services/visitorWalletService';

const GUEST_TOKEN_HEADER = 'X-Guest-Booking-Token';

export interface GuestVerification {
  guestToken: string;
  expiresInMinutes: number;
  hasPhoto: boolean;
  hasGovernmentId: boolean;
}

/** Booking a doctor visit without a visitor profile: WhatsApp code, photo + ID, online payment. */
export const GuestBookingService = {
  async sendCode(phone: string, branchId: string): Promise<{ message: string; testOtp?: string }> {
    const res = await apiClient.post('/api/public/appointments/guest/send-code', { phone, branchId });
    return res.data;
  },

  async verifyCode(phone: string, branchId: string, otp: string): Promise<GuestVerification> {
    const res = await apiClient.post<GuestVerification>('/api/public/appointments/guest/verify-code', {
      phone,
      branchId,
      otp,
    });
    return res.data;
  },

  async uploadDocuments(
    guestToken: string,
    files: { photo: File | null; governmentId: File | null },
  ): Promise<void> {
    const form = new FormData();
    if (files.photo) form.append('photo', files.photo);
    if (files.governmentId) form.append('governmentIdDocument', files.governmentId);
    await apiClient.post('/api/public/appointments/guest/documents', form, {
      headers: { [GUEST_TOKEN_HEADER]: guestToken, 'Content-Type': 'multipart/form-data' },
    });
  },

  async createPaymentOrder(guestToken: string): Promise<RazorpayOrder> {
    const res = await apiClient.post<RazorpayOrder>('/api/public/appointments/guest/payment-order', null, {
      headers: { [GUEST_TOKEN_HEADER]: guestToken },
    });
    return res.data;
  },
};

export interface PublicHospital {
  id: string;
  name: string;
  city: string;
  state: string;
  hospitalChainId: string;
}

export interface PublicDoctor {
  id: string;
  name: string;
  department: string | null;
  location: string | null;
  departmentName?: string | null;
  subDepartmentName?: string | null;
  branchName?: string | null;
  branchCity?: string | null;
  qualification?: string | null;
  experienceYears?: number | null;
  languages?: string[];
  consultationModes?: string[];
}

export interface DoctorSlot {
  id: string;
  slotStart: string;
  slotEnd: string;
  label: string;
}

export interface AppointmentRecord {
  id: string;
  status: string;
  appointmentDate: string | null;
  purpose: string | null;
  staffName: string | null;
  departmentId: string | null;
  subDepartmentId: string | null;
  checkInTime: string | null;
  checkOutTime: string | null;
  totalDurationMinutes: number | null;
  visitor?: { firstName: string; lastName: string; phone: string };
}

export const AppointmentService = {
  async list(params?: { status?: string; branchId?: string; limit?: number }): Promise<AppointmentRecord[]> {
    const response = await apiClient.get<AppointmentRecord[]>('/api/appointments', { params });
    return response.data;
  },

  async listPublicHospitals(params?: { hospitalChainId?: string }): Promise<PublicHospital[]> {
    const response = await apiClient.get('/api/public/appointments/hospitals', {
      params: params?.hospitalChainId ? { hospitalChainId: params.hospitalChainId } : undefined,
    });
    return ensureArray<PublicHospital>(response.data);
  },

  async listPublicDepartments(branchId: string) {
    const response = await apiClient.get('/api/public/appointments/departments', {
      params: { branchId },
    });
    return ensureArray<{ id: string; name: string }>(response.data);
  },

  async listPublicSubDepartments(departmentId: string) {
    const response = await apiClient.get('/api/public/appointments/sub-departments', {
      params: { departmentId },
    });
    return ensureArray<{ id: string; name: string }>(response.data);
  },

  async listPublicDoctors(subDepartmentId: string): Promise<PublicDoctor[]> {
    const response = await apiClient.get('/api/public/appointments/doctors', {
      params: { subDepartmentId },
    });
    return ensureArray<PublicDoctor>(response.data);
  },

  async getPublicDoctor(doctorId: string): Promise<PublicDoctor> {
    const response = await apiClient.get<PublicDoctor>(
      `/api/public/appointments/doctors/${doctorId}`,
    );
    return response.data;
  },

  async listDoctorSlots(doctorId: string, date: string): Promise<DoctorSlot[]> {
    const response = await apiClient.get(
      `/api/public/appointments/doctors/${doctorId}/slots`,
      { params: { date } },
    );
    return ensureArray<DoctorSlot>(response.data);
  },

  async book(data: {
    branchId: string;
    departmentId: string;
    subDepartmentId: string;
    doctorId: string;
    firstName: string;
    lastName: string;
    phone: string;
    email?: string;
    appointmentDate?: string;
    slotId?: string;
    requestCustomSlot?: boolean;
    purpose: string;
    itemsCarrying: string;
    appointmentMode?: 'IN_PERSON' | 'ONLINE';
    visitorType?: 'GENERAL' | 'SALES_REPRESENTATIVE' | 'VENDOR';
    companyName?: string;
    companyEmail?: string;
    paymentMethod?: 'WALLET' | 'RAZORPAY';
    razorpayOrderId?: string;
    razorpayPaymentId?: string;
    razorpaySignature?: string;
  }, guestToken?: string | null) {
    const token = getVisitorToken();
    const headers: Record<string, string> = {};
    if (token) headers.Authorization = `Bearer ${token}`;
    else if (guestToken) headers[GUEST_TOKEN_HEADER] = guestToken;
    const response = await apiClient.post('/api/public/appointments', data, { headers });
    return response.data as {
      bookingId: string;
      status: string;
      message: string;
      isCustomSlotRequest?: boolean;
      appointmentDate?: string;
      doctorName?: string;
      departmentName?: string;
      subDepartmentName?: string;
    };
  },

  async getBookingStatus(bookingId: string, phone: string) {
    const response = await apiClient.get<{
      bookingId: string;
      status: string;
      appointmentDate: string | null;
      doctorName: string | null;
      purpose: string | null;
      itemsCarrying?: string | null;
      checkInTime: string | null;
      checkOutTime: string | null;
      totalDurationMinutes: number | null;
      rejectionReason: string | null;
      doctorFeedback: string | null;
      doctorFeedbackAt: string | null;
      appointmentMode?: string;
      meetingJoinUrl?: string | null;
    }>(`/api/public/appointments/${bookingId}/status`, { params: { phone } });
    return response.data;
  },
};
