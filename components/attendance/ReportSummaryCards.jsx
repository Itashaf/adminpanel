import { FiUsers, FiCheck, FiX, FiLogOut } from 'react-icons/fi';

export default function ReportSummaryCards({ summary, totalStudents }) {
  // `summary.NA` can still be non-zero for an older saved Attendance record
  // (NA was a selectable status before it was removed) — kept out of the
  // percentage base for backward compatibility, even though nothing in the
  // UI can produce a new NA entry anymore.
  const countable = summary.total - (summary.NA || 0);
  const percentOf = (value) => (countable > 0 ? Math.round((value / countable) * 1000) / 10 : 0);

  const cards = [
    {
      label: 'Total Students',
      value: totalStudents,
      icon: FiUsers,
      iconBgClassName: 'bg-indigo-100',
      iconColorClassName: 'text-indigo-700',
    },
    {
      label: 'Present',
      value: summary.Present,
      percent: percentOf(summary.Present),
      icon: FiCheck,
      iconBgClassName: 'bg-green-100',
      iconColorClassName: 'text-green-700',
      percentClassName: 'text-green-600',
    },
    {
      label: 'Absent',
      value: summary.Absent,
      percent: percentOf(summary.Absent),
      icon: FiX,
      iconBgClassName: 'bg-red-100',
      iconColorClassName: 'text-red-600',
      percentClassName: 'text-red-600',
    },
    {
      label: 'Leave',
      value: summary.Leave,
      percent: percentOf(summary.Leave),
      icon: FiLogOut,
      iconBgClassName: 'bg-blue-100',
      iconColorClassName: 'text-blue-600',
      percentClassName: 'text-blue-600',
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
      {cards.map(({ label, value, percent, icon: Icon, iconBgClassName, iconColorClassName, percentClassName }) => (
        <div key={label} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-center gap-3">
          <span className={`flex items-center justify-center w-11 h-11 rounded-xl shrink-0 ${iconBgClassName}`}>
            <Icon className={`w-5 h-5 ${iconColorClassName}`} />
          </span>
          <div className="min-w-0">
            <p className="text-xs font-medium text-gray-500">{label}</p>
            <p className="text-xl font-bold text-gray-900 leading-tight">{(value || 0).toLocaleString()}</p>
            {percent !== undefined && <p className={`text-xs font-semibold ${percentClassName}`}>{percent}%</p>}
          </div>
        </div>
      ))}
    </div>
  );
}
