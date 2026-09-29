'use client';

import { useState } from 'react';
import Sidebar from './Sidebar';
import Topbar from './Topbar';

export default function DashboardShell({ children, school, activeSession, sessions, currentUser, userInfo, permissions = null, pendingLeaveCount = 0, isClassTeacher = false }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // A real signed-in session (userInfo, from lib/iam.js's getCurrentUserInfo)
  // must win over lib/currentUser.js's process-wide SchoolAdmin/Teacher demo
  // toggle — that toggle defaults to SchoolAdmin and never changes when a
  // real Teacher logs in, so using currentUser.role here rendered the full
  // Admin sidebar (Classes & Sections, Subjects, Staff Attendance, ...) for
  // every real Teacher session unless someone had also manually flipped the
  // toggle on this server process. Same fix already applied to every
  // page-level role check elsewhere in this app (roleGuard.js, timetable/
  // attendance pages) — this was the one spot it was still missing.
  const effectiveRole = userInfo?.role || currentUser?.role;

  return (
    <div className="flex flex-1 h-full overflow-hidden bg-gray-50 print:h-auto print:overflow-visible print:bg-white">
      <Sidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        school={school}
        role={effectiveRole}
        permissions={permissions}
        pendingLeaveCount={pendingLeaveCount}
        isClassTeacher={isClassTeacher}
      />
      <div className="flex flex-col flex-1 min-w-0">
        <Topbar
          onMenuClick={() => setIsSidebarOpen(true)}
          activeSession={activeSession}
          sessions={sessions}
          role={effectiveRole}
          userInfo={userInfo}
        />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 print:overflow-visible print:p-0">{children}</main>
      </div>
    </div>
  );
}
