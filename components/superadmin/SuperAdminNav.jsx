'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FaGraduationCap } from 'react-icons/fa';
import { FiHome, FiUsers, FiHelpCircle, FiMail, FiX } from 'react-icons/fi';
import { getSupportUnreadCount } from '@/lib/api';
import { getPusherClient } from '@/lib/pusherClient';

const NAV_ITEMS = [
  { label: 'Schools', href: '/super-admin/schools', icon: FiHome },
  { label: 'Admins', href: '/super-admin/admins', icon: FiUsers },
  { label: 'Users', href: '/super-admin/users', icon: FiUsers },
  { label: 'Support', href: '/super-admin/support', icon: FiHelpCircle },
  { label: 'Email', href: '/super-admin/email', icon: FiMail },
];

// Left sidebar for the Super Admin panel, same look as the School Admin / Parent sidebars: fixed
// on large screens, a slide-in drawer on small ones (opened from the topbar's menu button).
export default function SuperAdminNav({ isOpen, onClose }) {
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
    <>
      {isOpen && <div className="fixed inset-0 bg-black/40 z-30 lg:hidden" onClick={onClose} />}

      <aside
        className={`fixed lg:static inset-y-0 left-0 z-40 w-[80vw] lg:w-64 shrink-0 bg-gradient-to-b from-purple-950 to-indigo-950 text-white flex flex-col h-full transition-transform duration-200 ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="flex items-center justify-between px-5 py-5">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="flex items-center justify-center w-9 h-9 rounded-lg bg-white shrink-0">
              <FaGraduationCap className="w-5 h-5 text-purple-900" />
            </span>
            <div className="min-w-0">
              <p className="text-base font-bold leading-tight truncate">SchoolApp 360</p>
              <p className="text-xs text-purple-300 leading-tight">Super Admin</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="lg:hidden text-purple-200 hover:text-white cursor-pointer">
            <FiX className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 px-3 mt-2 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition cursor-pointer ${
                  isActive
                    ? 'bg-gradient-to-r from-violet-700 via-indigo-600 to-blue-600 text-white shadow'
                    : 'text-purple-200 hover:bg-white/5 hover:text-white'
                }`}
              >
                <item.icon className="w-[18px] h-[18px]" />
                {item.label}
                {item.href === '/super-admin/support' && supportUnreadCount > 0 && (
                  <span className="ml-auto flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-semibold">
                    {supportUnreadCount}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </aside>
    </>
  );
}
