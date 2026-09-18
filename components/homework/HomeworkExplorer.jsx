'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FiPlus, FiUserCheck } from 'react-icons/fi';
import Toast from '@/components/Toast';
import Dropdown from '@/components/Dropdown';
import Pagination from '@/components/Pagination';
import HomeworkFiltersBar from './HomeworkFiltersBar';
import HomeworkCard, { HOMEWORK_GRID_COLS } from './HomeworkCard';
import HomeworkFormModal from './HomeworkFormModal';
import HomeworkEmptyState from './HomeworkEmptyState';
import { useClassSections } from '@/lib/hooks/useClassSections';

const PAGE_SIZE = 10;

const SORT_OPTIONS = [
  { value: 'latest', label: 'Latest First' },
  { value: 'oldest', label: 'Oldest First' },
];

export default function HomeworkExplorer({ homework, sessionOptions, defaultSession, currentUser }) {
  const router = useRouter();
  const [showAddModal, setShowAddModal] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSection, setSelectedSection] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('latest');
  const [page, setPage] = useState(1);
  const isTeacher = currentUser.role === 'Teacher';
  const classSections = useClassSections();

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

  const filteredHomework = useMemo(() => {
    const query = search.trim().toLowerCase();
    const filtered = homework.filter((hw) => {
      const matchesClass = !selectedClass || hw.className === selectedClass;
      const matchesSection = !selectedSection || hw.sectionName === selectedSection;
      const matchesSubject = !selectedSubject || hw.subject === selectedSubject;
      const matchesSearch = !query || hw.title.toLowerCase().includes(query) || hw.description?.toLowerCase().includes(query);
      return matchesClass && matchesSection && matchesSubject && matchesSearch;
    });
    // homework already arrives newest-first from getVisibleHomework, so
    // "oldest first" is just the reverse — no extra date parsing needed.
    return sortBy === 'oldest' ? [...filtered].reverse() : filtered;
  }, [homework, selectedClass, selectedSection, selectedSubject, search, sortBy]);

  const totalPages = Math.max(1, Math.ceil(filteredHomework.length / PAGE_SIZE));
  const pagedHomework = filteredHomework.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="space-y-6">
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
          {filteredHomework.length} Homework item{filteredHomework.length === 1 ? '' : 's'}
        </p>
        <div className="w-44 shrink-0">
          <Dropdown options={SORT_OPTIONS} value={sortBy} onChange={setSortBy} />
        </div>
      </div>

      {filteredHomework.length === 0 ? (
        <HomeworkEmptyState onAssignHomework={() => setShowAddModal(true)} />
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
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
                serialNumber={(page - 1) * PAGE_SIZE + index + 1}
                canManage={currentUser.role !== 'Teacher' || hw.assignedByTeacherId === currentUser.teacherId}
                sessionOptions={sessionOptions}
                defaultSession={defaultSession}
                currentUser={currentUser}
              />
            ))}
          </div>
        </div>
      )}

      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} totalCount={filteredHomework.length} pageSize={PAGE_SIZE} />

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
