import Link from 'next/link';
import { FiUserPlus, FiUserCheck, FiCreditCard, FiFileText, FiBell, FiChevronRight } from 'react-icons/fi';

const ICON_BG = 'bg-blue-50 text-blue-800';
const HOVER_SHADOW = 'hover:shadow-blue-200/50';

const ACTIONS = [
  { label: 'Add Student', href: '/dashboard/students/add', icon: FiUserPlus, permKey: 'students.create' },
  { label: 'Add Teacher', href: '/dashboard/teachers/add', icon: FiUserCheck, permKey: 'teachers.create' },
  { label: 'Collect Fee', href: '/dashboard/fees/students', icon: FiCreditCard, permKey: 'fees.collect' },
  { label: 'Create Exam', href: '/dashboard/exams/list?compose=1', icon: FiFileText, permKey: 'exams.manage' },
  { label: 'Send Notice', href: '/dashboard/notices?compose=1', icon: FiBell, permKey: 'notices.create' },
];

// `permissions` null (no RBAC user resolved — pre-cutover legacy session)
// means show everything, same fallback as Sidebar's filterByPermissions.
// Phones get a "Quick Actions" heading and compact icon-over-label tiles; from
// sm up each action is the original wide card (icon, label, chevron).
export default function QuickActions({ permissions = null }) {
  const actions = permissions === null ? ACTIONS : ACTIONS.filter((a) => permissions.includes(a.permKey));
  if (actions.length === 0) return null;

  return (
    <div>
      <p className="text-base font-bold text-gray-900 mb-3 sm:hidden">Quick Actions</p>
      <div className="grid grid-cols-5 gap-2 sm:gap-4">
        {actions.map(({ label, href, icon: Icon }) => (
          <Link
            key={label}
            href={href}
            className={`group flex flex-col items-center gap-1.5 rounded-2xl bg-white border border-gray-100 shadow-sm px-1 py-2.5 text-center transition active:bg-gray-50 sm:flex-row sm:gap-3 sm:px-4 sm:py-3 sm:text-left sm:transition-all sm:duration-200 sm:hover:-translate-y-0.5 sm:hover:shadow-lg ${HOVER_SHADOW}`}
          >
            <span className={`flex items-center justify-center w-9 h-9 rounded-full shrink-0 ${ICON_BG}`}>
              <Icon className="w-4 h-4" />
            </span>
            <p className="text-[11px] leading-tight font-medium text-gray-700 sm:flex-1 sm:truncate sm:text-sm sm:font-semibold sm:text-gray-900">{label}</p>
            <FiChevronRight className="hidden sm:block w-4 h-4 text-gray-300 shrink-0 transition-transform duration-200 group-hover:translate-x-0.5" />
          </Link>
        ))}
      </div>
    </div>
  );
}
