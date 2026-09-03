import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bell, CheckCheck, Trash2, Info, CalendarCheck, MessageCircle, CreditCard, Star, ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { fetchWithAuth } from "@/lib/api";
import { useChat } from "@/chat/ChatContext";

interface BackendNotification {
  id: string
  type: string
  title: string
  message: string
  data?: { conversationId?: string; senderId?: string } | null
  read: boolean
  readAt?: string | null
  createdAt: string
}

interface NotificationPageData {
  notifications: BackendNotification[]
  pagination: { page: number; limit: number; totalCount: number; totalPages: number; unreadCount: number }
}

const typeConfig: Record<string, { icon: typeof Bell; color: string; bg: string }> = {
  BOOKING_CONFIRMED: { icon: CalendarCheck, color: "text-[var(--bv-success-text)]", bg: "bg-[var(--bv-success-bg)]" },
  BOOKING_CANCELLED: { icon: CalendarCheck, color: "text-[var(--bv-danger-text)]", bg: "bg-[var(--bv-danger-bg)]" },
  PAYMENT_RECEIVED: { icon: CreditCard, color: "text-[var(--bv-info-text)]", bg: "bg-[var(--bv-info-bg)]" },
  REVIEW_RECEIVED: { icon: Star, color: "text-amber-600", bg: "bg-amber-50" },
  NEW_MESSAGE: { icon: MessageCircle, color: "text-[var(--bv-accent-strong)]", bg: "bg-[var(--bv-accent-soft)]" },
  SYSTEM_ALERT: { icon: Info, color: "text-[var(--bv-info-text)]", bg: "bg-[var(--bv-info-bg)]" },
};

const DEFAULT_CONFIG = { icon: Bell, color: "text-[var(--bv-muted)]", bg: "bg-[var(--bv-surface-2)]" };

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

function getDateGroup(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfYesterday = new Date(startOfToday.getTime() - 86400000);
  const startOfWeek = new Date(startOfToday.getTime() - 7 * 86400000);

  if (date >= startOfToday) return "Today";
  if (date >= startOfYesterday) return "Yesterday";
  if (date >= startOfWeek) return "This Week";
  return "Earlier";
}

