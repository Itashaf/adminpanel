'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FiHome, FiMapPin, FiImage, FiSliders, FiClock } from 'react-icons/fi';

const NAV_ITEMS = [
  { label: 'School Profile', href: '/dashboard/settings/profile', icon: FiHome },
  { label: 'Contact & Address', href: '/dashboard/settings/contact', icon: FiMapPin },
  { label: 'Branding', href: '/dashboard/settings/branding', icon: FiImage },
  { label: 'System Preferences', href: '/dashboard/settings/preferences', icon: FiSliders },
  { label: 'Attendance Rules', href: '/dashboard/settings/attendance', icon: FiClock },
];

export default function SettingsNav() {
  const pathname = usePathname();

  return (
    <>
      <nav className="hidden lg:block w-64 shrink-0 bg-white rounded-2xl border border-gray-100 shadow-sm p-2 h-fit">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition cursor-pointer ${
                isActive ? 'bg-indigo-50 text-indigo-700' : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <item.icon className="w-[18px] h-[18px] shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="lg:hidden flex items-center gap-1 border-b border-gray-100 overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href;
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
              {isActive && (
                <span className="absolute left-0 right-0 -bottom-px h-0.5 bg-gradient-to-r from-violet-700 via-indigo-600 to-blue-600 rounded-full" />
              )}
            </Link>
          );
        })}
      </div>
    </>
  );
}
