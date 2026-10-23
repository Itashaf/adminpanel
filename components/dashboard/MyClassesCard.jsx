import Link from 'next/link';
import { FiUsers, FiCheckCircle, FiClock, FiChevronRight, FiArrowRight } from 'react-icons/fi';
import { HiOutlineAcademicCap } from 'react-icons/hi2';

export default function MyClassesCard({ classRows }) {
  return (
    <div className="bg-white rounded-[24px] border border-gray-100 shadow-sm p-5 pb-[50px] h-full flex flex-col transition-shadow duration-200 hover:shadow-md">
      <div className="flex items-center justify-between gap-3 mb-3">
        <p className="text-base font-bold text-gray-900 truncate">My Classes</p>
        <Link
          href="/dashboard/attendance/daily"
          className="flex items-center gap-1 text-sm font-medium text-indigo-700 hover:text-indigo-800 shrink-0"
        >
          Mark Attendance <FiArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {classRows.length === 0 ? (
        <p className="text-sm text-gray-500 py-8 text-center flex-1 flex items-center justify-center">You have no assigned classes yet.</p>
      ) : (
        <div className="divide-y divide-gray-100">
          {classRows.map((row) => (
            <Link
              key={`${row.class}-${row.section}`}
              href="/dashboard/attendance/daily"
              className="flex items-center gap-3 py-3 hover:bg-gray-50/60 transition cursor-pointer"
            >
              <span className="flex items-center justify-center w-11 h-11 rounded-xl bg-indigo-50 text-indigo-600 shrink-0">
                <HiOutlineAcademicCap className="w-5 h-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-gray-900 truncate">
                  {row.class}
                  {row.section && <span className="text-gray-400 font-normal"> - Section {row.section}</span>}
                </p>
                <p className="flex items-center gap-1.5 text-sm text-gray-500">
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
