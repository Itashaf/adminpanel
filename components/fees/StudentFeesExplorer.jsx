'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { FiSearch, FiDownload, FiUsers, FiCreditCard, FiClock, FiChevronUp, FiChevronDown } from 'react-icons/fi';
import Dropdown from '@/components/Dropdown';
import Pagination from '@/components/Pagination';
import Badge from '@/components/Badge';
import Button from '@/components/Button';
import Input from '@/components/Input';
import Toast from '@/components/Toast';
import StudentFeeDetailPanel from './StudentFeeDetailPanel';
import BulkCollectModal from './BulkCollectModal';
import { useClassSections } from '@/lib/hooks/useClassSections';
import { getStudentFeeSummaries, getStudentFeesStats } from '@/lib/api';

function formatCurrency(amount) {
  return `₹${amount.toLocaleString('en-IN')}`;
}

const STATUS_OPTIONS = [
  { value: '', label: 'All' },
  { value: 'PAID', label: 'Paid' },
  { value: 'PARTIAL', label: 'Partial' },
  { value: 'DUE', label: 'Due' },
];

const STATUS_BADGE = {
  PAID: { label: 'Paid', variant: 'green' },
  PARTIAL: { label: 'Partial', variant: 'violet' },
  DUE: { label: 'Due', variant: 'red' },
  NO_FEES: { label: 'No Fees', variant: 'gray' },
};

function SortableHeader({ label, field, sortBy, sortDir, onSort }) {
  const isActive = sortBy === field;
  return (
    <th className="py-4 pr-4">
      <button
        type="button"
        onClick={() => onSort(field)}
        className="flex items-center gap-1 cursor-pointer hover:text-gray-700"
      >
        {label}
        {isActive ? (
          sortDir === 'asc' ? (
            <FiChevronUp className="w-3.5 h-3.5" />
          ) : (
            <FiChevronDown className="w-3.5 h-3.5" />
          )
        ) : (
          <FiChevronDown className="w-3.5 h-3.5 opacity-30" />
        )}
      </button>
    </th>
  );
}

