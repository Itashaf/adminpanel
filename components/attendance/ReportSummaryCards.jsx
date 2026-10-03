import { FiUsers, FiCheck, FiX, FiLogOut } from 'react-icons/fi';
import KPICard from '@/components/dashboard/KPICard';

// Same "KPI Card" reusable design as the main Dashboard (see
// components/dashboard/KPICard.jsx).
export default function ReportSummaryCards({ summary, totalStudents }) {
  // `summary.NA` can still be non-zero for an older saved Attendance record
  // (NA was a selectable status before it was removed) — kept out of the
  // percentage base for backward compatibility, even though nothing in the
  // UI can produce a new NA entry anymore.
  const countable = summary.total - (summary.NA || 0);
  const percentOf = (value) => (countable > 0 ? Math.round((value / countable) * 1000) / 10 : 0);

  const cards = [
    { label: 'Total Students', value: totalStudents, icon: <FiUsers className="w-4 h-4" /> },
    { label: 'Present', value: summary.Present, percent: percentOf(summary.Present), icon: <FiCheck className="w-4 h-4" /> },
    { label: 'Absent', value: summary.Absent, percent: percentOf(summary.Absent), icon: <FiX className="w-4 h-4" /> },
    { label: 'Leave', value: summary.Leave, percent: percentOf(summary.Leave), icon: <FiLogOut className="w-4 h-4" /> },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
      {cards.map(({ label, value, percent, icon }) => (
        <KPICard
          key={label}
          label={label}
          icon={icon}
          value={(value || 0).toLocaleString()}
          context={percent !== undefined ? `${percent}%` : undefined}
        />
      ))}
    </div>
  );
}
