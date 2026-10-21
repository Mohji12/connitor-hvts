import apiClient from '@/lib/api';

export type BranchApprovalStatus = 'APPROVED' | 'PENDING' | 'REJECTED' | null;

export interface ApprovedBranch {
  id: string;
  name: string;
  phone: string;
  email: string;
  street: string;
  city: string;
  state: string;
  pinCode: string;
  hospitalChainName?: string | null;
  /** null = not requested yet; choose hospital in booking to request access */
  approvalStatus?: BranchApprovalStatus;
}

export interface DeliverySlot {
  id: string;
  branchId: string;
  slotStart: string;
  slotEnd: string;
  capacityMinutes?: number;
  bookedMinutes?: number;
  remainingMinutes?: number;
  maxDeliveries: number;
  bookedCount: number;
  /** Minutes still available in this hospital window */
  remaining: number;
  isActive: boolean;
}

export interface DeliveryAgent {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  licenseNumber: string | null;
  hasLogin?: boolean;
  photoUrl?: string | null;
}

export interface DeliveryVehicle {
  id: string;
  registrationNumber: string;
  vehicleType: string | null;
  lengthCm?: number | null;
  breadthCm?: number | null;
  heightCm?: number | null;
  volumeCm3?: number | null;
}

export type PackageType = 'Small' | 'Medium' | 'Large' | 'Equipment' | 'Custom';
export type VehicleCategory = 'Bike' | 'Auto' | 'SCV' | 'MCV' | 'LCV';

export interface ConsignmentPackageLine {
  packageType: PackageType;
  qty: number;
  remarks?: string;
  customSize?: string;
  customWeightKg?: number | string;
  supportRequired?: string;
}

export interface DeliveryPricingQuote {
  pricingModel?: string;
  vehicleType?: string;
  capacityUnits?: number;
  usedUnits?: number;
  overUnits?: number;
  baseFee?: number;
  handlingFee?: number;
  slotMinutes?: number;
  overCapacity?: boolean;
  warning?: string | null;
  packages?: ConsignmentPackageLine[];
  cargoVolumeCm3?: number;
  vehicleVolumeCm3?: number;
  fillPercent?: number;
  unloadMinutes: number;
  ratePerMinute?: number;
  fullUnloadMinutes?: number;
  walletFee: number;
  boxLengthCm?: number | null;
  boxBreadthCm?: number | null;
  boxHeightCm?: number | null;
  totalBoxes: number;
}

export interface BookDeliveryPayload {
  branchId: string;
  slotId?: string | null;
  expectedArrivalTime?: string | null;
  poNumber?: string;
  goodsType?: string;
  packages?: ConsignmentPackageLine[];
  vehicleCategory?: VehicleCategory;
  totalBoxes?: number;
  boxLengthCm?: number;
  boxBreadthCm?: number;
  boxHeightCm?: number;
  vehicleId?: string;
  vehicle?: {
    registrationNumber: string;
    vehicleType?: string;
    lengthCm?: number;
    breadthCm?: number;
    heightCm?: number;
  };
  agentId?: string;
  agent?: { name: string; email: string; phone?: string };
  remarks?: string;
  /** Demo gateway: credits fee then debits so booking works at zero wallet balance */
  paymentMethod?: 'DUMMY' | 'WALLET';
}

export interface DeliveryHospitalStat {
  branchId: string;
  branchName: string;
  total: number;
  completed: number;
  spend: number;
}

export interface DeliveryGoodsStat {
  goodsType: string;
  count: number;
  boxes: number;
}

export interface DeliveryTrendPoint {
  date: string;
  label: string;
  bookings: number;
  completed: number;
  spend: number;
}

export interface DistributorDeliveryAnalytics {
  total: number;
  byStatus: Record<string, number>;
  today: number;
  thisWeek: number;
  thisMonth: number;
  completed: number;
  inProgress: number;
  upcoming: number;
  onHold: number;
  rejected: number;
  totalBoxes: number;
  totalSpend: number;
  avgUnloadMinutes: number;
  byHospital: DeliveryHospitalStat[];
  byGoodsType: DeliveryGoodsStat[];
  trend: DeliveryTrendPoint[];
}

export interface DistributorAddress {
  line1?: string | null;
  line2?: string | null;
  city?: string | null;
  state?: string | null;
  pinCode?: string | null;
}