export default function StudentFeesExplorer({ feesStats, totalStudents, initialResult, initialFilters, pageSize, school }) {
  const router = useRouter();
  const pathname = usePathname();
  const [stats, setStats] = useState(feesStats);
  const [className, setClassName] = useState(initialFilters?.className || '');
  const [section, setSection] = useState(initialFilters?.section || '');
  const [status, setStatus] = useState(initialFilters?.status || '');
  const [search, setSearch] = useState(initialFilters?.search || '');
  const [sortBy, setSortBy] = useState(initialFilters?.sortBy || '');
  const [sortDir, setSortDir] = useState(initialFilters?.sortDir || 'desc');
  const [page, setPage] = useState(initialFilters?.page || 1);
  const [result, setResult] = useState(initialResult);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [activeStudentId, setActiveStudentId] = useState(null);
  const [autoCollect, setAutoCollect] = useState(false);
  const [bulkCollectOpen, setBulkCollectOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const classSections = useClassSections();

  const classOptions = useMemo(
    () => [{ value: '', label: 'All Classes' }, ...Object.keys(classSections).map((c) => ({ value: c, label: c }))],
    [classSections]
  );
  const sectionOptions = useMemo(
    () => [{ value: '', label: 'All Sections' }, ...(classSections[className] || []).map((s) => ({ value: s, label: s }))],
    [classSections, className]
  );

  // Debounced — a request per keystroke would spam the summary endpoint
  // (it re-aggregates every StudentFee for the filtered students on every
  // call, not a cheap indexed lookup). The URL is kept in sync with the
  // same filters on the same debounce (not on every keystroke) so a
  // refresh — or sharing/bookmarking this link — comes back to the same
  // class/section/status/search/sort/page instead of resetting to blank.
  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    const timeout = setTimeout(() => {
      getStudentFeeSummaries({ className, section, status, search, sortBy, sortDir, page, pageSize })
        .then((data) => {
          if (!cancelled) setResult(data);
        })
        .finally(() => {
          if (!cancelled) setIsLoading(false);
        });

      const params = new URLSearchParams();
      if (className) params.set('class', className);
      if (section) params.set('section', section);
      if (status) params.set('status', status);
      if (search) params.set('search', search);
      if (sortBy) {
        params.set('sortBy', sortBy);
        params.set('sortDir', sortDir);
      }
      if (page > 1) params.set('page', String(page));
      const queryString = params.toString();
      router.replace(queryString ? `${pathname}?${queryString}` : pathname, { scroll: false });
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [className, section, status, search, sortBy, sortDir, page]);

  const resetToPage1 = () => setPage(1);

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(field);
      setSortDir('desc');
    }
    resetToPage1();
  };

  const toggleRow = (studentId) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(studentId)) next.delete(studentId);
      else next.add(studentId);
      return next;
    });
  };

  const toggleAllOnPage = () => {
    const pageIds = result.rows.map((r) => r.studentId);
    const allSelected = pageIds.every((id) => selectedIds.has(id));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      pageIds.forEach((id) => (allSelected ? next.delete(id) : next.add(id)));
      return next;
    });
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const all = await getStudentFeeSummaries({ className, section, status, search, sortBy, sortDir, page: 1, pageSize: 5000 });
      const header = ['Admission No', 'Student Name', 'Class', 'Section', 'Total Fee', 'Paid', 'Due', 'Status'];
      const lines = all.rows.map((r) =>
        [r.admissionId, r.name, r.class, r.section, r.totalFee, r.paid, r.due, r.feeStatus].join(',')
      );
      const csv = [header.join(','), ...lines].join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'student-fees.csv';
      link.click();
      URL.revokeObjectURL(url);
    } finally {
      setIsExporting(false);
    }
  };

  const totalPages = Math.max(1, Math.ceil(result.total / pageSize));
  const pageIds = result.rows.map((r) => r.studentId);
  const allOnPageSelected = pageIds.length > 0 && pageIds.every((id) => selectedIds.has(id));

  return (
    <div className="flex flex-col xl:flex-row gap-6 items-start">
      <div className="flex-1 min-w-0 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Student Fees</h1>
            <p className="text-sm text-gray-500 mt-1">View students, check fee status and collect payments.</p>
          </div>
          <Button
            label={isExporting ? 'Exporting...' : 'Export'}
            icon={<FiDownload className="w-4 h-4" />}
            variant="secondary"
            onClick={handleExport}
            disabled={isExporting}
            fullWidth={false}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <span className="flex items-center justify-center w-9 h-9 rounded-lg bg-indigo-50 text-indigo-600 mb-3">
              <FiUsers className="w-4 h-4" />
            </span>
            <p className="text-xs font-medium text-gray-500">Total Students</p>
            <p className="text-xl font-bold text-gray-900 mt-1">{totalStudents}</p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <span className="flex items-center justify-center w-9 h-9 rounded-lg bg-green-50 text-green-600 mb-3">
              <FiCreditCard className="w-4 h-4" />
            </span>
            <p className="text-xs font-medium text-gray-500">Amount Collected</p>
            <p className="text-xl font-bold text-green-600 mt-1">{formatCurrency(stats.collected)}</p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <span className="flex items-center justify-center w-9 h-9 rounded-lg bg-amber-50 text-amber-600 mb-3">
              <FiClock className="w-4 h-4" />
            </span>
            <p className="text-xs font-medium text-gray-500">Pending Amount</p>
            <p className="text-xl font-bold text-amber-600 mt-1">{formatCurrency(stats.pending)}</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="w-full sm:w-40">
            <Dropdown
              options={classOptions}
              value={className}
              onChange={(v) => {
                setClassName(v);
                setSection('');
                resetToPage1();
              }}
            />
          </div>
          <div className="w-full sm:w-40">
            <Dropdown
              options={sectionOptions}
              value={section}
              onChange={(v) => {
                setSection(v);
                resetToPage1();
              }}
              disabled={!className}
            />
          </div>
          <div className="w-full sm:w-40">
            <Dropdown
              options={STATUS_OPTIONS}
              value={status}
              onChange={(v) => {
                setStatus(v);
                resetToPage1();
              }}
            />
          </div>
          <div className="flex-1">
            <Input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                resetToPage1();
              }}
              placeholder="Search by name, admission no. or transaction ID..."
              icon={<FiSearch />}
            />
          </div>
        </div>

        <div className={`bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden ${isLoading ? 'opacity-60' : ''}`}>
          {result.rows.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-16">No students match these filters.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    <th className="py-4 pl-6 pr-2 w-10">
                      <input type="checkbox" checked={allOnPageSelected} onChange={toggleAllOnPage} className="rounded border-gray-300 cursor-pointer" />
                    </th>
                    <th className="py-4 pr-4">Admission No.</th>
                    <th className="py-4 pr-4">Student Name</th>
                    <th className="py-4 pr-4">Class</th>
                    <th className="py-4 pr-4">Total Fee</th>
                    <SortableHeader label="Paid" field="paid" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
                    <SortableHeader label="Due" field="due" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
                    <th className="py-4 pr-4">Status</th>
                    <th className="py-4 pr-6 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {result.rows.map((row) => (
                    <tr
                      key={row.studentId}
                      className={`hover:bg-gray-50/60 transition ${activeStudentId === row.studentId ? 'bg-indigo-50/40' : ''}`}
                    >
                      <td className="py-4 pl-6 pr-2">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(row.studentId)}
                          onChange={() => toggleRow(row.studentId)}
                          className="rounded border-gray-300 cursor-pointer"
                        />
                      </td>
                      <td className="py-4 pr-4 text-gray-700">{row.admissionId}</td>
                      <td className="py-4 pr-4 font-medium text-gray-900">{row.name}</td>
                      <td className="py-4 pr-4 text-gray-700">
                        {row.class}{row.section ? `-${row.section}` : ''}
                      </td>
                      <td className="py-4 pr-4 text-gray-700">{formatCurrency(row.totalFee)}</td>
                      <td className="py-4 pr-4 text-gray-700">{formatCurrency(row.paid)}</td>
                      <td className="py-4 pr-4 text-gray-700">{formatCurrency(row.due)}</td>
                      <td className="py-4 pr-4">
                        <Badge {...(STATUS_BADGE[row.feeStatus] || STATUS_BADGE.NO_FEES)} />
                      </td>
                      <td className="py-4 pr-6">
                        <div className="flex items-center justify-center gap-1.5">
                          <Button
                            label="Collect"
                            variant="primary"
                            size="sm"
                            disabled={row.feeStatus === 'PAID' || row.feeStatus === 'NO_FEES'}
                            onClick={() => {
                              setActiveStudentId(row.studentId);
                              setAutoCollect(true);
                            }}
                            fullWidth={false}
                          />
                          <Button
                            label="View"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setActiveStudentId(row.studentId);
                              setAutoCollect(false);
                            }}
                            fullWidth={false}
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="px-6 py-4 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-sm text-gray-600">
                <input type="checkbox" checked={selectedIds.size > 0 && allOnPageSelected} onChange={toggleAllOnPage} className="rounded border-gray-300 cursor-pointer" />
                {selectedIds.size} selected
              </label>
              <Button
                label="Collect Payment"
                onClick={() => setBulkCollectOpen(true)}
                disabled={selectedIds.size === 0}
                fullWidth={false}
              />
            </div>
            <Pagination page={page} totalPages={totalPages} onPageChange={setPage} totalCount={result.total} pageSize={pageSize} />
          </div>
        </div>
      </div>

      {activeStudentId && (
        <div className="w-full xl:w-96 shrink-0">
          <StudentFeeDetailPanel
            studentId={activeStudentId}
            academicSession=""
            autoCollect={autoCollect}
            school={school}
            onClose={() => {
              setActiveStudentId(null);
              setAutoCollect(false);
            }}
            onCollected={(studentId, totals, message) => {
              // The row itself patches optimistically — the panel already
              // collected against the real backend and handed back this
              // student's fresh totals, so there's nothing stale about
              // that part. The two stat cards, though, are re-fetched fresh
              // (one cheap aggregate query) rather than patched by a
              // client-computed delta — a delta subtracts against this
              // page's locally-cached "before" value, which silently drifts
              // from the real DB total whenever something outside this
              // page's own state has touched fees since it loaded (e.g. a
              // fee structure created elsewhere auto-generating new pending
              // fees) — the exact "wrong until refresh" symptom this fixes.
              setResult((prev) => ({
                ...prev,
                rows: prev.rows.map((r) => (r.studentId === studentId ? { ...r, ...totals } : r)),
              }));
              getStudentFeesStats().then(setStats);
              setToastMessage(message);
            }}
          />
        </div>
      )}

      <BulkCollectModal
        isOpen={bulkCollectOpen}
        onClose={() => setBulkCollectOpen(false)}
        studentIds={Array.from(selectedIds)}
        onSuccess={(bulkResult, message) => {
          // Optimistic — bulkCollectFullDue always pays every collected
          // student's fee off in full, so any selected row that was DUE/
          // PARTIAL is now definitely PAID with paid === totalFee; no need
          // to re-fetch the summary to know that.
          const collectedIds = new Set(selectedIds);
          setResult((prev) => ({
            ...prev,
            rows: prev.rows.map((row) =>
              collectedIds.has(row.studentId) && (row.feeStatus === 'DUE' || row.feeStatus === 'PARTIAL')
                ? { ...row, paid: row.totalFee, due: 0, feeStatus: 'PAID' }
                : row
            ),
          }));
          getStudentFeesStats().then(setStats);
          setBulkCollectOpen(false);
          setSelectedIds(new Set());
          setToastMessage(message);
        }}
      />

      {toastMessage && <Toast message={toastMessage} onClose={() => setToastMessage('')} />}
    </div>
  );
}
