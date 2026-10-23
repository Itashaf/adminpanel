'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { FiPlus, FiUserCheck } from 'react-icons/fi';
import Toast from '@/components/Toast';
import FixedPaginationBar from '@/components/FixedPaginationBar';
import NoticesFiltersBar from './NoticesFiltersBar';
import NoticesTable from './NoticesTable';
import NoticeFormModal from './NoticeFormModal';
import NoticesEmptyState from './NoticesEmptyState';
import { useClassSections } from '@/lib/hooks/useClassSections';
import { useUrlSync } from '@/lib/hooks/useUrlSync';
import { usePagedResult } from '@/lib/hooks/usePagedResult';
import { getNoticesPage } from '@/lib/api';

const EMPTY_FILTERS = { search: '', audience: '', className: '', priority: '' };

export default function NoticesExplorer({ initialResult, initialParams, pageSize, sessionOptions, defaultSession, currentUser, teacherOptions = [], parentOptions = [] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  // Dashboard's "Send Notice" quick action links here with ?compose=1 so
  // the Post Notice modal opens immediately instead of landing on a bare
  // list the admin then has to click into.
  const [showAddModal, setShowAddModal] = useState(searchParams.get('compose') === '1');
  const [toastMessage, setToastMessage] = useState('');
  const [filters, setFilters] = useState(() => ({
    search: searchParams.get('search') || '',
    audience: searchParams.get('audience') || '',
    className: searchParams.get('className') || '',
    priority: searchParams.get('priority') || '',
  }));
  const [page, setPage] = useState(() => Number(searchParams.get('page')) || 1);

  useUrlSync({ ...filters, page }, { ...EMPTY_FILTERS, page: 1 });
  const isTeacher = currentUser.role === 'Teacher';
  // Accountant holds notices.view (can read every notice — see
  // prisma/rbacPermissions.js) but never posts/manages one; this is the
  // one other read-only role besides a non-Class-Teacher, so it's folded
  // into the same canPost/canManageFor checks below rather than a separate
  // branch.
  const isAccountant = currentUser.roleKey === 'Accountant';
  // A Teacher can post a notice only for a section they're the Class Teacher
  // of (see lib/notices.js's assertScopeAllowed) — a Teacher with no
  // classTeacherOf entries at all (never a Class Teacher anywhere) has
  // nothing to post to, so stays read-only same as before.
  const isClassTeacher = isTeacher && (currentUser.classTeacherOf || []).length > 0;
  const canPost = (!isTeacher || isClassTeacher) && !isAccountant;
  const classSections = useClassSections();

  const classOptions = useMemo(() => {
    if (isTeacher) {
      return [...new Set((currentUser.assignedClasses || []).map((a) => a.class))].map((c) => ({ value: c, label: c }));
    }
    return Object.keys(classSections).map((c) => ({ value: c, label: c }));
  }, [isTeacher, currentUser.assignedClasses, classSections]);

  // Typing in the search box only triggers a request once the user pauses.
  const [debouncedSearch, setDebouncedSearch] = useState(filters.search);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(filters.search), 300);
    return () => clearTimeout(timer);
  }, [filters.search]);

  // One server page at a time — filtering and paging both happen in the
  // database (see lib/notices.js's getNoticesPageForUser). The first page comes
  // pre-fetched from app/dashboard/notices/page.jsx; a post/edit/delete calls
  // router.refresh(), which brings a fresh initialResult for the same filters
  // (see usePagedResult).
  const requestKey = JSON.stringify({
    search: debouncedSearch,
    audience: filters.audience,
    className: filters.className,
    priority: filters.priority,
    page,
  });
  const { result, isLoading, error } = usePagedResult({
    initialResult,
    initialKey: JSON.stringify({
      search: initialParams.search,
      audience: initialParams.audience,
      className: initialParams.className,
      priority: initialParams.priority,
      page: initialParams.page,
    }),
    key: requestKey,
    page,
    pageSize,
    setPage,
    fetchPage: () =>
      getNoticesPage({
        search: debouncedSearch,
        audience: filters.audience,
        className: filters.className,
        priority: filters.priority,
        page,
        pageSize,
      }),
  });
  const pagedNotices = result.rows;
  const totalCount = result.total;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  const handleFilterChange = (next) => {
    setFilters(next);
    setPage(1);
  };

  const handleFilterReset = () => {
    setFilters(EMPTY_FILTERS);
    setPage(1);
  };

  // A SchoolAdmin can manage any notice. A Teacher can only manage (edit/
  // delete) a notice they themselves posted, as their own section's Class
  // Teacher — never another teacher's or an Admin's notice. Accountant
  // manages none, view-only.
  const canManageFor = (notice) => !isAccountant && (!isTeacher || notice.postedByTeacherId === currentUser.teacherId);

  return (
    <div className="flex flex-col h-full pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shrink-0 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Notices</h1>
          <p className="text-sm text-gray-500 mt-1">
            {isAccountant
              ? 'View every notice posted for the school.'
              : isClassTeacher
              ? 'School-wide announcements, and post updates for your own class.'
              : isTeacher
              ? 'School-wide announcements and updates for your classes.'
              : 'Post and manage announcements for the school or a specific class.'}
          </p>
          {isTeacher && !isClassTeacher && (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-indigo-700 bg-indigo-50 rounded-full px-3 py-1 mt-2">
              <FiUserCheck className="w-3.5 h-3.5" />
              Read-only — showing whole-school notices and your assigned classes
            </span>
          )}
        </div>

        {canPost && (
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

      {!result.hasAny ? (
        <NoticesEmptyState onPostNotice={canPost ? () => setShowAddModal(true) : undefined} />
      ) : (
        <div className="flex-1 min-h-0 flex flex-col gap-6">
          <NoticesFiltersBar
            filters={filters}
            onFilterChange={handleFilterChange}
            onReset={handleFilterReset}
            classOptions={classOptions}
          />
          {error && <p className="text-sm text-red-500 bg-red-50 border border-red-100 rounded-lg px-4 py-3">{error}</p>}
          <div className={isLoading ? 'opacity-60' : ''}>
            <NoticesTable
              notices={pagedNotices}
              serialStart={(page - 1) * pageSize + 1}
              canManageFor={canManageFor}
              sessionOptions={sessionOptions}
              defaultSession={defaultSession}
              currentUser={currentUser}
              teacherOptions={teacherOptions}
              parentOptions={parentOptions}
            />
          </div>
          <FixedPaginationBar
            page={page}
            totalPages={totalPages}
            onPageChange={setPage}
            totalCount={totalCount}
            pageSize={pageSize}
            itemLabel="notices"
          />
        </div>
      )}

      <NoticeFormModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        notice={null}
        sessionOptions={sessionOptions}
        defaultSession={defaultSession}
        currentUser={currentUser}
        teacherOptions={teacherOptions}
        parentOptions={parentOptions}
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
