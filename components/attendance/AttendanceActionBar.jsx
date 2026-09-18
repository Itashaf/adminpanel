import { STATUS_META } from './statusStyles';

export default function AttendanceActionBar({ counts, onSave, onReset, isSaving, isDirty }) {
  return (
    <div className="sticky bottom-0 bg-white/95 backdrop-blur border-t border-gray-100 rounded-b-2xl px-4 sm:px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
      <div className="flex items-center flex-wrap gap-x-5 gap-y-1.5">
        {Object.entries(counts).map(([status, count]) => (
          <span key={status} className="flex items-center gap-1.5 text-sm text-gray-600">
            <span className={`w-2 h-2 rounded-full shrink-0 ${STATUS_META[status].dot}`} />
            {status} <span className="font-bold text-gray-900">{count}</span>
          </span>
        ))}
      </div>

      <div className="flex flex-col-reverse sm:flex-row gap-3">
        <button
          type="button"
          onClick={onReset}
          disabled={isSaving || !isDirty}
          className="px-4 py-2.5 rounded-lg font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Reset Changes
        </button>
        <button
          type="button"
          onClick={onSave}
          disabled={isSaving || !isDirty}
          className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg font-medium text-white bg-gradient-to-r from-violet-700 via-indigo-600 to-blue-600 hover:opacity-90 transition cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {isSaving ? 'Saving...' : 'Save Attendance'}
        </button>
      </div>
    </div>
  );
}
