import apiClient from '@/lib/api';

export interface ApprovedBranch {
  id: string;
  name: string;
  phone: string;
  email: string;
  street: string;
  city: string;
  state: string;
  pinCode: string;
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

  async getSummary(branchId?: string) {
    const res = await apiClient.get<{ total: number; byStatus: Record<string, number> }>(
      '/api/delivery/deliveries/dashboard/summary',
      { params: branchId ? { branchId } : {} },
    );
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
