import Link from 'next/link';
import { FiUsers } from 'react-icons/fi';
import Badge from '@/components/Badge';

const AVATAR_COLORS = ['bg-blue-500', 'bg-violet-700', 'bg-purple-500', 'bg-indigo-600'];

export default function SectionStudentPreview({ classInfo, section, students }) {
  const studentsHref = `/dashboard/students?class=${encodeURIComponent(classInfo.name)}&section=${encodeURIComponent(section.name)}&session=${encodeURIComponent(classInfo.academicSession)}`;

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 sm:p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-semibold text-indigo-700">Student Preview</h3>
        <Link
          href={studentsHref}
          className="text-sm font-medium text-indigo-700 hover:text-indigo-800 cursor-pointer"
        >
          View All Students
        </Link>
      </div>

      {students.length === 0 ? (
        <div className="flex flex-col items-center text-center py-10">
          <span className="flex items-center justify-center w-12 h-12 rounded-full bg-indigo-50 text-indigo-700 mb-3">
            <FiUsers className="w-5 h-5" />
          </span>
          <p className="text-sm text-gray-500">No students in this section yet.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {students.map((student, index) => (
            <div
              key={student.id}
              className="flex items-center gap-3 p-3 rounded-lg border border-gray-50 hover:bg-gray-50/60 transition"
            >
              <span
                className={`flex items-center justify-center w-9 h-9 rounded-full text-white text-xs font-semibold shrink-0 ${AVATAR_COLORS[index % AVATAR_COLORS.length]}`}
              >
                {student.initials}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{student.name}</p>
                <p className="text-xs text-gray-400">{student.admissionId}</p>
              </div>
              <div className="hidden sm:block text-sm text-gray-500 shrink-0">{student.parentContact}</div>
              <Badge label={student.status} variant={student.status === 'Active' ? 'green' : 'gray'} />
            </div>
          ))}
        </div>
      )}

      <Link
        href={studentsHref}
        className="mt-4 block sm:hidden w-full text-center px-4 py-2.5 rounded-lg font-medium text-sm text-indigo-700 bg-indigo-50 hover:bg-indigo-100 transition cursor-pointer"
      >
        View All Students
      </Link>
    </div>
  );
}
