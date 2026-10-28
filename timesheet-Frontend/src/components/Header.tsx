import React, { useState, useEffect, useRef } from 'react';
import { ActivePortalMode, User, Notification as AppNotification, NotificationType } from '../types';
import {
  Bell,
  ChevronDown,
  LogOut,
  CheckCheck,
  Clock,
  CalendarCheck,
  CalendarX,
  CalendarClock,
  Briefcase,
  AlertCircle,
  RefreshCw,
  PanelLeft,
} from 'lucide-react';
import { formatINR } from '../utils/formatters';
import { useGetNotificationsQuery, useClearNotificationsMutation } from '../store/api/dataApi';
import { useSelector } from 'react-redux';
import { RootState } from '../store';

interface HeaderProps {
  currentUser: User;
  portalMode: ActivePortalMode;
  onTogglePortalMode: (mode: ActivePortalMode) => void;
  pendingApprovalsCount: number;
  onLogout: () => void;
  isSidebarCollapsed?: boolean;
  onToggleSidebar?: () => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function timeAgo(isoString: string): string {
  const now = Date.now();
  const then = new Date(isoString).getTime();
  const diff = Math.max(0, Math.floor((now - then) / 1000)); // seconds

  if (diff < 60) return 'Just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(isoString).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

function notificationIcon(type: NotificationType) {
  const base = 'w-4 h-4 flex-shrink-0';
  switch (type) {
    case 'leave_approved':
      return <CalendarCheck className={`${base} text-emerald-500`} />;
    case 'leave_rejected':
      return <CalendarX className={`${base} text-rose-500`} />;
    case 'leave_requested':
      return <CalendarClock className={`${base} text-blue-500`} />;
    case 'leave_cancelled':
      return <CalendarX className={`${base} text-slate-400`} />;
    case 'weekend_work_approved':
      return <CheckCheck className={`${base} text-emerald-500`} />;
    case 'weekend_work_rejected':
      return <AlertCircle className={`${base} text-rose-500`} />;
    case 'weekend_work_requested':
      return <Briefcase className={`${base} text-violet-500`} />;
    case 'timesheet_approved':
      return <CheckCheck className={`${base} text-emerald-500`} />;
    case 'timesheet_rejected':
      return <AlertCircle className={`${base} text-rose-500`} />;
    case 'pending_approval':
      return <Clock className={`${base} text-amber-500`} />;
    default:
      return <Bell className={`${base} text-slate-400`} />;
  }
}

function notificationBg(type: NotificationType, isRead: boolean): string {
  if (isRead) return 'bg-slate-50 border-slate-200/80';
  switch (type) {
    case 'leave_approved':
    case 'weekend_work_approved':
    case 'timesheet_approved':
      return 'bg-emerald-50/70 border-emerald-200/60';
    case 'leave_rejected':
    case 'weekend_work_rejected':
    case 'timesheet_rejected':
      return 'bg-rose-50/70 border-rose-200/60';
    case 'leave_requested':
    case 'weekend_work_requested':
      return 'bg-blue-50/70 border-blue-200/60';
    default:
      return 'bg-amber-50/70 border-amber-200/60';
  }
}

// ---------------------------------------------------------------------------
// Header component
// ---------------------------------------------------------------------------
export const Header: React.FC<HeaderProps> = React.memo(({
  currentUser,
  portalMode,
  onTogglePortalMode,
  pendingApprovalsCount,
  onLogout,
  isSidebarCollapsed,
  onToggleSidebar,
}) => {
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  // Local read-state overlay — IDs that the user has "seen" this session
  const [readIds, setReadIds] = useState<Set<string>>(new Set());

  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  const isLoggedIn = !!useSelector((state: RootState) => state.auth.user);

  const {
    data: notifData,
    isLoading: notifLoading,
    refetch: refetchNotifs,
    isFetching: notifFetching,
  } = useGetNotificationsQuery(undefined, {
    skip: !isLoggedIn,
    pollingInterval: 60_000, // auto-refresh every 60 seconds
  });

  const [clearNotifications] = useClearNotificationsMutation();

  const rawNotifications = notifData?.notifications ?? [];
  // Merge server is_read with local session read state
  const notifications = rawNotifications.map((n) => ({
    ...n,
    is_read: n.is_read || readIds.has(n.id),
  }));
  const unreadCount = notifications.filter((n) => !n.is_read).length;

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotifications(false);
      }
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setShowProfileMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Mark all as read when panel opens
  const handleOpenNotifications = () => {
    const next = !showNotifications;
    setShowNotifications(next);
    setShowProfileMenu(false);
    if (next) {
      // Mark all currently visible unread items as locally read
      setReadIds((prev) => {
        const updated = new Set(prev);
        rawNotifications.forEach((n) => {
          if (!n.is_read) updated.add(n.id);
        });
        return updated;
      });
    }
  };

  const handleMarkAllRead = () => {
    setReadIds((prev) => {
      const updated = new Set(prev);
      rawNotifications.forEach((n) => updated.add(n.id));
      return updated;
    });
  };

  const handleClearAll = async () => {
    try {
      await clearNotifications().unwrap();
      setReadIds(new Set());
    } catch (e) {
      console.error('Failed to clear notifications', e);
    }
  };

  return (
    <header className="sticky top-0 z-30 h-16 bg-white/85 backdrop-blur-md border-b border-slate-200/90 text-slate-800 px-4 lg:px-6 flex items-center justify-between gap-4 shadow-2xs">
      {/* Left Branding & Sidebar Slider Toggle */}
      <div className="flex items-center gap-3">
        {/* Brand Logo & Title */}
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-2xl bg-gradient-to-tr from-sky-600 to-blue-600 shadow-md shadow-blue-500/25 text-white font-extrabold text-xl">
            <span className="text-2xl tracking-tight text-white mb-0.5">
              𝖊𝖇
            </span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-black text-lg tracking-tight text-slate-900">
                SuperTime
              </span>
            </div>
            <p className="text-[11px] text-slate-500 font-semibold hidden sm:block">
              {portalMode === 'employee'
                ? 'Employee workspace'
                : portalMode === 'pm'
                ? 'Project Manager workspace'
                : portalMode === 'ac_manager'
                ? 'Account Manager workspace'
                : 'Admin workspace'}
            </p>
          </div>
        </div>

        {/* Separating Line */}
        <div className="h-6 w-px bg-slate-200 mx-1 hidden sm:block" />

        {/* Sidebar Toggler Button - upside after the logo */}
        {onToggleSidebar && (
          <button
            type="button"
            onClick={onToggleSidebar}
            className={`flex items-center justify-center w-8 h-8 rounded-lg transition-colors cursor-pointer ${
              isSidebarCollapsed
                ? 'text-indigo-600 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200/60'
                : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100 border border-transparent'
            }`}
            title={isSidebarCollapsed ? 'Expand sidebar (Ctrl+B)' : 'Collapse sidebar (Ctrl+B)'}
            aria-label="Toggle sidebar"
          >
            <PanelLeft className="w-5 h-5" />
          </button>
        )}
      </div>


      {/* Right Controls */}
      <div className="flex items-center gap-3">

        {/* Notifications Dropdown */}
        <div className="relative" ref={notifRef}>
          <button
            type="button"
            onClick={handleOpenNotifications}
            className="relative p-2 rounded-xl bg-slate-50/80 hover:bg-slate-100 border border-slate-200/90 text-slate-600 hover:text-slate-900 active:scale-95 transition-all shadow-2xs"
            title="Notifications"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 flex items-center justify-center bg-sky-600 text-white text-[9px] font-bold rounded-full leading-none z-10 shadow-xs animate-pulse">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-[360px] bg-white/95 backdrop-blur-xl border border-slate-200/90 rounded-2xl shadow-2xl z-50 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-extrabold uppercase tracking-wider text-slate-800">
                    Notifications
                  </span>
                  {unreadCount > 0 && (
                    <span className="text-[10px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-bold border border-blue-100">
                      {unreadCount} New
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  {/* Refresh button */}
                  <button
                    type="button"
                    onClick={() => refetchNotifs()}
                    title="Refresh"
                    className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${notifFetching ? 'animate-spin' : ''}`} />
                  </button>
                  {/* Mark all read */}
                  {unreadCount > 0 && (
                    <button
                      type="button"
                      onClick={handleMarkAllRead}
                      title="Mark all as read"
                      className="p-1 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                    >
                      <CheckCheck className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Body */}
              <div className="overflow-y-auto max-h-[380px] divide-y divide-slate-100">
                {notifLoading ? (
                  <div className="flex flex-col items-center justify-center gap-3 py-12 text-slate-400">
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    <p className="text-xs font-medium">Loading notifications…</p>
                  </div>
                ) : notifications.length === 0 ? (
                  <div className="flex flex-col items-center justify-center gap-3 py-12 text-slate-400">
                    <Bell className="w-8 h-8 opacity-30" />
                    <p className="text-xs font-semibold">You're all caught up!</p>
                    <p className="text-[11px] text-slate-400 text-center px-6">
                      No notifications to show. We'll alert you when something needs your attention.
                    </p>
                  </div>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n.id}
                      className={`flex items-start gap-3 px-4 py-3 transition-colors hover:bg-slate-50/80 cursor-default ${!n.is_read ? 'bg-blue-50/30' : ''
                        }`}
                    >
                      {/* Icon */}
                      <div className={`mt-0.5 p-1.5 rounded-lg border ${notificationBg(n.type, n.is_read)}`}>
                        {notificationIcon(n.type)}
                      </div>

                      {/* Text */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-0.5">
                          <p className={`text-xs font-bold leading-tight truncate ${n.is_read ? 'text-slate-600' : 'text-slate-900'}`}>
                            {n.title}
                          </p>
                          <span className="text-[10px] text-slate-400 font-normal whitespace-nowrap flex-shrink-0">
                            {timeAgo(n.timestamp)}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 leading-snug line-clamp-2">
                          {n.description}
                        </p>
                      </div>

                      {/* Unread dot */}
                      {!n.is_read && (
                        <div className="mt-1.5 w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />
                      )}
                    </div>
                  ))
                )}
              </div>

              {/* Footer */}
              {notifications.length > 0 && (
                <div className="px-4 py-2.5 border-t border-slate-100 bg-slate-50/80 flex justify-between items-center">
                  <p className="text-[10px] text-slate-400 font-medium">
                    Showing {notifications.length} recent notification{notifications.length !== 1 ? 's' : ''}
                  </p>
                  <button
                    type="button"
                    onClick={handleClearAll}
                    className="text-[10px] font-bold text-rose-500 hover:text-rose-600 hover:bg-rose-50 px-2 py-1 rounded transition-colors"
                  >
                    Clear All
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* User Profile */}
        <div className="relative" ref={profileRef}>
          <button
            type="button"
            onClick={() => {
              setShowProfileMenu(!showProfileMenu);
              setShowNotifications(false);
            }}
            className="flex items-center gap-2 p-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 transition-colors"
          >
            <img
              src={currentUser.avatar}
              alt={currentUser.name}
              className="w-7 h-7 rounded-lg object-cover ring-2 ring-blue-500/20"
            />
            <div className="text-left hidden lg:block">
              <p className="text-xs font-bold text-slate-900 leading-none">
                {currentUser.name}
              </p>
              <p className="text-[10px] text-blue-600 mt-0.5 leading-none font-extrabold capitalize">
                {currentUser.role.replace('_', ' ')}
              </p>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden lg:block" />
          </button>

          {showProfileMenu && (
            <div className="absolute right-0 mt-2 w-64 bg-white border border-slate-200 rounded-2xl shadow-2xl z-50 p-4 text-slate-800">
              <div className="flex items-center gap-3 pb-3 border-b border-slate-200 mb-3">
                <img
                  src={currentUser.avatar}
                  alt={currentUser.name}
                  className="w-10 h-10 rounded-xl object-cover ring-2 ring-blue-500/20"
                />
                <div>
                  <h4 className="text-xs font-extrabold text-slate-900">{currentUser.name}</h4>
                  <span className="inline-block mt-1 text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100 uppercase">
                    Role: {currentUser.role.replace('_', ' ')}
                  </span>
                </div>
              </div>

              <div className="space-y-2 text-xs">


                <button
                  type="button"
                  onClick={() => {
                    setShowProfileMenu(false);
                    onLogout();
                  }}
                  className="w-full py-2.5 px-3 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs flex items-center justify-center gap-2 transition-colors border border-rose-200"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Logout</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
});
Header.displayName = 'Header';

