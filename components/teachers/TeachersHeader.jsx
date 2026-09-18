import Link from 'next/link';
import { FiPlus } from 'react-icons/fi';

export default function TeachersHeader() {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Teachers</h1>
        <p className="text-sm text-gray-500 mt-1">Manage your school&apos;s teaching staff.</p>
      </div>

      <Link
        href="/dashboard/teachers/add"
        className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-medium text-white bg-gradient-to-r from-violet-700 via-indigo-600 to-blue-600 hover:opacity-90 transition cursor-pointer shrink-0"
      >
        <FiPlus className="w-4 h-4" />
        Add Teacher
      </Link>
    </div>
  );
}
