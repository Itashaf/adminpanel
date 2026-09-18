'use client';

import { useEffect, useRef, useState } from 'react';
import { FiLoader } from 'react-icons/fi';
import TeachersToolbar from './TeachersToolbar';
import TeacherBulkActionsBar from './TeacherBulkActionsBar';
import TeachersTable from './TeachersTable';
import Pagination from '@/components/Pagination';
import { getTeachersPage as fetchTeachersPage } from '@/lib/api';

const EMPTY_FILTERS = { search: '', status: '', class: '' };

// Real query-level pagination (see lib/teachers.js's getTeachersPage /
// app/api/teachers/paged/route.js) — same reasoning as
// StudentsExplorer.jsx: only the current page's rows and a total count
// reach the browser, and every filter/page change re-fetches instead of
// re-slicing a full in-memory roster.
export default function TeachersExplorer({ initialTeachers, initialTotal, classOptions, pageSize = 10 }) {
  const [teachersList, setTeachersList] = useState(initialTeachers);
  const [total, setTotal] = useState(initialTotal);
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);

  // Keeps this component's local copy in sync whenever the server component
  // re-fetches (e.g. a router.refresh() elsewhere after adding/editing a
  // teacher) — adjusted during render (React's documented pattern —
  // https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes),
  // not a useEffect, which would cause an extra render pass.
  const [prevInitialTeachers, setPrevInitialTeachers] = useState(initialTeachers);
  if (initialTeachers !== prevInitialTeachers) {
    setPrevInitialTeachers(initialTeachers);
    setTeachersList(initialTeachers);
    setTotal(initialTotal);
  }

  const isFirstRun = useRef(true);
  useEffect(() => {
    if (isFirstRun.current) {
      isFirstRun.current = false;
      return;
    }
    let cancelled = false;
    const timer = setTimeout(async () => {
      setIsLoading(true);
      try {
        const result = await fetchTeachersPage({ page, pageSize, ...filters });
        if (!cancelled) {
          setTeachersList(result.teachers);
          setTotal(result.total);
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [page, filters, pageSize]);

  const handleFilterChange = (nextFilters) => {
    setFilters(nextFilters);
    setPage(1);
  };

  const handleReset = () => {
    setFilters(EMPTY_FILTERS);
    setPage(1);
  };

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const toggleSelect = (id) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));
  };

  const toggleSelectAll = () => {
    const pageIds = teachersList.map((teacher) => teacher.id);
    const allSelected = pageIds.every((id) => selectedIds.includes(id));
    setSelectedIds((prev) =>
      allSelected ? prev.filter((id) => !pageIds.includes(id)) : [...new Set([...prev, ...pageIds])]
    );
  };

  return (
    <div className="space-y-4">
      <TeachersToolbar filters={filters} onFilterChange={handleFilterChange} onReset={handleReset} classOptions={classOptions} />

      <TeacherBulkActionsBar
        selectedCount={selectedIds.length}
        onExport={() => {}}
        onChangeStatus={() => {}}
        onDeactivate={() => {}}
      />

      <div className="relative bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {isLoading && (
          <div className="absolute inset-0 bg-white/60 flex items-center justify-center z-10">
            <FiLoader className="w-5 h-5 text-indigo-600 animate-spin" />
          </div>
        )}

        {teachersList.length > 0 ? (
          <TeachersTable
            teachers={teachersList}
            classOptions={classOptions}
            selectedIds={selectedIds}
            onToggleSelect={toggleSelect}
            onToggleSelectAll={toggleSelectAll}
          />
        ) : (
          <p className="text-sm text-gray-500 text-center py-10">No teachers match your filters.</p>
        )}

        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-100">
            <Pagination page={page} totalPages={totalPages} onPageChange={setPage} totalCount={total} pageSize={pageSize} />
          </div>
        )}
      </div>
    </div>
  );
}
