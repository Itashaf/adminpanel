import { FiUsers, FiCheckCircle, FiPauseCircle, FiAlertTriangle } from 'react-icons/fi';

export default function AdminsStatsCards({ admins, schoolsWithoutAdmin }) {
  const active = admins.filter((admin) => admin.status === 'Active').length;
  const inactive = admins.length - active;

  const cards = [
    { label: 'Total Admins', value: admins.length, icon: FiUsers, iconBgClassName: 'bg-violet-100', iconColorClassName: 'text-violet-700' },
    { label: 'Active', value: active, icon: FiCheckCircle, iconBgClassName: 'bg-green-100', iconColorClassName: 'text-green-700' },
    { label: 'Inactive', value: inactive, icon: FiPauseCircle, iconBgClassName: 'bg-gray-100', iconColorClassName: 'text-gray-500' },
    { label: 'Schools Without an Admin', value: schoolsWithoutAdmin, icon: FiAlertTriangle, iconBgClassName: 'bg-amber-100', iconColorClassName: 'text-amber-600' },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map(({ label, value, icon: Icon, iconBgClassName, iconColorClassName }) => (
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
