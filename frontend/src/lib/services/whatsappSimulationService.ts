import apiClient from '@/lib/api';

export interface WhatsAppSimulationContext {
  bookingId: string;
  status: string;
  visitorName: string;
  doctorName: string;
  doctorPhone: string;
  appointmentLabel: string;
  approvalCode: string;
  centralWhatsAppNumber: string;
  supportsInteractiveButtons: boolean;
  outboundMessage: string;
}

export const WhatsAppSimulationService = {
  async getSimulationContext(
    bookingId: string,
    phone: string,
  ): Promise<WhatsAppSimulationContext> {
    const response = await apiClient.get<WhatsAppSimulationContext>(
      `/api/public/appointments/${bookingId}/whatsapp-simulation`,
      { params: { phone } },
    );
    return response.data;
  },

  async simulateDoctorReply(params: {
    fromPhone: string;
    buttonId?: string;
    body?: string;
  }): Promise<{ message: string }> {
    const response = await apiClient.post<{ message: string }>(
      '/api/webhooks/whatsapp/simulate-reply',
      {
        from_phone: params.fromPhone,
        button_id: params.buttonId,
        body: params.body,
      },
    );
    return response.data;
  },
};
