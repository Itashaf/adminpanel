import Link from 'next/link';
import { FiCreditCard, FiLayers, FiFileText, FiChevronRight } from 'react-icons/fi';

// Mirrors QuickActions.jsx's tile style, but with the 3 actions an
// Accountant's own permission set (fees.*) actually reaches — no
// Receipt/Reminders tiles, since no dedicated page for either exists yet
// (see app/dashboard/fees/**); those would just be dead links.
const ACTIONS = [
  {
    label: 'Collect Fee',
    subtitle: 'Record fee payments',
    href: '/dashboard/fees/students',
    icon: FiCreditCard,
    iconBg: 'bg-orange-100 text-orange-600',
  },
  {
    label: 'Fee Structures',
    subtitle: 'View & manage fee plans',
    href: '/dashboard/fees/structures',
    icon: FiLayers,
    iconBg: 'bg-violet-100 text-violet-600',
  },
  {
    label: 'Payment History',
    subtitle: 'Browse all transactions',
    href: '/dashboard/fees/payments',
    icon: FiFileText,
    iconBg: 'bg-blue-100 text-blue-600',
  },
];

export default function AccountantQuickActions() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
