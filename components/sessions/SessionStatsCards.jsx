import { FiUsers, FiUser, FiLayers, FiGrid } from 'react-icons/fi';

export default function SessionStatsCards({ session }) {
  const cards = [
    {
      label: 'Students',
      value: session.studentCount,
      icon: FiUsers,
      iconBgClassName: 'bg-violet-100',
      iconColorClassName: 'text-violet-700',
    },
    {
      label: 'Teachers',
      value: session.teacherCount,
      icon: FiUser,
      iconBgClassName: 'bg-blue-100',
      iconColorClassName: 'text-blue-600',
    },
    {
      label: 'Classes',
      value: session.classCount,
      icon: FiLayers,
      iconBgClassName: 'bg-violet-100',
      iconColorClassName: 'text-violet-700',
    },
    {
      label: 'Sections',
      value: session.sectionCount,
      icon: FiGrid,
      iconBgClassName: 'bg-blue-100',
      iconColorClassName: 'text-blue-600',
    },
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
