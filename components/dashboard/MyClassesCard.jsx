import Link from 'next/link';
import { FiUsers, FiCheckCircle, FiClock, FiChevronRight } from 'react-icons/fi';
import { HiOutlineAcademicCap } from 'react-icons/hi2';

export default function MyClassesCard({ classRows }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <span className="flex items-center justify-center w-9 h-9 rounded-xl bg-blue-100 text-blue-600 shrink-0">
            <HiOutlineAcademicCap className="w-4 h-4" />
          </span>
          <h2 className="text-base font-bold text-gray-900">My Classes</h2>
        </div>
        <Link
          href="/dashboard/attendance/daily"
          className="flex items-center justify-center w-7 h-7 rounded-full text-gray-400 hover:text-indigo-700 hover:bg-indigo-50 transition cursor-pointer"
        >
          <FiChevronRight className="w-4 h-4" />
        </Link>
      </div>

      {classRows.length === 0 ? (
        <p className="text-sm text-gray-500 py-6 text-center flex-1 flex items-center justify-center">You have no assigned classes yet.</p>
      ) : (
        <div className="space-y-2 flex-1">
          {classRows.map((row) => (
            <Link
              key={`${row.class}-${row.section}`}
              href="/dashboard/attendance/daily"
              className="flex items-center gap-3 rounded-xl border border-gray-100 px-4 py-3 hover:bg-gray-50/60 transition cursor-pointer"
            >
              <span className="flex items-center justify-center w-10 h-10 rounded-xl bg-violet-100 text-violet-600 shrink-0">
                <HiOutlineAcademicCap className="w-5 h-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-gray-900">
                  {row.class}
                  {row.section && <span className="text-gray-400 font-normal"> - Section {row.section}</span>}
                </p>
                <p className="flex items-center gap-1.5 text-xs text-gray-500 mt-1">
                  <FiUsers className="w-3.5 h-3.5" />
                  {row.studentCount} Students
                </p>
              </div>

              <span
                className={`flex items-center gap-1.5 text-xs font-semibold rounded-full px-3 py-1 shrink-0 ${
                  row.attendanceMarked ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'
                }`}
              >
                {row.attendanceMarked ? <FiCheckCircle className="w-3.5 h-3.5" /> : <FiClock className="w-3.5 h-3.5" />}
                {row.attendanceMarked ? 'Marked Today' : 'Pending Today'}
              </span>
              <FiChevronRight className="w-4 h-4 text-gray-300 shrink-0 hidden sm:block" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
