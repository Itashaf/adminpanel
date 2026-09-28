'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { FiSearch, FiUsers, FiCheckCircle, FiClock, FiArrowRight, FiFileText } from 'react-icons/fi';
import Dropdown from '@/components/Dropdown';
import Pagination from '@/components/Pagination';
import { getYearlyDashboard, getYearlyReport } from '@/lib/api';
import { useClassSections, getSectionOptions } from '@/lib/hooks/useClassSections';
import { printYearlyReport } from './printYearlyReport';
import PerformanceTabs from './PerformanceTabs';

const PAGE_SIZE = 10;

// Same palette/component as StudentsTable.jsx's Avatar / Monthly Reports'
// table — all three tables in this app share one look.
const AVATAR_COLORS = ['bg-blue-500', 'bg-violet-700', 'bg-purple-500', 'bg-indigo-600', 'bg-pink-500', 'bg-cyan-600'];

function initialsOf(name) {
  const parts = (name || '').trim().split(/\s+/);
  return ((parts[0]?.[0] || '') + (parts[1]?.[0] || '')).toUpperCase();
}

function Avatar({ name, index }) {
  return (
    <span className={`flex items-center justify-center w-10 h-10 rounded-full text-white text-sm font-semibold shrink-0 ${AVATAR_COLORS[index % AVATAR_COLORS.length]}`}>
      {initialsOf(name)}
    </span>
  );
}

const RATING_STYLE = {
  EXCELLENT: { label: 'Excellent', dot: 'bg-emerald-600', className: 'bg-emerald-50 text-emerald-700' },
  GOOD: { label: 'Good', dot: 'bg-blue-600', className: 'bg-blue-50 text-blue-700' },
  IMPROVING: { label: 'Improving', dot: 'bg-orange-500', className: 'bg-orange-50 text-orange-700' },
  SUPPORT_NEEDED: { label: 'Support Needed', dot: 'bg-red-500', className: 'bg-red-50 text-red-700' },
};

