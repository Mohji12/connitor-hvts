// src/components/notifications/NotificationDropdown.tsx
import { Notification } from '@/lib/services/notificationService';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Bell, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface NotificationDropdownProps {
  notifications: Notification[];
  onMarkAsRead: (id: string) => void;
  onNotificationView: (notification: Notification) => void;
}

export const NotificationDropdown = ({
  notifications,
  onMarkAsRead,
  onNotificationView,
}: NotificationDropdownProps) => {
  if (notifications.length === 0) {
    return (
      <div className="p-6 text-center">
        <div className="text-gray-400 mb-3">
          <Bell className="h-10 w-10 mx-auto opacity-40" />
        </div>
        <p className="text-sm text-gray-500 font-medium">All caught up! 🎉</p>
        <p className="text-xs text-gray-400 mt-1">No new notifications</p>
      </div>
    );
  }

  return (
    <div className="w-72 flex flex-col bg-background rounded-lg max-h-96">
      {/* Header - Fixed at top */}
      <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex-shrink-0 flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-lg text-foreground">
            Notifications
          </h3>
          <p className="text-sm text-muted-foreground">
            {notifications.length} unread{' '}
            {notifications.length === 1 ? 'notification' : 'notifications'}
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => notifications.forEach((n) => onMarkAsRead(n.id))}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Scrollable Notifications Area */}
      <ScrollArea className="flex-1 min-h-[45vh] max-h-[50vh] overflow-scroll">
        <div className="p-2 space-y-2">
          {notifications.map((notification, index) => (
            <div
              key={notification.id}
              className={cn(
                'p-3 text-sm rounded-lg transition-all duration-300 cursor-pointer',
                'border-l-4 border-l-blue-400 bg-card shadow-sm',
                'hover:shadow-md hover:scale-[1.02] hover:border-l-blue-600',
                'transform origin-center ease-out',
                'border border-transparent hover:border-blue-100',
                'dark:hover:border-blue-900/30',
                !notification.read &&
                  'ring-1 ring-blue-200 dark:ring-blue-800/30',
              )}
              onClick={() => onNotificationView(notification)}
              style={{ transitionDelay: `${index * 20}ms` }}
            >
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground break-words leading-relaxed">
                    {notification.message}
                  </p>
                  <div className="flex justify-between items-center mt-3">
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(notification.createdAt).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                      {' • '}
                      {new Date(notification.createdAt).toLocaleDateString()}
                    </span>
                    {!notification.read && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2 text-xs flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                        onClick={(e) => {
                          e.stopPropagation();
                          onMarkAsRead(notification.id);
                        }}
                      >
                        Mark read
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>

      {/* Footer - Sticky at bottom */}
      {notifications.length > 0 && (
        <div className="p-3 border-t border-gray-100 dark:border-gray-800 flex-shrink-0 bg-background sticky bottom-0 z-10">
          <Button
            variant="outline"
            size="sm"
            className="w-full text-xs h-8 transition-all duration-200 hover:scale-[1.02]"
            onClick={() => notifications.forEach((n) => onMarkAsRead(n.id))}
          >
            <X className="h-3 w-3 mr-1" />
            Mark all as read
          </Button>
        </div>
      )}
    </div>
  );
};
