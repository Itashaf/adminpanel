'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { FiSearch, FiDownload, FiUsers, FiCreditCard, FiClock, FiChevronUp, FiChevronDown, FiArrowRight, FiBell, FiMoreVertical, FiEye } from 'react-icons/fi';
import Dropdown from '@/components/Dropdown';
import DropdownMenu from '@/components/DropdownMenu';
import Pagination from '@/components/Pagination';
import Badge from '@/components/Badge';
import Button from '@/components/Button';
import Input from '@/components/Input';
import Toast from '@/components/Toast';
import KPICard from '@/components/dashboard/KPICard';
import ClasswisePendingFeesModal from '@/components/dashboard/ClasswisePendingFeesModal';
import StudentFeeDetailPanel from './StudentFeeDetailPanel';
import BulkCollectModal from './BulkCollectModal';
import SendFeesReminderModal from './SendFeesReminderModal';
import { useClassSections } from '@/lib/hooks/useClassSections';
import { getStudentFeeSummaries, getStudentFeesStats } from '@/lib/api';

function formatCurrency(amount) {
  return `₹${amount.toLocaleString('en-IN')}`;
}

function formatDateTime(isoString) {
  if (!isoString) return null;
  return new Date(isoString).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' });
}

const EXPORT_PAGE_SIZE = 500;

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

