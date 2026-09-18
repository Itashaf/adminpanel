import { FiLayers, FiPlus } from 'react-icons/fi';
import ClassCard from './ClassCard';

export default function ClassesGrid({ classes, onAddClass }) {
  if (classes.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-10 sm:p-14 flex flex-col items-center text-center">
        <span className="flex items-center justify-center w-14 h-14 rounded-full bg-indigo-50 text-indigo-700 mb-4">
          <FiLayers className="w-6 h-6" />
        </span>
        <h3 className="text-base font-semibold text-gray-900">No classes created yet</h3>
        <p className="text-sm text-gray-500 mt-1 max-w-sm">
          Create your first class to start organizing students.
        </p>
        <button
          type="button"
          onClick={onAddClass}
          className="mt-5 inline-flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium text-white bg-gradient-to-r from-violet-700 via-indigo-600 to-blue-600 hover:opacity-90 transition cursor-pointer"
        >
          <FiPlus className="w-4 h-4" />
          Create Class
        </button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {classes.map((cls) => (
        <ClassCard key={cls.id} cls={cls} />
      ))}
    </div>
  );
}
