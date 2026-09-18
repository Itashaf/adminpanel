import { FiBook } from 'react-icons/fi';

export default function ClassOverviewCard({ name, sections, students, capacityPercent }) {
  return (
    <div className="bg-gray-50 rounded-xl border border-gray-100 p-4">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <span className="flex items-center justify-center w-9 h-9 rounded-lg bg-gray-100 text-gray-700 shrink-0">
            <FiBook className="w-4 h-4" />
          </span>
          <div>
            <p className="text-sm font-semibold text-gray-900">{name}</p>
            <p className="text-xs text-gray-400">{sections} Sections</p>
          </div>
        </div>
        <p className="text-sm font-semibold text-gray-900 whitespace-nowrap">{students} Students</p>
      </div>

      <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
        <div className="h-full bg-violet-700 rounded-full" style={{ width: `${capacityPercent}%` }} />
      </div>
    </div>
  );
}
