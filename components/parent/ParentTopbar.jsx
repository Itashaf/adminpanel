'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { FiLogOut, FiMenu, FiChevronDown, FiBell } from 'react-icons/fi';
import ConfirmDialog from '@/components/ConfirmDialog';
import DropdownMenu from '@/components/DropdownMenu';
import { logoutAction, switchActiveChildAction } from '@/app/actions/auth';
import { getParentNotifications, markParentNotificationRead, markAllParentNotificationsRead } from '@/lib/api';

function timeAgo(iso) {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

// Calendar-day buckets (not rolling 24h windows) so "Today"/"Yesterday"
// match what a person actually means by those words — a notification from
// 11pm yesterday and one from 1am today are 2 hours apart but very
// different buckets to a reader.
const GROUP_ORDER = ['Today', 'Yesterday', 'Last 7 Days', 'Last 30 Days', 'Older'];

function startOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function groupForDate(iso) {
  const day = startOfDay(iso);
  const today = startOfDay(new Date());
  const diffDays = Math.round((today - day) / (24 * 60 * 60 * 1000));
  if (diffDays <= 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays <= 7) return 'Last 7 Days';
  if (diffDays <= 30) return 'Last 30 Days';
  return 'Older';
}

function groupNotifications(notifications) {
  const buckets = new Map();
  for (const n of notifications) {
    const group = groupForDate(n.createdAt);
    if (!buckets.has(group)) buckets.set(group, []);
    buckets.get(group).push(n);
  }
  return GROUP_ORDER.filter((g) => buckets.has(g)).map((g) => ({ label: g, items: buckets.get(g) }));
}

// A parent with more than one child linked to their account (see
// lib/parentAccounts.js's linkOrCreateParentAccount) switches between them
// via the avatar dropdown — switchActiveChildAction re-signs the session
// cookie with the new activeStudentId, and every /parent page just re-reads
// that on the next render (router.refresh()). Logout lives in the same
// dropdown rather than its own button, matching the target design's minimal
// topbar (just a bell + one avatar control).
export default function ParentTopbar({ students = [], activeStudentId, onMenuClick }) {
  const router = useRouter();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isSwitching, setIsSwitching] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showPanel, setShowPanel] = useState(false);
  const panelRef = useRef(null);

  const activeStudent = students.find((s) => s.id === activeStudentId) || students[0];

  const loadNotifications = useCallback(async () => {
    try {
      const data = await getParentNotifications();
      setNotifications(data.notifications);
      setUnreadCount(data.unreadCount);
    } catch {
      // Silent — bell just keeps its last known state on a failed refresh.
    }
  }, []);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  useEffect(() => {
    if (!showPanel) return;
    function handleClickOutside(e) {
      if (panelRef.current && !panelRef.current.contains(e.target)) setShowPanel(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showPanel]);

  const handleNotificationClick = (n) => {
    if (!n.isRead) {
      setNotifications((prev) => prev.map((item) => (item.id === n.id ? { ...item, isRead: true } : item)));
      setUnreadCount((c) => Math.max(0, c - 1));
      markParentNotificationRead(n.id).catch(() => {});
    }
    setShowPanel(false);
    if (n.link) router.push(n.link);
  };

  const handleMarkAllRead = async () => {
    setNotifications((prev) => prev.map((item) => ({ ...item, isRead: true })));
    setUnreadCount(0);
    try {
      await markAllParentNotificationsRead();
    } catch {
      loadNotifications();
    }
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);
    await logoutAction();
    router.push('/login');
  };

  const handleSwitch = async (studentId) => {
    if (studentId === activeStudentId || isSwitching) return;
    setIsSwitching(true);
    try {
      await switchActiveChildAction(studentId);
      router.refresh();
    } finally {
      setIsSwitching(false);
    }
  };

  const menuItems = [
    ...students
      .filter((s) => s.id !== activeStudentId)
      .map((s) => ({
        label: `Switch to ${s.name}${s.class ? ` (${s.class}${s.section ? ` - ${s.section}` : ''})` : ''}`,
        onClick: () => handleSwitch(s.id),
      })),
    { label: 'Logout', icon: <FiLogOut className="w-4 h-4" />, onClick: () => setShowLogoutConfirm(true), danger: true },
  ];

  return (
    <header className="flex items-center gap-3 px-4 sm:px-6 py-3.5 bg-white border-b border-gray-100 shrink-0">
      <button type="button" onClick={onMenuClick} className="lg:hidden text-gray-400 hover:text-gray-600 cursor-pointer">
        <FiMenu className="w-5 h-5" />
      </button>

      <div className="ml-auto flex items-center gap-4">
        <div className="relative" ref={panelRef}>
          <button
            type="button"
            onClick={() => setShowPanel((v) => !v)}
            className="relative text-gray-400 hover:text-gray-600 transition cursor-pointer"
          >
            <FiBell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-red-500" />
            )}
          </button>

          {showPanel && (
            <div className="absolute right-0 mt-2 w-80 max-w-[calc(100vw-2rem)] bg-white rounded-xl shadow-lg border border-gray-100 z-50">
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                <span className="text-sm font-semibold text-gray-900">Notifications</span>
                {unreadCount > 0 && (
                  <button type="button" onClick={handleMarkAllRead} className="text-xs font-medium text-indigo-600 hover:text-indigo-700 cursor-pointer">
                    Mark all read
                  </button>
                )}
              </div>

              <div className="max-h-96 overflow-y-auto">
                {notifications.length === 0 ? (
                  <p className="px-4 py-8 text-sm text-gray-400 text-center">No notifications yet.</p>
                ) : (
                  groupNotifications(notifications).map((group) => (
                    <div key={group.label}>
                      <p className="px-4 pt-3 pb-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wide bg-gray-50/60">
                        {group.label}
                      </p>
                      {group.items.map((n) => (
                        <button
                          key={n.id}
                          type="button"
                          onClick={() => handleNotificationClick(n)}
                          className={`w-full text-left px-4 py-3 border-b border-gray-50 last:border-0 hover:bg-gray-50 transition cursor-pointer ${
                            !n.isRead ? 'bg-indigo-50/50' : ''
                          }`}
                        >
                          <div className="flex items-start gap-2">
                            {!n.isRead && <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-indigo-600 shrink-0" />}
                            <div className={n.isRead ? 'pl-3.5' : ''}>
                              <p className="text-sm font-medium text-gray-900 leading-tight">{n.title}</p>
                              <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{n.message}</p>
                              <p className="text-xs text-gray-400 mt-1">{timeAgo(n.createdAt)}</p>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        <DropdownMenu
          trigger={
            <span className="flex items-center gap-2">
              <span className="flex items-center justify-center w-8 h-8 rounded-full bg-indigo-600 text-white text-xs font-semibold shrink-0">
                {activeStudent?.name
                  ?.split(' ')
                  .map((p) => p[0])
                  .slice(0, 2)
                  .join('')
                  .toUpperCase()}
              </span>
              <span className="hidden sm:block text-left">
                <span className="block text-sm font-semibold text-gray-900 leading-tight">{activeStudent?.name}</span>
                <span className="block text-xs text-gray-400 leading-tight">Parent</span>
              </span>
              <FiChevronDown className="w-3.5 h-3.5 text-gray-400" />
            </span>
          }
          items={menuItems}
        />
      </div>

      <ConfirmDialog
        isOpen={showLogoutConfirm}
        onClose={() => setShowLogoutConfirm(false)}
        onConfirm={handleLogout}
        title="Log out?"
        description="You'll need to sign in again to view your child's fees."
        confirmLabel="Log Out"
        isLoading={isLoggingOut}
      />
    </header>
  );
}
