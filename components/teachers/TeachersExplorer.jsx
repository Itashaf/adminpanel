'use client';

import { useMemo, useState } from 'react';
import TeachersToolbar from './TeachersToolbar';
import TeacherBulkActionsBar from './TeacherBulkActionsBar';
import TeachersTable from './TeachersTable';
import Pagination from '@/components/Pagination';

const EMPTY_FILTERS = { search: '', status: '', class: '' };
const PAGE_SIZE = 5;

export default function TeachersExplorer({ teachers, classOptions }) {
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState([]);

  const handleFilterChange = (nextFilters) => {
    setFilters(nextFilters);
    setPage(1);
  };

  const handleReset = () => {
    setFilters(EMPTY_FILTERS);
    setPage(1);
  };

  const filteredTeachers = useMemo(() => {
    return teachers.filter((teacher) => {
      const query = filters.search.trim().toLowerCase();
      const matchesSearch =
        !query ||
        `${teacher.firstName} ${teacher.lastName}`.toLowerCase().includes(query) ||
        teacher.employeeId.toLowerCase().includes(query) ||
        teacher.phone.toLowerCase().includes(query) ||
        teacher.email.toLowerCase().includes(query);

      const matchesStatus = !filters.status || teacher.status === filters.status;
      const matchesClass = !filters.class || teacher.assignments.some((a) => a.class === filters.class);

      return matchesSearch && matchesStatus && matchesClass;
    });
  }, [teachers, filters]);

  const totalPages = Math.max(1, Math.ceil(filteredTeachers.length / PAGE_SIZE));
  const pagedTeachers = filteredTeachers.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const toggleSelect = (id) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));
  };

  const toggleSelectAll = () => {
    const pageIds = pagedTeachers.map((teacher) => teacher.id);
    const allSelected = pageIds.every((id) => selectedIds.includes(id));
    setSelectedIds((prev) =>
      allSelected ? prev.filter((id) => !pageIds.includes(id)) : [...new Set([...prev, ...pageIds])]
    );
  };

  return (
    <div className="space-y-4">
      <TeachersToolbar
        filters={filters}
        onFilterChange={handleFilterChange}
        onReset={handleReset}
        classOptions={classOptions}
      />

      <TeacherBulkActionsBar
        selectedCount={selectedIds.length}
        onExport={() => {}}
        onChangeStatus={() => {}}
        onDeactivate={() => {}}
      />

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {pagedTeachers.length > 0 ? (
          <TeachersTable
            teachers={pagedTeachers}
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
            <Pagination
              page={page}
              totalPages={totalPages}
              onPageChange={setPage}
              totalCount={filteredTeachers.length}
              pageSize={PAGE_SIZE}
            />
          </div>
        )}
      </div>
    </div>
  );
}
