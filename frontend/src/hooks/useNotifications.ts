import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { NotificationService } from '@/lib/services/notificationService';
import type { Notification } from '@/lib/services/notificationService';
import { toast } from 'sonner';
import { IS_DEMO_MODE, USE_MOCK_API } from '@/lib/demo-config';

interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
}

// ✅ Notification sound
const playNotificationSound = () => {
  try {
    const audio = new Audio('/notification-sound.mp3');
    audio.volume = 0.3;
    audio.play().catch(() => console.log('Audio play failed'));
  } catch (error) {
    console.log('Notification sound error:', error);
  }
};

// ✅ Show system notification
const showSystemNotification = (title: string, message: string) => {
  try {
    if (Notification.permission === 'granted') {
      new Notification(title, {
        body: message,
        icon: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjQiIGhlaWdodD0iNjQiIHZpZXdCb3g9IjAgMCA2NCA2NCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMzIiIGN5PSIzMiIgcj0iMzAiIGZpbGw9IiM0Njg4RkYiLz4KPGNpcmNsZSBjeD0iMzIiIGN5PSIyNCIgcj0iNCIgZmlsbD0id2hpdGUiLz4KPHBhdGggZD0iTTI0IDQwQzI0IDM2IDI2IDMyIDMyIDMyQzM4IDMyIDQwIDM2IDQwIDQwIiBzdHJva2U9IndoaXRlIiBzdHJva2Utd2lkdGg9IjIiLz4KPC9zdmc+', // Blue circle with face emoji
      });
    }
  } catch (error) {
    console.log('System notification error:', error);
  }
};

export const useNotifications = (user: User | null) => {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [previousCount, setPreviousCount] = useState(0);
  const pollingDisabled = useRef(false);

  // ✅ Ask for notification permission on first load
  useEffect(() => {
    try {
      if (Notification.permission === 'default') {
        Notification.requestPermission().catch(() => {});
      }
    } catch (error) {
      console.log('Notification permission error:', error);
    }
  }, []);

  const fetchNotifications = useCallback(async () => {
    if (!user || pollingDisabled.current) return;
    try {
      const unread = await NotificationService.getUnreadNotifications();

      // ✅ Play sound and show alert when new notifications arrive
      if (unread.length > previousCount) {
        playNotificationSound();

        // Show system notification with the latest unread notification
        if (unread.length > notifications.length && unread[0]) {
          showSystemNotification('New Notification', unread[0].message);
        }

        if (!IS_DEMO_MODE) {
          toast.info('You have new notifications.');
        }
      }

      setNotifications(unread);
      setUnreadCount(unread.length);
      setPreviousCount(unread.length);
    } catch {
      // Stop polling when the API is unreachable (common in local demo setups).
      pollingDisabled.current = true;
      setNotifications([]);
      setUnreadCount(0);
      setPreviousCount(0);
    }
  }, [user, previousCount, notifications.length]);

  useEffect(() => {
    if (!user) return;

    pollingDisabled.current = false;
    fetchNotifications();

    if (USE_MOCK_API) {
      return;
    }

    const intervalId = setInterval(fetchNotifications, 3000);
    return () => clearInterval(intervalId);
  }, [user, fetchNotifications]);

  const markAsRead = async (id: string) => {
    try {
      if (!user) return;
      await NotificationService.markAsRead(id);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      setUnreadCount((prev) => prev - 1);
    } catch {
      toast.error('Could not update notification.');
    }
  };

  const handleNotificationView = (notification: Notification) => {
    if (!notification.read) {
      markAsRead(notification.id);
    }
    if (!user) return;
    if (user.role === 'STAFF') {
      router.push('/dashboard/my-visitors');
      return;
    }
    if (user.role === 'SECURITY' || user.role === 'SECURITY_SUPERVISOR') {
      router.push('/security/dashboard?tab=appointments');
    }
  };

  return { notifications, unreadCount, markAsRead, handleNotificationView };
};
