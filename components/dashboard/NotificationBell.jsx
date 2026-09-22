'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { FiBell } from 'react-icons/fi';
import { getAdminNotifications, markAdminNotificationRead, markAllAdminNotificationsRead } from '@/lib/api';

const PANEL_WIDTH = 360;
const GAP = 8;

function timeAgo(iso) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

// Real notifications now (school-wide admin inbox — see lib/adminNotifications.js)
// — this replaced a bell that was purely decorative: a static red dot with
// no click handler, no fetch, no list, ever.
export default function NotificationBell() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const buttonRef = useRef(null);
  const panelRef = useRef(null);

  const load = useCallback(() => {
    setIsLoading(true);
    getAdminNotifications()
      .then(({ notifications: list, unreadCount: count }) => {
        setNotifications(list);
        setUnreadCount(count);
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  // Poll every 60s regardless of open/closed so the unread badge stays
  // current — cheap (one small query) and the only realtime signal an admin
  // gets short of a full push-notification pipeline this app doesn't have
  // for the web dashboard.
  useEffect(() => {
    load();
    const interval = setInterval(load, 60000);
    return () => clearInterval(interval);
  }, [load]);

  const computePosition = useCallback(() => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    setPosition({ top: rect.bottom + GAP, left: rect.right - PANEL_WIDTH });
  }, []);

  const handleToggle = () => {
    if (isOpen) {
      setIsOpen(false);
      return;
    }
    computePosition();
    setIsOpen(true);
    load();
  };

  useEffect(() => {
    if (!isOpen) return;
    function handleClickOutside(event) {
      if (
        buttonRef.current &&
        !buttonRef.current.contains(event.target) &&
        panelRef.current &&
        !panelRef.current.contains(event.target)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('scroll', computePosition, true);
    window.addEventListener('resize', computePosition);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('scroll', computePosition, true);
      window.removeEventListener('resize', computePosition);
    };
  }, [isOpen, computePosition]);

  const handleItemClick = async (item) => {
    setIsOpen(false);
    if (!item.isRead) {
      setNotifications((prev) => prev.map((n) => (n.id === item.id ? { ...n, isRead: true } : n)));
      setUnreadCount((prev) => Math.max(0, prev - 1));
      markAdminNotificationRead(item.id).catch(() => {});
    }
    if (item.link) router.push(item.link);
  };

  const handleMarkAllRead = async (e) => {
    e.stopPropagation();
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnreadCount(0);
    try {
      await markAllAdminNotificationsRead();
    } catch {
      load();
    }
  };

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={handleToggle}
        className="relative text-gray-500 hover:text-gray-700 cursor-pointer"
      >
        <FiBell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[16px] h-[16px] px-1 rounded-full bg-red-500 text-white text-[9px] font-bold">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen &&
        position &&
        createPortal(
          <div
            ref={panelRef}
            style={{ position: 'fixed', top: position.top, left: position.left, width: PANEL_WIDTH }}
            className="z-50 bg-white rounded-2xl border border-gray-100 shadow-xl overflow-hidden"
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <p className="text-sm font-semibold text-gray-900">Notifications</p>
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={handleMarkAllRead}
                  className="text-xs font-medium text-indigo-600 hover:text-indigo-700 cursor-pointer"
                >
                  Mark all read
                </button>
              )}
            </div>

            <div className="max-h-[400px] overflow-y-auto">
              {isLoading && notifications.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-10">Loading...</p>
              ) : notifications.length === 0 ? (
                <div className="text-center py-10 px-4">
                  <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-gray-50 text-gray-300 mb-2">
                    <FiBell className="w-4 h-4" />
                  </span>
                  <p className="text-sm text-gray-400">No notifications yet.</p>
                </div>
              ) : (
                notifications.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleItemClick(item)}
                    className={`w-full flex items-start gap-3 text-left px-4 py-3 border-b border-gray-50 last:border-b-0 hover:bg-gray-50 transition cursor-pointer ${
                      item.isRead ? '' : 'bg-indigo-50/40'
                    }`}
                  >
                    <span className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${item.isRead ? 'bg-gray-200' : 'bg-indigo-600'}`} />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-900 truncate">{item.title}</p>
                      <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{item.message}</p>
                      <p className="text-[11px] text-gray-400 mt-1">{timeAgo(item.createdAt)}</p>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