export default function NotificationsPage() {
  const navigate = useNavigate();
  const chat = useChat();
  const [notifications, setNotifications] = useState<BackendNotification[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetchWithAuth("/notifications?page=1&limit=50");
      if (!res.ok) return;
      const payload = await res.json().catch(() => ({}));
      const data = (payload.data ?? payload) as NotificationPageData;
      setNotifications(data.notifications ?? []);
    } catch {
      /* transient */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void Promise.resolve().then(fetchNotifications);
    const onFocus = () => fetchNotifications();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [fetchNotifications, chat.unreadCount]);

  const markRead = async (id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    fetchWithAuth(`/notifications/${id}/read`, { method: "PATCH" }).catch(() => {});
  };

  const markAllRead = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    toast.success("All notifications marked as read");
    fetchWithAuth("/notifications/mark-all-read", { method: "PATCH" }).catch(() => {});
  };

  const clearAll = async () => {
    setNotifications([]);
    toast.success("All notifications cleared");
    fetchWithAuth("/notifications/mark-all-read", { method: "PATCH" }).catch(() => {});
  };

  const removeOne = async (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    fetchWithAuth(`/notifications/${id}`, { method: "DELETE" }).catch(() => {});
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  const grouped = useMemo(() => {
    const groups: Record<string, BackendNotification[]> = {};
    for (const n of notifications) {
      const group = getDateGroup(n.createdAt);
      if (!groups[group]) groups[group] = [];
      groups[group].push(n);
    }
    const order = ["Today", "Yesterday", "This Week", "Earlier"];
    return order.filter((g) => groups[g]?.length).map((g) => ({ label: g, items: groups[g] }));
  }, [notifications]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-[var(--bv-muted)]">Loading notifications...</div>
    );
  }

  if (notifications.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center bg-white rounded-2xl border border-[var(--bv-border)] w-full mx-auto">
        <div className="w-16 h-16 rounded-2xl bg-[var(--bv-accent-soft)] flex items-center justify-center mb-5">
          <Bell size={28} className="text-[var(--bv-accent)]" />
        </div>
        <h3 className="text-[20px] font-heading font-semibold text-[var(--bv-ink)] mb-2">All Clear!</h3>
        <p className="text-[14px] text-[var(--bv-muted)] max-w-sm leading-relaxed mb-7">
          You have no notifications. We'll notify you when something new comes in.
        </p>
        <Button className="bg-[var(--bv-accent)] text-white hover:bg-[var(--bv-accent-strong)] rounded-xl" onClick={() => navigate("/")}>
          Explore Tours
        </Button>
      </div>
    );
  }

  return (
    <div className="w-full mx-auto">
      <div className="flex items-center justify-between mb-6">
        <p className="text-[14px] text-[var(--bv-muted)]">
          {unreadCount > 0 ? `${unreadCount} unread notification${unreadCount > 1 ? "s" : ""}` : "All caught up"}
        </p>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button
              onClick={markAllRead}
              className="flex items-center gap-1.5 text-[13px] font-medium text-[var(--bv-accent-strong)] hover:text-[var(--bv-forest)] transition-colors"
            >
              <CheckCheck size={14} />
              Mark all read
            </button>
          )}
          <button
            onClick={clearAll}
            className="flex items-center gap-1.5 text-[13px] font-medium text-[var(--bv-muted)] hover:text-[var(--bv-danger-text)] transition-colors"
          >
            <Trash2 size={14} />
            Clear all
          </button>
        </div>
      </div>

      <div className="space-y-6">
        {grouped.map((group) => (
          <div key={group.label}>
            <h3 className="text-[13px] font-semibold text-[var(--bv-faint)] uppercase tracking-wider mb-3 px-1">
              {group.label}
            </h3>
            <div className="space-y-2">
              <AnimatePresence>
                {group.items.map((notification) => {
                  const config = typeConfig[notification.type] ?? DEFAULT_CONFIG;
                  const isChat = notification.type === "NEW_MESSAGE";
                  const conversationId = notification.data?.conversationId;

                  return (
                    <motion.div
                      key={notification.id}
                      layout
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -30, height: 0, marginBottom: 0 }}
                      transition={{ duration: 0.2 }}
                      onClick={() => markRead(notification.id)}
                      className={`relative flex gap-4 p-4 rounded-xl cursor-pointer transition-all duration-150 ${
                        notification.read
                          ? "bg-white border border-[var(--bv-border)]"
                          : "bg-[var(--bv-accent-soft)]/40 border border-[var(--bv-accent)]/15 shadow-sm"
                      }`}
                    >
                      {!notification.read && (
                        <span className="absolute top-4 right-4 w-2 h-2 rounded-full bg-[var(--bv-accent)]" />
                      )}

                      <div className={`w-10 h-10 rounded-xl ${config.bg} flex items-center justify-center shrink-0`}>
                        <config.icon size={18} className={config.color} />
                      </div>

                      <div className="flex-1 min-w-0 pr-6">
                        <div className="flex items-start justify-between gap-3">
                          <h4 className={`text-[15px] font-semibold text-[var(--bv-ink)] ${notification.read ? "opacity-60" : ""}`}>
                            {notification.title}
                          </h4>
                          <span className="text-[12px] text-[var(--bv-faint)] whitespace-nowrap shrink-0 mt-0.5">
                            {timeAgo(notification.createdAt)}
                          </span>
                        </div>
                        <p className={`text-[14px] mt-1 leading-relaxed ${notification.read ? "text-[var(--bv-faint)]" : "text-[var(--bv-muted)]"}`}>
                          {notification.message}
                        </p>
                        {isChat && conversationId && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/dashboard/chat?conversation=${conversationId}`);
                            }}
                            className="flex items-center gap-1 text-[13px] font-medium text-[var(--bv-accent-strong)] mt-2 hover:underline"
                          >
                            View chat
                            <ExternalLink size={12} />
                          </button>
                        )}
                        <div className="flex items-center gap-3 mt-2 pt-2 border-t border-[var(--bv-border)]">
                          {!notification.read && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                markRead(notification.id);
                              }}
                              className="text-[12px] font-medium text-[var(--bv-accent-strong)] hover:underline"
                            >
                              Mark read
                            </button>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              removeOne(notification.id);
                            }}
                            className="text-[12px] font-medium text-[var(--bv-faint)] hover:text-[var(--bv-danger-text)] transition-colors"
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
        ))}
      </div>
    </div>
  );
}
