import Link from 'next/link';
import { FiArrowRight, FiUser } from 'react-icons/fi';

// A real donut — one arc for Present, one for everyone else (Absent +
// Leave combined), both derived from today's actual attendance record (see
// lib/attendance.js's summarize()). Not a fabricated ring; the percentages
// are the same real numbers the chips below show.
function AttendanceRing({ percent }) {
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const presentLength = (percent / 100) * circumference;

  return (
    <div className="relative w-32 h-32 shrink-0">
      <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
        <circle cx="60" cy="60" r={radius} fill="none" stroke="#fee2e2" strokeWidth="12" />
        <circle
          cx="60"
          cy="60"
          r={radius}
          fill="none"
          stroke="#22c55e"
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={`${presentLength} ${circumference - presentLength}`}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <p className="text-2xl font-bold text-gray-900 tabular-nums leading-tight">{percent}%</p>
        <p className="text-xs text-gray-400">Present</p>
      </div>
    </div>
  );
}

function StatusChip({ label, value, tone }) {
  const toneClasses = {
    green: { bg: 'bg-green-50', icon: 'text-green-600', text: 'text-green-700' },
    red: { bg: 'bg-red-50', icon: 'text-red-600', text: 'text-red-700' },
    amber: { bg: 'bg-amber-50', icon: 'text-amber-600', text: 'text-amber-700' },
  }[tone];

  return (
    <div className={`flex-1 rounded-2xl px-4 py-3 ${toneClasses.bg}`}>
      <p className="text-sm font-medium text-gray-500">{label}</p>
      <div className="flex items-center gap-1.5 mt-1">
        <p className={`text-2xl font-bold tabular-nums leading-tight ${toneClasses.text}`}>{value}</p>
        <FiUser className={`w-4 h-4 ${toneClasses.icon}`} />
      </div>
    </div>
  );
}

// Present/Absent/Leave are the real per-status counts from today's
// attendance record (see lib/attendance.js's summarize()).
export default function AttendanceOverviewCard({ attendance }) {
  if (!attendance || attendance.total === 0) {
    return (
      <div className="bg-white rounded-[24px] border border-gray-100 shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900">Attendance Today</h3>
        <p className="text-sm text-gray-400 mt-3">No attendance marked yet today.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-[24px] border border-gray-100 shadow-sm p-6 transition-shadow duration-200 hover:shadow-md">
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-lg font-semibold text-gray-900">Attendance Today</h3>
        <Link href="/dashboard/attendance/reports" className="flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-700">
          View Details
          <FiArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center gap-6">
        <AttendanceRing percent={attendance.percent} />

        <div className="flex flex-1 flex-wrap gap-3">
          <StatusChip label="Present" value={attendance.Present} tone="green" />
          <StatusChip label="Absent" value={attendance.Absent} tone="red" />
          <StatusChip label="Leave" value={attendance.Leave} tone="amber" />
        </div>
      </div>
    </div>
  );
}
