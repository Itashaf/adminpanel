import { FiMoreHorizontal } from 'react-icons/fi';

// Replaces the donut chart with a per-class horizontal bar list — the same
// class headcounts, just readable at a glance instead of decoded from a
// wedge's angle. `distribution` is real data from lib/dashboard.js's
// getDashboardOverview (each class's actual totalStudents), not a
// fabricated split.
export default function StudentOverviewCard({ total, distribution = [] }) {
  return (
    <div className="bg-white/70 backdrop-blur-md rounded-2xl border border-white/60 shadow-sm p-5">
      <div className="flex items-center justify-between mb-1">
        <div>
          <h3 className="text-base font-semibold text-gray-900">Student Distribution by Class</h3>
          <p className="text-xs text-gray-400 mt-0.5">{total.toLocaleString()} students total</p>
        </div>
        <button type="button" className="text-gray-400 hover:text-gray-600 cursor-pointer shrink-0">
          <FiMoreHorizontal className="w-5 h-5" />
        </button>
      </div>

      <div className="space-y-3.5 mt-5">
        {distribution.map((row) => (
          <div key={row.name}>
            <div className="flex items-center justify-between text-sm mb-1.5">
              <span className="font-medium text-gray-700">{row.name}</span>
              <span className="flex items-baseline gap-1.5">
                <span className="font-bold text-gray-900 tabular-nums">{row.count.toLocaleString()}</span>
                <span className="text-xs text-gray-400 tabular-nums">({row.percent}%)</span>
              </span>
            </div>
            <div className="h-2 rounded-full bg-white/60 backdrop-blur-md border border-white/60 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-violet-500 to-blue-600 transition-all"
                style={{ width: `${Math.max(row.percent > 0 ? 3 : 0, row.percent)}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
