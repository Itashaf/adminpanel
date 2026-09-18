'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FiPlus, FiUserCheck } from 'react-icons/fi';
import Toast from '@/components/Toast';
import Pagination from '@/components/Pagination';
import NoticesFiltersBar from './NoticesFiltersBar';
import NoticesTable from './NoticesTable';
import NoticeFormModal from './NoticeFormModal';
import NoticesEmptyState from './NoticesEmptyState';
import { useClassSections } from '@/lib/hooks/useClassSections';

const EMPTY_FILTERS = { search: '', audience: '', className: '', priority: '' };
const PAGE_SIZE = 10;

export default function NoticesExplorer({ notices, sessionOptions, defaultSession, currentUser }) {
  const router = useRouter();
  const [showAddModal, setShowAddModal] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [page, setPage] = useState(1);
  const isTeacher = currentUser.role === 'Teacher';
  const classSections = useClassSections();

  const classOptions = useMemo(() => {
    if (isTeacher) {
      return [...new Set((currentUser.assignedClasses || []).map((a) => a.class))].map((c) => ({ value: c, label: c }));
    }
    return Object.keys(classSections).map((c) => ({ value: c, label: c }));
  }, [isTeacher, currentUser.assignedClasses, classSections]);

  const filteredNotices = useMemo(() => {
    const query = filters.search.trim().toLowerCase();
    return notices.filter((notice) => {
      const matchesSearch =
        !query || notice.title.toLowerCase().includes(query) || notice.message.toLowerCase().includes(query);
      const matchesAudience = !filters.audience || notice.audience === filters.audience;
      const matchesClass = !filters.className || notice.className === filters.className;
      const matchesPriority = !filters.priority || notice.priority === filters.priority;
      return matchesSearch && matchesAudience && matchesClass && matchesPriority;
    });
  }, [notices, filters]);

  const totalPages = Math.max(1, Math.ceil(filteredNotices.length / PAGE_SIZE));
  const pagedNotices = filteredNotices.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleFilterChange = (next) => {
    setFilters(next);
    setPage(1);
  };

  const handleFilterReset = () => {
    setFilters(EMPTY_FILTERS);
    setPage(1);
  };

  // Notices are read-only for a Teacher — only a SchoolAdmin can post, edit
  // or delete, unlike Homework which a Teacher manages for their own class.
  const canManageFor = () => !isTeacher;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Notices</h1>
          <p className="text-sm text-gray-500 mt-1">
            {isTeacher
              ? 'School-wide announcements and updates for your classes.'
              : 'Post and manage announcements for the school or a specific class.'}
          </p>
          {isTeacher && (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-indigo-700 bg-indigo-50 rounded-full px-3 py-1 mt-2">
              <FiUserCheck className="w-3.5 h-3.5" />
              Read-only — showing whole-school notices and your assigned classes
            </span>
          )}
        </div>

        {!isTeacher && (
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-medium text-white bg-gradient-to-r from-violet-700 via-indigo-600 to-blue-600 hover:opacity-90 transition cursor-pointer shrink-0"
          >
            <FiPlus className="w-4 h-4" />
            Post Notice
          </button>
        )}
      </div>

      {notices.length === 0 ? (
        <NoticesEmptyState onPostNotice={isTeacher ? undefined : () => setShowAddModal(true)} />
      ) : (
        <>
          <NoticesFiltersBar
            filters={filters}
            onFilterChange={handleFilterChange}
            onReset={handleFilterReset}
            classOptions={classOptions}
          />
          <NoticesTable
            notices={pagedNotices}
            serialStart={(page - 1) * PAGE_SIZE + 1}
            canManageFor={canManageFor}
            sessionOptions={sessionOptions}
            defaultSession={defaultSession}
            currentUser={currentUser}
          />
          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} totalCount={filteredNotices.length} pageSize={PAGE_SIZE} />
        </>
      )}

      <NoticeFormModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        notice={null}
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