export default function StudentFeesExplorer({
  feesStats,
  totalStudents,
  classwisePendingFees,
  initialResult,
  initialFilters,
  pageSize,
  school,
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [stats, setStats] = useState(feesStats);
  const [classwiseOpen, setClasswiseOpen] = useState(false);
  const [sendingReminderId, setSendingReminderId] = useState(null);
  const [reminderModalOpen, setReminderModalOpen] = useState(false);

  // Per-row "Remind" — one real in-app Notice + push to every parent linked
  // to this student (see lib/fees.js's sendFeeReminders), the due amount and
  // quarter(s) always recomputed server-side, never trusted from this row.
  const handleSendReminder = async (row) => {
    setSendingReminderId(row.studentId);
    try {
      const res = await fetch('/api/fees/send-reminder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentIds: [row.studentId] }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to send reminder');
      if (data.sent.length > 0) {
        setToastMessage(`Reminder sent to ${data.sent.length} parent${data.sent.length === 1 ? '' : 's'}.`);
        const remindedAt = data.sent[0]?.remindedAt;
        if (remindedAt) {
          setResult((prev) => ({
            ...prev,
            rows: prev.rows.map((r) => (r.studentId === row.studentId ? { ...r, lastFeeReminderAt: remindedAt } : r)),
          }));
        }
      } else {
        setToastMessage(data.skipped[0]?.reason || 'Nothing to remind — no pending fee due.');
      }
    } catch (err) {
      setToastMessage(err.message);
    } finally {
      setSendingReminderId(null);
    }
  };

  // SendFeesReminderModal's result — update whichever rows on THIS page
  // happen to match (full list the modal sent to is usually bigger than
  // one page), toast the real sent/student count.
  const handleReminderModalSent = (data) => {
    const studentCount = new Set(data.sent.map((s) => s.studentId)).size;
    setToastMessage(`Reminder sent to ${data.sent.length} parent${data.sent.length === 1 ? '' : 's'} across ${studentCount} student${studentCount === 1 ? '' : 's'}.`);
    const remindedAtByStudent = new Map(data.sent.map((s) => [s.studentId, s.remindedAt]));
    setResult((prev) => ({
      ...prev,
      rows: prev.rows.map((r) => (remindedAtByStudent.has(r.studentId) ? { ...r, lastFeeReminderAt: remindedAtByStudent.get(r.studentId) } : r)),
    }));
  };

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
      // Pulled in pages of EXPORT_PAGE_SIZE until everything matching the
      // current filters is in — no fixed row cap.
      const allRows = [];
      let exportPage = 1;
      let exportTotal = 0;
      let chunkSize = 0;
      do {
        const chunk = await getStudentFeeSummaries({ className, section, status, search, sortBy, sortDir, page: exportPage, pageSize: EXPORT_PAGE_SIZE });
        allRows.push(...chunk.rows);
        exportTotal = chunk.total;
        chunkSize = chunk.rows.length;
        exportPage += 1;
      } while (allRows.length < exportTotal && chunkSize > 0);
      const header = ['Admission No', 'Student Name', 'Class', 'Section', 'Total Fee', 'Paid', 'Due', 'Status'];
      const lines = allRows.map((r) =>
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
    <div className="flex flex-col lg:flex-row gap-6 items-start">
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
          <KPICard label="Total Students" icon={<FiUsers className="w-4 h-4" />} value={totalStudents} />
          <KPICard label="Amount Collected" icon={<FiCreditCard className="w-4 h-4" />} value={formatCurrency(stats.collected)} />
          <KPICard
            label="Pending Amount"
            icon={<FiClock className="w-4 h-4" />}
            value={formatCurrency(stats.pending)}
            footer={
              <button
                type="button"
                onClick={() => setClasswiseOpen(true)}
                className="flex items-center gap-1 text-xs font-semibold text-white/90 hover:text-white cursor-pointer"
              >
                View Classwise
                <FiArrowRight className="w-3 h-3" />
              </button>
            }
          />
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <Input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                resetToPage1();
              }}
              placeholder="Search by name, admission no. or transaction ID..."
              icon={<FiSearch />}
              className="bg-white"
            />
          </div>
          <div className="w-full sm:w-40 [&>button]:h-[42px]">
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
          <div className="w-full sm:w-40 [&>button]:h-[42px] [&>button:disabled]:bg-white">
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
          <div className="w-full sm:w-40 [&>button]:h-[42px]">
            <Dropdown
              options={STATUS_OPTIONS}
              value={status}
              onChange={(v) => {
                setStatus(v);
                resetToPage1();
              }}
            />
          </div>
          <button
            type="button"
            onClick={() => setReminderModalOpen(true)}
            className="inline-flex items-center justify-center gap-2 h-[42px] px-4 rounded-full text-sm font-medium text-white bg-gradient-to-r from-violet-700 via-indigo-600 to-blue-600 hover:opacity-90 transition cursor-pointer whitespace-nowrap"
          >
            Send Fees Reminder
            <FiBell className="w-4 h-4" />
          </button>
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
                    <th className="py-4 pr-4">Student Name</th>
                    <th className="py-4 pr-4">Class</th>
                    <th className="py-4 pr-4">Total Fee</th>
                    <SortableHeader label="Paid" field="paid" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
                    <SortableHeader label="Due" field="due" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
                    <th className="py-4 pr-4">Status</th>
                    <th className="py-4 pr-4 text-center">Reminded On</th>
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
                      <td className="py-4 pr-4">
                        <p className="font-medium text-gray-900">{row.name}</p>
                        <p className="text-xs text-gray-400">{row.admissionId}</p>
                      </td>
                      <td className="py-4 pr-4 text-gray-700">
                        {row.class}{row.section ? `-${row.section}` : ''}
                      </td>
                      <td className="py-4 pr-4 text-gray-700">{formatCurrency(row.totalFee)}</td>
                      <td className="py-4 pr-4 text-gray-700">{formatCurrency(row.paid)}</td>
                      <td className="py-4 pr-4 text-gray-700">{formatCurrency(row.due)}</td>
                      <td className="py-4 pr-4">
                        <Badge {...(STATUS_BADGE[row.feeStatus] || STATUS_BADGE.NO_FEES)} />
                      </td>
                      <td className="py-4 pr-4 text-gray-500 text-center">{formatDateTime(row.lastFeeReminderAt) || '—'}</td>
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
                          <DropdownMenu
                            trigger={<FiMoreVertical className="w-4 h-4" />}
                            items={[
                              {
                                label: 'View Details',
                                icon: <FiEye className="w-4 h-4" />,
                                onClick: () => {
                                  setActiveStudentId(row.studentId);
                                  setAutoCollect(false);
                                },
                              },
                              ...(row.feeStatus !== 'PAID' && row.feeStatus !== 'NO_FEES'
                                ? [
                                    {
                                      label: sendingReminderId === row.studentId ? 'Sending...' : 'Fee Reminder',
                                      icon: <FiBell className="w-4 h-4" />,
                                      onClick: () => handleSendReminder(row),
                                    },
                                  ]
                                : []),
                            ]}
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
        <StudentFeeDetailPanel
          className="w-full lg:w-96 shrink-0"
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

      <ClasswisePendingFeesModal isOpen={classwiseOpen} onClose={() => setClasswiseOpen(false)} classwise={classwisePendingFees} />

      <SendFeesReminderModal
        isOpen={reminderModalOpen}
        onClose={() => setReminderModalOpen(false)}
        onSent={handleReminderModalSent}
      />

      {toastMessage && <Toast message={toastMessage} onClose={() => setToastMessage('')} />}
    </div>
  );
}
