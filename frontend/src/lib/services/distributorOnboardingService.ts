import apiClient from '@/lib/api';

export type OnboardingBranch = {
  id: string;
  name: string;
  city?: string | null;
  state?: string | null;
  hospitalChainName?: string | null;
};

export type DistributorOnboardingPayload = {
  email: string;
  password: string;
  contactPerson: string;
  phone: string;
  alternatePhone?: string;
  designation?: string;
  preferredLanguage?: string;
  vendorName: string;
  tradeName?: string;
  legalEntityType: string;
  vendorType: string;
  gstNumber?: string;
  gstRegistrationType: string;
  panNumber: string;
  cin?: string;
  udyamNumber?: string;
  yearEstablished?: number;
  website?: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  pinCode: string;
  operatingSameAsRegistered: boolean;
  operatingAddressLine1?: string;
  operatingAddressLine2?: string;
  operatingCity?: string;
  operatingState?: string;
  operatingPinCode?: string;
  serviceableStates?: string[];
  branchIds: string[];
  supplyCategories: string[];
  deliveryMode: 'OWN_FLEET' | 'THIRD_PARTY';
  goodsDescription: string;
  accountsEmail?: string;
  dispatchPhone?: string;
  acceptTerms: boolean;
  declarationTrue: boolean;
  documents?: Array<{
    documentType: string;
    documentNumber?: string;
    expiresAt?: string;
  }>;
};

export const DistributorOnboardingService = {
  async listBranches(): Promise<OnboardingBranch[]> {
    const res = await apiClient.get<{ items: OnboardingBranch[] }>(
      '/api/public/distributor-onboarding/branches',
    );
    return res.data.items ?? [];
  },

  async apply(
    payload: DistributorOnboardingPayload,
    files: Record<string, File | null>,
  ): Promise<{
    id: string;
    vendorCode: string;
    message: string;
  }> {
    const form = new FormData();
    form.append('payload', JSON.stringify(payload));
    Object.entries(files).forEach(([key, file]) => {
      if (file) form.append(key, file);
    });
    const res = await apiClient.post('/api/public/distributor-onboarding/apply', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  },
};