export interface DistributorHospitalMapping {
  mappingId: string;
  branchId: string;
  branchName?: string | null;
  approvalStatus: string;
}

export interface DistributorDocument {
  id: string;
  documentType: string;
  documentNumber?: string | null;
  expiresAt?: string | null;
  fileUrl?: string | null;
  verificationStatus: string;
}

export interface DistributorProfile {
  id: string;
  vendorCode: string;
  vendorName: string;
  tradeName?: string | null;
  vendorType?: string | null;
  legalEntityType?: string | null;
  gstNumber?: string | null;
  gstRegistrationType?: string | null;
  panNumber?: string | null;
  cin?: string | null;
  udyamNumber?: string | null;
  website?: string | null;
  yearEstablished?: number | null;
  contactPerson?: string | null;
  email?: string | null;
  phone?: string | null;
  alternatePhone?: string | null;
  designation?: string | null;
  preferredLanguage?: string | null;
  city?: string | null;
  state?: string | null;
  registeredAddress?: DistributorAddress | null;
  operatingAddress?: DistributorAddress | null;
  serviceableStates?: string[];
  supplyCategories?: string[];
  deliveryMode?: string | null;
  goodsDescription?: string | null;
  accountsEmail?: string | null;
  dispatchPhone?: string | null;
  verificationStatus?: string | null;
  onboardingStatus?: string | null;
  rejectionReason?: string | null;
  isActive?: boolean;
  branchMappings?: DistributorHospitalMapping[];
  documents?: DistributorDocument[];
  canBookDeliveries?: boolean;
}

export type DistributorProfileUpdate = Partial<
  Pick<
    DistributorProfile,
    | 'vendorName'
    | 'tradeName'
    | 'legalEntityType'
    | 'website'
    | 'yearEstablished'
    | 'contactPerson'
    | 'designation'
    | 'preferredLanguage'
    | 'email'
    | 'phone'
    | 'alternatePhone'
    | 'dispatchPhone'
    | 'accountsEmail'
    | 'city'
    | 'state'
    | 'deliveryMode'
    | 'goodsDescription'
    | 'registeredAddress'
    | 'operatingAddress'
    | 'serviceableStates'
    | 'supplyCategories'
  >
>;

export interface DeliveryListItem {
  id: string;
  deliveryNumber: string;
  status: string;
  goodsType?: string | null;
  totalBoxes?: number | null;
  expectedArrivalTime?: string | null;
  vendorName?: string | null;
  agentName?: string | null;
  vehicleNumber?: string | null;
  branchName?: string | null;
  branchId?: string;
  walletFee?: number;
  holdReason?: string | null;
  holdUntil?: string | null;
}

