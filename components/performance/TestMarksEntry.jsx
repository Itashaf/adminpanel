'use client';

import { useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import * as XLSX from 'xlsx';
import {
  FiArrowLeft,
  FiUploadCloud,
  FiDownload,
  FiFileText,
  FiUsers,
  FiCheckCircle,
  FiClock,
  FiBarChart2,
  FiSearch,
  FiFilter,
  FiMoreVertical,
  FiCalendar,
  FiUser,
  FiSave,
} from 'react-icons/fi';
import Button from '@/components/Button';
import Toast from '@/components/Toast';
import DropdownMenu from '@/components/DropdownMenu';
import Pagination from '@/components/Pagination';
import { uploadSubjectTestMarks } from '@/lib/api';

const PAGE_SIZE = 10;

const STATUS_STYLE = {
  Entered: { dot: 'bg-emerald-600', className: 'bg-emerald-50 text-emerald-700' },
  Pending: { dot: 'bg-amber-500', className: 'bg-amber-50 text-amber-700' },
};

const TEST_STATUS_STYLE = {
  DRAFT: { label: 'Draft', className: 'bg-gray-100 text-gray-600' },
  IN_PROGRESS: { label: 'In Progress', className: 'bg-amber-50 text-amber-700' },
  COMPLETED: { label: 'Completed', className: 'bg-emerald-50 text-emerald-700' },
};

function formatDate(iso) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

// Manual grid (autosave per mark on blur) + bulk Excel upload — both call
// the same bulk-upload endpoint (uploadSubjectTestMarks accepts `rows`), so
// typing one mark is just a 1-row version of the same import, not a
// separate code path.
export default function TestMarksEntry({ test: initialTest, canManage }) {
  const router = useRouter();
  const fileInputRef = useRef(null);
  const [test, setTest] = useState(initialTest);
  const [marksById, setMarksById] = useState(() => Object.fromEntries(initialTest.marks.map((m) => [m.studentId, m.marksObtained ?? ''])));
  const [savingId, setSavingId] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const [error, setError] = useState('');
  const [isSavingAll, setIsSavingAll] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState(1);

  const rowsWithState = useMemo(
    () =>
      test.marks.map((m) => {
        const raw = marksById[m.studentId];
        const marksObtained = raw !== '' && raw != null ? Number(raw) : null;
        const percent = marksObtained != null ? Math.round((marksObtained / test.maxMarks) * 1000) / 10 : null;
        return { ...m, marksObtained, percent, status: marksObtained != null ? 'Entered' : 'Pending' };
      }),
    [test.marks, marksById, test.maxMarks]
  );

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rowsWithState.filter((r) => {
      if (statusFilter && r.status !== statusFilter) return false;
      if (q && !r.studentName.toLowerCase().includes(q) && !r.admissionId.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [rowsWithState, search, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
  const pagedRows = filteredRows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const enteredCount = rowsWithState.filter((r) => r.status === 'Entered').length;
  const totalStudents = rowsWithState.length;
  const pendingCount = totalStudents - enteredCount;
  const classAverage = enteredCount > 0 ? Math.round((rowsWithState.reduce((sum, r) => sum + (r.percent || 0), 0) / enteredCount) * 10) / 10 : null;
  const enteredPercent = totalStudents > 0 ? Math.round((enteredCount / totalStudents) * 100) : 0;
  const pendingPercent = 100 - enteredPercent;

  const changeFilter = (setter) => (value) => {
    setter(value);
    setPage(1);
  };

  // Blocked at the keystroke, not just on blur — typing past max marks (or
  // below 0) never even lands in state, so there's nothing to type "500000"
  // into in the first place. The blocked attempt still needs to be visible
  // (red outline + message), not silently swallowed.
  const handleChange = (studentId, value) => {
    if (value !== '' && (Number(value) > test.maxMarks || Number(value) < 0)) {
      setFieldErrors((prev) => ({ ...prev, [studentId]: `Max ${test.maxMarks} marks` }));
      return;
    }
    setFieldErrors((prev) => {
      if (!prev[studentId]) return prev;
      const next = { ...prev };
      delete next[studentId];
      return next;
    });
    setMarksById((prev) => ({ ...prev, [studentId]: value }));
  };

  // Autosave on blur — only fires when the value actually changed and isn't
  // blank (clearing a mark back out isn't supported by this screen; that's
  // an accepted gap, not a silent data-loss risk since nothing is sent).
  const handleBlur = async (studentId, admissionId, originalValue) => {
    const value = marksById[studentId];
    if (value === '' || value == null || Number(value) === originalValue) return;

    // Reject before ever calling the API — same rule the server enforces
    // (uploadSubjectTestMarks), checked here too so a teacher sees the
    // error immediately instead of after a round-trip.
    const numericValue = Number(value);
    if (numericValue < 0 || numericValue > test.maxMarks) {
      setError(`Marks must be between 0 and ${test.maxMarks}.`);
      setMarksById((prev) => ({ ...prev, [studentId]: originalValue ?? '' }));
      return;
    }

    setSavingId(studentId);
    setError('');
    try {
      const result = await uploadSubjectTestMarks(test.id, { rows: [{ admissionNo: admissionId, marks: Number(value) }] });
      if (result.errorCount > 0) {
        setError(result.errors[0]?.message || 'Could not save this mark.');
        setMarksById((prev) => ({ ...prev, [studentId]: originalValue ?? '' }));
      } else {
        setTest((prev) => ({
          ...prev,
          marks: prev.marks.map((m) => (m.studentId === studentId ? { ...m, marksObtained: Number(value) } : m)),
        }));
      }
    } catch (err) {
      setError(err.message);
      setMarksById((prev) => ({ ...prev, [studentId]: originalValue ?? '' }));
    } finally {
      setSavingId(null);
    }
  };

  // Explicit "Save All Marks" — autosave-on-blur already covers the common
  // case, but a visible button is still needed: a teacher tabbing straight
  // to a bulk-upload/navigation action without blurring the last field, or
  // someone who just wants a plain "did this actually save" affordance,
  // shouldn't have to trust a blur event alone. Sends every currently
  // in-range value in one call; already-saved values just re-save
  // harmlessly (uploadSubjectTestMarks upserts).
  const handleSaveAll = async () => {
    const rows = test.marks
      .filter((m) => {
        const value = marksById[m.studentId];
        return value !== '' && value != null && !fieldErrors[m.studentId];
      })
      .map((m) => ({ admissionNo: m.admissionId, marks: Number(marksById[m.studentId]) }));

    if (rows.length === 0) {
      setError('Enter at least one mark before saving.');
      return;
    }

    setIsSavingAll(true);
    setError('');
    try {
      const result = await uploadSubjectTestMarks(test.id, { rows });
      if (result.errorCount > 0) setError(result.errors[0]?.message || `${result.errorCount} mark(s) failed to save.`);
      setToastMessage(`${result.successCount} of ${result.totalRecords} mark(s) saved.`);
      router.refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSavingAll(false);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError('');
    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(sheet, { defval: '', raw: false });
      const result = await uploadSubjectTestMarks(test.id, { rows });
      setToastMessage(`${result.successCount} of ${result.totalRecords} mark(s) imported.`);
      if (result.errorCount > 0) setError(result.errors[0]?.message || `${result.errorCount} row(s) failed.`);
      router.refresh();
    } catch (err) {
      setError(err.message || 'Could not read this file.');
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Real template, generated client-side from the roster already loaded —
  // no server round-trip needed, same reasoning as every other bulk-import
  // template in this app (see lib/performance/bulkImport.js), just built
  // in the browser instead since this screen already has the full roster.
  const handleDownloadTemplate = () => {
    const aoa = [['Admission No', 'Student Name', 'Marks'], ...test.marks.map((m) => [m.admissionId, m.studentName, ''])];
    const sheet = XLSX.utils.aoa_to_sheet(aoa);
    sheet['!cols'] = [{ wch: 16 }, { wch: 24 }, { wch: 10 }];
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, sheet, 'Marks');
    XLSX.writeFile(workbook, `${test.testName.replace(/\s+/g, '-')}-marks-template.xlsx`);
  };

  const handleExport = () => {
    const aoa = [
      ['Admission No', 'Student Name', 'Marks', 'Percentage', 'Status'],
      ...rowsWithState.map((r) => [r.admissionId, r.studentName, r.marksObtained ?? '', r.percent != null ? `${r.percent}%` : '', r.status]),
    ];
    const sheet = XLSX.utils.aoa_to_sheet(aoa);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, sheet, 'Marks');
    XLSX.writeFile(workbook, `${test.testName.replace(/\s+/g, '-')}-marks.xlsx`);
  };

  const testStatus = TEST_STATUS_STYLE[test.status] || TEST_STATUS_STYLE.DRAFT;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <button
          type="button"
          onClick={() => router.push('/dashboard/performance/tests')}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-indigo-700 transition cursor-pointer"
        >
          <FiArrowLeft className="w-4 h-4" />
          Subject Tests
        </button>
        {canManage && (
          <div className="flex items-center gap-2">
            <Button label="Download Template" variant="secondary" icon={<FiDownload className="w-4 h-4" />} onClick={handleDownloadTemplate} />
            <label className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-gradient-to-r from-violet-700 via-indigo-600 to-blue-600 text-white text-sm font-medium hover:opacity-90 cursor-pointer">
              <FiUploadCloud className="w-4 h-4" />
              Bulk Upload Excel
              <input ref={fileInputRef} type="file" accept=".xlsx" onChange={handleFileUpload} className="hidden" />
            </label>
          </div>
        )}
      </div>

      {error && <p className="text-sm text-red-500 bg-red-50 border border-red-100 rounded-lg px-4 py-3">{error}</p>}

      {/* Test info card */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex flex-col lg:flex-row lg:items-center gap-5">
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <span className="flex items-center justify-center w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 shrink-0">
            <FiFileText className="w-6 h-6" />
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-xl font-bold text-gray-900">{test.testName}</h1>
              <span className={`inline-block text-xs font-semibold rounded-full px-2.5 py-1 ${testStatus.className}`}>{testStatus.label}</span>
            </div>
            <p className="text-sm text-gray-500 mt-0.5">
              {test.subjectName} <span className="mx-1.5">•</span> {test.className} - {test.sectionName} <span className="mx-1.5">•</span> Max Marks: {test.maxMarks}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <div className="rounded-xl border border-gray-200 px-4 py-2.5 min-w-[160px]">
            <p className="flex items-center gap-1.5 text-xs text-gray-400">
              <FiCalendar className="w-3.5 h-3.5" />
              Exam Date
            </p>
            <p className="text-sm font-semibold text-gray-900 mt-0.5">{formatDate(test.testDate) || '—'}</p>
          </div>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl p-5 bg-indigo-50">
          <div className="flex items-center gap-2 text-indigo-500 text-xs font-medium uppercase tracking-wide">
            <FiUsers className="w-4 h-4" /> Total Students
          </div>
          <p className="text-3xl font-bold text-gray-900 mt-2">{totalStudents}</p>
        </div>
        <div className="rounded-2xl p-5 bg-emerald-50">
          <div className="flex items-center gap-2 text-emerald-600 text-xs font-medium uppercase tracking-wide">
            <FiCheckCircle className="w-4 h-4" /> Marks Entered
          </div>
          <p className="text-3xl font-bold text-gray-900 mt-2">{enteredCount}</p>
          <div className="h-1.5 bg-emerald-100 rounded-full overflow-hidden mt-2">
            <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${enteredPercent}%` }} />
          </div>
          <p className="text-xs text-gray-400 mt-1">{enteredPercent}% completed</p>
        </div>
        <div className="rounded-2xl p-5 bg-amber-50">
          <div className="flex items-center gap-2 text-amber-600 text-xs font-medium uppercase tracking-wide">
            <FiClock className="w-4 h-4" /> Pending
          </div>
          <p className="text-3xl font-bold text-gray-900 mt-2">{pendingCount}</p>
          <div className="h-1.5 bg-amber-100 rounded-full overflow-hidden mt-2">
            <div className="h-full bg-amber-500 rounded-full" style={{ width: `${pendingPercent}%` }} />
          </div>
          <p className="text-xs text-gray-400 mt-1">{pendingPercent}% remaining</p>
        </div>
        <div className="rounded-2xl p-5 bg-blue-50">
          <div className="flex items-center gap-2 text-blue-500 text-xs font-medium uppercase tracking-wide">
            <FiBarChart2 className="w-4 h-4" /> Class Average
          </div>
          <p className="text-3xl font-bold text-blue-700 mt-2">{classAverage != null ? `${classAverage}%` : '—'}</p>
          <p className="text-xs text-gray-400 mt-1">Based on {enteredCount} student{enteredCount === 1 ? '' : 's'}</p>
        </div>
      </div>

      {/* Students table */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h3 className="text-base font-bold text-gray-900">Students ({filteredRows.length})</h3>
          <p className="text-xs text-gray-400 mt-0.5">Enter marks for all students. Changes are autosaved.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search by name or admission no..."
              value={search}
              onChange={(e) => changeFilter(setSearch)(e.target.value)}
              className="pl-9 pr-3 py-2.5 w-64 text-sm border border-gray-200 rounded-full focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowFilters((v) => !v)}
              className={`inline-flex items-center gap-2 px-3.5 py-2.5 rounded-full text-sm font-medium border cursor-pointer transition ${
                statusFilter ? 'border-indigo-200 text-indigo-700 bg-indigo-50' : 'border-gray-200 text-gray-700 hover:bg-gray-50'
              }`}
            >
              <FiFilter className="w-4 h-4" />
              {statusFilter || 'All Status'}
            </button>
            {showFilters && (
              <div className="absolute right-0 mt-2 w-40 bg-white rounded-lg border border-gray-100 shadow-lg py-1 z-20">
                {['', 'Entered', 'Pending'].map((s) => (
                  <button
                    key={s || 'all'}
                    type="button"
                    onClick={() => {
                      changeFilter(setStatusFilter)(s);
                      setShowFilters(false);
                    }}
                    className={`w-full text-left px-3.5 py-2 text-sm cursor-pointer hover:bg-gray-50 ${statusFilter === s ? 'text-indigo-700 font-medium' : 'text-gray-700'}`}
                  >
                    {s || 'All Status'}
                  </button>
                ))}
              </div>
            )}
          </div>
          <DropdownMenu
            trigger={<FiMoreVertical className="w-4 h-4" />}
            items={[{ label: 'Export to Excel', icon: <FiDownload className="w-4 h-4" />, onClick: handleExport }]}
          />
        </div>
      </div>

      <div className="relative bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {pagedRows.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-10">No students match this filter.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  <th className="py-4 pl-6 pr-3 w-10">#</th>
                  <th className="py-4 pr-4">Student Name</th>
                  <th className="py-4 pr-4">Admission No.</th>
                  <th className="py-4 pr-4">Marks ( / {test.maxMarks})</th>
                  <th className="py-4 pr-4">Percentage</th>
                  <th className="py-4 pr-4">Status</th>
                  <th className="py-4 pr-6 text-right"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {pagedRows.map((r, i) => {
                  const status = STATUS_STYLE[r.status];
                  return (
                    <tr key={r.studentId} className="hover:bg-gray-50/60 transition">
                      <td className="py-5 pl-6 pr-3 text-gray-400">{(page - 1) * PAGE_SIZE + i + 1}</td>
                      <td className="py-5 pr-4 font-semibold text-gray-900">{r.studentName}</td>
                      <td className="py-5 pr-4 text-gray-500">{r.admissionId}</td>
                      <td className="py-5 pr-4">
                        <input
                          type="number"
                          min="0"
                          max={test.maxMarks}
                          value={marksById[r.studentId] ?? ''}
                          onChange={(e) => handleChange(r.studentId, e.target.value)}
                          onBlur={() => handleBlur(r.studentId, r.admissionId, r.marksObtained)}
                          onWheel={(e) => e.currentTarget.blur()}
                          disabled={!canManage || savingId === r.studentId}
                          className={`w-24 text-sm border rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 disabled:bg-gray-50 disabled:text-gray-400 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${
                            fieldErrors[r.studentId] ? 'border-red-400 focus:ring-red-400' : 'border-gray-200 focus:ring-indigo-500'
                          }`}
                        />
                        {fieldErrors[r.studentId] && <p className="text-xs text-red-500 mt-1">{fieldErrors[r.studentId]}</p>}
                      </td>
                      <td className="py-5 pr-4 text-gray-700">{r.percent != null ? `${r.percent}%` : '—'}</td>
                      <td className="py-5 pr-4">
                        <span className={`inline-flex items-center gap-1.5 text-xs font-semibold rounded-full px-3 py-1 ${status.className}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
                          {r.status}
                        </span>
                      </td>
                      <td className="py-5 pr-6 text-right">
                        <DropdownMenu
                          trigger={<FiMoreVertical className="w-4 h-4" />}
                          items={[
                            { label: 'View Student Profile', icon: <FiUser className="w-4 h-4" />, onClick: () => router.push(`/dashboard/students/${r.studentId}`) },
                          ]}
                        />
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
            <Pagination page={page} totalPages={totalPages} onPageChange={setPage} totalCount={filteredRows.length} pageSize={PAGE_SIZE} itemLabel="students" />
          </div>
        )}

        {canManage && (
          <div className="flex justify-end px-6 py-4 border-t border-gray-100">
            <Button label={isSavingAll ? 'Saving...' : 'Save All Marks'} icon={<FiSave className="w-4 h-4" />} onClick={handleSaveAll} disabled={isSavingAll} />
          </div>
        )}
      </div>

      {toastMessage && <Toast message={toastMessage} onClose={() => setToastMessage('')} />}
    </div>
  );
}
