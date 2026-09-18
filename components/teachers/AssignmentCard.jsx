import { FiLayers, FiCalendar, FiBook, FiX } from 'react-icons/fi';

export default function AssignmentCard({ assignment, onRemove }) {
  const isActive = assignment.status === 'Active';

  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-5 flex items-center justify-between gap-3">
      <div className="flex items-center gap-3 min-w-0">
        <span className="flex items-center justify-center w-11 h-11 rounded-2xl bg-violet-100 text-violet-600 shrink-0">
          <FiLayers className="w-5 h-5" />
        </span>
        <div className="min-w-0">
          <p className="font-bold text-gray-900 truncate">
            {assignment.class}{assignment.section ? ` - Section ${assignment.section}` : ''}
          </p>
          <div className="flex items-center flex-wrap gap-2 mt-1.5">
            <span className="flex items-center gap-1.5 text-xs text-gray-500 bg-gray-50 rounded-md px-2 py-1">
              <FiCalendar className="w-3 h-3" />
              {assignment.academicSession}
            </span>
            {assignment.subject && (
              <span className="flex items-center gap-1.5 text-xs text-violet-700 bg-violet-50 rounded-md px-2 py-1">
                <FiBook className="w-3 h-3" />
                {assignment.subject}
              </span>
            )}
            <span
              className={`inline-flex items-center gap-1.5 text-xs font-semibold rounded-full px-2.5 py-1 ${
                isActive ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-green-600' : 'bg-gray-400'}`} />
              {assignment.status}
            </span>
          </div>
        </div>
      </div>
      <button
        type="button"
        onClick={() => onRemove(assignment.id)}
        className="flex items-center gap-1.5 text-sm font-medium text-red-600 hover:text-red-700 cursor-pointer shrink-0"
      >
        <FiX className="w-4 h-4" />
        Remove
      </button>
    </div>
  );
}
