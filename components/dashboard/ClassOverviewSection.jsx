import Link from 'next/link';
import { FiArrowRight } from 'react-icons/fi';
import ClassOverviewCard from './ClassOverviewCard';

export default function ClassOverviewSection({ classes }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-base font-semibold text-indigo-700">Class Overview</h3>
        <Link
          href="/dashboard/classes"
          className="flex items-center gap-1 text-sm font-medium text-indigo-600 hover:text-indigo-800 cursor-pointer"
        >
          View All
          <FiArrowRight className="w-4 h-4" />
        </Link>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {classes.map((classItem) => (
          <ClassOverviewCard key={classItem.id} {...classItem} />
        ))}
      </div>
    </div>
  );
}
