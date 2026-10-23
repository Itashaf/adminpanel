'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { FiSearch, FiChevronDown } from 'react-icons/fi';
import ClassActionsMenu from './ClassActionsMenu';

const PAGE_SIZE = 10;

const STATUS_STYLE = {
  true: { label: 'Active', dot: 'bg-emerald-600', className: 'bg-emerald-50 text-emerald-700' },
  false: { label: 'Inactive', dot: 'bg-gray-400', className: 'bg-gray-100 text-gray-500' },
};

function GenderCounts({ boys, girls }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-gray-500">
      <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
      {boys}
      <span className="w-2 h-2 rounded-full bg-pink-500 shrink-0 ml-1.5" />
      {girls}
    </span>
  );
}

function SectionChips({ sections }) {
  if (sections.length === 0) return <span className="text-sm text-gray-400">No sections yet</span>;
  return (
    <div className="flex flex-wrap gap-1.5">
      {sections.map((section) => (
        <span key={section.id} className="flex items-center gap-1 text-xs border border-gray-200 rounded-lg px-2 py-1">
          <span className="font-semibold text-gray-900">{section.name}</span>
          <span className="text-gray-500">{section.studentCount}</span>
        </span>
      ))}
    </div>
  );
}

function ClassCard({ cls, expanded, onToggle }) {
  const status = STATUS_STYLE[cls.status === 'Active'];
  const open = expanded;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
      <div className="flex items-center gap-3">
        <Link href={`/dashboard/classes/${cls.id}`} className="flex items-center gap-3 min-w-0 flex-1">
          <div className="min-w-0">
            <p className="font-semibold text-gray-900 truncate">{cls.name}</p>
            <p className="text-xs text-gray-400 truncate">{cls.wing}</p>
          </div>
        </Link>
        <span className={`inline-flex items-center gap-1.5 text-xs font-semibold rounded-full px-2.5 py-1 shrink-0 ${status.className}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
          {status.label}
        </span>
        <ClassActionsMenu cls={cls} />
        <button
          type="button"
          onClick={onToggle}
          aria-label={expanded ? 'Collapse' : 'Expand'}
          aria-expanded={expanded}
          className="p-1 -mr-1 text-gray-400 cursor-pointer"
        >
          <FiChevronDown className={`w-5 h-5 transition-transform ${expanded ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {open ? (
        <div className="mt-4 space-y-3 border-t border-gray-100 pt-3">
          <div>
            <p className="text-xs font-semibold text-gray-500 mb-1.5">Sections</p>
            <SectionChips sections={cls.sections} />
          </div>
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">
              Total Students <span className="font-semibold text-gray-900 ml-1">{cls.totalStudents.toLocaleString()}</span>
            </p>
            <GenderCounts boys={cls.totalBoys} girls={cls.totalGirls} />
          </div>
        </div>
      ) : (
        <div className="mt-2 flex items-center justify-between">
          <p className="text-xs text-gray-500">
            {cls.sections.length > 0 ? `${cls.sections.length} sections` : 'No sections yet'} · {cls.totalStudents.toLocaleString()} students
          </p>
          <GenderCounts boys={cls.totalBoys} girls={cls.totalGirls} />
        </div>
      )}
    </div>
  );
}

// Phone-only (<sm) version of the classes table: search + List/Card toggle,
// one tappable card per class. Searches the already-loaded class list, so no
// extra fetch. Reorder-by-drag stays desktop-only.
export default function ClassesMobileList({ classes }) {
  const [query, setQuery] = useState('');
  const [expandedId, setExpandedId] = useState(null);
  // Load-on-scroll: show PAGE_SIZE more each time the sentinel scrolls into
  // view. Keyed by the search text so a new search starts back at one page.
  const [shown, setShown] = useState({ q: '', count: PAGE_SIZE });
  const sentinelRef = useRef(null);

  const q = query.trim().toLowerCase();
  const matches = q
    ? classes.filter((c) => c.name.toLowerCase().includes(q) || (c.wing || '').toLowerCase().includes(q))
    : classes;
  const count = shown.q === q ? shown.count : PAGE_SIZE;
  const visible = matches.slice(0, count);
  const hasMore = matches.length > count;

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !hasMore) return undefined;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setShown({ q, count: count + PAGE_SIZE });
      },
      { rootMargin: '200px' },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, q, count]);

  return (
    <div className="sm:hidden space-y-3">
      <div className="relative">
        <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search classes"
          className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-10 pr-3 text-sm outline-none focus:border-indigo-400"
        />
      </div>

      {visible.length === 0 ? (
        <p className="text-center text-sm text-gray-400 py-10">No classes match your search.</p>
      ) : (
        <div className="space-y-3">
          {visible.map((cls) => (
            <ClassCard
              key={cls.id}
              cls={cls}
              expanded={expandedId === cls.id}
              onToggle={() => setExpandedId(expandedId === cls.id ? null : cls.id)}
            />
          ))}
          {hasMore && <div ref={sentinelRef} className="h-8" />}
        </div>
      )}
    </div>
  );
}
