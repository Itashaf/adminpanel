import { FiUsers, FiUserCheck, FiUserPlus, FiUserX } from 'react-icons/fi';
import KPICard from '@/components/dashboard/KPICard';

const CARDS = (stats) => [
  { label: 'Total Teachers', value: stats.total, icon: <FiUsers className="w-4 h-4" /> },
  { label: 'Active Teachers', value: stats.active, icon: <FiUserCheck className="w-4 h-4" /> },
  { label: 'New This Month', value: stats.newThisMonth, icon: <FiUserPlus className="w-4 h-4" /> },
  { label: 'Inactive', value: stats.inactive, icon: <FiUserX className="w-4 h-4" /> },
];

// Same "KPI Card" reusable design as the main Dashboard (see
// components/dashboard/KPICard.jsx) — Sidebar's dark-to-light gradient,
// not this module's own one-off card look.
export default function TeachersStats({ stats }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {CARDS(stats).map(({ label, value, icon }) => (
        <KPICard key={label} label={label} icon={icon} value={value.toLocaleString()} />
      ))}
    </div>
  );
}
