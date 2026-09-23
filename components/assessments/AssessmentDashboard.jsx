'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  FiUsers,
  FiCheckCircle,
  FiClock,
  FiAlertCircle,
  FiSearch,
  FiUser,
  FiEye,
  FiEdit2,
  FiPlay,
  FiZap,
  FiLayers,
  FiSave,
  FiBarChart2,
  FiMoreVertical,
  FiChevronLeft,
  FiChevronRight,
} from 'react-icons/fi';
import Dropdown from '@/components/Dropdown';
import DropdownMenu from '@/components/DropdownMenu';
import Toast from '@/components/Toast';
import QuickAssessmentModal from './QuickAssessmentModal';
import { getSectionOptions } from '@/lib/hooks/useClassSections';
import { getClassAssessments, saveStudentAssessment } from '@/lib/api';
import {
  ASSESSMENT_STATUS_STYLES,
  RATING_LEVELS,
  RATING_STYLES,
  OVERALL_PERFORMANCE_OPTIONS,
  OVERALL_PERFORMANCE_STYLES,
  BEHAVIOUR_CATEGORIES,
} from '@/lib/assessmentConstants';

// Quick-glance fill state for a roster row's Academic/Behaviour/
// Participation columns — a filled green check vs. an empty gray ring, no
// label needed at this size (the column header already says what it is).
function SectionStatusDot({ filled }) {
  return filled ? (
    <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-green-100 text-green-600">
      <FiCheckCircle className="w-3.5 h-3.5" />
    </span>
  ) : (
    <span className="inline-block w-5 h-5 rounded-full border-2 border-gray-200" />
  );
}

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

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
}

