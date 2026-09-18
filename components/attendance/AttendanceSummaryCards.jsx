import { FiCheck, FiX, FiLogOut, FiUsers } from 'react-icons/fi';

export default function AttendanceSummaryCards({ total, present, absent, leave }) {
  const cards = [
    { label: 'Present', value: present, icon: FiCheck, iconBgClassName: 'bg-green-100', iconColorClassName: 'text-green-700' },
    { label: 'Absent', value: absent, icon: FiX, iconBgClassName: 'bg-red-100', iconColorClassName: 'text-red-600' },
    { label: 'On Leave', value: leave, icon: FiLogOut, iconBgClassName: 'bg-blue-100', iconColorClassName: 'text-blue-600' },
    { label: 'Total Students', value: total, icon: FiUsers, iconBgClassName: 'bg-violet-100', iconColorClassName: 'text-violet-700' },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
      {cards.map(({ label, value, icon: Icon, iconBgClassName, iconColorClassName }) => (
        <div key={label} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
          <div className="flex items-start justify-between">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">{label}</p>
            <span className={`flex items-center justify-center w-9 h-9 rounded-lg shrink-0 ${iconBgClassName}`}>
              <Icon className={`w-4 h-4 ${iconColorClassName}`} />
            </span>
          </div>
          <p className="text-2xl font-bold text-gray-900 mt-2">{value}</p>
        </div>
      ))}
    </div>
  );
}
