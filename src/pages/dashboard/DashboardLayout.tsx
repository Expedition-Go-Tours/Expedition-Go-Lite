import { useState, useEffect, lazy } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Settings, CalendarDays, Heart, Star, Bell, MessageCircle,
  LogOut, ChevronLeft, ChevronRight, Menu, Home, ArrowLeft
} from "lucide-react";
import { toast } from "sonner";
import { useSidebarStore } from "@/stores/sidebarStore";
import { signOutUser } from "@/lib/auth";
import { useAuthUser } from "@/hooks/useAuthUser";
import { useChat } from "@/chat/ChatContext";
import "../../components/booking/bookingTheme.css";
import "./DashboardLayout.css";

// Dashboard sub-pages are code-split so visiting one tab (e.g. Wishlist) only
// downloads that page's chunk instead of every dashboard page up front.
const SettingsPage = lazy(() => import("./SettingsPage"));
const BookingHistory = lazy(() => import("../BookingHistory"));
const Wishlist = lazy(() => import("../Wishlist"));
const ReviewsPage = lazy(() => import("./ReviewsPage"));
const NotificationsPage = lazy(() => import("./NotificationsPage"));
const ChatPage = lazy(() => import("./ChatPage"));

const navItems = [
  { label: "Bookings", path: "/dashboard/bookings", icon: CalendarDays },
  { label: "Wishlist", path: "/dashboard/wishlist", icon: Heart },
  { label: "Reviews", path: "/dashboard/reviews", icon: Star },
  { label: "Updates", path: "/dashboard/notifications", icon: Bell },
  { label: "Chat", path: "/dashboard/chat", icon: MessageCircle },
  { label: "Settings", path: "/dashboard/settings", icon: Settings },
];

const ROUTES = [
  { path: "/dashboard/settings", title: "Account Settings", Page: SettingsPage },
  { path: "/dashboard/bookings", title: "Booking History", Page: BookingHistory },
  { path: "/dashboard/wishlist", title: "My Wishlist", Page: Wishlist },
  { path: "/dashboard/reviews", title: "My Reviews", Page: ReviewsPage },
  { path: "/dashboard/notifications", title: "Updates", Page: NotificationsPage },
  { path: "/dashboard/chat", title: "Chat", Page: ChatPage },
] as const;

function isBookingsAreaPath(pathname: string): boolean {
  return pathname === "/dashboard/bookings";
}

