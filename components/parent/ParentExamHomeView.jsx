import Link from 'next/link';
import { FiCalendar, FiFileText, FiChevronRight, FiAward, FiClock } from 'react-icons/fi';
import Badge from '@/components/Badge';

const STATUS_VARIANTS = { Published: 'blue', Completed: 'green' };

function formatDate(iso) {
  return new Date(`${iso}T00:00:00`).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function ParentExamHomeView({ exams, nextExam, latestResult, student }) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Exams</h1>
        <p className="text-sm text-gray-500 mt-1">
          For {student.firstName} — {student.class}
          {student.section ? ` - ${student.section}` : ''}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="rounded-2xl p-5 bg-blue-50">
          <span className="flex items-center justify-center w-10 h-10 rounded-xl bg-white/70 text-blue-600 mb-3">
            <FiClock className="w-4 h-4" />
          </span>
          <p className="text-sm text-gray-600">Next Exam</p>
          {nextExam ? (
            <>
              <p className="text-lg font-bold text-blue-700 mt-1 truncate">{nextExam.name}</p>
              <p className="text-xs text-gray-500 mt-1">
                {formatDate(nextExam.startDate)} – {formatDate(nextExam.endDate)}
              </p>
              <Link href={`/parent/exams/${nextExam.id}`} className="inline-flex items-center gap-1 text-xs font-medium text-blue-700 hover:text-blue-800 mt-2">
                View Schedule
                <FiChevronRight className="w-3.5 h-3.5" />
              </Link>
            </>
          ) : (
            <p className="text-sm text-gray-500 mt-2">No upcoming exam scheduled.</p>
          )}
        </div>

        <div className="rounded-2xl p-5 bg-violet-50">
          <span className="flex items-center justify-center w-10 h-10 rounded-xl bg-white/70 text-violet-600 mb-3">
            <FiAward className="w-4 h-4" />
          </span>
          <p className="text-sm text-gray-600">Latest Result</p>
          {latestResult ? (
            <>
              <p className="text-lg font-bold text-violet-700 mt-1 truncate">{latestResult.examName}</p>
              <p className="text-xs text-gray-500 mt-1">
                {latestResult.percentage.toFixed(1)}% • Grade {latestResult.grade} •{' '}
                <span className={latestResult.isPass ? 'text-green-600' : 'text-red-600'}>{latestResult.isPass ? 'Pass' : 'Fail'}</span>
              </p>
              <Link href={`/parent/exams/${latestResult.examId}`} className="inline-flex items-center gap-1 text-xs font-medium text-violet-700 hover:text-violet-800 mt-2">
                View Result
                <FiChevronRight className="w-3.5 h-3.5" />
              </Link>
            </>
          ) : (
            <p className="text-sm text-gray-500 mt-2">No results published yet.</p>
          )}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <p className="text-sm font-bold text-gray-900">All Exams</p>
        </div>

        {exams.length === 0 ? (
          <div className="text-center py-16 px-6">
            <span className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gray-50 text-gray-300 mb-3">
              <FiFileText className="w-6 h-6" />
            </span>
            <p className="text-sm text-gray-500">No exams announced yet.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {exams.map((exam) => (
              <Link
                key={exam.id}
                href={`/parent/exams/${exam.id}`}
                className="flex items-center gap-3 px-5 py-3.5 hover:bg-gray-50/60 transition"
              >
                <span className="flex items-center justify-center w-9 h-9 rounded-lg bg-indigo-50 text-indigo-600 shrink-0">
                  <FiCalendar className="w-4 h-4" />
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{exam.name}</p>
                  <p className="text-xs text-gray-400 truncate">
                    {exam.examType} • {formatDate(exam.startDate)} – {formatDate(exam.endDate)}
                  </p>
                </div>
                <Badge label={exam.status} variant={STATUS_VARIANTS[exam.status] || 'gray'} />
                <FiChevronRight className="w-4 h-4 text-gray-300 shrink-0" />
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
