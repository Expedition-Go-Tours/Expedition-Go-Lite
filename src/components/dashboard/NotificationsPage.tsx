import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, CheckCheck, Trash2, Info, CalendarCheck, Percent, AlertCircle, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

type NotificationType = "booking" | "promo" | "system" | "reminder";

interface Notification {
  id: string
  type: NotificationType
  title: string
  message: string
  date: string
  read: boolean
  actionLabel?: string
}

const typeConfig: Record<NotificationType, { icon: typeof Bell; color: string; bg: string }> = {
  booking: { icon: CalendarCheck, color: "text-[#065f46]", bg: "bg-[#ecfdf5]" },
  promo: { icon: Percent, color: "text-[#179237]", bg: "bg-[#f0fdf4]" },
  system: { icon: Info, color: "text-[#2563eb]", bg: "bg-blue-50" },
  reminder: { icon: AlertCircle, color: "text-[#d97706]", bg: "bg-amber-50" },
};

const mockNotifications: Notification[] = [
  {
    id: "1",
    type: "booking",
    title: "Booking Confirmed",
    message: "Your Cape Coast Castle & Kakum National Park tour has been confirmed for March 15, 2024.",
    date: "2024-03-10T10:30:00",
    read: false,
    actionLabel: "View Booking",
  },
  {
    id: "2",
    type: "reminder",
    title: "Upcoming Tour Reminder",
    message: "Your Mole National Park Safari Adventure is tomorrow! Please arrive at the meeting point by 6:00 AM.",
    date: "2024-04-19T08:00:00",
    read: false,
    actionLabel: "View Details",
  },
  {
    id: "3",
    type: "promo",
    title: "Spring Sale! 20% Off",
    message: "Enjoy 20% off all multi-day tours booked this week. Use code SPRING20 at checkout.",
    date: "2024-03-28T14:00:00",
    read: true,
    actionLabel: "Browse Deals",
  },
  {
    id: "4",
    type: "system",
    title: "Account Updated",
    message: "Your profile information has been successfully updated.",
    date: "2024-03-25T16:45:00",
    read: true,
  },
  {
    id: "5",
    type: "booking",
    title: "Booking Cancelled",
    message: "Your Kumasi Cultural Heritage Tour booking has been cancelled as requested. A refund of $255 has been processed.",
    date: "2024-03-22T11:20:00",
    read: true,
    actionLabel: "View Refund",
  },
];

function timeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>(mockNotifications);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleMarkAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    toast.success("All notifications marked as read");
  };

  const handleMarkRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const handleClearAll = () => {
    setNotifications([]);
    toast.success("All notifications cleared");
  };

  const handleClear = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const handleAction = (label?: string) => {
    if (label) toast.info(`Navigating to: ${label}`);
  };

  if (notifications.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center bg-white rounded-xl border border-[#e5e4e7] w-full max-w-4xl mx-auto">
        <Bell size={56} className="text-[#065f46] opacity-50 mb-5" />
        <h3 className="text-xl font-heading font-semibold text-[#1a1a1a] mb-2">All Clear!</h3>
        <p className="text-[14px] text-[#6b7280] max-w-sm leading-relaxed mb-7">
          You have no notifications. We'll notify you when something new comes in.
        </p>
        <Button className="bg-[#065f46] text-white hover:bg-[#047857]">Explore Tours</Button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-5">
        <p className="text-[14px] text-[#6b7280]">
          {unreadCount > 0 ? `${unreadCount} unread notification${unreadCount > 1 ? "s" : ""}` : "All caught up"}
        </p>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="flex items-center gap-1.5 text-[13px] font-medium text-[#065f46] hover:underline"
            >
              <CheckCheck size={14} />
              Mark all read
            </button>
          )}
          <button
            onClick={handleClearAll}
            className="flex items-center gap-1.5 text-[13px] font-medium text-[#6b7280] hover:text-[#ef4444] transition-colors"
          >
            <Trash2 size={14} />
            Clear all
          </button>
        </div>
      </div>

      <div className="space-y-2">
        <AnimatePresence>
          {notifications.map((notification) => {
            const config = typeConfig[notification.type];

            return (
              <motion.div
                key={notification.id}
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -30, height: 0, marginBottom: 0 }}
                transition={{ duration: 0.2 }}
                onClick={() => handleMarkRead(notification.id)}
                className={`relative flex gap-4 p-4 rounded-xl cursor-pointer transition-all duration-200 ${
                  notification.read
                    ? "bg-white border border-[#e5e4e7]"
                    : "bg-[#f8fafc] border border-[#065f46]/10 shadow-sm"
                }`}
              >
                {!notification.read && (
                  <span className="absolute top-4 right-4 w-2 h-2 rounded-full bg-[#065f46]" />
                )}

                <div className={`w-10 h-10 rounded-xl ${config.bg} flex items-center justify-center shrink-0`}>
                  <config.icon size={18} className={config.color} />
                </div>

                <div className="flex-1 min-w-0 pr-6">
                  <div className="flex items-start justify-between gap-3">
                    <h4 className={`text-[15px] font-semibold text-[#1a1a1a] ${notification.read ? "opacity-60" : ""}`}>
                      {notification.title}
                    </h4>
                    <span className="text-[12px] text-[#9ca3af] whitespace-nowrap shrink-0 mt-0.5">
                      {timeAgo(notification.date)}
                    </span>
                  </div>
                  <p className={`text-[14px] mt-1 leading-relaxed ${notification.read ? "text-[#9ca3af]" : "text-[#6b7280]"}`}>
                    {notification.message}
                  </p>
                  {notification.actionLabel && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAction(notification.actionLabel);
                      }}
                      className="flex items-center gap-1 text-[13px] font-medium text-[#065f46] mt-2 hover:underline"
                    >
                      {notification.actionLabel}
                      <ExternalLink size={12} />
                    </button>
                  )}
                  <div className="flex items-center gap-3 mt-2 pt-2 border-t border-[#e5e4e7]">
                    {!notification.read && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMarkRead(notification.id);
                        }}
                        className="text-[12px] font-medium text-[#065f46] hover:underline"
                      >
                        Mark read
                      </button>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleClear(notification.id);
                      }}
                      className="text-[12px] font-medium text-[#9ca3af] hover:text-[#ef4444] transition-colors"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
