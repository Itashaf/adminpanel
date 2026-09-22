'use client';

import { useState } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { FiSearch, FiMenu, FiChevronDown, FiUser, FiLogOut, FiGrid, FiArrowLeft } from 'react-icons/fi';
import DropdownMenu from '@/components/DropdownMenu';
import ConfirmDialog from '@/components/ConfirmDialog';
import SessionSwitcher from './SessionSwitcher';
import NotificationBell from './NotificationBell';
import TeacherNotificationBell from './TeacherNotificationBell';
import { logoutAction } from '@/app/actions/auth';

function initialsFor(name) {
  if (!name) return 'AD';
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] || '') + (parts[1]?.[0] || parts[0]?.[1] || '')).toUpperCase();
}

// print:hidden — reports like the class-wise Student List page (see
// components/students/StudentListReport.jsx) are meant to print just their
// own table, not this chrome around it.
// Route-specific "go back" chip shown to the left of the search bar — only
// on the exam detail page, using the `?from=` the Manage Exams list hands it
// (see ExamCard.jsx / ExamsExplorer.jsx) so it returns to that exact
// filtered/paginated/sorted list instead of resetting to page 1.
const EXAM_DETAIL_PATTERN = /^\/dashboard\/exams\/[^/]+$/;

export default function Topbar({ onMenuClick, activeSession, sessions, role, userInfo }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const isTeacher = role === 'Teacher';

  const isExamDetailPage = EXAM_DETAIL_PATTERN.test(pathname) && pathname !== '/dashboard/exams/list';
  const fromParam = searchParams.get('from');
  const backHref = fromParam ? decodeURIComponent(fromParam) : '/dashboard/exams/list';
  // `userInfo` is null when nobody's really signed in yet (e.g. /dashboard
  // was reached directly without going through /login — see lib/iam.js) —
  // keep the old hardcoded "AD" look for that pre-existing gap rather than
  // showing a broken-looking blank avatar.
  const initials = initialsFor(userInfo?.name);

  const accountItems = [
    {
      label: 'Profile',
      icon: <FiUser className="w-4 h-4" />,
      onClick: () => router.push('/dashboard/profile'),
    },
    // "Manage Schools" is a super-admin escape hatch for whoever is currently
    // logged in as this school's admin — a Teacher never sees it.
    ...(isTeacher
      ? []
      : [
          {
            label: 'Manage Schools',
            icon: <FiGrid className="w-4 h-4" />,
            onClick: () => router.push('/super-admin/schools'),
          },
        ]),
    {
      label: 'Logout',
      icon: <FiLogOut className="w-4 h-4" />,
      onClick: () => setShowLogoutConfirm(true),
      danger: true,
    },
  ];

  const handleLogout = async () => {
    setIsLoggingOut(true);
    // Only the SchoolAdmin login sets the real `edumanage_session` cookie;
    // a Teacher's "session" is still the in-memory currentUser.js toggle, but
    // clearing the cookie unconditionally here is harmless for that case.
    await logoutAction();
    router.push('/login');
  };

  return (
    <header className="print:hidden flex items-center gap-3 sm:gap-4 px-4 sm:px-6 py-3 bg-white border-b border-gray-100">
      <button
        type="button"
        onClick={onMenuClick}
        className="lg:hidden text-gray-500 hover:text-gray-700 cursor-pointer"
      >
        <FiMenu className="w-5 h-5" />
      </button>

      {isExamDetailPage && (
        <Link
          href={backHref}
          className="flex items-center justify-center w-9 h-9 rounded-lg text-white bg-gradient-to-b from-purple-950 to-indigo-950 hover:opacity-90 transition shrink-0"
        >
          <FiArrowLeft className="w-4 h-4" />
        </Link>
      )}

      <div className="flex-1 max-w-sm relative hidden sm:block">
        <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
        <input
          type="text"
          placeholder="Search students, teachers, notices..."
          autoComplete="off"
          className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-full focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      <div className="flex items-center gap-2 sm:gap-4 ml-auto">
        <SessionSwitcher sessions={sessions || []} activeSession={activeSession} canSwitch={!isTeacher} />
        {isTeacher ? <TeacherNotificationBell /> : <NotificationBell />}
        <DropdownMenu
          trigger={
            <span className="flex items-center gap-2">
              {userInfo?.photoUrl ? (
                <img src={userInfo.photoUrl} alt="" className="w-9 h-9 rounded-full object-cover shrink-0" />
              ) : (
                <span className="flex items-center justify-center w-9 h-9 rounded-full bg-gradient-to-br from-violet-700 to-blue-600 text-white text-xs font-semibold shrink-0">
                  {initials}
                </span>
              )}
              {userInfo?.name && (
                <span className="hidden sm:flex flex-col items-start leading-tight">
                  <span className="text-sm font-semibold text-gray-900">{userInfo.name}</span>
                  {userInfo.email && <span className="text-xs text-gray-400">{userInfo.email}</span>}
                </span>
              )}
              <FiChevronDown className="w-4 h-4 text-gray-400" />
            </span>
          }
          items={accountItems}
        />
      </div>

      <ConfirmDialog
        isOpen={showLogoutConfirm}
        onClose={() => setShowLogoutConfirm(false)}
        onConfirm={handleLogout}
        title="Log out?"
        description="You'll need to sign in again to access SchoolApp 360."
        confirmLabel="Log Out"
        isLoading={isLoggingOut}
      />
    </header>
  );
}
