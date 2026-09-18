import Link from 'next/link';
import { FiCalendar, FiUsers, FiGrid, FiLayers, FiArrowRight } from 'react-icons/fi';
import StatusPill from './StatusPill';
import { formatSessionDate } from './dateUtils';

export default function CurrentSessionCard({ session }) {
  if (!session) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
        <p className="text-sm text-gray-500">No academic session is currently active.</p>
      </div>
    );
  }

  const stats = [
    { label: 'Students', value: session.studentCount, icon: FiUsers },
    { label: 'Classes', value: session.classCount, icon: FiLayers },
    { label: 'Sections', value: session.sectionCount, icon: FiGrid },
  ];

  return (
    <div className="relative overflow-hidden bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sm:p-8">
      <div className="absolute -top-24 -right-24 w-64 h-64 rounded-full bg-gradient-to-br from-violet-200 via-indigo-200 to-blue-200 opacity-40 blur-3xl pointer-events-none" />

      <div className="relative">
        <p className="text-xs font-semibold text-indigo-600 uppercase tracking-wider mb-3">Current Academic Session</p>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <span className="flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-700 via-indigo-600 to-blue-600 text-white shrink-0">
              <FiCalendar className="w-7 h-7" />
            </span>
            <div>
              <h2 className="text-3xl font-bold text-gray-900">{session.name}</h2>
              <p className="text-sm text-gray-500 mt-1">
                {formatSessionDate(session.startDate)} → {formatSessionDate(session.endDate)}
              </p>
            </div>
          </div>
          <StatusPill status={session.status} size="lg" />
        </div>

        <div className="flex flex-wrap items-center gap-x-6 gap-y-3 mt-6 pt-6 border-t border-gray-100">
          {stats.map(({ label, value, icon: Icon }) => (
            <div key={label} className="flex items-center gap-2.5">
              <span className="flex items-center justify-center w-9 h-9 rounded-lg bg-gray-50 text-gray-500">
                <Icon className="w-4 h-4" />
              </span>
              <div>
                <p className="text-lg font-bold text-gray-900 leading-tight">{value.toLocaleString()}</p>
                <p className="text-xs text-gray-400">{label}</p>
              </div>
            </div>
          ))}
          <Link
            href={`/dashboard/sessions/${session.id}`}
            className="sm:ml-auto flex items-center gap-1.5 text-sm font-semibold text-indigo-700 hover:text-indigo-800 transition cursor-pointer"
          >
            View Details
            <FiArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
