import Link from 'next/link';
import { FiArrowLeft } from 'react-icons/fi';
import Badge from '@/components/Badge';

export default function SectionDetailsHeader({ classInfo, section }) {
  return (
    <div className="space-y-3">
      <Link
        href={`/dashboard/classes/${classInfo.id}`}
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-indigo-700 transition cursor-pointer"
      >
        <FiArrowLeft className="w-4 h-4" />
        {classInfo.name}
      </Link>

      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-bold text-gray-900">
          {classInfo.name} · Section {section.name}
        </h1>
        <Badge label={classInfo.academicSession} variant="violet" />
        <Badge label={section.status} variant={section.status === 'Active' ? 'green' : 'gray'} />
      </div>
    </div>
  );
}
