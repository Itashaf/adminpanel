'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  FiUsers,
  FiShield,
  FiClock,
  FiBarChart2,
  FiSearch,
  FiUser,
  FiEye,
  FiEdit2,
  FiZap,
  FiLayers,
  FiSave,
  FiChevronLeft,
  FiChevronRight,
  FiChevronDown,
  FiChevronUp,
  FiCalendar,
  FiCheckCircle,
} from 'react-icons/fi';
import Dropdown from '@/components/Dropdown';
import Toast from '@/components/Toast';
import QuickAssessmentModal from './QuickAssessmentModal';
import { getSectionOptions } from '@/lib/hooks/useClassSections';
import { getClassAssessments, saveStudentAssessment } from '@/lib/api';
import { RATING_LEVELS, RATING_STYLES, OVERALL_PERFORMANCE_OPTIONS, OVERALL_PERFORMANCE_STYLES, BEHAVIOUR_CATEGORIES } from '@/lib/assessmentConstants';

function MiniChipRow({ options, value, onChange, styles }) {
  return (
    <div className="flex flex-wrap gap-1">
      {options.map((option) => (
        <button
          key={option}
          type="button"
          onClick={() => onChange(option)}
          className={`px-2 py-1 rounded-full text-[11px] font-medium border transition cursor-pointer whitespace-nowrap ${
            value === option ? styles[option] : 'bg-white text-gray-400 border-gray-200 hover:border-gray-300'
          }`}
        >
          {option}
        </button>
      ))}
    </div>
  );
}

const PAGE_SIZE = 20;

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const MONTH_OPTIONS = MONTH_NAMES.map((label, i) => ({ value: String(i + 1), label }));

function yearOptions() {
  const current = new Date().getFullYear();
  return [current - 1, current, current + 1].map((y) => ({ value: String(y), label: String(y) }));
}

// Pastel initials avatar — same "no photo -> colored circle" idea as
// components/students/StudentsTable.jsx's Avatar, just a lighter palette
// (light bg + matching dark text) to match this screen's reference design.
const AVATAR_PALETTE = [
  { bg: 'bg-purple-100', text: 'text-purple-700' },
  { bg: 'bg-green-100', text: 'text-green-700' },
  { bg: 'bg-pink-100', text: 'text-pink-700' },
  { bg: 'bg-blue-100', text: 'text-blue-700' },
  { bg: 'bg-amber-100', text: 'text-amber-700' },
  { bg: 'bg-teal-100', text: 'text-teal-700' },
];

function initialsOf(name) {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] || '') + (parts[1]?.[0] || parts[0]?.[1] || '')).toUpperCase();
}

function Avatar({ name, photoUrl, index }) {
  if (photoUrl) {
    return <img src={photoUrl} alt={name} className="w-9 h-9 rounded-full object-cover shrink-0" />;
  }
  const palette = AVATAR_PALETTE[index % AVATAR_PALETTE.length];
  return (
    <span className={`flex items-center justify-center w-9 h-9 rounded-full text-xs font-semibold shrink-0 ${palette.bg} ${palette.text}`}>
      {initialsOf(name) || <FiUser className="w-3.5 h-3.5" />}
    </span>
  );
}

