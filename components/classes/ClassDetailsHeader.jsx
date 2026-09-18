import Link from 'next/link';
import { FiArrowLeft, FiEdit2, FiPlus } from 'react-icons/fi';
import Badge from '@/components/Badge';

export default function ClassDetailsHeader({ cls, onEditClass, onAddSection }) {
  return (
    <div className="space-y-3">
      <Link
        href="/dashboard/classes"
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-indigo-700 transition cursor-pointer"
      >
        <FiArrowLeft className="w-4 h-4" />
        Classes &amp; Sections
      </Link>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-gray-900">{cls.name}</h1>
          <Badge label={cls.academicSession} variant="violet" />
          <Badge label={cls.status} variant={cls.status === 'Active' ? 'green' : 'gray'} />
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={onEditClass}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-medium text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 transition cursor-pointer"
          >
            <FiEdit2 className="w-4 h-4" />
            Edit Class
          </button>
          <button
            type="button"
            onClick={onAddSection}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-medium text-white bg-gradient-to-r from-violet-700 via-indigo-600 to-blue-600 hover:opacity-90 transition cursor-pointer"
          >
            <FiPlus className="w-4 h-4" />
            Add Section
          </button>
        </div>
      </div>
    </div>
  );
}
