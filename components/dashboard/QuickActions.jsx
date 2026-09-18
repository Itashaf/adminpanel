import Link from 'next/link';
import { FiUserPlus, FiCheckSquare, FiCreditCard, FiFileText, FiChevronRight } from 'react-icons/fi';

const ACTIONS = [
  {
    label: 'Add Student',
    subtitle: 'Register a new student',
    href: '/dashboard/students/add',
    icon: FiUserPlus,
    iconBg: 'bg-blue-100 text-blue-600',
  },
  {
    label: 'Mark Attendance',
    subtitle: 'Take daily attendance',
    href: '/dashboard/attendance/daily',
    icon: FiCheckSquare,
    iconBg: 'bg-green-100 text-green-600',
  },
  {
    label: 'Collect Fee',
    subtitle: 'Record fee payments',
    href: '/dashboard/fees/students',
    icon: FiCreditCard,
    iconBg: 'bg-orange-100 text-orange-600',
  },
  {
    label: 'Create Exam',
    subtitle: 'Set up a new exam',
    href: '/dashboard/exams/list',
    icon: FiFileText,
    iconBg: 'bg-violet-100 text-violet-600',
  },
];

export default function QuickActions() {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {ACTIONS.map(({ label, subtitle, href, icon: Icon, iconBg }) => (
        <Link
          key={label}
          href={href}
          className="group flex items-center gap-3 bg-white rounded-[24px] border border-gray-100 shadow-sm px-5 py-5 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5"
        >
          <span className={`flex items-center justify-center w-11 h-11 rounded-xl shrink-0 ${iconBg}`}>
            <Icon className="w-5 h-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-gray-900 truncate">{label}</p>
            <p className="text-xs text-gray-400 truncate">{subtitle}</p>
          </div>
          <FiChevronRight className="w-4 h-4 text-gray-300 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-gray-400 shrink-0" />
        </Link>
      ))}
    </div>
  );
}
