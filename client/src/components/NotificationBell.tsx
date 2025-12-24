import { useState, useEffect } from "react";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { trpc } from "@/lib/trpc";
import { useSocket } from "@/contexts/SocketContext";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  resourceType?: string | null;
  resourceId?: string | null;
  isRead: boolean;
  createdAt: Date;
}

export function NotificationBell() {
  const { socket } = useSocket();
  const [open, setOpen] = useState(false);
  
  // Fetch notifications
  const { data: notifications = [], refetch } = trpc.notifications.list.useQuery(
    undefined,
    { refetchInterval: open ? 5000 : false }
  );

  // Get unread count
  const { data: unreadCount = 0, refetch: refetchCount } = trpc.notifications.unreadCount.useQuery();

  // Mark as read mutation
  const markAsReadMutation = trpc.notifications.markAsRead.useMutation({
    onSuccess: () => {
      refetch();
      refetchCount();
    },
  });

  // Mark all as read mutation
  const markAllAsReadMutation = trpc.notifications.markAllAsRead.useMutation({
    onSuccess: () => {
      refetch();
      refetchCount();
      toast.success("All notifications marked as read");
    },
  });

  // Delete notification mutation
  const deleteNotificationMutation = trpc.notifications.delete.useMutation({
    onSuccess: () => {
      refetch();
      refetchCount();
    },
  });

  // Listen for real-time notifications
  useEffect(() => {
    if (!socket) return;

    const handleNotification = (notification: Notification) => {
      console.log("[Notification]", notification);
      
      // Show toast
      toast(notification.title, {
        description: notification.message,
        duration: 5000,
      });

      // Refetch notifications and count
      refetch();
      refetchCount();
    };

    socket.on("notification", handleNotification);

    return () => {
      socket.off("notification", handleNotification);
    };
  }, [socket, refetch, refetchCount]);

  const handleMarkAsRead = (notificationId: string) => {
    markAsReadMutation.mutate(notificationId);
  };

  const handleMarkAllAsRead = () => {
    markAllAsReadMutation.mutate();
  };

  const handleDelete = (notificationId: string) => {
    deleteNotificationMutation.mutate(notificationId);
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "comment":
        return "💬";
      case "mention":
        return "👋";
      case "evaluation_complete":
        return "✅";
      case "budget_alert":
        return "⚠️";
      case "test_run_complete":
        return "🧪";
      case "optimization_ready":
        return "✨";
      default:
        return "📢";
    }
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Notifications</span>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleMarkAllAsRead}
              className="h-6 text-xs"
            >
              Mark all read
            </Button>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <ScrollArea className="h-[400px]">
          {notifications.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <Bell className="h-12 w-12 mx-auto mb-2 opacity-20" />
              <p>No notifications</p>
            </div>
          ) : (
            notifications.map((notification: Notification) => (
              <DropdownMenuItem
                key={notification.id}
                className={`flex flex-col items-start p-3 cursor-pointer ${
                  !notification.isRead ? "bg-muted/50" : ""
                }`}
                onClick={() => {
                  if (!notification.isRead) {
                    handleMarkAsRead(notification.id);
                  }
                }}
              >
                <div className="flex items-start justify-between w-full">
                  <div className="flex items-start gap-2 flex-1">
                    <span className="text-lg">{getNotificationIcon(notification.type)}</span>
                    <div className="flex-1">
                      <p className="font-medium text-sm">{notification.title}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {notification.message}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(notification.id);
                    }}
                    className="h-6 w-6 p-0 ml-2"
                  >
                    ×
                  </Button>
                </div>
              </DropdownMenuItem>
            ))
          )}
        </ScrollArea>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
