'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FaGraduationCap } from 'react-icons/fa';
import {
  FiHome,
  FiCreditCard,
  FiCalendar,
  FiBook,
  FiBell,
  FiFileText,
  FiUser,
  FiX,
} from 'react-icons/fi';

// A dedicated sidebar (not the shared admin/teacher components/dashboard/
// Sidebar.jsx) — the Parent Portal's flat single-column nav (no grouped/
// expandable menus) doesn't fit that component's structure, but it keeps
// the exact same dark purple/indigo gradient theme so the Parent Portal
// still looks like the same app, not a separate one.
const NAV_ITEMS = [
  { label: 'Home', href: '/parent', icon: FiHome },
  { label: 'Fees', href: '/parent/fees', icon: FiCreditCard },
  { label: 'Attendance', href: '/parent/attendance', icon: FiCalendar },
  { label: 'Homework', href: '/parent/homework', icon: FiBook },
  { label: 'Notices', href: '/parent/notices', icon: FiBell },
  { label: 'Exams', href: '/parent/exams', icon: FiFileText },
  { label: 'My Profile', href: '/parent/profile', icon: FiUser },
];

export default function ParentSidebar({ isOpen, onClose }) {
  const pathname = usePathname();

  return (
    <>
      {isOpen && <div className="fixed inset-0 bg-black/40 z-30 lg:hidden" onClick={onClose} />}

      <aside
        className={`fixed lg:static inset-y-0 left-0 z-40 w-64 shrink-0 bg-gradient-to-b from-purple-950 to-indigo-950 text-white flex flex-col h-full transition-transform duration-200 ${
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
              <p className="text-xs text-purple-300 leading-tight">Parent Portal</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="lg:hidden text-purple-200 hover:text-white cursor-pointer">
            <FiX className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 px-3 mt-2 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map((item) => {
            const isActive = !item.comingSoon && pathname === item.href;
            if (item.comingSoon) {
              return (
                <div
                  key={item.label}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-purple-400/60 cursor-not-allowed"
                >
                  <item.icon className="w-[18px] h-[18px]" />
                  {item.label}
                  <span className="ml-auto text-[10px] font-medium bg-white/10 text-purple-300 rounded-full px-1.5 py-0.5">Soon</span>
                </div>
              );
            }
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition cursor-pointer ${
                  isActive
                    ? 'bg-gradient-to-r from-violet-700 via-indigo-600 to-blue-600 text-white shadow'
                    : 'text-purple-200 hover:bg-white/5 hover:text-white'
                }`}
              >
                <item.icon className="w-[18px] h-[18px]" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-4">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-5 text-center">
            <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-white/10 text-white mb-3">
              <FiBook className="w-4 h-4" />
            </span>
            <p className="text-sm font-semibold text-white">Education Builds a Brighter Tomorrow</p>
          </div>
        </div>
      </aside>
    </>
  );
}
