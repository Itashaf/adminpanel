'use client';

import { useState } from 'react';
import SuperAdminNav from './SuperAdminNav';
import SuperAdminTopbar from './SuperAdminTopbar';

// Sidebar + topbar + content, same layout as the School Admin and Parent shells.
export default function SuperAdminShell({ children }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="flex flex-1 h-full overflow-hidden bg-gray-50">
      <SuperAdminNav isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      <div className="flex flex-col flex-1 min-w-0">
        <SuperAdminTopbar onMenuClick={() => setIsSidebarOpen(true)} />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
