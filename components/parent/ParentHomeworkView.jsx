'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { FiBook, FiUser, FiCalendar, FiChevronDown, FiSearch } from 'react-icons/fi';
import Badge from '@/components/Badge';
import Dropdown from '@/components/Dropdown';
import FixedPaginationBar from '@/components/FixedPaginationBar';
import { useUrlSync } from '@/lib/hooks/useUrlSync';
import { getParentHomeworkPage } from '@/lib/api';

function formatDate(dateString) {
  return new Date(`${dateString}T00:00:00`).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
}

function HomeworkRow({ homework }) {
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
        <span className="mt-2 w-2.5 h-2.5 rounded-full shrink-0 bg-indigo-600" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-semibold text-gray-900 truncate">{homework.title}</p>
            <Badge label={homework.subject} variant="violet" />
          </div>
          {!isExpanded && homework.description && (
            <p className="text-sm text-gray-500 truncate mt-0.5">{homework.description}</p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0 pl-2">
          <span className="hidden sm:block text-sm text-gray-400 whitespace-nowrap">{formatDate(homework.assignedDate)}</span>
          <FiChevronDown className={`w-4 h-4 text-gray-300 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
        </div>
      </div>

      {isExpanded && (
        <div className="px-5 pb-4 pl-[2.75rem]">
          {homework.description && <p className="text-sm text-gray-600 whitespace-pre-wrap">{homework.description}</p>}
          <div className="flex items-center flex-wrap gap-x-4 gap-y-1 text-xs text-gray-400 mt-3">
            <span className="flex items-center gap-1.5">
              <FiUser className="w-3.5 h-3.5" />
              {homework.assignedByName}
            </span>
            <span className="flex items-center gap-1.5">
              <FiCalendar className="w-3.5 h-3.5" />
              Assigned {formatDate(homework.assignedDate)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ParentHomeworkView({ initialResult, pageSize, student }) {
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(() => searchParams.get('search') || '');
  const [debouncedSearch, setDebouncedSearch] = useState(search);
  const [subject, setSubject] = useState(() => searchParams.get('subject') || '');
  const [page, setPage] = useState(() => Number(searchParams.get('page')) || 1);
  const [error, setError] = useState('');

  useUrlSync({ search, subject, page }, { search: '', subject: '', page: 1 });

  // Typing only triggers a request once the user pauses.
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Only one page is ever held here — the server returns the rows for the
  // current search/subject/page. The first page arrives pre-fetched from
  // app/parent/homework/page.jsx, so `loaded.key` starts equal to the current
  // key and nothing is fetched on mount. `isLoading` is derived (key
  // mismatch) rather than set synchronously inside the effect.
  const key = JSON.stringify({ search: debouncedSearch, subject, page });
  const [loaded, setLoaded] = useState(() => ({ key, result: initialResult }));
  const isLoading = loaded.key !== key;

  useEffect(() => {
    if (loaded.key === key) return;
    let cancelled = false;
    getParentHomeworkPage({ page, pageSize, search: debouncedSearch, subject })
      .then((result) => {
        if (cancelled) return;
        // A stale ?page= past the last page — jump back to the real last page.
        if (result.rows.length === 0 && result.total > 0 && page > 1) {
          setPage(Math.max(Math.ceil(result.total / pageSize), 1));
          return;
        }
        setError('');
        setLoaded({ key, result });
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const { rows, total, subjects } = loaded.result;
  const totalPages = Math.max(Math.ceil(total / pageSize), 1);

  const subjectOptions = useMemo(
    () => [{ value: '', label: 'All Subjects' }, ...subjects.map((s) => ({ value: s, label: s }))],
    [subjects]
  );

  const hasFilters = Boolean(debouncedSearch.trim() || subject);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Homework</h1>
        <p className="text-base text-gray-500 mt-1.5">
          {student.firstName} {student.lastName} · {student.class}
          {student.section ? ` - ${student.section}` : ''}
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search homework..."
            className="w-full h-[42px] pl-10 pr-4 bg-white border border-gray-200 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <div className="w-full sm:w-52 [&>button]:h-[42px]">
          <Dropdown
            options={subjectOptions}
            value={subject}
            onChange={(value) => {
              setSubject(value);
              setPage(1);
            }}
          />
        </div>
      </div>

      {error && <p className="text-sm text-red-500 bg-red-50 border border-red-100 rounded-lg px-4 py-3">{error}</p>}

      <div className={`bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden ${isLoading ? 'opacity-60' : ''}`}>
        {rows.length === 0 ? (
          <div className="text-center py-16 px-6">
            <span className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gray-50 text-gray-300 mb-3">
              <FiBook className="w-6 h-6" />
            </span>
            <p className="text-sm text-gray-500">{hasFilters ? 'No homework matches your search.' : 'No homework assigned yet.'}</p>
          </div>
        ) : (
          <>
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    <th className="py-4 pl-6 pr-4 w-16">S.No.</th>
                    <th className="py-4 pr-4">Title</th>
                    <th className="py-4 pr-4">Description</th>
                    <th className="py-4 pr-4">Subject</th>
                    <th className="py-4 pr-4">Date</th>
                    <th className="py-4 pr-6">Assigned By</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {rows.map((hw, index) => (
                    <tr key={hw.id} className="align-top hover:bg-gray-50/60 transition">
                      <td className="py-4 pl-6 pr-4 text-gray-500">{(page - 1) * pageSize + index + 1}</td>
                      <td className="py-4 pr-4 font-medium text-gray-900">{hw.title}</td>
                      <td className="py-4 pr-4 text-gray-700 whitespace-pre-wrap min-w-[240px]">{hw.description || '—'}</td>
                      <td className="py-4 pr-4">
                        <Badge label={hw.subject} variant="violet" />
                      </td>
                      <td className="py-4 pr-4 text-gray-700 whitespace-nowrap">{formatDate(hw.assignedDate)}</td>
                      <td className="py-4 pr-6 text-gray-700 whitespace-nowrap">{hw.assignedByName}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="md:hidden">
              {rows.map((hw) => (
                <HomeworkRow key={hw.id} homework={hw} />
              ))}
            </div>
          </>
        )}
      </div>

      {rows.length > 0 && <div className="shrink-0 h-[40px]" />}

      <FixedPaginationBar
        page={page}
        totalPages={totalPages}
        onPageChange={setPage}
        totalCount={total}
        pageSize={pageSize}
        itemLabel="homework"
      />
    </div>
  );
}
