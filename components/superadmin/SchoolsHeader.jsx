import Link from 'next/link';
import { FiPlus } from 'react-icons/fi';

export default function SchoolsHeader() {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Schools</h1>
        <p className="text-sm text-gray-500 mt-1">Every school onboarded to the platform, in one place.</p>
      </div>

      <Link
        href="/setup"
        className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-medium text-white bg-gradient-to-r from-violet-700 via-indigo-600 to-blue-600 hover:opacity-90 transition cursor-pointer shrink-0"
      >
        <FiPlus className="w-4 h-4" />
        Add School
      </Link>
    </div>
  );
}