function Sidebar() {
  const { isCollapsed, toggle, isMobileOpen, closeMobile } = useSidebarStore();
  const location = useLocation();
  const navigate = useNavigate();
  const user = useAuthUser();
  const { unreadCount } = useChat();
  const [signingOut, setSigningOut] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setMounted(true));
  }, []);

  const handleSignOut = async () => {
    setSigningOut(true);
    await signOutUser();
    setSigningOut(false);
    navigate("/");
    toast.success("Successfully signed out");
  };

  return (
    <>
      {/* Mobile hamburger */}
      <button
        onClick={() => useSidebarStore.getState().toggleMobile()}
        className={`fixed top-0 left-0 z-[70] p-3 rounded-br-xl bg-white border border-[var(--bv-border)] shadow-sm text-[var(--bv-text)] hover:bg-[var(--bv-surface-2)] transition-colors ${isMobileOpen ? "hidden" : "lg:hidden"}`}
        aria-label="Toggle menu"
      >
        <Menu size={20} />
      </button>

      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-0 h-screen bg-[var(--dash-sidebar-bg)] border-r border-[var(--dash-sidebar-border)] z-[60] flex flex-col
          ${mounted ? "transition-all duration-[400ms] ease-[cubic-bezier(0.25,0.46,0.45,0.94)]" : ""}
          ${isMobileOpen ? "translate-x-0" : "-translate-x-full"}
          ${isCollapsed ? "lg:w-[72px] lg:translate-x-0" : "lg:w-[272px] lg:translate-x-0"}
          w-[280px]`}
      >
        {/* Profile — centered avatar + name + email */}
        <div className={`shrink-0 flex flex-col items-center ${isCollapsed ? "pt-6 pb-4" : "pt-6 pb-5"}`}>
          <div className={`rounded-full overflow-hidden bg-white/15 shrink-0 flex items-center justify-center ${isCollapsed ? "w-11 h-11" : "w-14 h-14"}`}>
            {user?.photoURL ? (
              <img src={user.photoURL} alt="" className="w-full h-full object-cover object-center" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
            ) : (
              <span className={`font-bold text-white ${isCollapsed ? "text-sm" : "text-lg"}`}>
                {(user?.name || "U").charAt(0).toUpperCase()}
              </span>
            )}
          </div>
          {!isCollapsed && (
            <div className="min-w-0 text-center mt-3">
              <p className="text-[15px] font-semibold text-white truncate leading-tight tracking-[-0.01em]">
                {user?.name || "User"}
              </p>
              <p className="text-[12.5px] text-white/65 truncate leading-relaxed mt-0.5 tracking-[0.01em]">
                {user?.email || ""}
              </p>
            </div>
          )}
        </div>

        {/* Divider */}
        <div className={`h-px bg-white/10 ${isCollapsed ? "mx-3" : "mx-5"}`} />

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto overflow-x-hidden min-h-0 scrollbar-none px-3 py-3">
          <div className="space-y-0.5">
            {navItems.map((item) => {
              const isActive =
                location.pathname === item.path ||
                location.pathname.startsWith(item.path + "/");

              return (
                <button
                  key={item.path}
                  onClick={() => {
                    navigate(item.path);
                    closeMobile();
                  }}
                  className={`relative flex items-center w-full rounded-xl text-[14px] font-medium tracking-[0.01em] transition-all duration-150 group
                    ${isActive
                      ? "bg-[var(--dash-sidebar-active-bg)] text-[var(--dash-sidebar-active-text)] font-semibold"
                      : "text-white/65 hover:bg-white/10 hover:text-white"
                    }
                    ${isCollapsed ? "justify-center px-0 py-2.5" : "gap-3 px-3 py-2.5"}`}
                  title={isCollapsed ? item.label : undefined}
                >
                  {isActive && (
                    <motion.span
                      layoutId="sidebar-active"
                      transition={{ type: "spring", stiffness: 400, damping: 30 }}
                      className="absolute left-0 inset-y-2 w-[3px] rounded-r-full bg-[var(--dash-sidebar-active-border)]"
                    />
                  )}
                  <motion.span
                    layout
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    className="shrink-0"
                  >
                    <item.icon size={18} strokeWidth={isActive ? 2.2 : 1.7} />
                  </motion.span>
                  {!isCollapsed && (
                    <span className="truncate">{item.label}</span>
                  )}
                  {item.path === "/dashboard/chat" && unreadCount > 0 && (
                    <span className={`ml-auto min-w-[18px] h-[18px] px-1 rounded-full bg-[var(--bv-danger-dot)] text-white text-[10px] font-bold flex items-center justify-center ${isCollapsed ? "absolute top-1 right-1" : ""}`}>
                      {unreadCount > 99 ? "99+" : unreadCount}
                    </span>
                  )}
                  {isCollapsed && (
                    <div className="absolute left-full ml-2.5 top-1/2 -translate-y-1/2 px-2.5 py-1.5 bg-[var(--bv-ink)] text-white text-xs font-medium rounded-lg shadow-lg whitespace-nowrap opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-150 pointer-events-none z-[70]">
                      {item.label}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </nav>

        {/* Divider */}
        <div className={`h-px bg-white/10 ${isCollapsed ? "mx-3" : "mx-5"}`} />

        {/* Bottom actions — wrapped in subtle card */}
        <div className={`shrink-0 py-2 ${isCollapsed ? "px-3" : "px-3"}`}>
          <div className={`rounded-xl bg-white/8 ${isCollapsed ? "p-1" : "p-1"}`}>
            <button
              onClick={() => { navigate("/"); closeMobile(); }}
              className={`flex items-center w-full rounded-lg text-[13px] font-medium tracking-[0.01em] transition-all duration-150 text-white/80 hover:bg-white/12
                ${isCollapsed ? "justify-center px-0 py-2" : "gap-3 px-3 py-2"}`}
              title={isCollapsed ? "Back to Homepage" : undefined}
            >
              <Home size={18} strokeWidth={1.8} />
              {!isCollapsed && <span>Back to Homepage</span>}
            </button>

            <div className="relative">
              <button
                onClick={() => setShowLogoutConfirm(!showLogoutConfirm)}
                onBlur={() => setTimeout(() => setShowLogoutConfirm(false), 200)}
                className={`flex items-center w-full rounded-lg text-[13px] font-medium tracking-[0.01em] transition-all duration-150 text-red-300 hover:bg-white/10
                  ${isCollapsed ? "justify-center px-0 py-2" : "gap-3 px-3 py-2"}`}
                title={isCollapsed ? "Sign out" : undefined}
              >
                <LogOut size={18} strokeWidth={1.8} />
                {!isCollapsed && <span>{signingOut ? "Signing out..." : "Sign out"}</span>}
              </button>
              {showLogoutConfirm && (
                <div className={`absolute bottom-full mb-2 bg-white rounded-xl shadow-xl p-3 min-w-[200px] z-[70] border border-[var(--bv-border)] ${isCollapsed ? "left-0" : "left-1/2 -translate-x-1/2"}`}>
                  <p className="text-[13px] font-medium text-[var(--bv-text)] mb-2.5 text-center whitespace-nowrap">Sign out of dashboard?</p>
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => setShowLogoutConfirm(false)}
                      className="flex-1 px-3 py-1.5 text-[13px] font-medium text-[var(--bv-muted)] bg-[var(--bv-surface-2)] hover:bg-[var(--bv-border)] rounded-lg transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSignOut}
                      className="flex-1 px-3 py-1.5 text-[13px] font-medium text-white bg-[var(--bv-danger-dot)] hover:bg-red-600 rounded-lg transition-colors"
                    >
                      Sign out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Collapse button — desktop only */}
        <div className={`shrink-0 hidden lg:block border-t border-white/10 ${isCollapsed ? "px-3 pt-3 pb-4" : "px-3 pt-3 pb-4"}`}>
          <button
            onClick={toggle}
            className={`flex items-center w-full rounded-xl text-[12px] font-medium tracking-[0.02em] transition-all duration-150 text-white/38 hover:text-white hover:bg-white/10
              ${isCollapsed ? "justify-center px-0 py-2" : "gap-2.5 px-3 py-2"}`}
            title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {isCollapsed ? <ChevronRight size={16} /> : (
              <>
                <ChevronLeft size={16} />
                <span>Collapse</span>
              </>
            )}
          </button>
        </div>
      </aside>

      {/* Mobile overlay */}
      <AnimatePresence>
        {isMobileOpen && (
          <motion.div
            className="fixed inset-0 bg-black/30 z-[45] lg:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={closeMobile}
          />
        )}
      </AnimatePresence>
    </>
  );
}

export default function DashboardLayout() {
  const { isCollapsed } = useSidebarStore();
  const location = useLocation();
  const navigate = useNavigate();
  const { unreadCount } = useChat();

  // Keep every visited dashboard page mounted (hidden, not unmounted) so
  // navigating away and back never remounts the page / refetches data.
  const [visited, setVisited] = useState<Set<string>>(() => new Set([location.pathname]));
  if (!visited.has(location.pathname)) {
    setVisited((prev) => new Set(prev).add(location.pathname));
  }

  const activeRoute = ROUTES.find((r) => r.path === location.pathname);
  if (!activeRoute) {
    return <Navigate to="/dashboard/settings" replace />;
  }
  const title = activeRoute.title;
  const bookingsArea = isBookingsAreaPath(location.pathname);

  return (
    <div className={`min-h-screen ${bookingsArea ? "bg-white" : "bg-[var(--dash-content-bg)]"}`}>
      <Sidebar />

      <main
        className={`min-h-screen transition-all duration-300 pt-6 lg:pt-10 ${
          isCollapsed ? "lg:ml-[72px]" : "lg:ml-[272px]"
        }`}
      >
        <div className="mx-auto w-full max-w-[1120px] px-4 sm:px-6 lg:px-10 pb-10">
          <div className="flex items-center justify-center lg:justify-start mb-8 relative">
            <h1 className="text-[clamp(24px,2.4vw,32px)] font-heading font-bold text-[var(--bv-ink)] text-center lg:text-left">
              {title}
            </h1>

            {location.pathname === "/dashboard/settings" && (
              <button
                type="button"
                onClick={() => navigate("/")}
                className="lg:hidden absolute right-0 flex h-9 w-9 items-center justify-center rounded-full border border-[var(--bv-border)] bg-white text-[var(--bv-text)] shadow-sm transition-colors hover:bg-[var(--bv-surface-2)]"
                aria-label="Back to home"
              >
                <ArrowLeft size={16} strokeWidth={2.2} />
              </button>
            )}

            {location.pathname === "/dashboard/bookings" && (
              <button
                type="button"
                onClick={() => navigate("/", { state: { openMobileMenu: true } })}
                className="lg:hidden absolute right-0 flex h-9 w-9 items-center justify-center rounded-full border border-[var(--bv-border)] bg-white text-[var(--bv-text)] shadow-sm transition-colors hover:bg-[var(--bv-surface-2)]"
                aria-label="Back to menu"
              >
                <ArrowLeft size={16} strokeWidth={2.2} />
              </button>
            )}
          </div>

          <div className="dash-pages">
            {ROUTES.map((r) => {
              if (!visited.has(r.path)) return null;
              const active = r.path === location.pathname;
              return (
                <section
                  key={r.path}
                  className={`dash-pane${active ? " active" : ""}`}
                  hidden={!active}
                >
                  <r.Page />
                </section>
              );
            })}
          </div>
        </div>
      </main>

      {/* Mobile bottom tab bar */}
      <nav className="dash-bottom-bar lg:hidden" aria-label="Dashboard navigation">
        <div className="dash-bottom-bar-inner">
          {navItems.map((item) => {
            const isActive =
              location.pathname === item.path ||
              location.pathname.startsWith(item.path + "/");
            const badge =
              item.path === "/dashboard/chat" ? unreadCount : 0;
            return (
              <motion.button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`dash-bottom-tab${isActive ? " active" : ""}`}
                aria-current={isActive ? "page" : undefined}
                whileTap={{ scale: 0.88 }}
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
              >
                <span className="dash-bottom-icon-wrap">
                  <motion.span
                    className="dash-bottom-icon"
                    animate={{ scale: isActive ? 1.08 : 1 }}
                    transition={{ type: "spring", stiffness: 500, damping: 25 }}
                  >
                    <item.icon size={22} strokeWidth={isActive ? 2.2 : 1.7} />
                  </motion.span>
                  {badge > 0 && (
                    <span className="dash-bottom-badge">
                      {badge > 99 ? "99+" : badge}
                    </span>
                  )}
                </span>
                <span className="dash-bottom-label">
                  {item.label}
                </span>
                {isActive && <span className="dash-bottom-active-dot" />}
              </motion.button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
