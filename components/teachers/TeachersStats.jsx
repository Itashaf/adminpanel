import { FiUsers, FiUserCheck, FiUserPlus, FiUserX } from 'react-icons/fi';

const CARDS = (stats) => [
  {
    label: 'Total Teachers',
    value: stats.total,
    icon: FiUsers,
    iconBgClassName: 'bg-violet-100',
    iconColorClassName: 'text-violet-700',
  },
  {
    label: 'Active Teachers',
    value: stats.active,
    icon: FiUserCheck,
    iconBgClassName: 'bg-blue-100',
    iconColorClassName: 'text-blue-600',
  },
  {
    label: 'New This Month',
    value: stats.newThisMonth,
    icon: FiUserPlus,
    iconBgClassName: 'bg-violet-100',
    iconColorClassName: 'text-violet-700',
  },
  {
    label: 'Inactive',
    value: stats.inactive,
    icon: FiUserX,
    iconBgClassName: 'bg-gray-100',
    iconColorClassName: 'text-gray-500',
  },
];

export default function TeachersStats({ stats }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {CARDS(stats).map(({ label, value, icon: Icon, iconBgClassName, iconColorClassName }) => (
        <div key={label} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
          <div className="flex items-start justify-between">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">{label}</p>
            <span className={`flex items-center justify-center w-9 h-9 rounded-lg ${iconBgClassName}`}>
              <Icon className={`w-4 h-4 ${iconColorClassName}`} />
            </span>
          </div>
          <p className="text-2xl font-bold text-gray-900 mt-2">{value.toLocaleString()}</p>
        </div>
      ))}
    </div>
  );
}
