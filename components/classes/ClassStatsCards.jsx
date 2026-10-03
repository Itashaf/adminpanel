import { FiUsers, FiGrid, FiUserCheck } from 'react-icons/fi';
import KPICard from '@/components/dashboard/KPICard';

const CARDS = (cls) => [
  { label: 'Students', value: cls.totalStudents, icon: <FiUsers className="w-4 h-4" /> },
  { label: 'Sections', value: cls.sectionCount, icon: <FiGrid className="w-4 h-4" /> },
  { label: 'Class Teachers', value: cls.classTeacherCount, icon: <FiUserCheck className="w-4 h-4" /> },
];

// Same "KPI Card" reusable design as the main Dashboard (see
// components/dashboard/KPICard.jsx) — Sidebar's dark-to-light gradient,
// not this module's own one-off card look.
export default function ClassStatsCards({ cls }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {CARDS(cls).map(({ label, value, icon }) => (
        <KPICard key={label} label={label} icon={icon} value={value.toLocaleString()} />
      ))}
    </div>
  );
}
