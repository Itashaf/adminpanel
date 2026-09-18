import Link from 'next/link';
import { FiPhone, FiArrowRight } from 'react-icons/fi';

const AVATAR_COLORS = ['bg-blue-500', 'bg-violet-700', 'bg-purple-500', 'bg-indigo-600', 'bg-cyan-600'];

function StatusPill({ status }) {
  const isActive = status === 'Active';
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-xs font-medium rounded-full px-2.5 py-1 ${
        isActive ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'
      }`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-green-600' : 'bg-amber-500'}`} />
      {status}
    </span>
  );
}

function Avatar({ initials, index }) {
  return (
    <span
      className={`flex items-center justify-center w-9 h-9 rounded-full text-white text-xs font-semibold shrink-0 ${AVATAR_COLORS[index % AVATAR_COLORS.length]}`}
    >
      {initials}
    </span>
  );
}

// `students` is already the latest 5 (see lib/dashboard.js's
// getDashboardOverview, which slices recentStudents to 5 before this ever
// renders) — no client-side re-slicing needed here.
export default function RecentStudentsTable({ students }) {
  return (
    <div className="bg-white rounded-[24px] border border-gray-100 shadow-sm overflow-hidden transition-shadow duration-200 hover:shadow-md">
      <div className="flex items-center justify-between px-6 py-5">
        <h3 className="text-lg font-semibold text-gray-900">Recently Added Students</h3>
        <Link href="/dashboard/students" className="flex items-center gap-1 text-sm font-medium text-violet-700 hover:text-violet-800">
          View All
          <FiArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Desktop table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs font-medium text-gray-400 uppercase tracking-wide border-y border-gray-100">
              <th className="py-3 pl-6 pr-4 font-medium">Student</th>
              <th className="py-3 pr-4 font-medium">Class</th>
              <th className="py-3 pr-4 font-medium">Parent Contact</th>
              <th className="py-3 pr-6 font-medium">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {students.map((student, index) => (
              <tr key={student.admissionId} className="hover:bg-gray-50/60 transition">
                <td className="py-3.5 pr-4 pl-6">
                  <div className="flex items-center gap-3">
                    <Avatar initials={student.initials} index={index} />
                    <div>
                      <p className="font-medium text-gray-900">{student.name}</p>
                      <p className="text-xs text-gray-400">{student.admissionId}</p>
                    </div>
                  </div>
                </td>
                <td className="py-3.5 pr-4 text-gray-600">{student.classSection}</td>
                <td className="py-3.5 pr-4">
                  <p className="flex items-center gap-1.5 text-gray-500">
                    <FiPhone className="w-3 h-3 text-gray-300" />
                    {student.parentContact}
                  </p>
                </td>
                <td className="py-3.5 pr-6">
                  <StatusPill status={student.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden divide-y divide-gray-50">
        {students.map((student, index) => (
          <div key={student.admissionId} className="px-6 py-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 min-w-0">
                <Avatar initials={student.initials} index={index} />
                <div className="min-w-0">
                  <p className="font-medium text-gray-900 truncate">{student.name}</p>
                  <p className="text-xs text-gray-400">{student.classSection}</p>
                </div>
              </div>
              <StatusPill status={student.status} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
