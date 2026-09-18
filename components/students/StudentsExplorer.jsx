'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { FiUploadCloud, FiPlus } from 'react-icons/fi';
import StudentsHeader from './StudentsHeader';
import StudentsStats from './StudentsStats';
import StudentsToolbar from './StudentsToolbar';
import BulkActionsBar from './BulkActionsBar';
import StudentsTable from './StudentsTable';
import BulkImportModal from './BulkImportModal';
import Pagination from '@/components/Pagination';
import { useClassSections, getSectionOptions } from '@/lib/hooks/useClassSections';

const EMPTY_FILTERS = { search: '', class: '', section: '', status: '' };
const PAGE_SIZE = 5;

// Owns the title row (with its Bulk Import / Add Student actions), the stats
// cards, and the table together — not split across sibling server
// components like before — because Bulk Import's success handler needs to
// push newly imported students straight into this component's local list
// (see SKILL.md's optimistic-update rule), and that only works if the
// button that opens it lives wherever that state does.
export default function StudentsExplorer({ students, classOptions, initialFilters, canManage = true }) {
  const [studentsList, setStudentsList] = useState(students);
  const [filters, setFilters] = useState(() => ({ ...EMPTY_FILTERS, ...initialFilters }));
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState([]);
  const [showBulkImport, setShowBulkImport] = useState(false);
  const classSections = useClassSections();

  const handleStudentDeleted = (id) => {
    setStudentsList((prev) => prev.filter((student) => student.id !== id));
    setSelectedIds((prev) => prev.filter((selectedId) => selectedId !== id));
  };

  const handleImported = (importedStudents) => {
    setStudentsList((prev) => [...importedStudents, ...prev]);
    // Newly imported students are prepended, so they land on page 1 — if the
    // admin was sitting on a later page (or a class/section filter that
    // excludes the imported rows), they'd otherwise see no change at all and
    // assume the import silently failed until a hard refresh. Jump back to
    // an unfiltered page 1 so the import's actual result is immediately visible.
    setFilters(EMPTY_FILTERS);
    setPage(1);
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

  // Derived from studentsList (not a server-computed prop) so it stays in
  // sync with optimistic add/delete updates without a router.refresh() —
  // same formula as lib/students.js's getStudentStats().
  const computedStats = useMemo(() => {
    const active = studentsList.filter((s) => s.status === 'Active').length;
    const inactive = studentsList.filter((s) => s.status !== 'Active').length;
    const thisMonth = new Date().toISOString().slice(0, 7);
    const newAdmissions = studentsList.filter((s) => s.admissionDate?.startsWith(thisMonth)).length;
    return { total: studentsList.length, active, newAdmissions, inactive };
  }, [studentsList]);

  const filteredStudents = useMemo(() => {
    return studentsList.filter((student) => {
      const query = filters.search.trim().toLowerCase();
      const matchesSearch =
        !query ||
        `${student.firstName} ${student.lastName}`.toLowerCase().includes(query) ||
        student.admissionId.toLowerCase().includes(query) ||
        student.guardian.phone.toLowerCase().includes(query);

      const matchesClass = !filters.class || student.class === filters.class;
      const matchesSection = !filters.section || student.section === filters.section;
      const matchesStatus = !filters.status || student.status === filters.status;

      return matchesSearch && matchesClass && matchesSection && matchesStatus;
    });
  }, [studentsList, filters]);

  const totalPages = Math.max(1, Math.ceil(filteredStudents.length / PAGE_SIZE));
  const pagedStudents = filteredStudents.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const toggleSelect = (id) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));
  };

  const toggleSelectAll = () => {
    const pageIds = pagedStudents.map((student) => student.id);
    const allSelected = pageIds.every((id) => selectedIds.includes(id));
    setSelectedIds((prev) =>
      allSelected ? prev.filter((id) => !pageIds.includes(id)) : [...new Set([...prev, ...pageIds])]
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <StudentsHeader canManage={canManage} />

        {canManage && (
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

      <StudentsStats stats={computedStats} />

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

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {pagedStudents.length > 0 ? (
            <StudentsTable
              students={pagedStudents}
              selectedIds={selectedIds}
              onToggleSelect={toggleSelect}
              onToggleSelectAll={toggleSelectAll}
              onStudentDeleted={handleStudentDeleted}
              canManage={canManage}
            />
          ) : (
            <p className="text-sm text-gray-500 text-center py-10">No students match your filters.</p>
          )}

          {totalPages > 1 && (
            <div className="px-6 py-4 border-t border-gray-100">
              <Pagination
                page={page}
                totalPages={totalPages}
                onPageChange={setPage}
                totalCount={filteredStudents.length}
                pageSize={PAGE_SIZE}
              />
            </div>
          )}
        </div>
      </div>

      {canManage && (
        <BulkImportModal isOpen={showBulkImport} onClose={() => setShowBulkImport(false)} onImported={handleImported} />
      )}
    </div>
  );
}
