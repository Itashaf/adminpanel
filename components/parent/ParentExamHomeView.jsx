'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { FiCalendar, FiFileText, FiChevronRight, FiAward, FiClock } from 'react-icons/fi';
import Badge from '@/components/Badge';
import ParentKPICard from '@/components/parent/ParentKPICard';
import FixedPaginationBar from '@/components/FixedPaginationBar';
import { useUrlSync } from '@/lib/hooks/useUrlSync';
import { getParentExamsPage } from '@/lib/api';

const STATUS_VARIANTS = { Published: 'blue', Completed: 'green' };

function formatDate(iso) {
  return new Date(`${iso}T00:00:00`).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
}

// Long exam names don't fit ParentKPICard's default 4xl number size, so the
// value is passed in at a smaller size.
function KPIValue({ children }) {
  return <span className="block text-2xl truncate">{children}</span>;
}

export default function ParentExamHomeView({ initialResult, pageSize, summary, latestResult, student }) {
  const searchParams = useSearchParams();
  const [page, setPage] = useState(() => Number(searchParams.get('page')) || 1);
  const [error, setError] = useState('');

  useUrlSync({ page }, { page: 1 });

  // Only one page of exams is ever held here — the server returns the rows for
  // the current page. The first page arrives pre-fetched from
  // app/parent/exams/(list)/page.jsx, so `loaded.page` starts equal to `page`
  // and nothing is fetched on mount. `isLoading` is derived (page mismatch)
  // rather than set synchronously inside the effect.
  const [loaded, setLoaded] = useState(() => ({ page, result: initialResult }));
  const isLoading = loaded.page !== page;

  useEffect(() => {
    if (loaded.page === page) return;
    let cancelled = false;
    getParentExamsPage({ page, pageSize })
      .then((result) => {
        if (cancelled) return;
        // A stale ?page= past the last page — jump back to the real last page.
        if (result.rows.length === 0 && result.total > 0 && page > 1) {
          setPage(Math.max(Math.ceil(result.total / pageSize), 1));
          return;
        }
        setError('');
        setLoaded({ page, result });
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const exams = loaded.result.rows;
  const total = loaded.result.total;
  const totalPages = Math.max(Math.ceil(total / pageSize), 1);
  const { total: examTotal, upcomingCount, nextExam } = summary;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Exams &amp; Results</h1>
        <p className="text-base text-gray-500 mt-1.5">
          {student.firstName} {student.lastName} · {student.class}
          {student.section ? ` - ${student.section}` : ''}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <ParentKPICard
          label="Total Exams"
          icon={<FiFileText className="w-5 h-5" />}
          value={<KPIValue>{examTotal}</KPIValue>}
          context={examTotal > 0 ? `${upcomingCount} upcoming · ${examTotal - upcomingCount} completed` : 'No exams announced yet.'}
          dotClassName="bg-amber-400"
        />
        <Link href={nextExam ? `/parent/exams/${nextExam.id}` : '/parent/exams'} className="block">
          <ParentKPICard
            label="Next Exam"
            icon={<FiClock className="w-5 h-5" />}
            value={<KPIValue>{nextExam ? nextExam.name : '—'}</KPIValue>}
            context={nextExam ? `${formatDate(nextExam.startDate)} – ${formatDate(nextExam.endDate)}` : 'No upcoming exam scheduled.'}
            dotClassName="bg-sky-400"
          />
        </Link>
        <Link href={latestResult ? `/parent/exams/${latestResult.examId}` : '/parent/exams'} className="block">
          <ParentKPICard
            label="Latest Result"
            icon={<FiAward className="w-5 h-5" />}
            value={<KPIValue>{latestResult ? latestResult.examName : '—'}</KPIValue>}
            context={
              latestResult
                ? `${latestResult.percentage.toFixed(1)}% • Grade ${latestResult.grade} • ${latestResult.isPass ? 'Pass' : 'Fail'}`
                : 'No results published yet.'
            }
            dotClassName={latestResult && !latestResult.isPass ? 'bg-red-400' : 'bg-green-400'}
          />
        </Link>
      </div>

      {error && <p className="text-sm text-red-500 bg-red-50 border border-red-100 rounded-lg px-4 py-3">{error}</p>}

      <div className={`bg-white rounded-[24px] border border-gray-100 shadow-sm overflow-hidden transition-shadow duration-200 hover:shadow-md ${isLoading ? 'opacity-60' : ''}`}>
        <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100">
          <span className="flex items-center justify-center w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 shrink-0">
            <FiFileText className="w-[18px] h-[18px]" />
          </span>
          <p className="text-base font-bold text-gray-900">All Exams</p>
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
                className="flex items-center gap-3 px-5 py-4 hover:bg-gray-50/60 transition"
              >
                <span className="flex items-center justify-center w-11 h-11 rounded-xl bg-indigo-50 text-indigo-600 shrink-0">
                  <FiCalendar className="w-[18px] h-[18px]" />
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{exam.name}</p>
                  <p className="text-sm text-gray-500 truncate">
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

      {exams.length > 0 && <div className="shrink-0 h-[40px]" />}

      <FixedPaginationBar
        page={page}
        totalPages={totalPages}
        onPageChange={setPage}
        totalCount={total}
        pageSize={pageSize}
        itemLabel="exams"
      />
    </div>
  );
}
