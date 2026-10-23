'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { FiPlus, FiUserCheck } from 'react-icons/fi';
import Toast from '@/components/Toast';
import Dropdown from '@/components/Dropdown';
import FixedPaginationBar from '@/components/FixedPaginationBar';
import HomeworkFiltersBar from './HomeworkFiltersBar';
import HomeworkCard, { HOMEWORK_GRID_COLS } from './HomeworkCard';
import HomeworkFormModal from './HomeworkFormModal';
import HomeworkEmptyState from './HomeworkEmptyState';
import { useClassSections } from '@/lib/hooks/useClassSections';
import { useUrlSync } from '@/lib/hooks/useUrlSync';
import { usePagedResult } from '@/lib/hooks/usePagedResult';
import { getHomeworkPage } from '@/lib/api';

const SORT_OPTIONS = [
  { value: 'latest', label: 'Latest First' },
  { value: 'oldest', label: 'Oldest First' },
];

export default function HomeworkExplorer({ initialResult, initialParams, pageSize, sessionOptions, defaultSession, currentUser }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [showAddModal, setShowAddModal] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [selectedClass, setSelectedClass] = useState(() => searchParams.get('class') || '');
  const [selectedSection, setSelectedSection] = useState(() => searchParams.get('section') || '');
  const [selectedSubject, setSelectedSubject] = useState(() => searchParams.get('subject') || '');
  const [search, setSearch] = useState(() => searchParams.get('q') || '');
  const [sortBy, setSortBy] = useState(() => searchParams.get('sort') || 'latest');
  const [page, setPage] = useState(() => Number(searchParams.get('page')) || 1);
  const isTeacher = currentUser.role === 'Teacher';
  const classSections = useClassSections();

  useUrlSync(
    { class: selectedClass, section: selectedSection, subject: selectedSubject, q: search, sort: sortBy, page },
    { class: '', section: '', subject: '', q: '', sort: 'latest', page: 1 }
  );

  // Typing only triggers a request once the user pauses.
  const [debouncedSearch, setDebouncedSearch] = useState(search);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  // One server page at a time — filtering, sorting and paging all happen in
  // the database (see lib/homework.js's getHomeworkPageForUser). The first
  // page comes pre-fetched from app/dashboard/homework/page.jsx; a save/delete
  // calls router.refresh(), which brings a fresh initialResult for the same
  // filters (see usePagedResult).
  const requestKey = JSON.stringify({
    class: selectedClass,
    section: selectedSection,
    subject: selectedSubject,
    q: debouncedSearch,
    sort: sortBy,
    page,
  });
  const { result, isLoading, error } = usePagedResult({
    initialResult,
    initialKey: JSON.stringify({
      class: initialParams.class,
      section: initialParams.section,
      subject: initialParams.subject,
      q: initialParams.q,
      sort: initialParams.sort,
      page: initialParams.page,
    }),
    key: requestKey,
    page,
    pageSize,
    setPage,
    fetchPage: () =>
      getHomeworkPage({
        className: selectedClass,
        section: selectedSection,
        subject: selectedSubject,
        search: debouncedSearch,
        sort: sortBy,
        page,
        pageSize,
      }),
  });
  const pagedHomework = result.rows;
  const totalCount = result.total;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  const classOptions = useMemo(() => {
    if (isTeacher) {
      return [...new Set((currentUser.assignedClasses || []).map((a) => a.class))].map((c) => ({ value: c, label: c }));
    }
    return Object.keys(classSections).map((c) => ({ value: c, label: c }));
  }, [isTeacher, currentUser.assignedClasses, classSections]);

  const updateFilter = (setter) => (value) => {
    setter(value);
    setPage(1);
  };

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Homework</h1>
          <p className="text-sm text-gray-500 mt-1">
            {isTeacher ? 'Assign and track homework for your classes.' : 'Assign and manage homework across the school.'}
          </p>
          {isTeacher && (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-indigo-700 bg-indigo-50 rounded-full px-3 py-1 mt-2">
              <FiUserCheck className="w-3.5 h-3.5" />
              Showing your assigned classes
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-medium text-white bg-gradient-to-r from-violet-700 via-indigo-600 to-blue-600 hover:opacity-90 transition cursor-pointer shrink-0"
        >
          <FiPlus className="w-4 h-4" />
          Assign Homework
        </button>
      </div>

      <HomeworkFiltersBar
        classOptions={classOptions}
        selectedClass={selectedClass}
        onClassChange={updateFilter(setSelectedClass)}
        selectedSection={selectedSection}
        onSectionChange={updateFilter(setSelectedSection)}
        selectedSubject={selectedSubject}
        onSubjectChange={updateFilter(setSelectedSubject)}
        search={search}
        onSearchChange={updateFilter(setSearch)}
      />

      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-gray-500">
          {totalCount} Homework item{totalCount === 1 ? '' : 's'}
        </p>
        <div className="w-44 shrink-0">
          <Dropdown options={SORT_OPTIONS} value={sortBy} onChange={setSortBy} />
        </div>
      </div>

      {error && <p className="text-sm text-red-500 bg-red-50 border border-red-100 rounded-lg px-4 py-3">{error}</p>}

      {totalCount === 0 ? (
        <HomeworkEmptyState onAssignHomework={() => setShowAddModal(true)} />
      ) : (
        <div className={`bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden ${isLoading ? 'opacity-60' : ''}`}>
          <div
            style={{ gridTemplateColumns: HOMEWORK_GRID_COLS }}
            className="hidden md:grid gap-4 px-4 sm:px-5 py-3 border-b border-gray-100 text-xs font-semibold text-gray-400 uppercase tracking-wide"
          >
            <span>S.No.</span>
            <span />
            <span>Homework</span>
            <span>Subject</span>
            <span>Class &amp; Section</span>
            <span>Date</span>
            <span>Time</span>
            <span />
          </div>
          <div className="divide-y divide-gray-50">
            {pagedHomework.map((hw, index) => (
              <HomeworkCard
                key={hw.id}
                homework={hw}
                serialNumber={(page - 1) * pageSize + index + 1}
                canManage={currentUser.role !== 'Teacher' || hw.assignedByTeacherId === currentUser.teacherId}
                sessionOptions={sessionOptions}
                defaultSession={defaultSession}
                currentUser={currentUser}
              />
            ))}
          </div>
        </div>
      )}

      <FixedPaginationBar
        page={page}
        totalPages={totalPages}
        onPageChange={setPage}
        totalCount={totalCount}
        pageSize={pageSize}
        itemLabel="homework items"
      />

      <HomeworkFormModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        homework={null}
        sessionOptions={sessionOptions}
        defaultSession={defaultSession}
        currentUser={currentUser}
        onSuccess={(message) => {
          setShowAddModal(false);
          setToastMessage(message);
          router.refresh();
        }}
      />

      {toastMessage && <Toast message={toastMessage} onClose={() => setToastMessage('')} />}
    </div>
  );
}