function timeAgo(iso) {
  const minutes = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function StatCard({ label, value, icon, iconBg, sub }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <div className="flex items-center justify-between">
        <span className={`flex items-center justify-center w-11 h-11 rounded-xl shrink-0 ${iconBg}`}>{icon}</span>
      </div>
      <p className="text-sm font-medium text-gray-500 mt-3">{label}</p>
      <p className="text-3xl font-bold text-gray-900 mt-1">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
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
  recentlyAssessed,
}) {
  const router = useRouter();
  const [className, setClassName] = useState(defaultClass);
  const [sectionName, setSectionName] = useState(defaultSection);
  const [month, setMonth] = useState(defaultMonth);
  const [year, setYear] = useState(defaultYear);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
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
  // keystroke — search now runs server-side (see getAssessmentsForClass)
  // so it has to be a real request, not a client-side filter.
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
  }, [className, sectionName, month, year, academicSession, page, debouncedSearch]);

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

  const handleMonthChange = (value) => {
    setMonth(Number(value));
    setPage(1);
  };

  const handleYearChange = (value) => {
    setYear(Number(value));
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

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Monthly Assessments</h1>
          <p className="text-sm text-gray-500 mt-1">Complete a student&apos;s monthly assessment in a couple of minutes.</p>
        </div>
        {className && sectionName && (
          <Link
            href={`/dashboard/assessments/reports?class=${encodeURIComponent(className)}&section=${encodeURIComponent(sectionName)}&month=${month}&year=${year}`}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-sm font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 transition cursor-pointer"
          >
            <FiBarChart2 className="w-4 h-4" />
            View Reports
          </Link>
        )}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Students" value={stats.total} icon={<FiUsers className="w-5 h-5" />} iconBg="bg-indigo-100 text-indigo-600" />
        <StatCard label="Completed" value={stats.completed} icon={<FiCheckCircle className="w-5 h-5" />} iconBg="bg-green-100 text-green-600" />
        <StatCard label="Pending" value={stats.pending} icon={<FiClock className="w-5 h-5" />} iconBg="bg-amber-100 text-amber-600" />
        <StatCard
          label="Completion %"
          value={`${stats.completionPercent}%`}
          icon={<FiAlertCircle className="w-5 h-5" />}
          iconBg="bg-violet-100 text-violet-600"
        />
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-medium text-gray-700">Class progress</p>
          <p className="text-sm font-semibold text-gray-900">{stats.completionPercent}%</p>
        </div>
        <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-violet-700 via-indigo-600 to-blue-600 rounded-full transition-all"
            style={{ width: `${stats.completionPercent}%` }}
          />
        </div>
      </div>

      {recentlyAssessed?.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Recently Assessed</p>
          <div className="flex items-center gap-3 overflow-x-auto pb-1">
            {recentlyAssessed.map((r) => (
              <Link
                key={`${r.studentId}-${r.month}-${r.year}`}
                href={`/dashboard/assessments/${r.studentId}?month=${r.month}&year=${r.year}`}
                className="flex items-center gap-2 px-3 py-2 rounded-xl border border-gray-100 hover:border-indigo-200 hover:bg-indigo-50/40 transition cursor-pointer shrink-0"
              >
                <span
                  className={`w-2 h-2 rounded-full shrink-0 ${r.status === 'Completed' ? 'bg-green-500' : 'bg-amber-500'}`}
                />
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-gray-900 truncate max-w-[140px]">{r.name}</p>
                  <p className="text-[11px] text-gray-400">
                    {r.className} - {r.sectionName} • {timeAgo(r.updatedAt)}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoComplete="off"
            placeholder="Search by name or admission no..."
            className="w-full pl-10 pr-4 py-2.5 text-sm border border-gray-200 rounded-full focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <div className="w-36">
          <Dropdown options={classOptions} value={className} onChange={handleClassChange} placeholder="Class" />
        </div>
        <div className="w-40">
          <Dropdown options={sectionOptions} value={sectionName} onChange={handleSectionChange} placeholder="Section" />
        </div>
        <div className="w-40">
          <Dropdown options={MONTH_OPTIONS} value={String(month)} onChange={handleMonthChange} />
        </div>
        <div className="w-28">
          <Dropdown options={yearOptions()} value={String(year)} onChange={handleYearChange} />
        </div>
        <button
          type="button"
          onClick={() => {
            setBulkMode((prev) => !prev);
            setBulkChanges({});
          }}
          className={`inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-sm font-medium transition cursor-pointer whitespace-nowrap ${
            bulkMode ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          <FiLayers className="w-4 h-4" />
          Bulk Assessment Mode
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="text-center py-16 text-sm text-gray-400">Loading...</div>
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
                  <th className="py-3 pr-4">Student Name</th>
                  <th className="py-3 pr-4 text-center">Attendance</th>
                  {bulkMode ? (
                    <>
                      <th className="py-3 pr-4">Behaviour Rating</th>
                      <th className="py-3 pr-4">Performance Rating</th>
                    </>
                  ) : (
                    <>
                      <th className="py-3 pr-4 text-center">Academic</th>
                      <th className="py-3 pr-4 text-center">Behaviour</th>
                      <th className="py-3 pr-4 text-center">Participation</th>
                    </>
                  )}
                  <th className="py-3 pr-4">Status</th>
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
                          <span className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 text-gray-400 shrink-0 overflow-hidden">
                            {r.photoUrl ? (
                              <img src={r.photoUrl} alt={r.name} className="w-full h-full object-cover" />
                            ) : (
                              <FiUser className="w-3.5 h-3.5" />
                            )}
                          </span>
                          <div className="min-w-0">
                            <p className="font-medium text-gray-900 truncate">{r.name}</p>
                            <p className="text-xs text-gray-400 truncate">{r.admissionId}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 pr-4 text-center">
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
                        <>
                          <td className="py-3 pr-4 text-center">
                            <SectionStatusDot filled={r.sections.academic} />
                          </td>
                          <td className="py-3 pr-4 text-center">
                            <SectionStatusDot filled={r.sections.behaviour} />
                          </td>
                          <td className="py-3 pr-4 text-center">
                            <SectionStatusDot filled={r.sections.participation} />
                          </td>
                        </>
                      )}
                      <td className="py-3 pr-4">
                        <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${ASSESSMENT_STATUS_STYLES[r.status]}`}>{r.status}</span>
                      </td>
                      <td className="py-3 pr-6 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Link
                            href={`/dashboard/assessments/${r.studentId}?month=${month}&year=${year}`}
                            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition cursor-pointer ${
                              r.status === 'Completed'
                                ? 'text-gray-600 bg-gray-100 hover:bg-gray-200'
                                : 'text-white bg-gradient-to-r from-violet-700 via-indigo-600 to-blue-600 hover:opacity-90'
                            }`}
                          >
                            {r.status === 'Completed' ? (
                              <>
                                <FiEye className="w-3.5 h-3.5" />
                                View
                              </>
                            ) : (
                              <>
                                <FiEdit2 className="w-3.5 h-3.5" />
                                Fill
                              </>
                            )}
                          </Link>
                          {!bulkMode && (
                            <DropdownMenu
                              trigger={<FiMoreVertical className="w-4 h-4" />}
                              items={[
                                { label: 'Complete in 30s', icon: <FiZap className="w-4 h-4" />, onClick: () => setQuickTarget(r) },
                                {
                                  label: 'Open Full Form',
                                  icon: <FiPlay className="w-4 h-4" />,
                                  onClick: () => router.push(`/dashboard/assessments/${r.studentId}?month=${month}&year=${year}`),
                                },
                              ]}
                            />
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
