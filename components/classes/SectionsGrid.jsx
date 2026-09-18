import { FiGrid, FiPlus } from 'react-icons/fi';
import SectionCard from './SectionCard';

export default function SectionsGrid({ classId, className, academicSession, sections, teacherOptions, onAddSection }) {
  if (sections.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-10 sm:p-14 flex flex-col items-center text-center">
        <span className="flex items-center justify-center w-14 h-14 rounded-full bg-indigo-50 text-indigo-700 mb-4">
          <FiGrid className="w-6 h-6" />
        </span>
        <h3 className="text-base font-semibold text-gray-900">No sections added</h3>
        <p className="text-sm text-gray-500 mt-1 max-w-sm">
          Add a section to organize students within this class.
        </p>
        <button
          type="button"
          onClick={onAddSection}
          className="mt-5 inline-flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium text-white bg-gradient-to-r from-violet-700 via-indigo-600 to-blue-600 hover:opacity-90 transition cursor-pointer"
        >
          <FiPlus className="w-4 h-4" />
          Add Section
        </button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
      {sections.map((section) => (
        <SectionCard
          key={section.id}
          classId={classId}
          className={className}
          academicSession={academicSession}
          section={section}
          teacherOptions={teacherOptions}
        />
      ))}
    </div>
  );
}