export default function YearlyDashboardExplorer({ classOptions, sessionOptions, defaultAcademicSession, canManage, school }) {
  const [academicSession, setAcademicSession] = useState(defaultAcademicSession);
  const [className, setClassName] = useState('');
  const [sectionName, setSectionName] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [busyRowId, setBusyRowId] = useState(null);
  const classSections = useClassSections();

  const handleGeneratePdf = async (studentId) => {
    setBusyRowId(studentId);
    setError('');
    try {
      const report = await getYearlyReport(studentId, { academicSession });
      printYearlyReport({ school, report, academicSession });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyRowId(null);
    }
  };

  useEffect(() => {
    if (!academicSession) return;
    setError('');
    getYearlyDashboard({ academicSession, class: className, section: sectionName, search })
      .then(setData)
      .catch((err) => setError(err.message));
  }, [academicSession, className, sectionName, search]);

  const totalPages = Math.max(1, Math.ceil((data?.rows.length || 0) / PAGE_SIZE));
  const pagedRows = useMemo(() => (data?.rows || []).slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), [data, page]);

  const changeFilter = (setter) => (value) => {
    setter(value);
    setPage(1);
  };

  return (
    <div className="space-y-6">
      <PerformanceTabs />

      <div>
        <h1 className="text-2xl font-bold text-gray-900">Yearly Reports</h1>
        <p className="text-sm text-gray-500 mt-1">View and manage students&apos; yearly performance reports.</p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-wrap gap-3 items-end">
        <div className="w-40">
          <label className="block text-xs font-medium text-gray-400 mb-1">Session</label>
          <Dropdown placeholder="Session" value={academicSession} onChange={changeFilter(setAcademicSession)} options={sessionOptions} />
        </div>
        <div className="w-40">
          <label className="block text-xs font-medium text-gray-400 mb-1">Class</label>
          <Dropdown
            placeholder="All Classes"
            value={className}
            onChange={(v) => {
              changeFilter(setClassName)(v);
              setSectionName('');
            }}
            options={[{ value: '', label: 'All Classes' }, ...classOptions]}
          />
        </div>
        <div className="w-40">
          <label className="block text-xs font-medium text-gray-400 mb-1">Section</label>
          <Dropdown
            placeholder="All Sections"
            value={sectionName}
            onChange={changeFilter(setSectionName)}
            options={[{ value: '', label: 'All Sections' }, ...getSectionOptions(classSections, className)]}
            disabled={!className}
          />
        </div>
        <div className="relative flex-1 min-w-[200px]">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search students..."
            value={search}
            onChange={(e) => changeFilter(setSearch)(e.target.value)}
            className="pl-9 pr-3 py-2.5 w-full text-sm border border-gray-200 rounded-full focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      {error && <p className="text-sm text-red-500 bg-red-50 border border-red-100 rounded-lg px-4 py-3">{error}</p>}

      {!academicSession ? (
        <p className="text-sm text-gray-400 text-center py-8">
          No academic session found for the school currently in context. If you&apos;re Super Admin, open{' '}
          <span className="font-medium text-gray-600">Manage This School</span> for the school you want to view first.
        </p>
      ) : !data ? (
        <p className="text-sm text-gray-400 text-center py-8">Loading...</p>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="rounded-2xl p-5 bg-indigo-50">
              <div className="flex items-center gap-2 text-indigo-500 text-xs font-medium uppercase tracking-wide">
                <FiUsers className="w-4 h-4" /> Total Students
              </div>
              <p className="text-3xl font-bold text-gray-900 mt-2">{data.cards.totalStudents}</p>
            </div>
            <div className="rounded-2xl p-5 bg-emerald-50">
              <div className="flex items-center gap-2 text-emerald-600 text-xs font-medium uppercase tracking-wide">
                <FiCheckCircle className="w-4 h-4" /> Reports Generated
              </div>
              <p className="text-3xl font-bold text-gray-900 mt-2">{data.cards.reportsGenerated}</p>
            </div>
            <div className="rounded-2xl p-5 bg-amber-50">
              <div className="flex items-center gap-2 text-amber-600 text-xs font-medium uppercase tracking-wide">
                <FiClock className="w-4 h-4" /> Reports Pending
              </div>
              <p className="text-3xl font-bold text-gray-900 mt-2">{data.cards.reportsPending}</p>
            </div>
          </div>

          <div>
            <h3 className="text-base font-bold text-gray-900">Students ({data.rows.length})</h3>
            <p className="text-xs text-gray-400 mt-0.5">Manage yearly reports for all students</p>
          </div>

          {/* Same wrapper/spacing/colors/fonts as StudentsTable.jsx. */}
          <div className="relative bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            {pagedRows.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-10">No students match this filter.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      <th className="py-4 pl-6 pr-4">Student &amp; ID</th>
                      <th className="py-4 pr-4">Class / Section</th>
                      <th className="py-4 pr-4">Attendance %</th>
                      <th className="py-4 pr-4">Academic Avg</th>
                      <th className="py-4 pr-4">Activities</th>
                      <th className="py-4 pr-4">Awards</th>
                      <th className="py-4 pr-4">Final Rating</th>
                      <th className="py-4 pr-6 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {pagedRows.map((r, index) => {
                      const rating = r.finalRating ? RATING_STYLE[r.finalRating] : null;
                      return (
                        <tr key={r.studentId} className="hover:bg-gray-50/60 transition">
                          <td className="py-5 pl-6 pr-4">
                            <div className="flex items-center gap-3">
                              <Avatar name={r.studentName} index={index} />
                              <p className="font-semibold text-gray-900">{r.studentName}</p>
                            </div>
                          </td>
                          <td className="py-5 pr-4">
                            <div className="flex items-center gap-2">
                              <span className="text-gray-700">{r.className}</span>
                              {r.sectionName && (
                                <span className="flex items-center justify-center w-6 h-6 rounded-md bg-gray-100 text-xs font-semibold text-gray-600 shrink-0">
                                  {r.sectionName}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-5 pr-4 text-gray-700">{r.attendancePercent}%</td>
                          <td className="py-5 pr-4 text-gray-700">{r.academicAverage}%</td>
                          <td className="py-5 pr-4 text-gray-700">{r.activitiesCount}</td>
                          <td className="py-5 pr-4 text-gray-700">{r.awardsCount}</td>
                          <td className="py-5 pr-4">
                            {rating ? (
                              <span className={`inline-flex items-center gap-1.5 text-xs font-semibold rounded-full px-3 py-1 ${rating.className}`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${rating.dot}`} />
                                {rating.label}
                              </span>
                            ) : (
                              <span className="text-xs text-gray-300">—</span>
                            )}
                          </td>
                          <td className="py-5 pr-6 text-right">
                            <div className="flex items-center justify-end gap-3">
                              <button
                                type="button"
                                onClick={() => handleGeneratePdf(r.studentId)}
                                disabled={busyRowId === r.studentId}
                                className="text-gray-400 hover:text-indigo-600 disabled:opacity-40 cursor-pointer"
                                title="Generate PDF"
                              >
                                <FiFileText className="w-4 h-4" />
                              </button>
                              <Link
                                href={`/dashboard/performance/yearly/${r.studentId}?academicSession=${encodeURIComponent(academicSession)}`}
                                className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-700"
                              >
                                {canManage ? 'Open' : 'View'}
                                <FiArrowRight className="w-3.5 h-3.5" />
                              </Link>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {totalPages > 1 && (
              <div className="px-6 py-4 border-t border-gray-100">
                <Pagination page={page} totalPages={totalPages} onPageChange={setPage} totalCount={data.rows.length} pageSize={PAGE_SIZE} itemLabel="students" />
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
