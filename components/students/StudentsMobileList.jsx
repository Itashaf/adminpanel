'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { FiPhone, FiUsers } from 'react-icons/fi';
import EmptyState from '@/components/EmptyState';
import StudentActionsMenu from './StudentActionsMenu';
import { Avatar, StatusPill } from './StudentsTable';
import { getStudentsPage as fetchStudentsPage } from '@/lib/api';

const fresh = (key, page) => ({ key, rows: [], nextPage: page + 1, loading: false, error: false, done: false });

function StudentCard({ student, index, canManage, canEdit, onDeleted }) {
  const guardian = student.guardian;
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
      <div className="flex items-center gap-3">
        <Link href={`/dashboard/students/${student.id}`} className="flex items-center gap-3 min-w-0 flex-1">
          <Avatar initials={student.initials} photoUrl={student.photoUrl} index={index} />
          <div className="min-w-0">
            <p className="font-semibold text-gray-900 truncate">
              {student.firstName} {student.lastName}
            </p>
            <p className="text-xs text-gray-400 truncate">{student.admissionId}</p>
          </div>
        </Link>
        <StatusPill status={student.status} />
        {canManage && <StudentActionsMenu student={student} onDeleted={onDeleted} canEdit={canEdit} />}
      </div>

      <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-sm text-gray-700 truncate">{student.class}</span>
          {student.section && (
            <span className="flex items-center justify-center w-6 h-6 rounded-md bg-gray-100 text-xs font-semibold text-gray-600 shrink-0">
              {student.section}
            </span>
          )}
        </div>
        <div className="text-right min-w-0">
          <p className="text-sm font-medium text-gray-900 truncate">{guardian?.fullName || '—'}</p>
          {guardian?.phone ? (
            <a href={`tel:${guardian.phone}`} className="inline-flex items-center gap-1 text-xs text-indigo-600">
              <FiPhone className="w-3 h-3" />
              {guardian.phone}
            </a>
          ) : (
            <p className="text-xs text-gray-400">—</p>
          )}
        </div>
      </div>
    </div>
  );
}

// Phone-only (<sm) student list. `students` is the explorer's current server
// page; further pages are fetched from the same paged API as the user
// scrolls and kept here, keyed by page + filters so any filter change starts
// over from the explorer's fresh first page.
export default function StudentsMobileList({
  students,
  total,
  isLoading,
  filters,
  page,
  pageSize,
  canManage,
  canEdit,
  onStudentDeleted,
}) {
  const key = `${page}|${JSON.stringify(filters)}`;
  const [extra, setExtra] = useState(() => fresh('', 1));
  const cur = extra.key === key ? extra : fresh(key, page);
  const sentinelRef = useRef(null);

  const loaded = (page - 1) * pageSize + students.length + cur.rows.length;
  const hasMore = loaded < total && !cur.done && !cur.error;

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !hasMore || cur.loading) return undefined;
    const requestPage = cur.nextPage;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        observer.disconnect();
        setExtra((prev) => ({ ...(prev.key === key ? prev : fresh(key, page)), loading: true }));
        fetchStudentsPage({ page: requestPage, pageSize, ...filters })
          .then((result) => {
            setExtra((prev) =>
              prev.key !== key
                ? prev
                : {
                    ...prev,
                    rows: [...prev.rows, ...result.students],
                    nextPage: requestPage + 1,
                    loading: false,
                    done: result.students.length === 0,
                  }
            );
          })
          .catch(() => {
            setExtra((prev) => (prev.key !== key ? prev : { ...prev, loading: false, error: true }));
          });
      },
      { rootMargin: '200px' }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, cur.loading, cur.nextPage, key, filters, page, pageSize]);

  const handleDeleted = (id) => {
    onStudentDeleted(id);
    setExtra((prev) => ({ ...prev, rows: prev.rows.filter((s) => s.id !== id) }));
  };

  const all = [...students, ...cur.rows];

  if (all.length === 0) {
    return (
      <div className="sm:hidden bg-white rounded-2xl border border-gray-100 shadow-sm">
        <EmptyState icon={FiUsers} description="No students match your filters." />
      </div>
    );
  }

  return (
    <div className={`sm:hidden space-y-3 transition-opacity ${isLoading ? 'opacity-50' : ''}`}>
      {all.map((student, index) => (
        <StudentCard
          key={student.id}
          student={student}
          index={index}
          canManage={canManage}
          canEdit={canEdit}
          onDeleted={handleDeleted}
        />
      ))}

      {cur.loading && <div className="h-24 rounded-2xl bg-gray-100 animate-pulse" />}
      {cur.error && (
        <button
          type="button"
          onClick={() => setExtra((prev) => ({ ...prev, error: false }))}
          className="w-full py-3 text-sm font-semibold text-indigo-700 cursor-pointer"
        >
          Couldn&apos;t load more. Tap to retry
        </button>
      )}
      {hasMore && <div ref={sentinelRef} className="h-8" />}
    </div>
  );
}
