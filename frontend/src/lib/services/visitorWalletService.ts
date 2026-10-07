import apiClient from '@/lib/api';

export type VisitorWalletSummary = {
  balance: number;
  reserved: number;
  available: number;
  fee: number;
  currency: string;
};

export type VisitorWalletTransaction = {
  id: string;
  amount: number;
  transactionType: string;
  status: string;
  referenceType: string | null;
  referenceId: string | null;
  createdAt: string | null;
};

export type RazorpayOrder = {
  orderId: string;
  amount: number;
  currency: string;
  keyId: string;
  feeRupees: number;
};

export const VisitorWalletService = {
  async getWallet(): Promise<VisitorWalletSummary> {
    const res = await apiClient.get<VisitorWalletSummary>('/api/public/visitor-wallet');
    return res.data;
  },

  async listTransactions(): Promise<VisitorWalletTransaction[]> {
    const res = await apiClient.get<VisitorWalletTransaction[]>(
      '/api/public/visitor-wallet/transactions',
    );
    return res.data;
  },

  async dummyRecharge(amount: number): Promise<VisitorWalletSummary> {
    const res = await apiClient.post<VisitorWalletSummary>('/api/public/visitor-wallet/recharge/dummy', {
      amount,
    });
    return res.data;
  },

  async createRechargeOrder(amount: number): Promise<RazorpayOrder> {
    const res = await apiClient.post<RazorpayOrder>('/api/public/visitor-wallet/recharge/order', {
      amount,
    });
    return res.data;
  },

  async verifyRecharge(payload: {
    razorpayOrderId: string;
    razorpayPaymentId: string;
    razorpaySignature: string;
  }): Promise<VisitorWalletSummary> {
    const res = await apiClient.post<VisitorWalletSummary>(
      '/api/public/visitor-wallet/recharge/verify',
      payload,
    );
    return res.data;
  },

  async createVisitOrder(): Promise<RazorpayOrder> {
    const res = await apiClient.post<RazorpayOrder>('/api/public/visitor-wallet/visit-order');
    return res.data;
  },
};
