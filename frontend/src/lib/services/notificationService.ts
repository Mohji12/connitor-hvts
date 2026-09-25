import apiClient from '@/lib/api';

export interface Notification {
  id: string;
  message: string;
  read: boolean;
  createdAt: string;
  visitId?: string;
  recipientId: string;
}

export const NotificationService = {
  async getUnreadNotifications(): Promise<Notification[]> {
    const { data } = await apiClient.get<Notification[]>(
      '/api/notifications/unread',
    );
    return data;
  },

  async markAsRead(notificationId: string): Promise<void> {
    await apiClient.patch(`/api/notifications/${notificationId}/read`);
  },
};
