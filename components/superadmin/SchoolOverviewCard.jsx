import { FiHome } from 'react-icons/fi';

export default function SchoolOverviewCard({ school }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sm:p-8">
      <div className="flex items-center gap-4 mb-6">
        <span className="flex items-center justify-center w-11 h-11 rounded-2xl bg-violet-100 text-violet-600 shrink-0">
          {school.logoUrl ? (
            <img src={school.logoUrl} alt={school.name} className="w-full h-full object-contain p-1.5 rounded-2xl" />
          ) : (
            <FiHome className="w-5 h-5" />
          )}
        </span>
        <div>
          <h3 className="text-lg font-bold text-gray-900">School Overview</h3>
          <p className="text-sm text-gray-500 mt-0.5">Profile and contact details on file.</p>
        </div>
      </div>

      <dl className="bg-gray-50 rounded-2xl p-6 grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div>
          <dt className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1.5">School Code</dt>
          <dd className="text-base font-bold text-gray-900">{school.code}</dd>
        </div>
        <div>
          <dt className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1.5">Principal</dt>
          <dd className="text-base font-bold text-gray-900">{school.principalName || '—'}</dd>
        </div>
        <div>
          <dt className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1.5">Email</dt>
          <dd className="text-base font-bold text-gray-900">{school.email}</dd>
        </div>
        <div>
          <dt className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1.5">Phone</dt>
          <dd className="text-base font-bold text-gray-900">{school.phone}</dd>
        </div>
        <div>
          <dt className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1.5">Location</dt>
          <dd className="text-base font-bold text-gray-900">{[school.city, school.state, school.country].filter(Boolean).join(', ') || '—'}</dd>
        </div>
        <div>
          <dt className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1.5">Current Session</dt>
          <dd className="text-base font-bold text-gray-900">{school.currentSessionName || '—'}</dd>
        </div>
      </dl>

      <p className="text-xs text-gray-400 mt-5 px-1">
        On the platform since <span className="text-gray-500 font-medium">{school.createdAt}</span>
      </p>
    </div>
  );
}
