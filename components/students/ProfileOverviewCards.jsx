import { FiCalendar, FiLayers, FiGrid, FiClock, FiCheckCircle } from 'react-icons/fi';

function formatDate(dateString) {
  return new Date(dateString).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function ProfileOverviewCards({ student }) {
  const items = [
    { label: 'Academic Session', value: student.academicSession, icon: FiCalendar, iconBg: 'bg-violet-100', iconColor: 'text-violet-700' },
    { label: 'Class', value: student.class, icon: FiLayers, iconBg: 'bg-blue-100', iconColor: 'text-blue-600' },
    { label: 'Section', value: student.section, icon: FiGrid, iconBg: 'bg-violet-100', iconColor: 'text-violet-700' },
    { label: 'Admission Date', value: formatDate(student.admissionDate), icon: FiClock, iconBg: 'bg-amber-100', iconColor: 'text-amber-600' },
    { label: 'Status', value: student.status, icon: FiCheckCircle, iconBg: 'bg-green-100', iconColor: 'text-green-700' },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
      {items.map(({ label, value, icon: Icon, iconBg, iconColor }) => (
        <div key={label} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
          <span className={`flex items-center justify-center w-9 h-9 rounded-lg mb-2 ${iconBg}`}>
            <Icon className={`w-4 h-4 ${iconColor}`} />
          </span>
          <p className="text-xs text-gray-400 uppercase tracking-wide">{label}</p>
          <p className="text-sm font-semibold text-gray-900 mt-0.5">{value}</p>
        </div>
      ))}
    </div>
  );
}
