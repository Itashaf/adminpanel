'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FaGraduationCap } from 'react-icons/fa';
import { isFeatureEnabled } from '@/lib/featureFlags';
import {
  FiGrid,
  FiUsers,
  FiUser,
  FiUserPlus,
  FiLayers,
  FiCalendar,
  FiSettings,
  FiChevronDown,
  FiX,
  FiCheckSquare,
  FiBarChart2,
  FiBell,
  FiBook,
  FiCreditCard,
  FiPrinter,
  FiClipboard,
  FiEdit3,
  FiBookOpen,
  FiClock,
  FiSend,
  FiAward,
  FiTrendingUp,
  FiFileText,
} from 'react-icons/fi';

// `permKey` (RBAC permission key, see prisma/rbacPermissions.js) gates an
// item for Principal/Admin/Accountant/SuperAdmin, on top of the existing
// `featureKey` (per-school module toggle) — both must pass. Only added
// where the permission catalog actually has a matching key; a module the
// catalog doesn't cover (Homework, Assessments, Calendar) is left ungated
// here, same "don't build for a key that doesn't exist" call as the rest
// of this RBAC project.
const ADMIN_NAV_ITEMS = [
  { label: 'Dashboard', href: '/dashboard', icon: FiGrid },
  {
    label: 'Academics',
    icon: FiBookOpen,
    basePath: '/dashboard/academics',
    children: [
      { label: 'Academic Sessions', href: '/dashboard/sessions', icon: FiCalendar, permKey: 'settings.view' },
      { label: 'Classes & Sections', href: '/dashboard/classes', icon: FiLayers, permKey: 'classes.view' },
      { label: 'Subjects', href: '/dashboard/academics/subjects', icon: FiBook, permKey: 'subjects.view' },
      { label: 'Time Table', href: '/dashboard/academics/timetable', icon: FiClock, permKey: 'timetable.view' },
      { label: 'Calendar', href: '/dashboard/academics/calendar', icon: FiCalendar, permKey: 'classes.view' },
    ],
  },
  {
    label: 'Students',
    icon: FiUsers,
    basePath: '/dashboard/students',
    children: [
      { label: 'All Students', href: '/dashboard/students', icon: FiUsers, permKey: 'students.view' },
      { label: 'Add Student', href: '/dashboard/students/add', icon: FiUserPlus, permKey: 'students.create' },
      { label: 'Student List', href: '/dashboard/students/list', icon: FiPrinter, permKey: 'students.view' },
    ],
  },
  {
    label: 'Teachers',
    icon: FiUser,
    basePath: '/dashboard/teachers',
    children: [
      { label: 'All Teachers', href: '/dashboard/teachers', icon: FiUsers, permKey: 'teachers.view' },
      { label: 'Add Teacher', href: '/dashboard/teachers/add', icon: FiUserPlus, permKey: 'teachers.create' },
    ],
  },
  {
    label: 'Fees',
    icon: FiCreditCard,
    basePath: '/dashboard/fees',
    featureKey: 'fees',
    children: [
      { label: 'Fee Structures', href: '/dashboard/fees/structures', icon: FiLayers, permKey: 'fees.view' },
      { label: 'Student Fees', href: '/dashboard/fees/students', icon: FiUsers, permKey: 'fees.view' },
      { label: 'Payments', href: '/dashboard/fees/payments', icon: FiCreditCard, permKey: 'fees.view' },
    ],
  },
  {
    label: 'Attendance',
    icon: FiCheckSquare,
    basePath: '/dashboard/attendance',
    children: [
      { label: 'Attendance Reports', href: '/dashboard/attendance/reports', icon: FiBarChart2, permKey: 'attendance.student.report' },
      { label: 'Daily Attendance', href: '/dashboard/attendance/daily', icon: FiCheckSquare, permKey: 'attendance.student.mark' },
      { label: 'Staff Attendance', href: '/dashboard/attendance/staff', icon: FiUser, permKey: 'attendance.teacher.view' },
    ],
  },
  {
    label: 'Communication',
    icon: FiSend,
    basePath: '/dashboard/notices',
    children: [
      { label: 'Notices', href: '/dashboard/notices', icon: FiBell, permKey: 'notices.view' },
      { label: 'Homework', href: '/dashboard/homework', icon: FiBook, featureKey: 'homework' },
    ],
  },
  {
    label: 'Exams',
    icon: FiClipboard,
    basePath: '/dashboard/exams',
    featureKey: 'exams',
    children: [
      { label: 'Exam Dashboard', href: '/dashboard/exams', icon: FiGrid, permKey: 'exams.view' },
      { label: 'Manage Exams', href: '/dashboard/exams/list', icon: FiClipboard, permKey: 'exams.view' },
      { label: 'Enter Marks', href: '/dashboard/marks-entry', icon: FiEdit3, permKey: 'marks.enter' },
      { label: 'Print Marksheet', href: '/dashboard/print-marksheet', icon: FiPrinter, permKey: 'results.view' },
    ],
  },
  { label: 'Assessments', href: '/dashboard/assessments', icon: FiAward, featureKey: 'assessments' },
  {
    label: 'Students Report',
    icon: FiTrendingUp,
    basePath: '/dashboard/performance',
    children: [
      { label: 'Monthly Reports', href: '/dashboard/performance/monthly', icon: FiClipboard, permKey: 'performanceReports.view' },
      { label: 'Yearly Reports', href: '/dashboard/performance/yearly', icon: FiTrendingUp, permKey: 'performanceReports.view' },
      { label: 'Subject Tests', href: '/dashboard/performance/tests', icon: FiFileText, permKey: 'performanceReports.view' },
    ],
  },
  { label: 'Leave Requests', href: '/dashboard/leave', icon: FiClock, featureKey: 'leave', permKey: 'leave.approve' },
  { label: 'School Settings', href: '/dashboard/settings', icon: FiSettings, permKey: 'settings.view' },
];

