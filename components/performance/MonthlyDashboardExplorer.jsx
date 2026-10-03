'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  FiSearch,
  FiUsers,
  FiCheckCircle,
  FiClock,
  FiArrowRight,
  FiUpload,
  FiPrinter,
  FiFileText,
} from 'react-icons/fi';
import Button from '@/components/Button';
import KPICard from '@/components/dashboard/KPICard';
import Dropdown from '@/components/Dropdown';
import Toast from '@/components/Toast';
import FixedPaginationBar from '@/components/FixedPaginationBar';
import { getMonthlyDashboard, getMonthlyReport } from '@/lib/api';
import { useClassSections, getSectionOptions } from '@/lib/hooks/useClassSections';
import { useUrlSync } from '@/lib/hooks/useUrlSync';
import { printMonthlyReport, printMonthlyReportsBulk } from './printMonthlyReport';
import BulkImportModal from './BulkImportModal';
import PerformanceListSkeleton from './PerformanceListSkeleton';

const PAGE_SIZE = 10;

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
  const searchParams = useSearchParams();
  const [academicSession, setAcademicSession] = useState(() => searchParams.get('session') || defaultAcademicSession);
  const [month, setMonth] = useState(() => searchParams.get('month') || currentMonth());
  const [className, setClassName] = useState(() => searchParams.get('class') || '');
  const [sectionName, setSectionName] = useState(() => searchParams.get('section') || '');
  const [search, setSearch] = useState(() => searchParams.get('q') || '');
  const [page, setPage] = useState(() => Number(searchParams.get('page')) || 1);

  useUrlSync(
    { session: academicSession, month, class: className, section: sectionName, q: search, page },
    { session: defaultAcademicSession, month: currentMonth(), class: '', section: '', q: '', page: 1 }
  );
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [busyRowId, setBusyRowId] = useState(null);
  const [isBulkBusy, setIsBulkBusy] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [showBulkImport, setShowBulkImport] = useState(false);
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

  return (
    <div className="space-y-6 pb-12">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Monthly Reports</h1>
          <p className="text-sm text-gray-500 mt-1">View and manage students&apos; monthly performance reports.</p>
        </div>
        {canManage && (
          <div className="flex items-center gap-2">
            <Button label="Bulk Import" icon={<FiUpload className="w-4 h-4" />} onClick={() => setShowBulkImport(true)} />
          </div>
        )}
      </div>

      {academicSession && data && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <KPICard label="Total Students" icon={<FiUsers className="w-4 h-4" />} value={data.cards.totalStudents} />
          <KPICard
            label="Completed Reports"
            icon={<FiCheckCircle className="w-4 h-4" />}
            value={data.cards.completedReports}
            context={`${data.cards.totalStudents > 0 ? Math.round((data.cards.completedReports / data.cards.totalStudents) * 100) : 0}% of students`}
          />
          <KPICard
            label="Pending Reports"
            icon={<FiClock className="w-4 h-4" />}
            value={data.cards.pendingReports}
            context={`${data.cards.totalStudents > 0 ? Math.round((data.cards.pendingReports / data.cards.totalStudents) * 100) : 0}% of students`}
          />
        </div>
      )}

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
        <PerformanceListSkeleton statCount={0} />
      ) : (
        <>
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
                    {pagedRows.map((r) => {
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
                            <div>
                              <p className="font-semibold text-gray-900">{r.studentName}</p>
                              <p className="text-xs text-gray-400">{r.admissionId}</p>
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

          </div>
        </>
      )}

      <FixedPaginationBar page={page} totalPages={totalPages} onPageChange={setPage} totalCount={data?.rows.length ?? 0} pageSize={PAGE_SIZE} itemLabel="students" />

      {toastMessage && <Toast message={toastMessage} onClose={() => setToastMessage('')} />}

      <BulkImportModal
        isOpen={showBulkImport}
        onClose={() => setShowBulkImport(false)}
        classOptions={classOptions}
        defaultAcademicSession={academicSession}
        defaultMonth={month}
        defaultClassName={className}
        defaultSectionName={sectionName}
        onImported={refresh}
      />
    </div>
  );
}
