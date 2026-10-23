'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { FiPhone, FiMail, FiUsers } from 'react-icons/fi';
import EmptyState from '@/components/EmptyState';
import TeacherActionsMenu from './TeacherActionsMenu';
import { Avatar, StatusPill } from './TeachersTable';
import { getTeachersPage as fetchTeachersPage } from '@/lib/api';

const fresh = (key, page) => ({ key, rows: [], nextPage: page + 1, loading: false, error: false, done: false });

// "Class 6" + "A" -> "6A"; max 3 distinct sections, the rest as "+N".
function formatClasses(assignments) {
  const labels = [...new Set((assignments || []).map((a) => `${a.class.replace(/^Class\s+/i, '')}${a.section}`))];
  if (labels.length === 0) return '—';
  const extra = labels.length - 3;
  return labels.slice(0, 3).join(', ') + (extra > 0 ? ` +${extra}` : '');
}

function TeacherCard({ teacher, index, classOptions }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
      <div className="flex items-center gap-3">
        <Link href={`/dashboard/teachers/${teacher.id}`} className="flex items-center gap-3 min-w-0 flex-1">
          <Avatar initials={teacher.initials} photoUrl={teacher.photoUrl} index={index} />
          <div className="min-w-0">
            <p className="font-semibold text-gray-900 truncate">
              {teacher.firstName} {teacher.lastName}
            </p>
            <p className="text-xs text-gray-400 truncate">{teacher.employeeId}</p>
          </div>
        </Link>
        <StatusPill status={teacher.status} />
        <TeacherActionsMenu teacher={teacher} classOptions={classOptions} />
      </div>

      <div className="mt-3 pt-3 border-t border-gray-100 space-y-1.5 text-sm">
        <p className="flex items-center justify-between gap-3">
          <span className="text-gray-400 shrink-0">Classes</span>
          <span className="font-medium text-gray-900 truncate">{formatClasses(teacher.assignments)}</span>
        </p>
        {teacher.phone && (
          <a href={`tel:${teacher.phone}`} className="flex items-center gap-2 text-indigo-600">
            <FiPhone className="w-3.5 h-3.5 shrink-0" />
            {teacher.phone}
          </a>
        )}
        {teacher.email && (
          <p className="flex items-center gap-2 text-gray-500 min-w-0">
            <FiMail className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">{teacher.email}</span>
          </p>
        )}
      </div>
    </div>
  );
}

// Phone-only (<sm) teacher list — same shape as StudentsMobileList: the
// explorer's current server page, then further pages fetched on scroll from
// the same paged API, keyed by page + filters so a filter change starts over.
export default function TeachersMobileList({ teachers, total, isLoading, filters, page, pageSize, classOptions }) {
  const key = `${page}|${JSON.stringify(filters)}`;
  const [extra, setExtra] = useState(() => fresh('', 1));
  const cur = extra.key === key ? extra : fresh(key, page);
  const sentinelRef = useRef(null);

  const loaded = (page - 1) * pageSize + teachers.length + cur.rows.length;
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
        fetchTeachersPage({ page: requestPage, pageSize, ...filters })
          .then((result) => {
            setExtra((prev) =>
              prev.key !== key
                ? prev
                : {
                    ...prev,
                    rows: [...prev.rows, ...result.teachers],
                    nextPage: requestPage + 1,
                    loading: false,
                    done: result.teachers.length === 0,
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

  const all = [...teachers, ...cur.rows];

  if (all.length === 0) {
    return (
      <div className="sm:hidden bg-white rounded-2xl border border-gray-100 shadow-sm">
        <EmptyState icon={FiUsers} description="No teachers match your filters." />
      </div>
    );
  }

  return (
    <div className={`sm:hidden space-y-3 transition-opacity ${isLoading ? 'opacity-50' : ''}`}>
      {all.map((teacher, index) => (
        <TeacherCard key={teacher.id} teacher={teacher} index={index} classOptions={classOptions} />
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
