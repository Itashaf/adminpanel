'use client';

import { useMemo, useState } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { FiPlus } from 'react-icons/fi';
import Toast from '@/components/Toast';
import Dropdown from '@/components/Dropdown';
import FixedPaginationBar from '@/components/FixedPaginationBar';
import ExamsFiltersBar from './ExamsFiltersBar';
import ExamCard, { EXAM_GRID_COLS } from './ExamCard';
import ExamFormModal from './ExamFormModal';
import ExamsEmptyState from './ExamsEmptyState';
import { useClassSections } from '@/lib/hooks/useClassSections';
import { useUrlSync } from '@/lib/hooks/useUrlSync';

const PAGE_SIZE = 10;

const SORT_OPTIONS = [
  { value: 'latest', label: 'Newest First' },
  { value: 'oldest', label: 'Oldest First' },
];

export default function ExamsExplorer({ exams, sessionOptions, defaultSession, examTypeOptions, role }) {
  const isAdmin = role === 'SchoolAdmin' || role === 'SuperAdmin';
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  // Dashboard's "Create Exam" quick action links here with ?compose=1 so the
  // create-exam modal opens immediately instead of landing on a bare list.
  const [showAddModal, setShowAddModal] = useState(() => searchParams.get('compose') === '1');
  const [toastMessage, setToastMessage] = useState('');
  const [selectedSession, setSelectedSession] = useState(() => searchParams.get('session') || '');
  const [selectedClass, setSelectedClass] = useState(() => searchParams.get('class') || '');
  const [selectedStatus, setSelectedStatus] = useState(() => searchParams.get('status') || '');
  const [selectedType, setSelectedType] = useState(() => searchParams.get('type') || '');
  const [search, setSearch] = useState(() => searchParams.get('q') || '');
  const [sortBy, setSortBy] = useState(() => searchParams.get('sort') || 'latest');
  const [page, setPage] = useState(() => Number(searchParams.get('page')) || 1);
  const classSections = useClassSections();
  const classOptions = Object.keys(classSections).map((c) => ({ value: c, label: c }));

  const updateFilter = (setter) => (value) => {
    setter(value);
    setPage(1);
  };

  useUrlSync(
    { session: selectedSession, class: selectedClass, status: selectedStatus, type: selectedType, q: search, sort: sortBy, page },
    { session: '', class: '', status: '', type: '', q: '', sort: 'latest', page: 1 }
  );

  const filteredExams = useMemo(() => {
    const query = search.trim().toLowerCase();
    const filtered = exams.filter((exam) => {
      const matchesSession = !selectedSession || exam.academicSession === selectedSession;
      const matchesClass = !selectedClass || exam.classes.includes(selectedClass);
      const matchesStatus = !selectedStatus || exam.status === selectedStatus;
      const matchesType = !selectedType || exam.examType === selectedType;
      const matchesSearch = !query || exam.name.toLowerCase().includes(query);
      return matchesSession && matchesClass && matchesStatus && matchesType && matchesSearch;
    });
    // exams already arrive newest-first (see lib/exams.js's getAllExams
    // ordering by startDate desc), so "oldest first" is just the reverse.
    return sortBy === 'oldest' ? [...filtered].reverse() : filtered;
  }, [exams, selectedSession, selectedClass, selectedStatus, selectedType, search, sortBy]);

  const totalPages = Math.max(1, Math.ceil(filteredExams.length / PAGE_SIZE));
  const pagedExams = filteredExams.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // The list's own current URL (filters/sort/page as they are right now, not
  // the debounced value already written to the address bar) — handed to each
  // row so "Back to Manage Exams" on the exam detail page can return here
  // instead of resetting to an unfiltered page 1.
  const listHref = useMemo(() => {
    const params = new URLSearchParams();
    if (selectedSession) params.set('session', selectedSession);
    if (selectedClass) params.set('class', selectedClass);
    if (selectedStatus) params.set('status', selectedStatus);
    if (selectedType) params.set('type', selectedType);
    if (search) params.set('q', search);
    if (sortBy !== 'latest') params.set('sort', sortBy);
    if (page !== 1) params.set('page', String(page));
    const qs = params.toString();
    return qs ? `${pathname}?${qs}` : pathname;
  }, [pathname, selectedSession, selectedClass, selectedStatus, selectedType, search, sortBy, page]);

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{isAdmin ? 'Manage Exams' : 'My Exams'}</h1>
          <p className="text-sm text-gray-500 mt-1">
            {isAdmin ? 'Create, schedule, and publish exams across the school.' : 'Exams for the classes you teach.'}
          </p>
        </div>

        {isAdmin && (
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-medium text-white bg-gradient-to-r from-violet-700 via-indigo-600 to-blue-600 hover:opacity-90 transition cursor-pointer shrink-0"
          >
            <FiPlus className="w-4 h-4" />
            Create Exam
          </button>
        )}
      </div>

      <ExamsFiltersBar
        sessionOptions={sessionOptions}
        selectedSession={selectedSession}
        onSessionChange={updateFilter(setSelectedSession)}
        classOptions={classOptions}
        selectedClass={selectedClass}
        onClassChange={updateFilter(setSelectedClass)}
        selectedStatus={selectedStatus}
        onStatusChange={updateFilter(setSelectedStatus)}
        typeOptions={examTypeOptions}
        selectedType={selectedType}
        onTypeChange={updateFilter(setSelectedType)}
        search={search}
        onSearchChange={updateFilter(setSearch)}
      />

      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-gray-500">
          {filteredExams.length} exam{filteredExams.length === 1 ? '' : 's'} found
        </p>
        <div className="w-44 shrink-0">
          <Dropdown options={SORT_OPTIONS} value={sortBy} onChange={setSortBy} />
        </div>
      </div>

      {filteredExams.length === 0 ? (
        <ExamsEmptyState onCreateExam={isAdmin ? () => setShowAddModal(true) : undefined} />
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div
            style={{ gridTemplateColumns: EXAM_GRID_COLS }}
            className="hidden md:grid gap-x-6 gap-y-6 px-5 sm:px-6 py-3 bg-gray-50/80 border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase tracking-wide"
          >
            <span>#</span>
            <span>Exam</span>
            <span>Session</span>
            <span>Dates</span>
            <span>Classes</span>
            <span>Status</span>
            <span className="text-right">Actions</span>
          </div>
          <div className="divide-y divide-gray-50">
            {pagedExams.map((exam, index) => (
              <ExamCard
                key={exam.id}
                exam={exam}
                serialNumber={(page - 1) * PAGE_SIZE + index + 1}
                sessionOptions={sessionOptions}
                defaultSession={defaultSession}
                examTypeOptions={examTypeOptions}
                backHref={listHref}
                isAdmin={isAdmin}
              />
            ))}
          </div>
        </div>
      )}

      <FixedPaginationBar
        page={page}
        totalPages={totalPages}
        onPageChange={setPage}
        totalCount={filteredExams.length}
        pageSize={PAGE_SIZE}
        itemLabel="exams"
      />

      <ExamFormModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        exam={null}
        sessionOptions={sessionOptions}
        defaultSession={defaultSession}
        examTypeOptions={examTypeOptions}
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
