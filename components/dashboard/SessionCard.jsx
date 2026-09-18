import { FiCalendar } from 'react-icons/fi';

export default function SessionCard({ label, statusLabel }) {
  return (
    <div className="bg-gradient-to-br from-violet-700 via-indigo-700 to-blue-700 rounded-xl p-4 text-white">
      <div className="flex items-start justify-between">
        <p className="text-xs font-medium text-purple-200 uppercase tracking-wide">Academic Session</p>
        <span className="flex items-center justify-center w-9 h-9 rounded-lg bg-white/15">
          <FiCalendar className="w-4 h-4 text-white" />
        </span>
      </div>

      <p className="text-2xl font-bold mt-2">{label}</p>

      <div className="flex items-center gap-2 mt-3">
        <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
        <span className="text-xs text-purple-100">{statusLabel}</span>
      </div>
    </div>
  );
}
