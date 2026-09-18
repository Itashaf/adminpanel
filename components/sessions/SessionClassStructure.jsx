import Link from 'next/link';
import { FiLayers, FiUsers, FiGrid, FiChevronRight } from 'react-icons/fi';

export default function SessionClassStructure({ classes }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sm:p-8">
      <div className="flex items-center gap-4 mb-6">
        <span className="flex items-center justify-center w-11 h-11 rounded-2xl bg-violet-100 text-violet-600 shrink-0">
          <FiLayers className="w-5 h-5" />
        </span>
        <div>
          <h3 className="text-lg font-bold text-gray-900">Class Structure</h3>
          <p className="text-sm text-gray-500 mt-0.5">Classes and sections belonging to this session.</p>
        </div>
      </div>

      {classes.length === 0 ? (
        <p className="text-sm text-gray-500 text-center py-10">No classes have been set up for this session yet.</p>
      ) : (
        <div className="space-y-2">
          {classes.map((cls) => (
            <Link
              key={cls.id}
              href={`/dashboard/classes/${cls.id}`}
              className="flex items-center justify-between gap-3 bg-gray-50 hover:bg-gray-100 rounded-xl px-4 py-3.5 transition cursor-pointer"
            >
              <p className="font-semibold text-gray-900">{cls.name}</p>
              <div className="flex items-center gap-4 shrink-0">
                <span className="flex items-center gap-1.5 text-sm text-gray-500">
                  <FiGrid className="w-3.5 h-3.5" />
                  {cls.sectionCount} Sections
                </span>
                <span className="flex items-center gap-1.5 text-sm text-gray-500">
                  <FiUsers className="w-3.5 h-3.5" />
                  {cls.totalStudents} Students
                </span>
                <FiChevronRight className="w-4 h-4 text-gray-300" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
