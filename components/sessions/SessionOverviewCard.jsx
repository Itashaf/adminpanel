import { FiCalendar } from 'react-icons/fi';
import StatusPill from './StatusPill';
import { formatSessionDate } from './dateUtils';

export default function SessionOverviewCard({ session }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sm:p-8">
      <div className="flex items-center gap-4 mb-6">
        <span className="flex items-center justify-center w-11 h-11 rounded-2xl bg-violet-100 text-violet-600 shrink-0">
          <FiCalendar className="w-5 h-5" />
        </span>
        <div>
          <h3 className="text-lg font-bold text-gray-900">Session Overview</h3>
          <p className="text-sm text-gray-500 mt-0.5">Key details for this academic session.</p>
        </div>
      </div>

      <dl className="bg-gray-50 rounded-2xl p-6 grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div>
          <dt className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1.5">Session Name</dt>
          <dd className="text-base font-bold text-gray-900">{session.name}</dd>
        </div>
        <div>
          <dt className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1.5">Status</dt>
          <dd>
            <StatusPill status={session.status} />
          </dd>
        </div>
        <div>
          <dt className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1.5">Start Date</dt>
          <dd className="text-base font-bold text-gray-900">{formatSessionDate(session.startDate)}</dd>
        </div>
        <div>
          <dt className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1.5">End Date</dt>
          <dd className="text-base font-bold text-gray-900">{formatSessionDate(session.endDate)}</dd>
        </div>
        {session.description && (
          <div className="sm:col-span-2">
            <dt className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1.5">Description</dt>
            <dd className="text-sm text-gray-600">{session.description}</dd>
          </div>
        )}
      </dl>

      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 mt-5 px-1">
        <p className="text-xs text-gray-400">
          Created <span className="text-gray-500 font-medium">{formatSessionDate(session.createdAt)}</span>
        </p>
        <p className="text-xs text-gray-400">
          Last Updated <span className="text-gray-500 font-medium">{formatSessionDate(session.updatedAt)}</span>
        </p>
      </div>
    </div>
  );
}
