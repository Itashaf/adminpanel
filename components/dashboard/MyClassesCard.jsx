import Link from 'next/link';
import { FiUsers, FiCheckCircle, FiClock } from 'react-icons/fi';

export default function MyClassesCard({ classRows }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-bold text-gray-900">My Classes</h2>
        <Link href="/dashboard/attendance/daily" className="text-xs font-medium text-indigo-700 hover:underline cursor-pointer">
          Mark Attendance
        </Link>
      </div>

      {classRows.length === 0 ? (
        <p className="text-sm text-gray-500 py-6 text-center">You have no assigned classes yet.</p>
      ) : (
        <div className="space-y-2">
          {classRows.map((row) => (
            <div
              key={`${row.class}-${row.section}`}
              className="flex items-center justify-between gap-3 rounded-xl border border-gray-100 px-4 py-3"
            >
              <div className="min-w-0">
                <p className="text-sm font-semibold text-gray-900">
                  {row.class}
                  {row.section && <span className="text-gray-400 font-normal"> • Section {row.section}</span>}
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
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
