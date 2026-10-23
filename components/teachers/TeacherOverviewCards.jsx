import KPICard from '@/components/dashboard/KPICard';
import { FiCalendar, FiAward, FiClock, FiBriefcase, FiPhone, FiMail, FiShield, FiUsers } from 'react-icons/fi';

function formatDate(dateString) {
  if (!dateString) return '—';
  return new Date(dateString).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function formatServicePeriod(teacher) {
  const from = formatDate(teacher.joiningDate);
  const to = teacher.relievingDate ? formatDate(teacher.relievingDate) : 'Present';
  return `${from} – ${to}`;
}

function formatClassTeacherOf(classTeacherOf) {
  if (!classTeacherOf?.length) return 'Not a Class Teacher';
  return classTeacherOf.map((s) => `${s.className}-${s.sectionName}`).join(', ');
}

export default function TeacherOverviewCards({ teacher }) {
  const items = [
    { label: 'Class Teacher Of', value: formatClassTeacherOf(teacher.classTeacherOf), icon: FiUsers, iconBg: 'bg-green-100', iconColor: 'text-green-700', tint: 'bg-green-50' },
    { label: 'Service Period', value: formatServicePeriod(teacher), icon: FiCalendar, iconBg: 'bg-violet-100', iconColor: 'text-violet-700', tint: 'bg-violet-50', wide: true, inHeader: true },
    { label: 'Qualification', value: teacher.qualification || '—', icon: FiAward, iconBg: 'bg-blue-100', iconColor: 'text-blue-600', tint: 'bg-blue-50', inHeader: true },
    { label: 'Experience', value: teacher.experience || '—', icon: FiClock, iconBg: 'bg-amber-100', iconColor: 'text-amber-600', tint: 'bg-amber-50', inHeader: true },
    { label: 'Employment Type', value: teacher.employmentType, icon: FiBriefcase, iconBg: 'bg-violet-100', iconColor: 'text-violet-700', tint: 'bg-indigo-50' },
    { label: 'Phone', value: teacher.phone, icon: FiPhone, iconBg: 'bg-blue-100', iconColor: 'text-blue-600', tint: 'bg-blue-50', inHeader: true },
    { label: 'Email', value: teacher.email, icon: FiMail, iconBg: 'bg-violet-100', iconColor: 'text-violet-700', tint: 'bg-violet-50', wide: true, inHeader: true },
    {
      label: 'Contact',
      value: [teacher.phone, teacher.email].filter(Boolean),
      icon: FiPhone,
      iconBg: 'bg-blue-100',
      iconColor: 'text-blue-600',
      tint: 'bg-blue-50',
      wide: true,
      only2xl: true,
    },
    {
      label: 'Account Status',
      value: teacher.loginAccess?.enabled ? teacher.loginAccess.accountStatus : 'No Access',
      icon: FiShield,
      iconBg: 'bg-green-100',
      iconColor: 'text-green-700',
      tint: 'bg-green-50',
    },
  ];

  return (
    <>
    {/* sm and up: the same gradient KPI cards the other pages use. */}
    <div className="hidden sm:grid grid-cols-2 lg:grid-cols-4 gap-4">
      {items.map(({ label, value, icon: Icon, inHeader, only2xl }) => (
        <div key={label} className={`[&>div]:h-full ${inHeader ? '2xl:hidden' : ''} ${only2xl ? 'hidden 2xl:block' : ''}`}>
          <KPICard
            label={label}
            icon={<Icon className="w-4 h-4" />}
            valueClassName="text-base"
            value={(Array.isArray(value) ? value : [value]).map((line) => (
              <span key={line} className="block truncate">
                {line}
              </span>
            ))}
          />
        </div>
      ))}
    </div>

    {/* Phone: compact pastel tiles. */}
    <div className="sm:hidden grid grid-cols-2 gap-2.5">
      {items.map(({ label, value, icon: Icon, iconBg, iconColor, tint, wide, only2xl }) => (
        <div
          key={label}
          className={`text-center rounded-xl p-3 ${tint || ''} ${wide ? 'col-span-2' : ''} ${only2xl ? 'hidden' : ''}`}
        >
          <span className={`flex items-center justify-center w-8 h-8 rounded-lg mb-2 mx-auto ${iconBg}`}>
            <Icon className={`w-4 h-4 ${iconColor}`} />
          </span>
          <p className="text-[11px] text-gray-500 tracking-wide">{label}</p>
          {(Array.isArray(value) ? value : [value]).map((line) => (
            <p key={line} className="text-xs font-semibold text-gray-900 mt-0.5 break-words">
              {line}
            </p>
          ))}
        </div>
      ))}
    </div>
    </>
  );
}
