import { useState, useEffect, useRef, useCallback, lazy } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Settings,
  CalendarDays,
  Heart,
  Star,
  Bell,
  MessageCircle,
  LogOut,
  Home,
  ArrowLeft,
  Menu,
  ChevronDown,
} from "lucide-react";
import { toast } from "sonner";
import { useSidebarStore } from "@/stores/sidebarStore";
import { signOutUser } from "@/lib/auth";
import { useAuthUser } from "@/hooks/useAuthUser";
import { useChat } from "@/chat/ChatContext";
import logoSrc from "../../assets/expo_trans.png";
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

// Navigation items split: top-bar visible items vs dropdown overflow
const topBarItems = [
  { label: "Bookings", path: "/dashboard/bookings", icon: CalendarDays },
  { label: "Wishlist", path: "/dashboard/wishlist", icon: Heart },
  { label: "Reviews", path: "/dashboard/reviews", icon: Star },
];

const allNavItems = [
  ...topBarItems,
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

/* ================================================================
   PROFILE DROPDOWN
   ================================================================ */
function ProfileDropdown({
  open,
  onClose,
  onSignOut,
  signingOut,
}: {
  open: boolean;
  onClose: () => void;
  onSignOut: () => void;
  signingOut: boolean;
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const user = useAuthUser();
  const { unreadCount } = useChat();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open, onClose]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  const isActive = (path: string) =>
    location.pathname === path || location.pathname.startsWith(path + "/");

  const navigateAndClose = (path: string) => {
    navigate(path);
    onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          ref={ref}
          className="dash-profile-dropdown"
          role="menu"
          aria-label="User menu"
          initial={{ opacity: 0, scale: 0.96, y: -4 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: -4 }}
          transition={{ duration: 0.15, ease: "easeOut" }}
        >
          {/* User info header */}
          <div className="dash-profile-user">
            <div className="dash-profile-user-avatar">
              {user?.photoURL ? (
                <img
                  src={user.photoURL}
                  alt=""
                  className="dash-profile-user-img"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
                />
              ) : (
                <span className="dash-profile-user-initial">
                  {(user?.name || "U").charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            <div className="dash-profile-user-info">
              <p className="dash-profile-user-name">{user?.name || "User"}</p>
              <p className="dash-profile-user-email">{user?.email || ""}</p>
            </div>
          </div>

          <div className="dash-profile-divider" />

          {/* Nav items */}
          {allNavItems.map((item) => {
            const active = isActive(item.path);
            const badge =
              item.path === "/dashboard/chat" ? unreadCount : 0;
            return (
              <button
                key={item.path}
                role="menuitem"
                className={`dash-profile-item${active ? " active" : ""}`}
                onClick={() => navigateAndClose(item.path)}
              >
                <item.icon size={16} strokeWidth={active ? 2.2 : 1.7} />
                <span>{item.label}</span>
                {badge > 0 && (
                  <span className="dash-profile-badge">
                    {badge > 99 ? "99+" : badge}
                  </span>
                )}
              </button>
            );
          })}

          <div className="dash-profile-divider" />

          {/* Account settings */}
          <button
            role="menuitem"
            className="dash-profile-item"
            onClick={() => navigateAndClose("/dashboard/settings")}
          >
            <Settings size={16} strokeWidth={1.7} />
            <span>Account Settings</span>
          </button>

          {/* Back to homepage */}
          <button
            role="menuitem"
            className="dash-profile-item"
            onClick={() => {
              onClose();
              navigate("/");
            }}
          >
            <Home size={16} strokeWidth={1.7} />
            <span>Back to Homepage</span>
          </button>

          <div className="dash-profile-divider" />

          {/* Sign out */}
          {!showLogoutConfirm ? (
            <button
              role="menuitem"
              className="dash-profile-item dash-profile-signout"
              onClick={() => setShowLogoutConfirm(true)}
            >
              <LogOut size={16} strokeWidth={1.7} />
              <span>{signingOut ? "Signing out..." : "Sign out"}</span>
            </button>
          ) : (
            <div className="dash-profile-signout-confirm">
              <p className="dash-profile-signout-text">Sign out of dashboard?</p>
              <div className="dash-profile-signout-actions">
                <button
                  className="dash-profile-signout-cancel"
                  onClick={() => setShowLogoutConfirm(false)}
                >
                  Cancel
                </button>
                <button
                  className="dash-profile-signout-btn"
                  onClick={onSignOut}
                  disabled={signingOut}
                >
                  {signingOut ? "Signing out..." : "Sign out"}
                </button>
              </div>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ================================================================
   TOP BAR (replaces Sidebar on desktop)
   ================================================================ */
function TopBar() {
  const location = useLocation();
  const navigate = useNavigate();
  const user = useAuthUser();
  const { unreadCount } = useChat();
  const { isMobileOpen, closeMobile, toggleMobile } = useSidebarStore();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const handleSignOut = async () => {
    setSigningOut(true);
    await signOutUser();
    setSigningOut(false);
    navigate("/");
    toast.success("Successfully signed out");
  };

  const isActive = (path: string) =>
    location.pathname === path || location.pathname.startsWith(path + "/");

  return (
    <>
      {/* Top bar */}
      <header className="dash-topbar">
        <div className="dash-topbar-inner">
          {/* Left: Logo + hamburger (mobile) */}
          <div className="dash-topbar-left">
            {/* Mobile hamburger */}
            <button
              onClick={toggleMobile}
              className="dash-topbar-hamburger lg:hidden"
              aria-label="Toggle menu"
            >
              <Menu size={20} />
            </button>

            {/* Logo */}
            <a
              href="/"
              className="dash-topbar-logo"
              onClick={(e) => {
                e.preventDefault();
                navigate("/");
              }}
            >
              <img
                src={logoSrc}
                alt="Expedition Go"
                className="dash-topbar-logo-img"
              />
            </a>
          </div>

          {/* Center: Nav tabs (desktop only) */}
          <nav className="dash-topbar-nav hidden lg:flex" aria-label="Dashboard navigation">
            {topBarItems.map((item) => {
              const active = isActive(item.path);
              return (
                <button
                  key={item.path}
                  className={`dash-topbar-tab${active ? " active" : ""}`}
                  onClick={() => navigate(item.path)}
                  aria-current={active ? "page" : undefined}
                >
                  <item.icon size={16} strokeWidth={active ? 2.2 : 1.7} />
                  <span>{item.label}</span>
                  {active && (
                    <motion.span
                      layoutId="topbar-active"
                      className="dash-topbar-underline"
                      transition={{ type: "spring", stiffness: 500, damping: 35 }}
                    />
                  )}
                </button>
              );
            })}
          </nav>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Right: Utilities */}
          <div className="dash-topbar-utilities">
            {/* Updates bell (desktop) */}
            <button
              className="dash-topbar-icon-btn hidden lg:flex"
              onClick={() => navigate("/dashboard/notifications")}
              aria-label="Updates"
            >
              <Bell size={18} strokeWidth={1.7} />
              {/* Unread badge could go here if we track notification unread */}
            </button>

            {/* Chat (desktop) */}
            <button
              className="dash-topbar-icon-btn hidden lg:flex"
              onClick={() => navigate("/dashboard/chat")}
              aria-label="Chat"
            >
              <span className="dash-topbar-icon-wrap">
                <MessageCircle size={18} strokeWidth={1.7} />
                {unreadCount > 0 && (
                  <span className="dash-topbar-badge">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </span>
            </button>

            {/* Profile trigger */}
            <div ref={dropdownRef} className="relative">
              <button
                className="dash-profile-trigger"
                onClick={() => setDropdownOpen((v) => !v)}
                aria-expanded={dropdownOpen}
                aria-haspopup="menu"
              >
                <div className="dash-topbar-avatar">
                  {user?.photoURL ? (
                    <img
                      src={user.photoURL}
                      alt=""
                      className="dash-topbar-avatar-img"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = "none";
                      }}
                    />
                  ) : (
                    <span className="dash-topbar-avatar-initial">
                      {(user?.name || "U").charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
                <span className="dash-topbar-name hidden sm:block">
                  {user?.name || "User"}
                </span>
                <ChevronDown
                  size={14}
                  className={`dash-topbar-chevron${dropdownOpen ? " open" : ""}`}
                />
              </button>

              <ProfileDropdown
                open={dropdownOpen}
                onClose={() => setDropdownOpen(false)}
                onSignOut={handleSignOut}
                signingOut={signingOut}
              />
            </div>
          </div>
        </div>
      </header>

      {/* Mobile drawer overlay */}
      <AnimatePresence>
        {isMobileOpen && (
          <>
            <motion.div
              className="fixed inset-0 bg-black/30 z-[70] lg:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={closeMobile}
            />
            {/* Mobile drawer */}
            <motion.div
              className="fixed left-0 top-0 h-screen w-[280px] bg-white z-[80] lg:hidden flex flex-col shadow-2xl"
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", stiffness: 400, damping: 35 }}
            >
              {/* Drawer header */}
              <div className="flex items-center justify-between px-5 pt-5 pb-4">
                <a href="/" className="flex items-center gap-2.5" onClick={closeMobile}>
                  <img src={logoSrc} alt="Expedition Go" className="h-14" />
                  <span className="text-[17px] font-bold text-[var(--bv-ink)] tracking-[-0.01em]">
                    Expedition Go
                  </span>
                </a>
                <button
                  onClick={closeMobile}
                  className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
                  aria-label="Close menu"
                >
                  <span className="text-xl leading-none">&times;</span>
                </button>
              </div>

              <div className="h-px bg-gray-100 mx-4" />

              {/* Drawer nav */}
              <nav className="flex-1 overflow-y-auto px-3 py-3" aria-label="Dashboard navigation">
                {allNavItems.map((item) => {
                  const active = isActive(item.path);
                  const badge =
                    item.path === "/dashboard/chat" ? unreadCount : 0;
                  return (
                    <button
                      key={item.path}
                      className={`dash-drawer-item${active ? " active" : ""}`}
                      onClick={() => {
                        navigate(item.path);
                        closeMobile();
                      }}
                    >
                      <item.icon size={18} strokeWidth={active ? 2.2 : 1.7} />
                      <span>{item.label}</span>
                      {badge > 0 && (
                        <span className="ml-auto min-w-[18px] h-[18px] px-1 rounded-full bg-[var(--bv-danger-dot)] text-white text-[10px] font-bold flex items-center justify-center">
                          {badge > 99 ? "99+" : badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </nav>

              <div className="h-px bg-gray-100 mx-4" />

              {/* Drawer footer */}
              <div className="px-3 py-3 space-y-0.5">
                <button
                  className="dash-drawer-item"
                  onClick={() => {
                    navigate("/");
                    closeMobile();
                  }}
                >
                  <Home size={18} strokeWidth={1.7} />
                  <span>Back to Homepage</span>
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

/* ================================================================
   DASHBOARD LAYOUT
   ================================================================ */
export default function DashboardLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { unreadCount } = useChat();

  // Keep every visited dashboard page mounted (hidden, not unmounted) so
  // navigating away and back never remounts the page / refetches data.
  const [visited, setVisited] = useState<Set<string>>(
    () => new Set([location.pathname])
  );
  if (!visited.has(location.pathname)) {
    setVisited((prev) => new Set(prev).add(location.pathname));
  }

  const activeRoute = ROUTES.find((r) => r.path === location.pathname);
  if (!activeRoute) {
    return <Navigate to="/dashboard/bookings" replace />;
  }
  const title = activeRoute.title;
  const bookingsArea = isBookingsAreaPath(location.pathname);

  return (
    <div className={`min-h-screen ${bookingsArea ? "bg-white" : "bg-[var(--dash-content-bg)]"}`}>
      <TopBar />

      <main className="min-h-screen dash-main-content">
        <div className="mx-auto w-full max-w-[1120px] px-4 sm:px-6 lg:px-10 pb-10">
          <div className="flex items-center justify-center lg:justify-start mb-4 relative">
            {location.pathname !== "/dashboard/notifications" && (
              <h1 className="text-[clamp(24px,2.4vw,32px)] font-heading font-bold text-[var(--bv-ink)] text-center lg:text-left">
                {title}
              </h1>
            )}

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
                onClick={() =>
                  navigate("/", { state: { openMobileMenu: true } })
                }
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
          {allNavItems.map((item) => {
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
                    transition={{
                      type: "spring",
                      stiffness: 500,
                      damping: 25,
                    }}
                  >
                    <item.icon
                      size={22}
                      strokeWidth={isActive ? 2.2 : 1.7}
                    />
                  </motion.span>
                  {badge > 0 && (
                    <span className="dash-bottom-badge">
                      {badge > 99 ? "99+" : badge}
                    </span>
                  )}
                </span>
                <span className="dash-bottom-label">{item.label}</span>
                {isActive && <span className="dash-bottom-active-dot" />}
              </motion.button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
