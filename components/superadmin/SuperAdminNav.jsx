'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FiHome, FiUsers } from 'react-icons/fi';

const NAV_ITEMS = [
  { label: 'Schools', href: '/super-admin/schools', icon: FiHome },
  { label: 'Admins', href: '/super-admin/admins', icon: FiUsers },
];

export default function SuperAdminNav() {
  const pathname = usePathname();

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
            {isActive && (
              <span className="absolute left-0 right-0 -bottom-px h-0.5 bg-gradient-to-r from-violet-700 via-indigo-600 to-blue-600 rounded-full" />
            )}
          </Link>
        );
      })}
    </div>
  );
}