// A Teacher only ever marks/views attendance and views (never manages) the
// students in their own classes — no Teachers/Classes/Sessions/Settings, and
// no "Add Student" child. This list is the UI half of the restriction; the
// authoritative half is lib/roleGuard.js's server-side redirects, since a
// hidden link alone doesn't stop someone typing the URL directly.
const TEACHER_NAV_ITEMS = [
  { label: 'Dashboard', href: '/dashboard', icon: FiGrid },
  {
    label: 'Students',
    icon: FiUsers,
    basePath: '/dashboard/students',
    children: [
      { label: 'All Students', href: '/dashboard/students', icon: FiUsers },
      { label: 'Student List', href: '/dashboard/students/list', icon: FiPrinter },
    ],
  },
  {
    label: 'Attendance',
    icon: FiCheckSquare,
    basePath: '/dashboard/attendance',
    children: [
      { label: 'Attendance Reports', href: '/dashboard/attendance/reports', icon: FiBarChart2 },
      { label: 'Daily Attendance', href: '/dashboard/attendance/daily', icon: FiCheckSquare },
    ],
  },
  {
    label: 'Academics',
    icon: FiBookOpen,
    basePath: '/dashboard/academics',
    children: [
      // Every Teacher can view any class's timetable now — only editing
      // stays restricted to a Class Teacher's own class (see
      // app/dashboard/academics/timetable/page.jsx).
      { label: 'Time Table', href: '/dashboard/academics/timetable', icon: FiClock },
      // Read-only for a Teacher — same whole-school events Admin sees, no
      // Add/Edit drawer (see TeacherCalendarView.jsx).
      { label: 'Calendar', href: '/dashboard/academics/calendar', icon: FiCalendar },
    ],
  },
  // Scoped content, not a scoped-away module — a Teacher sees/posts Notices
  // and Homework for their own classes (plus whole-school Notices), so this
  // stays a full nav entry rather than being hidden like Teachers/Classes.
  { label: 'Notices', href: '/dashboard/notices', icon: FiBell },
  { label: 'Homework', href: '/dashboard/homework', icon: FiBook, featureKey: 'homework' },
  // Only meaningful for a Class Teacher (they can add their own class's
  // subjects to an exam's date sheet — see lib/examSchedules.js's
  // assertCanManageSchedule); the page itself 404s for anyone else's exam.
  { label: 'My Exams', href: '/dashboard/exams/list', icon: FiClipboard, featureKey: 'exams' },
  { label: 'Marks Entry', href: '/dashboard/marks-entry', icon: FiEdit3, featureKey: 'exams' },
  { label: 'Print Marksheet', href: '/dashboard/print-marksheet', icon: FiPrinter, featureKey: 'exams' },
  { label: 'Assessments', href: '/dashboard/assessments', icon: FiAward, featureKey: 'assessments' },
  {
    label: 'Students Report',
    icon: FiTrendingUp,
    basePath: '/dashboard/performance',
    children: [
      { label: 'Monthly Reports', href: '/dashboard/performance/monthly', icon: FiClipboard, permKey: 'performanceReports.view' },
      { label: 'Yearly Reports', href: '/dashboard/performance/yearly', icon: FiTrendingUp, permKey: 'performanceReports.view' },
      { label: 'Subject Tests', href: '/dashboard/performance/tests', icon: FiFileText, permKey: 'performanceReports.view' },
    ],
  },
  { label: 'My Leave', href: '/dashboard/leave', icon: FiClock, featureKey: 'leave' },
];

// Drops any top-level item or group child whose `featureKey` the school has
// disabled; a group left with zero children is dropped entirely rather than
// rendered empty. Items with no `featureKey` (core modules) always pass.
function filterByFeatures(navItems, disabledFeatures) {
  return navItems
    .map((item) => {
      if (item.children) {
        const children = item.children.filter((child) => !child.featureKey || isFeatureEnabled(disabledFeatures, child.featureKey));
        return children.length ? { ...item, children } : null;
      }
      return item.featureKey && !isFeatureEnabled(disabledFeatures, item.featureKey) ? null : item;
    })
    .filter(Boolean);
}

