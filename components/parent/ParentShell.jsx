'use client';

import { useState } from 'react';
import ParentSidebar from './ParentSidebar';
import ParentTopbar from './ParentTopbar';

export default function ParentShell({ children, students, activeStudentId, noticesCount }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="flex flex-1 h-full overflow-hidden bg-gray-50">
      <ParentSidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      <div className="flex flex-col flex-1 min-w-0">
        <ParentTopbar
          students={students}
          activeStudentId={activeStudentId}
          noticesCount={noticesCount}
          onMenuClick={() => setIsSidebarOpen(true)}
        />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
