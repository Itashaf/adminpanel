import { FiCalendar, FiLayers, FiGrid, FiClock, FiCheckCircle } from 'react-icons/fi';

function formatDate(dateString) {
  return new Date(dateString).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function ProfileOverviewCards({ student }) {
  const items = [
    { label: 'Academic Session', value: student.academicSession, icon: FiCalendar, iconBg: 'bg-violet-100', iconColor: 'text-violet-700', tint: 'bg-violet-50', phoneLabel: 'Session' },
    { label: 'Class', value: student.class, icon: FiLayers, iconBg: 'bg-blue-100', iconColor: 'text-blue-600', tint: 'bg-blue-50', phoneValue: [student.class?.replace(/^Class\s+/i, ''), student.section].filter(Boolean).join('-') },
    { label: 'Section', value: student.section, icon: FiGrid, iconBg: 'bg-violet-100', iconColor: 'text-violet-700', tint: 'bg-indigo-50', hideOnPhone: true },
    { label: 'Admission Date', value: formatDate(student.admissionDate), icon: FiClock, iconBg: 'bg-amber-100', iconColor: 'text-amber-600', hideOnPhone: true },
    { label: 'Status', value: student.status, icon: FiCheckCircle, iconBg: 'bg-green-100', iconColor: 'text-green-700', tint: 'bg-green-50' },
  ];

  return (
    <div className="grid grid-cols-3 sm:grid-cols-2 lg:grid-cols-5 gap-2 sm:gap-4">
      {items.map(({ label, value, icon: Icon, iconBg, iconColor, tint, hideOnPhone, phoneValue, phoneLabel }) => (
        <div
          key={label}
          className={`text-center sm:text-left rounded-xl p-2.5 sm:p-4 sm:bg-white sm:border sm:border-gray-100 sm:shadow-sm sm:last:col-span-2 lg:last:col-span-1 ${tint || ''} ${hideOnPhone ? 'hidden sm:block' : ''}`}
        >
          <span className={`flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 rounded-lg mb-2 mx-auto sm:mx-0 ${iconBg}`}>
            <Icon className={`w-4 h-4 ${iconColor}`} />
          </span>
          <p className="text-[11px] sm:text-xs text-gray-500 sm:text-gray-400 sm:uppercase tracking-wide">
            {phoneLabel ? (
              <>
                <span className="sm:hidden">{phoneLabel}</span>
                <span className="hidden sm:inline">{label}</span>
              </>
            ) : (
              label
            )}
          </p>
          <p className="text-xs sm:text-sm font-semibold text-gray-900 mt-0.5 break-words">{phoneValue ? (
              <>
                <span className="sm:hidden">{phoneValue}</span>
                <span className="hidden sm:inline">{value}</span>
              </>
            ) : (
              value
            )}
          </p>
        </div>
      ))}
    </div>
  );
}