// Same shape as filterByFeatures, gating on `permKey` against the signed-in
// user's real permission set instead of a school's disabledFeatures.
// `permissions === null` (no RBAC user resolved — see app/dashboard/
// layout.jsx) means show everything unfiltered, matching this app's
// pre-existing behavior before permission-gating existed.
function filterByPermissions(navItems, permissions) {
  if (!permissions) return navItems;
  const has = (key) => permissions.includes(key);
  return navItems
    .map((item) => {
      if (item.children) {
        const children = item.children.filter((child) => !child.permKey || has(child.permKey));
        return children.length ? { ...item, children } : null;
      }
      return item.permKey && !has(item.permKey) ? null : item;
    })
    .filter(Boolean);
}

function NavLink({ label, href, icon: Icon, isActive, badge }) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition cursor-pointer ${
        isActive
          ? 'bg-gradient-to-r from-[#2563EB] to-[#7C3AED] text-white shadow'
          : 'text-purple-200 hover:bg-white/5 hover:text-white'
      }`}
    >
      <Icon className="w-[18px] h-[18px]" />
      <span className="flex-1">{label}</span>
      {badge > 0 && (
        <span className="flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-semibold">
          {badge}
        </span>
      )}
    </Link>
  );
}

function NavGroup({ item, pathname, isExpanded, onToggle }) {
  const isChildActive = item.children.some((child) => pathname === child.href);

  return (
    <div>
      <button
        type="button"
        onClick={onToggle}
        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition cursor-pointer ${
          isChildActive ? 'text-white' : 'text-purple-200 hover:bg-white/5 hover:text-white'
        }`}
      >
        <item.icon className="w-[18px] h-[18px]" />
        <span className="flex-1 text-left">{item.label}</span>
        <FiChevronDown className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
      </button>

      <div
        className="grid transition-[grid-template-rows] duration-300 ease-in-out"
        style={{ gridTemplateRows: isExpanded ? '1fr' : '0fr' }}
      >
        <div className="overflow-hidden">
          <div className="mt-1 ml-4 pl-4 border-l border-white/10 space-y-1 pb-1">
            {item.children.map((child) => (
              <NavLink key={child.href} {...child} isActive={pathname === child.href} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Sidebar({ isOpen = false, onClose, school, role, permissions = null, pendingLeaveCount = 0 }) {
  const pathname = usePathname();
  const displayName = school?.displayName || 'SchoolApp 360';
  const navItems = filterByPermissions(
    filterByFeatures(role === 'Teacher' ? TEACHER_NAV_ITEMS : ADMIN_NAV_ITEMS, school?.disabledFeatures),
    permissions
  );
  // Accordion: only one group's children are expanded at a time. Starts
  // open on whichever group contains the current page (same default the
  // old per-group local state had), computed once — matches the rest of
  // this component's mount-time-only pathname handling.
  const [expandedLabel, setExpandedLabel] = useState(
    () => navItems.find((item) => item.children?.some((child) => pathname === child.href))?.label ?? null
  );

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-30 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`print:hidden fixed lg:static inset-y-0 left-0 z-40 w-64 shrink-0 bg-gradient-to-b from-purple-950 to-indigo-950 text-white flex flex-col h-full transition-transform duration-200 ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="flex items-center justify-between px-5 py-5">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="flex items-center justify-center w-9 h-9 rounded-lg bg-white overflow-hidden shrink-0">
              {school?.logoUrl ? (
                <img src={school.logoUrl} alt={displayName} className="w-full h-full object-contain p-1" />
              ) : (
                <FaGraduationCap className="w-5 h-5 text-purple-900" />
              )}
            </span>
            <div className="min-w-0">
              <p className="text-base font-bold leading-tight truncate">{displayName}</p>
              <p className="text-xs text-purple-300 leading-tight">
                {role === 'Teacher' ? 'Teacher' : 'School Admin'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="lg:hidden text-purple-200 hover:text-white cursor-pointer"
          >
            <FiX className="w-5 h-5" />
          </button>
        </div>

        <nav className="sidebar-nav-scroll flex-1 px-3 mt-2 space-y-1 overflow-y-auto">
          {navItems.map((item) =>
            item.children ? (
              <NavGroup
                key={item.label}
                item={item}
                pathname={pathname}
                isExpanded={expandedLabel === item.label}
                onToggle={() => setExpandedLabel((prev) => (prev === item.label ? null : item.label))}
              />
            ) : (
              <NavLink
                key={item.href}
                {...item}
                isActive={pathname === item.href.split('?')[0]}
                badge={item.href === '/dashboard/leave' ? pendingLeaveCount : undefined}
              />
            )
          )}
        </nav>

        <div className="px-3 pb-5">
          <button
            type="button"
            className="w-full text-center py-2.5 rounded-lg border border-purple-400/30 text-sm font-medium text-white hover:bg-white/5 transition cursor-pointer"
          >
            Support
          </button>
        </div>
      </aside>
    </>
  );
}
