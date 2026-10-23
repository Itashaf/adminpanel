'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FiHome, FiUsers, FiHelpCircle } from 'react-icons/fi';
import { getSupportUnreadCount } from '@/lib/api';
import { getPusherClient } from '@/lib/pusherClient';

const NAV_ITEMS = [
  { label: 'Schools', href: '/super-admin/schools', icon: FiHome },
  { label: 'Admins', href: '/super-admin/admins', icon: FiUsers },
  { label: 'Users', href: '/super-admin/users', icon: FiUsers },
  { label: 'Support', href: '/super-admin/support', icon: FiHelpCircle },
];

export default function SuperAdminNav() {
  const pathname = usePathname();
  const [supportUnreadCount, setSupportUnreadCount] = useState(0);

  // Re-fetched on every route change (not just mount) — this nav lives in
  // the persistent super-admin layout, so it never remounts when switching
  // tabs; without this, opening a ticket on the Support page (which marks
  // it seen) would never clear the badge until a hard refresh.
  const refreshSupportUnreadCount = () => {
    getSupportUnreadCount()
      .then((data) => setSupportUnreadCount(data.count))
      .catch(() => {});
  };

  useEffect(() => {
    refreshSupportUnreadCount();
  }, [pathname]);

  // Live badge update — any school submitting/replying pushes here.
  useEffect(() => {
    const pusher = getPusherClient();
    const channel = pusher.subscribe('support-superadmin');
    channel.bind('ticket-updated', refreshSupportUnreadCount);
    return () => {
      channel.unbind('ticket-updated', refreshSupportUnreadCount);
      pusher.unsubscribe('support-superadmin');
    };
  }, []);

  return (
    <div className="flex items-center gap-1 border-b border-gray-100 overflow-x-auto px-4 sm:px-6 bg-white">
      {NAV_ITEMS.map((item) => {
        const isActive = pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`relative flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap transition cursor-pointer ${
              isActive ? 'text-indigo-700' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <item.icon className="w-4 h-4" />
            {item.label}
            {item.href === '/super-admin/support' && supportUnreadCount > 0 && (
              <span className="flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-semibold">
                {supportUnreadCount}
              </span>
            )}
            {isActive && (
              <span className="absolute left-0 right-0 -bottom-px h-0.5 bg-gradient-to-r from-violet-700 via-indigo-600 to-blue-600 rounded-full" />
            )}
          </Link>
        );
      })}
    </div>
  );
}
