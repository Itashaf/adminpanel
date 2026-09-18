import { FiCalendar, FiAward, FiClock, FiBriefcase, FiPhone, FiMail, FiShield, FiUsers } from 'react-icons/fi';

function formatDate(dateString) {
  if (!dateString) return '—';
  return new Date(dateString).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatServicePeriod(teacher) {
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
    { label: 'Class Teacher Of', value: formatClassTeacherOf(teacher.classTeacherOf), icon: FiUsers, iconBg: 'bg-green-100', iconColor: 'text-green-700' },
    { label: 'Service Period', value: formatServicePeriod(teacher), icon: FiCalendar, iconBg: 'bg-violet-100', iconColor: 'text-violet-700' },
    { label: 'Qualification', value: teacher.qualification || '—', icon: FiAward, iconBg: 'bg-blue-100', iconColor: 'text-blue-600' },
    { label: 'Experience', value: teacher.experience || '—', icon: FiClock, iconBg: 'bg-amber-100', iconColor: 'text-amber-600' },
    { label: 'Employment Type', value: teacher.employmentType, icon: FiBriefcase, iconBg: 'bg-violet-100', iconColor: 'text-violet-700' },
    { label: 'Phone', value: teacher.phone, icon: FiPhone, iconBg: 'bg-blue-100', iconColor: 'text-blue-600' },
    { label: 'Email', value: teacher.email, icon: FiMail, iconBg: 'bg-violet-100', iconColor: 'text-violet-700' },
    {
      label: 'Account Status',
      value: teacher.loginAccess?.enabled ? teacher.loginAccess.accountStatus : 'No Access',
      icon: FiShield,
      iconBg: 'bg-green-100',
      iconColor: 'text-green-700',
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {items.map(({ label, value, icon: Icon, iconBg, iconColor }) => (
        <div key={label} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
          <span className={`flex items-center justify-center w-9 h-9 rounded-lg mb-2 ${iconBg}`}>
            <Icon className={`w-4 h-4 ${iconColor}`} />
          </span>
          <p className="text-xs text-gray-400 uppercase tracking-wide">{label}</p>
          <p className="text-sm font-semibold text-gray-900 mt-0.5 truncate">{value}</p>
        </div>
      ))}
    </div>
  );
}
