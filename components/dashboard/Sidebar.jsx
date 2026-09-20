'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FaGraduationCap } from 'react-icons/fa';
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
} from 'react-icons/fi';

const ADMIN_NAV_ITEMS = [
  { label: 'Dashboard', href: '/dashboard', icon: FiGrid },
  {
    label: 'Academics',
    icon: FiBookOpen,
    basePath: '/dashboard/academics',
    children: [
      { label: 'Academic Sessions', href: '/dashboard/sessions', icon: FiCalendar },
      { label: 'Classes & Sections', href: '/dashboard/classes', icon: FiLayers },
      { label: 'Subjects', href: '/dashboard/academics/subjects', icon: FiBook },
      { label: 'Time Table', href: '/dashboard/academics/timetable', icon: FiClock },
      { label: 'Calendar', href: '/dashboard/academics/calendar', icon: FiCalendar },
    ],
  },
  {
    label: 'Students',
    icon: FiUsers,
    basePath: '/dashboard/students',
    children: [
      { label: 'All Students', href: '/dashboard/students', icon: FiUsers },
      { label: 'Add Student', href: '/dashboard/students/add', icon: FiUserPlus },
      { label: 'Student List', href: '/dashboard/students/list', icon: FiPrinter },
    ],
  },
  {
    label: 'Teachers',
    icon: FiUser,
    basePath: '/dashboard/teachers',
    children: [
      { label: 'All Teachers', href: '/dashboard/teachers', icon: FiUsers },
      { label: 'Add Teacher', href: '/dashboard/teachers/add', icon: FiUserPlus },
    ],
  },
  {
    label: 'Fees',
    icon: FiCreditCard,
    basePath: '/dashboard/fees',
    children: [
      { label: 'Fee Structures', href: '/dashboard/fees/structures', icon: FiLayers },
      { label: 'Student Fees', href: '/dashboard/fees/students', icon: FiUsers },
      { label: 'Payments', href: '/dashboard/fees/payments', icon: FiCreditCard },
    ],
  },
  {
    label: 'Attendance',
    icon: FiCheckSquare,
    basePath: '/dashboard/attendance',
    children: [
      { label: 'Attendance Reports', href: '/dashboard/attendance/reports', icon: FiBarChart2 },
      { label: 'Daily Attendance', href: '/dashboard/attendance/daily', icon: FiCheckSquare },
      { label: 'Staff Attendance', href: '/dashboard/attendance/staff', icon: FiUser },
    ],
  },
  {
    label: 'Communication',
    icon: FiSend,
    basePath: '/dashboard/notices',
    children: [
      { label: 'Notices', href: '/dashboard/notices', icon: FiBell },
      { label: 'Homework', href: '/dashboard/homework', icon: FiBook },
    ],
  },
  {
    label: 'Exams',
    icon: FiClipboard,
    basePath: '/dashboard/exams',
    children: [
      { label: 'Exam Dashboard', href: '/dashboard/exams', icon: FiGrid },
      { label: 'Manage Exams', href: '/dashboard/exams/list', icon: FiClipboard },
      { label: 'Enter Marks', href: '/dashboard/marks-entry', icon: FiEdit3 },
      { label: 'Print Marksheet', href: '/dashboard/print-marksheet', icon: FiPrinter },
    ],
  },
  { label: 'Leave Requests', href: '/dashboard/leave', icon: FiClock },
  { label: 'School Settings', href: '/dashboard/settings', icon: FiSettings },
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
  // Scoped content, not a scoped-away module — a Teacher sees/posts Notices
  // and Homework for their own classes (plus whole-school Notices), so this
  // stays a full nav entry rather than being hidden like Teachers/Classes.
  { label: 'Notices', href: '/dashboard/notices', icon: FiBell },
  { label: 'Homework', href: '/dashboard/homework', icon: FiBook },
  // Only meaningful for a Class Teacher (they can add their own class's
  // subjects to an exam's date sheet — see lib/examSchedules.js's
  // assertCanManageSchedule); the page itself 404s for anyone else's exam.
  { label: 'My Exams', href: '/dashboard/exams/list', icon: FiClipboard },
  { label: 'Marks Entry', href: '/dashboard/marks-entry', icon: FiEdit3 },
  { label: 'Print Marksheet', href: '/dashboard/print-marksheet', icon: FiPrinter },
  { label: 'My Leave', href: '/dashboard/leave', icon: FiClock },
];

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

export default function Sidebar({ isOpen = false, onClose, school, role, pendingLeaveCount = 0 }) {
  const pathname = usePathname();
  const displayName = school?.displayName || 'SchoolApp 360';
  const navItems = role === 'Teacher' ? TEACHER_NAV_ITEMS : ADMIN_NAV_ITEMS;
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
