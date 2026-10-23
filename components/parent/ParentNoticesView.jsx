'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { FiBell, FiChevronDown, FiChevronUp, FiPaperclip, FiVolume2 } from 'react-icons/fi';
import Badge from '@/components/Badge';
import FixedPaginationBar from '@/components/FixedPaginationBar';
import { useUrlSync } from '@/lib/hooks/useUrlSync';
import { getParentNoticesPage } from '@/lib/api';

const PRIORITY_DOT = { Normal: 'bg-blue-600', Important: 'bg-amber-500', Urgent: 'bg-red-500' };
const PRIORITY_VARIANTS = { Normal: 'gray', Important: 'amber', Urgent: 'red' };

function formatDate(dateString) {
  return new Date(`${dateString}T00:00:00`).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
}

function audienceLabelFor(notice) {
  if (notice.audience === 'Class') return `${notice.className}${notice.sectionName ? ` • Sec ${notice.sectionName}` : ''}`;
  if (notice.audience === 'Individual') return 'Just for you';
  return notice.audience;
}

function NoticeRow({ notice }) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="border-b border-gray-100 last:border-b-0">
      <div
        role="button"
        tabIndex={0}
        onClick={() => setIsExpanded((prev) => !prev)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setIsExpanded((prev) => !prev);
          }
        }}
        className="w-full flex items-start gap-3 px-5 py-4 text-left cursor-pointer hover:bg-gray-50/60 transition"
      >
        <span className={`mt-2 w-2.5 h-2.5 rounded-full shrink-0 ${PRIORITY_DOT[notice.priority] || PRIORITY_DOT.Normal}`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-semibold text-gray-900 truncate">{notice.title}</p>
            <Badge label={audienceLabelFor(notice)} variant="violet" />
            <Badge label={notice.priority} variant={PRIORITY_VARIANTS[notice.priority]} />
          </div>
          {!isExpanded && <p className="text-sm text-gray-500 truncate mt-0.5">{notice.message}</p>}
        </div>
        <div className="flex items-center gap-2 shrink-0 pl-2">
          <span className="hidden sm:block text-sm text-gray-400 whitespace-nowrap">{formatDate(notice.createdAt)}</span>
          {isExpanded ? <FiChevronUp className="w-4 h-4 text-gray-300" /> : <FiChevronDown className="w-4 h-4 text-gray-300" />}
        </div>
      </div>

      {isExpanded && (
        <div className="px-5 pb-4 pl-[2.75rem]">
          <p className="text-sm text-gray-600 whitespace-pre-wrap">{notice.message}</p>
          {notice.attachmentUrl && (
            <a
              href={notice.attachmentUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm text-indigo-600 hover:text-indigo-700 font-medium mt-2"
            >
              <FiPaperclip className="w-3.5 h-3.5" />
              {notice.attachmentName || 'Attachment.pdf'}
            </a>
          )}
          <p className="text-xs text-gray-400 mt-3">
            Posted by {notice.postedByName} · {formatDate(notice.createdAt)}
          </p>
        </div>
      )}
    </div>
  );
}

export default function ParentNoticesView({ initialResult, pageSize, student }) {
  const searchParams = useSearchParams();
  const [page, setPage] = useState(() => Number(searchParams.get('page')) || 1);
  const [error, setError] = useState('');

  useUrlSync({ page }, { page: 1 });

  // Only one page is ever held here — the server returns the rows for the
  // current page. The first page arrives pre-fetched from
  // app/parent/notices/page.jsx, so `loaded.page` starts equal to `page` and
  // nothing is fetched on mount. `isLoading` is derived (page mismatch)
  // rather than set synchronously inside the effect.
  const [loaded, setLoaded] = useState(() => ({ page, result: initialResult }));
  const isLoading = loaded.page !== page;

  useEffect(() => {
    if (loaded.page === page) return;
    let cancelled = false;
    getParentNoticesPage({ page, pageSize })
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

  const { rows: notices, total } = loaded.result;
  const totalPages = Math.max(Math.ceil(total / pageSize), 1);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Notices</h1>
        <p className="text-base text-gray-500 mt-1.5">
          {student.firstName} {student.lastName} · {student.class}
          {student.section ? ` - ${student.section}` : ''} &amp; whole-school announcements
        </p>
      </div>

      {error && <p className="text-sm text-red-500 bg-red-50 border border-red-100 rounded-lg px-4 py-3">{error}</p>}

      <div className={`bg-white rounded-[24px] border border-gray-100 shadow-sm overflow-hidden transition-shadow duration-200 hover:shadow-md ${isLoading ? 'opacity-60' : ''}`}>
        <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100">
          <span className="flex items-center justify-center w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 shrink-0">
            <FiVolume2 className="w-[18px] h-[18px]" />
          </span>
          <p className="text-base font-bold text-gray-900">All Notices</p>
        </div>

        {notices.length === 0 ? (
          <div className="text-center py-16 px-6">
            <span className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gray-50 text-gray-300 mb-3">
              <FiBell className="w-6 h-6" />
            </span>
            <p className="text-sm text-gray-500">No notices yet.</p>
          </div>
        ) : (
          notices.map((notice) => <NoticeRow key={notice.id} notice={notice} />)
        )}
      </div>

      {notices.length > 0 && <div className="shrink-0 h-[40px]" />}

      <FixedPaginationBar
        page={page}
        totalPages={totalPages}
        onPageChange={setPage}
        totalCount={total}
        pageSize={pageSize}
        itemLabel="notices"
      />
    </div>
  );
}