export const DistributorDeliveryService = {
  async listBranches(): Promise<ApprovedBranch[]> {
    const res = await apiClient.get<{ branches: ApprovedBranch[] }>(
      '/api/delivery/distributors/me/branches',
    );
    return res.data.branches;
  },

  async requestBranchAccess(branchId: string): Promise<{
    mappingId: string;
    branchId: string;
    approvalStatus: string;
  }> {
    const res = await apiClient.post<{
      mappingId: string;
      branchId: string;
      approvalStatus: string;
    }>(`/api/delivery/distributors/me/branches/${branchId}/request`);
    return res.data;
  },

  async listSlots(
    branchId: string,
    date: string,
    neededMinutes?: number,
  ): Promise<DeliverySlot[]> {
    const res = await apiClient.get<{ slots: DeliverySlot[] }>(
      `/api/delivery/branches/${branchId}/slots`,
      {
        params: {
          date,
          ...(neededMinutes && neededMinutes > 0 ? { neededMinutes } : {}),
        },
      },
    );
    return res.data.slots;
  },

  async getBranchSettings(branchId: string): Promise<{ allowUnscheduledDeliveries: boolean }> {
    const res = await apiClient.get<{ allowUnscheduledDeliveries: boolean }>(
      `/api/delivery/branch-settings/${branchId}`,
    );
    return res.data;
  },

  async listAgents(): Promise<DeliveryAgent[]> {
    const res = await apiClient.get<{ agents: DeliveryAgent[] }>('/api/delivery/agents');
    return res.data.agents;
  },

  async createAgent(data: {
    name: string;
    email: string;
    phone?: string;
  }): Promise<DeliveryAgent> {
    const res = await apiClient.post('/api/delivery/agents', data);
    return res.data;
  },

  async updateAgent(
    agentId: string,
    data: { name: string; email: string; phone?: string },
  ): Promise<DeliveryAgent> {
    const res = await apiClient.patch<DeliveryAgent>(`/api/delivery/agents/${agentId}`, data);
    return res.data;
  },

  async uploadAgentPhoto(agentId: string, file: File): Promise<DeliveryAgent> {
    const body = new FormData();
    body.append('file', file);
    const res = await apiClient.post<DeliveryAgent>(`/api/delivery/agents/${agentId}/photo`, body);
    return res.data;
  },

  async listVehicles(): Promise<DeliveryVehicle[]> {
    const res = await apiClient.get<{ vehicles: DeliveryVehicle[] }>('/api/delivery/vehicles');
    return res.data.vehicles;
  },

  async createVehicle(data: {
    registrationNumber: string;
    vehicleType?: string;
    lengthCm?: number;
    breadthCm?: number;
    heightCm?: number;
  }): Promise<DeliveryVehicle> {
    const res = await apiClient.post('/api/delivery/vehicles', data);
    return res.data;
  },

  async updateVehicle(
    vehicleId: string,
    data: {
      registrationNumber: string;
      vehicleType?: string;
      lengthCm?: number;
      breadthCm?: number;
      heightCm?: number;
    },
  ): Promise<DeliveryVehicle> {
    const res = await apiClient.patch<DeliveryVehicle>(`/api/delivery/vehicles/${vehicleId}`, data);
    return res.data;
  },

  async quoteDelivery(data: {
    packages?: ConsignmentPackageLine[];
    vehicleCategory?: VehicleCategory;
    vehicleType?: VehicleCategory;
    totalBoxes?: number;
    boxLengthCm?: number;
    boxBreadthCm?: number;
    boxHeightCm?: number;
    vehicleId?: string;
    vehicleVolumeCm3?: number;
    vehicleLengthCm?: number;
    vehicleBreadthCm?: number;
    vehicleHeightCm?: number;
  }): Promise<DeliveryPricingQuote> {
    const res = await apiClient.post<DeliveryPricingQuote>('/api/delivery/deliveries/quote', data);
    return res.data;
  },

  async bookDelivery(payload: BookDeliveryPayload) {
    const res = await apiClient.post('/api/delivery/deliveries/book', payload);
    return res.data;
  },

  async listDeliveries(params?: { branchId?: string; limit?: number }) {
    const res = await apiClient.get<{ items: DeliveryListItem[]; total?: number }>(
      '/api/delivery/deliveries',
      { params },
    );
    return res.data;
  },

  async getDelivery(id: string) {
    const res = await apiClient.get(`/api/delivery/deliveries/${id}`);
    return res.data;
  },

  async getSummary(branchId?: string): Promise<DistributorDeliveryAnalytics> {
    const res = await apiClient.get<DistributorDeliveryAnalytics>(
      '/api/delivery/deliveries/dashboard/summary',
      { params: branchId ? { branchId } : {} },
    );
    return res.data;
  },

  async getProfile(): Promise<DistributorProfile> {
    const res = await apiClient.get<DistributorProfile>('/api/delivery/distributors/me');
    return res.data;
  },

  async updateProfile(payload: DistributorProfileUpdate): Promise<DistributorProfile> {
    const res = await apiClient.patch<DistributorProfile>('/api/delivery/distributors/me', payload);
    return res.data;
  },

  async getWallet(vendorId: string) {
    const res = await apiClient.get<{ balance: number }>(`/api/delivery/wallets/${vendorId}`);
    return res.data;
  },

  async listWalletTransactions(vendorId: string) {
    const res = await apiClient.get<{
      items: Array<{
        id: string;
        amount: number;
        transactionType: string;
        referenceType: string;
        createdAt?: string | null;
      }>;
    }>(`/api/delivery/wallets/${vendorId}/transactions`);
    return res.data.items ?? [];
  },

  async rechargeWallet(vendorId: string, amount: number) {
    const res = await apiClient.post('/api/delivery/wallets/recharge', { vendorId, amount });
    return res.data;
  },
};
