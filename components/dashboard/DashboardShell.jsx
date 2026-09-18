'use client';

import { useState } from 'react';
import Sidebar from './Sidebar';
import Topbar from './Topbar';

export default function DashboardShell({ children, school, activeSession, sessions, currentUser, userInfo }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="flex flex-1 h-full overflow-hidden bg-gray-50 print:h-auto print:overflow-visible print:bg-white">
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} school={school} role={currentUser?.role} />
      <div className="flex flex-col flex-1 min-w-0">
        <Topbar
          onMenuClick={() => setIsSidebarOpen(true)}
          activeSession={activeSession}
          sessions={sessions}
          role={currentUser?.role}
          userInfo={userInfo}
        />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 print:overflow-visible print:p-0">{children}</main>
      </div>
    </div>
  );
}