function StatusPill({ status }) {
  const isCompleted = status === 'Completed';
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-xs font-semibold rounded-full px-3 py-1 border ${
        isCompleted ? 'bg-green-50 text-green-700 border-green-200' : 'bg-amber-50 text-amber-700 border-amber-200'
      }`}
    >
      {isCompleted ? <FiCheckCircle className="w-3.5 h-3.5" /> : <FiClock className="w-3.5 h-3.5" />}
      {isCompleted ? 'Completed' : 'Pending'}
    </span>
  );
}

function StatCard({ label, value, icon, iconBg }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-center gap-4">
      <span className={`flex items-center justify-center w-12 h-12 rounded-xl shrink-0 ${iconBg}`}>{icon}</span>
      <div className="min-w-0">
        <p className="text-2xl font-bold text-gray-900 leading-tight">{value}</p>
        <p className="text-sm text-gray-500 truncate">{label}</p>
      </div>
    </div>
  );
}

// Client-side refetch loading state (filters/pagination/tab change) —
// mirrors the real roster table's row shape so the table doesn't jump/
// flash, same shimmer convention as app/dashboard/assessments/loading.jsx
// (the initial server-render fallback) instead of a spinner icon.
function RosterRowSkeleton() {
  return (
    <tr className="border-t border-gray-100">
      <td className="py-3 pl-6 pr-3"><div className="h-3 w-4 bg-gray-100 rounded animate-pulse" /></td>
      <td className="py-3 pr-4">
        <div className="flex items-center gap-2.5 animate-pulse">
          <div className="w-9 h-9 rounded-full bg-gray-100 shrink-0" />
          <div className="h-3.5 w-32 bg-gray-100 rounded" />
        </div>
      </td>
      <td className="py-3 pr-4"><div className="h-3 w-16 bg-gray-100 rounded animate-pulse" /></td>
      <td className="py-3 pr-4"><div className="h-3 w-10 bg-gray-100 rounded animate-pulse" /></td>
      <td className="py-3 pr-4"><div className="h-6 w-20 bg-gray-100 rounded-full animate-pulse" /></td>
      <td className="py-3 pr-6"><div className="h-7 w-28 bg-gray-100 rounded-lg ml-auto animate-pulse" /></td>
    </tr>
  );
}

export default function AssessmentDashboard({
  initialData,
  classOptions,
  classSections,
  isTeacher,
  teacherScope,
  academicSession,
  defaultClass,
  defaultSection,
  defaultMonth,
  defaultYear,
  subjects,
}) {
  const [className, setClassName] = useState(defaultClass);
  const [sectionName, setSectionName] = useState(defaultSection);
  const [month, setMonth] = useState(defaultMonth);
  const [year, setYear] = useState(defaultYear);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [tab, setTab] = useState('all'); // 'all' | 'completed' | 'pending'
  const [sortOrder, setSortOrder] = useState('asc');
  const [page, setPage] = useState(1);
  const [data, setData] = useState(initialData);
  const [isLoading, setIsLoading] = useState(false);
  const [quickTarget, setQuickTarget] = useState(null);
  const [bulkMode, setBulkMode] = useState(false);
  const [bulkChanges, setBulkChanges] = useState({}); // studentId -> { behaviour, overallPerformance }
  const [isSavingBulk, setIsSavingBulk] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const isFirstRun = useRef(true);

  const sectionOptions = isTeacher
    ? [...new Set(teacherScope.filter((a) => a.class === className).map((a) => a.section))].map((s) => ({
        value: s,
        label: `Section ${s}`,
      }))
    : getSectionOptions(classSections, className);

  // Debounce the search box (400ms) so it doesn't hit the API on every
  // keystroke — search runs server-side (see getAssessmentsForClass).
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 400);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    if (isFirstRun.current) {
      isFirstRun.current = false;
      return;
    }
    if (!className || !sectionName) return;
    let cancelled = false;
    (async () => {
      setIsLoading(true);
      try {
        const result = await getClassAssessments({
          className,
          sectionName,
          academicSession,
          month,
          year,
          page,
          pageSize: PAGE_SIZE,
          search: debouncedSearch,
          status: tab,
          sort: sortOrder,
        });
        if (!cancelled) setData(result);
      } catch {
        // Filters just keep showing the previous roster.
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [className, sectionName, month, year, academicSession, page, debouncedSearch, tab, sortOrder]);

  const reload = async () => {
    if (!className || !sectionName) return;
    try {
      const result = await getClassAssessments({
        className,
        sectionName,
        academicSession,
        month,
        year,
        page,
        pageSize: PAGE_SIZE,
        search: debouncedSearch,
        status: tab,
        sort: sortOrder,
      });
      setData(result);
    } catch {
      // Keep whatever was last shown.
    }
  };

  const handleClassChange = (value) => {
    setClassName(value);
    const nextSections = isTeacher
      ? [...new Set(teacherScope.filter((a) => a.class === value).map((a) => a.section))]
      : (classSections[value] || []);
    setSectionName(nextSections[0] || '');
    setPage(1);
  };

  const handleSectionChange = (value) => {
    setSectionName(value);
    setPage(1);
  };

  const handleMonthYearChange = (m, y) => {
    setMonth(m);
    setYear(y);
    setPage(1);
  };

  const handleTabChange = (value) => {
    setTab(value);
    setPage(1);
  };

  const toggleSort = () => {
    setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    setPage(1);
  };

  const { stats } = data;
  const bulkChangeCount = Object.keys(bulkChanges).length;

  // Applies one uniform rating across every real category/subject — same
  // shortcut convention QuickAssessmentModal uses, and marks each row
  // COMPLETED directly (per the spec: assess 40+ students, only open one
  // individually if detailed remarks are actually needed).
  const handleSaveAllBulk = async () => {
    setIsSavingBulk(true);
    try {
      await Promise.all(
        Object.entries(bulkChanges).map(([studentId, change]) => {
          if (!change.behaviour && !change.overallPerformance) return null;
          const behaviour = change.behaviour
            ? Object.fromEntries(BEHAVIOUR_CATEGORIES.map((cat) => [cat.key, change.behaviour]))
            : undefined;
          return saveStudentAssessment(studentId, month, year, { overallPerformance: change.overallPerformance, behaviour }, true);
        })
      );
      setToastMessage(`${bulkChangeCount} assessment(s) saved.`);
      setBulkChanges({});
      setBulkMode(false);
      await reload();
    } catch (err) {
      setToastMessage(err.message);
    } finally {
      setIsSavingBulk(false);
    }
  };

  const classLabel = className && sectionName ? `${className} - ${sectionName}` : className || 'Class';
  const tabs = [
    { key: 'all', label: 'All Students', count: stats.total },
    { key: 'completed', label: 'Completed', count: stats.completed },
    { key: 'pending', label: 'Pending', count: stats.pending },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex gap-3">
          <span className="w-1 self-stretch rounded-full bg-gradient-to-b from-violet-700 via-indigo-600 to-blue-600 shrink-0" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">My Students — {classLabel}</h1>
            <p className="text-sm text-gray-500 mt-1">Manage and track monthly progress, development and reports for your students.</p>
            <p className="text-xs text-gray-400 mt-2">
              <Link href="/dashboard" className="hover:text-gray-600 cursor-pointer">
                Dashboard
              </Link>{' '}
              &gt; My Students
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {classOptions.length > 1 && (
            <div className="w-32">
              <Dropdown options={classOptions} value={className} onChange={handleClassChange} placeholder="Class" />
            </div>
          )}
          {sectionOptions.length > 1 && (
            <div className="w-36">
              <Dropdown options={sectionOptions} value={sectionName} onChange={handleSectionChange} placeholder="Section" />
            </div>
          )}
          <div className="relative">
            <FiCalendar className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 z-10" />
            <select
              value={`${month}-${year}`}
              onChange={(e) => {
                const [m, y] = e.target.value.split('-').map(Number);
                handleMonthYearChange(m, y);
              }}
              className="appearance-none pl-9 pr-8 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-xl cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {MONTH_OPTIONS.map((mo) =>
                yearOptions().map((yo) => (
                  <option key={`${mo.value}-${yo.value}`} value={`${mo.value}-${yo.value}`}>
                    {mo.label} {yo.label}
                  </option>
                ))
              )}
            </select>
            <FiChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 w-3.5 h-3.5" />
          </div>
          <Link
            href={`/dashboard/assessments/reports?class=${encodeURIComponent(className)}&section=${encodeURIComponent(sectionName)}&month=${month}&year=${year}`}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 transition cursor-pointer"
          >
            <FiBarChart2 className="w-4 h-4" />
            Reports
          </Link>
          <button
            type="button"
            onClick={() => {
              setBulkMode((prev) => !prev);
              setBulkChanges({});
            }}
            className={`inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-medium transition cursor-pointer whitespace-nowrap ${
              bulkMode ? 'bg-indigo-600 text-white' : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
            }`}
          >
            <FiLayers className="w-4 h-4" />
            Bulk Actions
            <FiChevronDown className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Students" value={stats.total} icon={<FiUsers className="w-5 h-5" />} iconBg="bg-blue-50 text-blue-600" />
        <StatCard label="Records Completed" value={stats.completed} icon={<FiShield className="w-5 h-5" />} iconBg="bg-green-50 text-green-600" />
        <StatCard label="Pending This Month" value={stats.pending} icon={<FiClock className="w-5 h-5" />} iconBg="bg-amber-50 text-amber-600" />
        <StatCard
          label="Class Average Attendance"
          value={stats.avgAttendance != null ? `${stats.avgAttendance}%` : '—'}
          icon={<FiBarChart2 className="w-5 h-5" />}
          iconBg="bg-purple-50 text-purple-600"
        />
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1">
          {tabs.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => handleTabChange(t.key)}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium cursor-pointer transition border-b-2 ${
                tab === t.key ? 'text-indigo-700 border-indigo-600' : 'text-gray-500 border-transparent hover:text-gray-700'
              }`}
            >
              {t.label}
              <span
                className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                  tab === t.key ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-500'
                }`}
              >
                {t.count}
              </span>
            </button>
          ))}
        </div>
        <div className="relative w-full sm:w-64">
          <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoComplete="off"
            placeholder="Search by name or admission no..."
            className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 rounded-full focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <tbody>
                {Array.from({ length: 8 }).map((_, i) => (
                  <RosterRowSkeleton key={i} />
                ))}
              </tbody>
            </table>
          </div>
        ) : !className || !sectionName ? (
          <div className="text-center py-16 text-sm text-gray-500">Select a class and section to view assessments.</div>
        ) : data.roster.length === 0 ? (
          <div className="text-center py-16 text-sm text-gray-500">No students found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  <th className="py-3 pl-6 pr-3 w-8">#</th>
                  <th className="py-3 pr-4">
                    <button type="button" onClick={toggleSort} className="inline-flex items-center gap-1 cursor-pointer hover:text-gray-700">
                      Student Name
                      {sortOrder === 'asc' ? <FiChevronUp className="w-3.5 h-3.5" /> : <FiChevronDown className="w-3.5 h-3.5" />}
                    </button>
                  </th>
                  <th className="py-3 pr-4">Admission No.</th>
                  <th className="py-3 pr-4">Attendance %</th>
                  {bulkMode ? (
                    <>
                      <th className="py-3 pr-4">Behaviour Rating</th>
                      <th className="py-3 pr-4">Performance Rating</th>
                    </>
                  ) : (
                    <th className="py-3 pr-4">Status</th>
                  )}
                  <th className="py-3 pr-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.roster.map((r, index) => {
                  const change = bulkChanges[r.studentId] || {};
                  return (
                    <tr key={r.studentId} className="hover:bg-gray-50/60 transition">
                      <td className="py-3 pl-6 pr-3 text-gray-400">{(data.page - 1) * data.pageSize + index + 1}</td>
                      <td className="py-3 pr-4">
                        <div className="flex items-center gap-2.5">
                          <Avatar name={r.name} photoUrl={r.photoUrl} index={index} />
                          <p className="font-medium text-gray-900 truncate">{r.name}</p>
                        </div>
                      </td>
                      <td className="py-3 pr-4 text-gray-500">{r.admissionId}</td>
                      <td className="py-3 pr-4">
                        <span className="text-sm font-semibold text-gray-700">
                          {r.attendancePercentage != null ? `${r.attendancePercentage}%` : '—'}
                        </span>
                      </td>
                      {bulkMode ? (
                        <>
                          <td className="py-3 pr-4">
                            <MiniChipRow
                              options={RATING_LEVELS}
                              styles={RATING_STYLES}
                              value={change.behaviour}
                              onChange={(v) =>
                                setBulkChanges((prev) => ({ ...prev, [r.studentId]: { ...prev[r.studentId], behaviour: v } }))
                              }
                            />
                          </td>
                          <td className="py-3 pr-4">
                            <MiniChipRow
                              options={OVERALL_PERFORMANCE_OPTIONS}
                              styles={OVERALL_PERFORMANCE_STYLES}
                              value={change.overallPerformance}
                              onChange={(v) =>
                                setBulkChanges((prev) => ({ ...prev, [r.studentId]: { ...prev[r.studentId], overallPerformance: v } }))
                              }
                            />
                          </td>
                        </>
                      ) : (
                        <td className="py-3 pr-4">
                          <StatusPill status={r.status === 'Completed' ? 'Completed' : 'Pending'} />
                        </td>
                      )}
                      <td className="py-3 pr-6 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Link
                            href={`/dashboard/assessments/${r.studentId}?month=${month}&year=${year}`}
                            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                              r.status === 'Completed'
                                ? 'text-indigo-700 bg-indigo-50 hover:bg-indigo-100'
                                : 'text-white bg-gradient-to-r from-violet-700 via-indigo-600 to-blue-600 hover:opacity-90'
                            }`}
                          >
                            {r.status === 'Completed' ? (
                              <>
                                <FiEdit2 className="w-3.5 h-3.5" />
                                Edit
                              </>
                            ) : (
                              'Fill Record'
                            )}
                          </Link>
                          <Link
                            href={`/dashboard/assessments/${r.studentId}?month=${month}&year=${year}`}
                            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 transition cursor-pointer"
                          >
                            <FiEye className="w-3.5 h-3.5" />
                            View
                          </Link>
                          {!bulkMode && r.status !== 'Completed' && (
                            <button
                              type="button"
                              onClick={() => setQuickTarget(r)}
                              title="Complete in 30s"
                              className="inline-flex items-center justify-center w-7 h-7 rounded-lg text-amber-600 bg-amber-50 hover:bg-amber-100 transition cursor-pointer shrink-0"
                            >
                              <FiZap className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {!isLoading && className && sectionName && data.roster.length > 0 && (
          <div className="flex items-center justify-between gap-3 px-4 sm:px-6 py-3 border-t border-gray-100">
            <p className="text-xs text-gray-500">
              Showing {(data.page - 1) * data.pageSize + 1}–{Math.min(data.page * data.pageSize, data.total)} of {data.total}
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={data.page <= 1}
                className="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-gray-200 text-gray-500 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50 cursor-pointer"
              >
                <FiChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-xs font-medium text-gray-600 min-w-[70px] text-center">
                Page {data.page} of {data.totalPages}
              </span>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))}
                disabled={data.page >= data.totalPages}
                className="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-gray-200 text-gray-500 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50 cursor-pointer"
              >
                <FiChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {bulkMode && bulkChangeCount > 0 && (
        <div className="fixed bottom-0 left-0 right-0 lg:left-64 bg-white border-t border-gray-100 px-4 sm:px-6 py-3 flex items-center justify-between gap-3 z-30">
          <p className="text-sm text-gray-600">{bulkChangeCount} student(s) with pending changes</p>
          <button
            type="button"
            onClick={handleSaveAllBulk}
            disabled={isSavingBulk}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium text-white bg-gradient-to-r from-violet-700 via-indigo-600 to-blue-600 hover:opacity-90 disabled:opacity-60 cursor-pointer transition"
          >
            <FiSave className="w-4 h-4" />
            {isSavingBulk ? 'Saving...' : `Save All (${bulkChangeCount})`}
          </button>
        </div>
      )}

      <QuickAssessmentModal
        isOpen={Boolean(quickTarget)}
        onClose={() => setQuickTarget(null)}
        student={quickTarget}
        month={month}
        year={year}
        subjects={subjects}
        onSuccess={(message) => {
          setQuickTarget(null);
          setToastMessage(message);
          reload();
        }}
      />

      {toastMessage && <Toast message={toastMessage} onClose={() => setToastMessage('')} />}
    </div>
  );
}
