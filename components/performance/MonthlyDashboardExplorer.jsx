'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  FiSearch,
  FiUsers,
  FiCheckCircle,
  FiClock,
  FiLock,
  FiArrowRight,
  FiUpload,
  FiDownload,
  FiPrinter,
  FiFileText,
} from 'react-icons/fi';
import Button from '@/components/Button';
import Dropdown from '@/components/Dropdown';
import Toast from '@/components/Toast';
import Pagination from '@/components/Pagination';
import { getMonthlyDashboard, getMonthlyReport, lockMonthlyReport } from '@/lib/api';
import { useClassSections, getSectionOptions } from '@/lib/hooks/useClassSections';
import { printMonthlyReport, printMonthlyReportsBulk } from './printMonthlyReport';
import PerformanceTabs from './PerformanceTabs';

const PAGE_SIZE = 10;

// Same palette/component shape as StudentsTable.jsx's Avatar — this table
// is styled to match that one exactly, so it reuses the same convention
// rather than a different one.
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

const STATUS_STYLE = {
  DRAFT: { label: 'Draft', dot: 'bg-gray-400', className: 'bg-gray-100 text-gray-500' },
  COMPLETED: { label: 'Completed', dot: 'bg-blue-600', className: 'bg-blue-50 text-blue-700' },
  LOCKED: { label: 'Locked', dot: 'bg-emerald-600', className: 'bg-emerald-50 text-emerald-700' },
  PENDING: { label: 'Pending', dot: 'bg-amber-500', className: 'bg-amber-50 text-amber-700' },
};

function currentMonth() {
  return new Date().toISOString().slice(0, 7);
}

