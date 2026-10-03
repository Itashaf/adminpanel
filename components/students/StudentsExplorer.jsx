'use client';

import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { FiUploadCloud, FiPlus, FiLoader } from 'react-icons/fi';
import StudentsHeader from './StudentsHeader';
import StudentsStats from './StudentsStats';
import StudentsToolbar from './StudentsToolbar';
import BulkActionsBar from './BulkActionsBar';
import StudentsTable from './StudentsTable';
import BulkImportModal from './BulkImportModal';
import FixedPaginationBar from '@/components/FixedPaginationBar';
import { useClassSections, getSectionOptions } from '@/lib/hooks/useClassSections';
import { useUrlSync } from '@/lib/hooks/useUrlSync';
import { getStudentsPage as fetchStudentsPage } from '@/lib/api';

const EMPTY_FILTERS = { search: '', class: '', section: '', status: '' };

// Real query-level pagination (see lib/students.js's getStudentsPage /
// app/api/students/paged/route.js) — only the current page's rows and a
// total count ever reach the browser, unlike the old version which fetched
// the school's entire roster up front and sliced/filtered it client-side
// (fine at a few hundred students, a real problem well before a few
// thousand). Every filter/page change now re-fetches from the server
// instead of re-slicing an in-memory array.
export default function StudentsExplorer({
  initialStudents,
  initialTotal,
  stats,
  classOptions,
  initialFilters,
  canManage = true,
  canCreate = canManage,
  canEdit = canManage,
  pageSize = 10,
}) {
  const searchParams = useSearchParams();
  const [studentsList, setStudentsList] = useState(initialStudents);
  const [total, setTotal] = useState(initialTotal);
  const [filters, setFilters] = useState(() => ({
    ...EMPTY_FILTERS,
    ...initialFilters,
    search: searchParams.get('search') || initialFilters?.search || '',
    status: searchParams.get('status') || initialFilters?.status || '',
  }));
  const [page, setPage] = useState(() => Number(searchParams.get('page')) || 1);

  useUrlSync({ ...filters, page }, { ...EMPTY_FILTERS, page: 1 });
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [showBulkImport, setShowBulkImport] = useState(false);
  const classSections = useClassSections();

  // Keeps this component's local copy in sync whenever the server component
  // re-fetches (e.g. a router.refresh() elsewhere after adding/editing a
  // student) — without this, `initialStudents`/`initialTotal` changing on
  // the parent would never actually reach this component's own state, since
  // useState only reads its initializer once. Adjusted during render (React's
  // documented pattern for this — https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes)
  // rather than in a useEffect, which would cause an extra render pass.
  const [prevInitialStudents, setPrevInitialStudents] = useState(initialStudents);
  if (initialStudents !== prevInitialStudents) {
    setPrevInitialStudents(initialStudents);
    setStudentsList(initialStudents);
    setTotal(initialTotal);
  }

  // React 18 Strict Mode double-invokes this effect once in dev (mount →
  // cleanup → mount again), reusing the SAME ref instance — a plain "skip
  // the first run" boolean flag gets flipped by the first invocation and
  // no longer skips the second, firing a spurious re-fetch of the exact
  // same first page a moment after load (the table briefly dims under the
  // loading overlay even though nothing actually changed). Comparing
  // against an immutable baseline captured once at mount, instead of a
  // flag that mutates, stays correct under the double-invoke: both
  // invocations re-evaluate the same (page, filters) vs baseline
  // comparison and both skip, while a real user-driven change (which does
  // change page/filters) still fetches exactly as before.
  const baselineRef = useRef({ page, filters });
  useEffect(() => {
    const isUnchanged =
      page === baselineRef.current.page && JSON.stringify(filters) === JSON.stringify(baselineRef.current.filters);
    if (isUnchanged) return;
    let cancelled = false;
    // Debounced so typing in the search box doesn't fire one request per
    // keystroke — page/filter-dropdown changes still feel instant since
    // this effect re-runs immediately for those (only `search` benefits
    // from waiting, but there's no cheap way to debounce just one field of
    // the same effect without a second effect, so the whole thing waits).
    const timer = setTimeout(async () => {
      setIsLoading(true);
      try {
        const result = await fetchStudentsPage({ page, pageSize, ...filters });
        if (!cancelled) {
          setStudentsList(result.students);
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

  const refetchCurrentPage = async () => {
    setIsLoading(true);
    try {
      const result = await fetchStudentsPage({ page, pageSize, ...filters });
      setStudentsList(result.students);
      setTotal(result.total);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStudentDeleted = (id) => {
    setStudentsList((prev) => prev.filter((student) => student.id !== id));
    setSelectedIds((prev) => prev.filter((selectedId) => selectedId !== id));
    setTotal((prev) => Math.max(0, prev - 1));
  };

  const handleImported = () => {
    // Newly imported students land wherever they sort to on the server —
    // jump back to an unfiltered page 1 and refetch so the import's actual
    // result is immediately visible, same reasoning as before this was
    // server-paginated (an admin sitting on a later page or an excluding
    // filter would otherwise see no change at all).
    setFilters(EMPTY_FILTERS);
    setPage(1);
    refetchCurrentPage();
  };

  const handleFilterChange = (nextFilters) => {
    const classChanged = nextFilters.class !== filters.class;
    setFilters(classChanged ? { ...nextFilters, section: '' } : nextFilters);
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
    const pageIds = studentsList.map((student) => student.id);
    const allSelected = pageIds.every((id) => selectedIds.includes(id));
    setSelectedIds((prev) =>
      allSelected ? prev.filter((id) => !pageIds.includes(id)) : [...new Set([...prev, ...pageIds])]
    );
  };

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <StudentsHeader canManage={canManage} />

        {canCreate && (
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setShowBulkImport(true)}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-medium text-white bg-green-600 hover:bg-green-700 transition cursor-pointer"
            >
              <FiUploadCloud className="w-4 h-4" />
              Bulk Import
            </button>
            <Link
              href="/dashboard/students/add"
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-medium text-white bg-gradient-to-r from-violet-700 via-indigo-600 to-blue-600 hover:opacity-90 transition cursor-pointer"
            >
              <FiPlus className="w-4 h-4" />
              Add Student
            </Link>
          </div>
        )}
      </div>

      <StudentsStats stats={stats} />

      <div className="space-y-4">
        <StudentsToolbar
          filters={filters}
          onFilterChange={handleFilterChange}
          onReset={handleReset}
          classOptions={classOptions}
          sectionOptions={getSectionOptions(classSections, filters.class)}
        />

        {canManage && (
          <BulkActionsBar
            selectedCount={selectedIds.length}
            onExport={() => {}}
            onChangeStatus={() => {}}
            onDeactivate={() => {}}
          />
        )}

        <div className="relative bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {isLoading && (
            <div className="absolute inset-0 bg-white/60 flex items-center justify-center z-10">
              <FiLoader className="w-5 h-5 text-indigo-600 animate-spin" />
            </div>
          )}

          {studentsList.length > 0 ? (
            <StudentsTable
              students={studentsList}
              selectedIds={selectedIds}
              onToggleSelect={toggleSelect}
              onToggleSelectAll={toggleSelectAll}
              onStudentDeleted={handleStudentDeleted}
              canManage={canManage}
              canEdit={canEdit}
            />
          ) : (
            <p className="text-sm text-gray-500 text-center py-10">No students match your filters.</p>
          )}
        </div>
      </div>

      <FixedPaginationBar page={page} totalPages={totalPages} onPageChange={setPage} totalCount={total} pageSize={pageSize} itemLabel="students" />

      {canManage && (
        <BulkImportModal isOpen={showBulkImport} onClose={() => setShowBulkImport(false)} onImported={handleImported} />
      )}
    </div>
  );
}
