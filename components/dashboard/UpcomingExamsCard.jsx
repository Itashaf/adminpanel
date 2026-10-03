import Link from 'next/link';
import { FiArrowRight, FiCalendar } from 'react-icons/fi';

function formatDate(dateStr) {
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
}

// Real upcoming-exam rows (startDate in the future, see page.jsx) + the
// same resultsPending/ongoing figures lib/exams.js's getExamDashboardStats
// already computes for the Exams module itself — nothing fabricated here.
export default function UpcomingExamsCard({ exams, stats }) {
  return (
    <div className="bg-white rounded-[24px] border border-gray-100 shadow-sm p-6">
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-lg font-semibold text-gray-900">Upcoming Exams</h3>
        <Link
          href="/dashboard/exams/list"
          className="flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-700"
        >
          View All
          <FiArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      <div className="flex gap-3 mb-5">
        <div className="flex-1 rounded-2xl bg-blue-50 px-4 py-3">
          <p className="text-xl font-bold text-blue-700 tabular-nums leading-tight">{stats.upcoming}</p>
          <p className="text-xs text-gray-500 mt-0.5">Upcoming</p>
        </div>
        <div className="flex-1 rounded-2xl bg-amber-50 px-4 py-3">
          <p className="text-xl font-bold text-amber-700 tabular-nums leading-tight">{stats.ongoing}</p>
          <p className="text-xs text-gray-500 mt-0.5">Ongoing</p>
        </div>
        <div className="flex-1 rounded-2xl bg-violet-50 px-4 py-3">
          <p className="text-xl font-bold text-violet-700 tabular-nums leading-tight">{stats.resultsPending}</p>
          <p className="text-xs text-gray-500 mt-0.5">Results Pending</p>
        </div>
      </div>

      {exams.length === 0 ? (
        <p className="text-sm text-gray-400">No upcoming exams scheduled.</p>
      ) : (
        <div className="divide-y divide-gray-100">
          {exams.map((exam) => (
            <Link
              key={exam.id}
              href={`/dashboard/exams/${exam.id}`}
              className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0 hover:bg-gray-50/60 -mx-2 px-2 rounded-lg transition"
            >
              <div className="min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">{exam.name}</p>
                <p className="text-xs text-gray-400 truncate">{exam.classes.join(', ')}</p>
              </div>
              <span className="flex items-center gap-1.5 text-xs font-medium text-gray-500 shrink-0">
                <FiCalendar className="w-3.5 h-3.5" />
                {formatDate(exam.startDate)}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
