'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FiClipboard, FiTrendingUp, FiFileText } from 'react-icons/fi';

const TABS = [
  { label: 'Monthly Reports', href: '/dashboard/performance/monthly', icon: FiClipboard },
  { label: 'Yearly Reports', href: '/dashboard/performance/yearly', icon: FiTrendingUp },
  { label: 'Subject Tests', href: '/dashboard/performance/tests', icon: FiFileText },
];

// Shared tab bar across the 3 Students Report list screens — same
// "one group, several tabs" idea as SettingsNav.jsx, just for this module.
// Only rendered on the list/dashboard screens, not the per-student detail
// pages (a student's report already has its own back-link + month/session
// switcher, adding tabs there would just be noise).
export default function PerformanceTabs() {
  const pathname = usePathname();

  return (
    <div className="flex items-center gap-1 border-b border-gray-100 overflow-x-auto mb-2">
      {TABS.map((tab) => {
        const isActive = pathname.startsWith(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`relative flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap transition cursor-pointer ${
              isActive ? 'text-indigo-700' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
            {isActive && (
              <span className="absolute left-0 right-0 -bottom-px h-0.5 bg-gradient-to-r from-violet-700 via-indigo-600 to-blue-600 rounded-full" />
            )}
          </Link>
        );
      })}
    </div>
  );
}
