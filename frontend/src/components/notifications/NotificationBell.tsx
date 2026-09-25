// src/components/notifications/NotificationBell.tsx
import { Bell } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Notification } from '@/lib/services/notificationService';
import { NotificationDropdown } from './NotificationDropdown';

interface NotificationBellProps {
  notifications: Notification[];
  unreadCount: number;
  onMarkAsRead: (id: string) => void;
  onNotificationView: (notification: Notification) => void;
}

export const NotificationBell = ({
  notifications,
  unreadCount,
  onMarkAsRead,
  onNotificationView,
}: NotificationBellProps) => {
  return (
    <div className="mr-4">
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="relative transition-all hover:scale-105 hover:bg-gray-100 duration-200"
          >
            <Bell className="h-5 w-5 transition-transform duration-200 hover:rotate-12" />
            {unreadCount > 0 && (
              <span className="absolute top-0 right-0 inline-flex items-center justify-center w-5 h-5 text-xs font-bold leading-none text-white transform translate-x-1/3 -translate-y-1/3 bg-red-600 rounded-full animate-pulse">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent
          align="end"
          className="p-0 overflow-hidden border-0 shadow-xl max-h-[80vh]"
          sideOffset={8}
          collisionPadding={16}
        >
          <NotificationDropdown
            notifications={notifications}
            onMarkAsRead={onMarkAsRead}
            onNotificationView={onNotificationView}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
};