export default function MonthlyDashboardExplorer({ classOptions, sessionOptions, defaultAcademicSession, canManage, school }) {
  const [academicSession, setAcademicSession] = useState(defaultAcademicSession);
  const [month, setMonth] = useState(currentMonth());
  const [className, setClassName] = useState('');
  const [sectionName, setSectionName] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [busyRowId, setBusyRowId] = useState(null);
  const [isBulkBusy, setIsBulkBusy] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const classSections = useClassSections();

  const refresh = () => {
    if (!academicSession || !month) return;
    getMonthlyDashboard({ academicSession, month, class: className, section: sectionName, search })
      .then(setData)
      .catch((err) => setError(err.message));
  };

  useEffect(() => {
    if (!academicSession || !month) return;
    setError('');
    setSelectedIds(new Set());
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [academicSession, month, className, sectionName, search]);

  const totalPages = Math.max(1, Math.ceil((data?.rows.length || 0) / PAGE_SIZE));
  const pagedRows = useMemo(() => (data?.rows || []).slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), [data, page]);

  const changeFilter = (setter) => (value) => {
    setter(value);
    setPage(1);
  };

  const allPagedSelected = pagedRows.length > 0 && pagedRows.every((r) => selectedIds.has(r.studentId));
  const toggleSelectAll = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allPagedSelected) pagedRows.forEach((r) => next.delete(r.studentId));
      else pagedRows.forEach((r) => next.add(r.studentId));
      return next;
    });
  };
  const toggleSelectOne = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleGeneratePdf = async (studentId) => {
    setBusyRowId(studentId);
    setError('');
    try {
      const report = await getMonthlyReport(studentId, { academicSession, month });
      printMonthlyReport({ school, report, academicSession, month });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyRowId(null);
    }
  };

  const handleLockRow = async (studentId) => {
    setBusyRowId(studentId);
    setError('');
    try {
      await lockMonthlyReport(studentId, { academicSession, month });
      refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyRowId(null);
    }
  };

  // "Print Selected" / "Generate PDFs" — same combined print job (every
  // selected student's report as its own page, see printMonthlyReportsBulk)
  // under two labels, matching the reference's two separate buttons for
  // what's really one action: this app has never generated a downloadable
  // PDF file server-side, "Generate" and "Print" both mean "open the
  // browser's print dialog" here (see printMonthlyReport.js).
  const handlePrintSelected = async () => {
    if (selectedIds.size === 0) return;
    setIsBulkBusy(true);
    setError('');
    try {
      const reports = await Promise.all([...selectedIds].map((id) => getMonthlyReport(id, { academicSession, month })));
      printMonthlyReportsBulk({ school, reports, academicSession, month });
    } catch (err) {
      setError(err.message);
    } finally {
      setIsBulkBusy(false);
    }
  };

  // "Lock Selected" — sequential, not Promise.all: each lock call also
  // writes a ReportLock audit row, and running them one at a time keeps
  // "3 of 12 failed" reporting simple and avoids hammering the DB with a
  // burst of concurrent transactions for a large section.
  const handleLockSelected = async () => {
    if (selectedIds.size === 0) return;
    setIsBulkBusy(true);
    setError('');
    let succeeded = 0;
    const failures = [];
    for (const id of selectedIds) {
      try {
        await lockMonthlyReport(id, { academicSession, month });
        succeeded += 1;
      } catch (err) {
        failures.push(err.message);
      }
    }
    setIsBulkBusy(false);
    setToastMessage(failures.length === 0 ? `${succeeded} report(s) locked.` : `${succeeded} locked, ${failures.length} failed.`);
    refresh();
  };

  return (
    <div className="space-y-6">
      <PerformanceTabs />

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Monthly Reports</h1>
          <p className="text-sm text-gray-500 mt-1">View and manage students&apos; monthly performance reports.</p>
        </div>
        {canManage && (
          <div className="flex items-center gap-2">
            <Link href="/dashboard/performance/monthly/import">
              <Button label="Import Excel" variant="secondary" icon={<FiDownload className="w-4 h-4" />} />
            </Link>
            <Link href="/dashboard/performance/monthly/import">
              <Button label="Download Template" variant="secondary" icon={<FiDownload className="w-4 h-4" />} />
            </Link>
            <Link href="/dashboard/performance/monthly/import">
              <Button label="Bulk Import" icon={<FiUpload className="w-4 h-4" />} />
            </Link>
          </div>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-wrap gap-3 items-end">
        <div className="w-40">
          <label className="block text-xs font-medium text-gray-400 mb-1">Session</label>
          <Dropdown placeholder="Session" value={academicSession} onChange={changeFilter(setAcademicSession)} options={sessionOptions} />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1">Month</label>
          <input
            type="month"
            value={month}
            onChange={(e) => changeFilter(setMonth)(e.target.value)}
            className="px-3 py-2.5 text-sm border border-gray-200 rounded-full focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
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
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="rounded-2xl p-5 bg-indigo-50">
              <div className="flex items-center gap-2 text-indigo-500 text-xs font-medium uppercase tracking-wide">
                <FiUsers className="w-4 h-4" /> Total Students
              </div>
              <p className="text-3xl font-bold text-gray-900 mt-2">{data.cards.totalStudents}</p>
            </div>
            <div className="rounded-2xl p-5 bg-emerald-50">
              <div className="flex items-center gap-2 text-emerald-600 text-xs font-medium uppercase tracking-wide">
                <FiCheckCircle className="w-4 h-4" /> Completed Reports
              </div>
              <p className="text-3xl font-bold text-gray-900 mt-2">{data.cards.completedReports}</p>
              <p className="text-xs text-gray-400 mt-0.5">
                {data.cards.totalStudents > 0 ? Math.round((data.cards.completedReports / data.cards.totalStudents) * 100) : 0}% of students
              </p>
            </div>
            <div className="rounded-2xl p-5 bg-amber-50">
              <div className="flex items-center gap-2 text-amber-600 text-xs font-medium uppercase tracking-wide">
                <FiClock className="w-4 h-4" /> Pending Reports
              </div>
              <p className="text-3xl font-bold text-gray-900 mt-2">{data.cards.pendingReports}</p>
              <p className="text-xs text-gray-400 mt-0.5">
                {data.cards.totalStudents > 0 ? Math.round((data.cards.pendingReports / data.cards.totalStudents) * 100) : 0}% of students
              </p>
            </div>
            <div className="rounded-2xl p-5 bg-emerald-50">
              <div className="flex items-center gap-2 text-emerald-600 text-xs font-medium uppercase tracking-wide">
                <FiLock className="w-4 h-4" /> Locked Reports
              </div>
              <p className="text-3xl font-bold text-gray-900 mt-2">{data.cards.lockedReports}</p>
              <p className="text-xs text-gray-400 mt-0.5">
                {data.cards.totalStudents > 0 ? Math.round((data.cards.lockedReports / data.cards.totalStudents) * 100) : 0}% of students
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <h3 className="text-base font-bold text-gray-900">Students ({data.rows.length})</h3>
              <p className="text-xs text-gray-400 mt-0.5">
                {selectedIds.size > 0 ? `${selectedIds.size} selected` : 'Manage monthly reports for all students'}
              </p>
            </div>
            {canManage && (
              <div className="flex items-center gap-2">
                <Button
                  label={isBulkBusy ? 'Printing...' : 'Print Selected'}
                  variant="secondary"
                  icon={<FiPrinter className="w-4 h-4" />}
                  onClick={handlePrintSelected}
                  disabled={isBulkBusy || selectedIds.size === 0}
                />
                <Button
                  label={isBulkBusy ? 'Generating...' : 'Generate PDFs'}
                  variant="secondary"
                  icon={<FiFileText className="w-4 h-4" />}
                  onClick={handlePrintSelected}
                  disabled={isBulkBusy || selectedIds.size === 0}
                />
                <Button
                  label={isBulkBusy ? 'Locking...' : 'Lock Selected'}
                  icon={<FiLock className="w-4 h-4" />}
                  onClick={handleLockSelected}
                  disabled={isBulkBusy || selectedIds.size === 0}
                />
              </div>
            )}
          </div>

          {/* Same wrapper/spacing/colors/fonts as StudentsTable.jsx — this
              table is deliberately styled to match the All Students table
              exactly, not its own independent design. */}
          <div className="relative bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            {pagedRows.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-10">No students match this filter.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      {canManage && (
                        <th className="py-4 pl-6 pr-3 w-10">
                          <input type="checkbox" checked={allPagedSelected} onChange={toggleSelectAll} className="w-[18px] h-[18px] rounded-md border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer" />
                        </th>
                      )}
                      <th className={`py-4 pr-4 ${canManage ? '' : 'pl-6'}`}>Student &amp; ID</th>
                      <th className="py-4 pr-4">Class / Section</th>
                      <th className="py-4 pr-4">Attendance %</th>
                      <th className="py-4 pr-4">Tests</th>
                      <th className="py-4 pr-4">Activities</th>
                      <th className="py-4 pr-4">Status</th>
                      <th className="py-4 pr-6 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {pagedRows.map((r, index) => {
                      const status = STATUS_STYLE[r.status] || { label: r.status, dot: 'bg-gray-400', className: 'bg-gray-100 text-gray-500' };
                      return (
                        <tr key={r.studentId} className="hover:bg-gray-50/60 transition">
                          {canManage && (
                            <td className="py-5 pl-6 pr-3">
                              <input
                                type="checkbox"
                                checked={selectedIds.has(r.studentId)}
                                onChange={() => toggleSelectOne(r.studentId)}
                                className="w-[18px] h-[18px] rounded-md border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                              />
                            </td>
                          )}
                          <td className={`py-5 pr-4 ${canManage ? '' : 'pl-6'}`}>
                            <div className="flex items-center gap-3">
                              <Avatar name={r.studentName} index={index} />
                              <div>
                                <p className="font-semibold text-gray-900">{r.studentName}</p>
                                <p className="text-xs text-gray-400">{r.admissionId}</p>
                              </div>
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
                          <td className="py-5 pr-4 text-gray-700">{r.testsCount}</td>
                          <td className="py-5 pr-4 text-gray-700">{r.activitiesCount}</td>
                          <td className="py-5 pr-4">
                            <span className={`inline-flex items-center gap-1.5 text-xs font-semibold rounded-full px-3 py-1 ${status.className}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
                              {status.label}
                            </span>
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
                              {canManage && (
                                <button
                                  type="button"
                                  onClick={() => r.status !== 'LOCKED' && handleLockRow(r.studentId)}
                                  disabled={busyRowId === r.studentId || r.status === 'LOCKED'}
                                  className={`cursor-pointer ${r.status === 'LOCKED' ? 'text-emerald-500 cursor-default' : 'text-gray-400 hover:text-emerald-600'} disabled:opacity-60`}
                                  title={r.status === 'LOCKED' ? 'Locked' : 'Lock Report'}
                                >
                                  <FiLock className="w-4 h-4" />
                                </button>
                              )}
                              <Link
                                href={`/dashboard/performance/monthly/${r.studentId}?academicSession=${encodeURIComponent(academicSession)}&month=${month}`}
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

      {toastMessage && <Toast message={toastMessage} onClose={() => setToastMessage('')} />}
    </div>
  );
}
