'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { FiSearch, FiCheck, FiClock, FiMoreVertical } from 'react-icons/fi';
import Badge from '@/components/Badge';
import DropdownMenu from '@/components/DropdownMenu';
import Pagination from '@/components/Pagination';
import ConfirmDialog from '@/components/ConfirmDialog';
import Toast from '@/components/Toast';
import { getMarksSheet, saveExamMarks } from '@/lib/api';

const AUTOSAVE_DELAY_MS = 2000;
// A Teacher is locked out from the moment their entry leaves Draft — an
// admin bypasses this entirely (see lib/examMarks.js's saveExamMarks),
// since the verification workflow exists to gate a Teacher's edits, not an
// admin correcting something before publish/verification.
const TEACHER_LOCKED_STATUSES = ['Submitted', 'Approved', 'Published'];
const PAGE_SIZE = 10;

const ATTENDANCE_STATUSES = ['Present', 'Absent', 'Medical', 'Exempted', 'ReExam'];
const ATTENDANCE_LABEL = { Present: 'Mark Present', Absent: 'Mark Absent', Medical: 'Mark Medical Leave', Exempted: 'Mark Exempted', ReExam: 'Mark Re-Exam' };

const STATUS_VARIANTS = { pending: 'gray', entered: 'green', absent: 'red' };
const STATUS_LABEL = { pending: 'Pending', entered: 'Entered', absent: 'Absent' };

function isRowEntered(row, schedule) {
  if (row.attendanceStatus !== 'Present') return true;
  if (schedule.markingType === 'Grade') return Boolean(row.gradeValue);
  if (schedule.markingType === 'Remarks') return Boolean(row.remarksValue);
  return row.marksObtained !== null && row.marksObtained !== undefined && row.marksObtained !== '';
}

function rowStatusFor(row, schedule) {
  if (row.attendanceStatus && row.attendanceStatus !== 'Present') return 'absent';
  return isRowEntered(row, schedule) ? 'entered' : 'pending';
}

// type="number" still lets someone type e/E (exponent notation) or +/- —
// none of which make sense for a marks field, so block them at the
// keystroke level rather than only validating after the fact.
const BLOCKED_NUMBER_KEYS = ['e', 'E', '+', '-'];
function blockNonNumericKeys(e) {
  if (BLOCKED_NUMBER_KEYS.includes(e.key)) e.preventDefault();
}

function formatSavedAt(date) {
  if (!date) return '';
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

const FILTER_TABS = [
  { value: 'all', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'entered', label: 'Entered' },
  { value: 'absent', label: 'Absent' },
];

export default function MarksEntrySheet({ schedule, role }) {
  const isAdmin = role === 'SchoolAdmin' || role === 'SuperAdmin';
  const lockedStatuses = isAdmin ? [] : TEACHER_LOCKED_STATUSES;
  // The bottom action bar is portaled straight to document.body (see the
  // render below) — the same technique DropdownMenu already uses — so it's
  // truly pinned to the viewport with zero risk of any ancestor (transform,
  // stacking context, overflow) ever nudging it. Only possible after mount,
  // since document isn't available during SSR.
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => setIsMounted(true), []);
  const [rows, setRows] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterTab, setFilterTab] = useState('all');
  const [page, setPage] = useState(1);
  const [rowErrors, setRowErrors] = useState({});
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState(null);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [submitError, setSubmitError] = useState('');
  const autosaveTimer = useRef(null);
  const inputRefs = useRef({});
  const rowsRef = useRef(rows);
  useEffect(() => {
    rowsRef.current = rows;
  }, [rows]);

  useEffect(() => {
    setIsLoading(true);
    setPage(1);
    getMarksSheet(schedule.id)
      .then((sheet) => setRows(sheet.students))
      .finally(() => setIsLoading(false));
    return () => clearTimeout(autosaveTimer.current);
  }, [schedule.id]);

  const persistRows = async (rowsToSave, { submit = false } = {}) => {
    const payload = rowsToSave
      .filter((r) => !lockedStatuses.includes(r.status))
      .map((r) => ({
        studentId: r.studentId,
        attendanceStatus: r.attendanceStatus || 'Present',
        marksObtained: r.marksObtained === '' || r.marksObtained === null || r.marksObtained === undefined ? null : Number(r.marksObtained),
        gradeValue: r.gradeValue || '',
        remarksValue: r.remarksValue || '',
        practicalMarksObtained:
          r.practicalMarksObtained === '' || r.practicalMarksObtained === null || r.practicalMarksObtained === undefined
            ? null
            : Number(r.practicalMarksObtained),
      }));
    if (payload.length === 0) return;
    const saved = await saveExamMarks(schedule.id, payload, submit);
    const savedByStudentId = new Map(saved.map((s) => [s.studentId, s]));
    setRows((prev) => prev.map((r) => (savedByStudentId.has(r.studentId) ? { ...r, status: savedByStudentId.get(r.studentId).status } : r)));
  };

  const scheduleAutosave = () => {
    setIsDirty(true);
    clearTimeout(autosaveTimer.current);
    autosaveTimer.current = setTimeout(async () => {
      try {
        await persistRows(rowsRef.current);
        setLastSavedAt(new Date());
        setIsDirty(false);
      } catch {
        // Silent — the next successful autosave or the explicit "Save as
        // Draft" click will retry; a failed background save shouldn't
        // interrupt whoever is mid-entry with an error popup.
      }
    }, AUTOSAVE_DELAY_MS);
  };

  // Reject the keystroke that would push the value out of range — rather
  // than silently clamping to the max (which hides what actually happened),
  // the field just stops accepting input and shows why, so typing "555"
  // against a max of 100 stops dead at "55" with an inline error.
  const handleMarksChange = (studentId, rawValue) => {
    if (rawValue !== '') {
      const numeric = Number(rawValue);
      if (!Number.isNaN(numeric) && (numeric > schedule.maxMarks || numeric < 0)) {
        setRowErrors((prev) => ({ ...prev, [studentId]: numeric < 0 ? 'Cannot be negative' : `Max marks ${schedule.maxMarks}` }));
        return;
      }
    }
    setRowErrors((prev) => {
      const next = { ...prev };
      delete next[studentId];
      return next;
    });
    setRows((prev) => prev.map((r) => (r.studentId === studentId ? { ...r, marksObtained: rawValue } : r)));
    scheduleAutosave();
  };

  const handlePracticalChange = (studentId, rawValue) => {
    const key = `${studentId}-practical`;
    if (rawValue !== '') {
      const numeric = Number(rawValue);
      if (!Number.isNaN(numeric) && (numeric > schedule.practicalMaxMarks || numeric < 0)) {
        setRowErrors((prev) => ({ ...prev, [key]: numeric < 0 ? 'Cannot be negative' : `Max marks ${schedule.practicalMaxMarks}` }));
        return;
      }
    }
    setRowErrors((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
    setRows((prev) => prev.map((r) => (r.studentId === studentId ? { ...r, practicalMarksObtained: rawValue } : r)));
    scheduleAutosave();
  };

  const handleGradeChange = (studentId, value) => {
    setRows((prev) => prev.map((r) => (r.studentId === studentId ? { ...r, gradeValue: value } : r)));
    scheduleAutosave();
  };

  const handleRemarksChange = (studentId, value) => {
    setRows((prev) => prev.map((r) => (r.studentId === studentId ? { ...r, remarksValue: value } : r)));
    scheduleAutosave();
  };

  const setAttendance = (studentId, status) => {
    setRows((prev) => prev.map((r) => (r.studentId === studentId ? { ...r, attendanceStatus: status } : r)));
    setRowErrors((prev) => {
      const next = { ...prev };
      delete next[studentId];
      delete next[`${studentId}-practical`];
      return next;
    });
    scheduleAutosave();
  };

  const handleSaveDraft = async () => {
    clearTimeout(autosaveTimer.current);
    setSubmitError('');
    // Optimistic — reflect "saved" immediately instead of waiting on the
    // round-trip; the values themselves are already in `rows` from typing,
    // so this just fast-forwards the confirmation. Rolled back below if the
    // request actually fails.
    setLastSavedAt(new Date());
    setIsDirty(false);
    setToastMessage('Draft saved.');
    setIsSaving(true);
    try {
      await persistRows(rowsRef.current);
    } catch (err) {
      setIsDirty(true);
      setSubmitError(err.message);
      setToastMessage('');
    } finally {
      setIsSaving(false);
    }
  };

  const pendingCount = rows.filter((r) => rowStatusFor(r, schedule) === 'pending' && !lockedStatuses.includes(r.status)).length;
  // 'UnderReview' means an admin rejected it and sent it back — that still
  // needs a resubmit, so only 'Submitted'/'Approved'/'Published' count as
  // nothing left to do here.
  const allSubmitted = rows.length > 0 && rows.every((r) => ['Submitted', 'Approved', 'Published'].includes(r.status));
  const saveDisabled = isSaving || isSubmitting;
  const submitDisabled = isSubmitting || isSaving || rows.length === 0 || allSubmitted;

  const handleSubmitClick = () => {
    if (Object.keys(rowErrors).length > 0) {
      setSubmitError('Fix the highlighted marks before submitting.');
      return;
    }
    if (pendingCount > 0) {
      setShowSubmitConfirm(true);
      return;
    }
    doSubmit();
  };

  const doSubmit = async () => {
    setIsSubmitting(true);
    setSubmitError('');
    try {
      clearTimeout(autosaveTimer.current);
      await persistRows(rowsRef.current, { submit: true });
      setShowSubmitConfirm(false);
      setToastMessage('Marks submitted for verification.');
    } catch (err) {
      setSubmitError(err.message);
      setShowSubmitConfirm(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const focusNext = (studentId) => {
    const index = filteredRows.findIndex((r) => r.studentId === studentId);
    const next = filteredRows[index + 1];
    if (next) inputRefs.current[next.studentId]?.focus();
  };

  const enteredCount = rows.filter((r) => rowStatusFor(r, schedule) === 'entered' || rowStatusFor(r, schedule) === 'absent').length;

  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase();
    return rows.filter((r) => {
      const matchesSearch = !query || r.name.toLowerCase().includes(query) || r.admissionId.toLowerCase().includes(query);
      const matchesTab = filterTab === 'all' || rowStatusFor(r, schedule) === filterTab;
      return matchesSearch && matchesTab;
    });
  }, [rows, search, filterTab, schedule]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
  const pagedRows = filteredRows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="space-y-6">
      {submitError && <p className="text-sm text-red-500 bg-red-50 border border-red-100 rounded-lg px-4 py-3">{submitError}</p>}

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-5 px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-5 shrink-0">
            <h2 className="text-base font-bold text-gray-900 shrink-0">Students</h2>
            <span className="text-xs font-medium text-gray-500 bg-gray-100 rounded-full px-2.5 py-1 shrink-0">
              {enteredCount} / {rows.length} entered
            </span>
            <div className="h-2 w-28 sm:w-44 bg-gray-100 rounded-full overflow-hidden shrink-0">
              <div
                className="h-full bg-gradient-to-r from-violet-700 to-blue-600 rounded-full transition-all"
                style={{ width: `${rows.length ? (enteredCount / rows.length) * 100 : 0}%` }}
              />
            </div>
            {(isDirty || lastSavedAt) && (
              <span className="flex items-center gap-1 text-xs text-gray-400 shrink-0">
                {isDirty ? (
                  <>
                    <FiClock className="w-3.5 h-3.5" />
                    Saving...
                  </>
                ) : (
                  <>
                    <FiCheck className="w-3.5 h-3.5 text-green-600" />
                    Saved {formatSavedAt(lastSavedAt)}
                  </>
                )}
              </span>
            )}
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className="relative w-56">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name or roll no..."
                autoComplete="off"
                className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-full focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div className="flex items-center gap-1.5 overflow-x-auto shrink-0">
              {FILTER_TABS.map((tab) => (
                <button
                  key={tab.value}
                  type="button"
                  onClick={() => {
                    setFilterTab(tab.value);
                    setPage(1);
                  }}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition cursor-pointer ${
                    filterTab === tab.value ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {isLoading ? (
          <p className="text-sm text-gray-500 text-center py-10">Loading students...</p>
        ) : filteredRows.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-10">No students match this filter.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50/80 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide border-b border-gray-100">
                  <th className="py-2.5 pl-5 pr-2 w-[80px] text-center">S.No.</th>
                  <th className="py-2.5 pr-4">Student Name</th>
                  <th className="py-2.5 pr-4">
                    {schedule.markingType === 'Numeric' ? `Marks ( / ${schedule.maxMarks} )` : schedule.markingType}
                  </th>
                  {schedule.hasPractical && <th className="py-2.5 pr-4">Practical ( / {schedule.practicalMaxMarks} )</th>}
                  <th className="py-2.5 pr-4">Status</th>
                  <th className="py-2.5 pr-5 w-10" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {pagedRows.map((row, index) => {
                  const isLocked = lockedStatuses.includes(row.status);
                  const isPresent = (row.attendanceStatus || 'Present') === 'Present';
                  const error = rowErrors[row.studentId];
                  const practicalError = rowErrors[`${row.studentId}-practical`];
                  const status = rowStatusFor(row, schedule);

                  const menuItems = ATTENDANCE_STATUSES.map((s) => ({
                    label: ATTENDANCE_LABEL[s],
                    onClick: () => setAttendance(row.studentId, s),
                  }));

                  return (
                    <tr key={row.studentId} className="hover:bg-gray-50/60 transition">
                      <td className="py-3 pl-5 pr-2 w-[80px] text-gray-500 text-center">{(page - 1) * PAGE_SIZE + index + 1}</td>
                      <td className="py-3 pr-4">
                        <p className="font-medium text-gray-900">{row.name}</p>
                        <p className="text-xs text-gray-400">{row.admissionId}</p>
                      </td>
                      <td className="py-3 pr-4">
                        {!isPresent ? (
                          <span className="text-gray-300">—</span>
                        ) : schedule.markingType === 'Grade' ? (
                          <input
                            ref={(el) => (inputRefs.current[row.studentId] = el)}
                            type="text"
                            value={row.gradeValue ?? ''}
                            disabled={isLocked}
                            placeholder="A"
                            maxLength={4}
                            autoComplete="off"
                            onChange={(e) => handleGradeChange(row.studentId, e.target.value.toUpperCase())}
                            onKeyDown={(e) => e.key === 'Enter' && focusNext(row.studentId)}
                            className="w-16 text-center py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-50 disabled:text-gray-400"
                          />
                        ) : schedule.markingType === 'Remarks' ? (
                          <input
                            ref={(el) => (inputRefs.current[row.studentId] = el)}
                            type="text"
                            value={row.remarksValue ?? ''}
                            disabled={isLocked}
                            placeholder="Good"
                            autoComplete="off"
                            onChange={(e) => handleRemarksChange(row.studentId, e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && focusNext(row.studentId)}
                            className="w-32 py-2 px-3 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-50 disabled:text-gray-400"
                          />
                        ) : (
                          <div>
                            <input
                              ref={(el) => (inputRefs.current[row.studentId] = el)}
                              type="number"
                              min="0"
                              max={schedule.maxMarks}
                              value={row.marksObtained ?? ''}
                              disabled={isLocked}
                              placeholder="—"
                              autoComplete="off"
                              onChange={(e) => handleMarksChange(row.studentId, e.target.value)}
                              onKeyDown={(e) => {
                                blockNonNumericKeys(e);
                                if (e.key === 'Enter') focusNext(row.studentId);
                              }}
                              onWheel={(e) => e.target.blur()}
                              className={`w-24 text-center py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 disabled:bg-gray-50 disabled:text-gray-400 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${
                                error ? 'border-red-400 focus:ring-red-400' : 'border-gray-200 focus:ring-indigo-500'
                              }`}
                            />
                            {error && <p className="text-[10px] text-red-500 mt-0.5">{error}</p>}
                          </div>
                        )}
                      </td>
                      {schedule.hasPractical && (
                        <td className="py-3 pr-4">
                          {isPresent ? (
                            <div>
                              <input
                                type="number"
                                min="0"
                                max={schedule.practicalMaxMarks}
                                value={row.practicalMarksObtained ?? ''}
                                disabled={isLocked}
                                placeholder="—"
                                autoComplete="off"
                                onChange={(e) => handlePracticalChange(row.studentId, e.target.value)}
                                onKeyDown={blockNonNumericKeys}
                                onWheel={(e) => e.target.blur()}
                                className={`w-24 text-center py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 disabled:bg-gray-50 disabled:text-gray-400 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${
                                  practicalError ? 'border-red-400 focus:ring-red-400' : 'border-gray-200 focus:ring-indigo-500'
                                }`}
                              />
                              {practicalError && <p className="text-[10px] text-red-500 mt-0.5">{practicalError}</p>}
                            </div>
                          ) : (
                            <span className="text-gray-300">—</span>
                          )}
                        </td>
                      )}
                      <td className="py-3 pr-4">
                        <Badge label={!isPresent ? row.attendanceStatus : STATUS_LABEL[status]} variant={!isPresent ? 'red' : STATUS_VARIANTS[status]} />
                      </td>
                      <td className="py-3 pr-5">
                        {isLocked ? (
                          <span className="text-xs text-gray-400">Locked</span>
                        ) : (
                          <DropdownMenu trigger={<FiMoreVertical className="w-4 h-4" />} items={menuItems} />
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} totalCount={filteredRows.length} pageSize={PAGE_SIZE} itemLabel="students" />

      {isMounted &&
        createPortal(
          <div className="fixed bottom-0 left-0 right-0 lg:left-64 bg-gray-50 border-t border-gray-100 px-4 sm:px-6 py-3 z-20">
            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  if (!saveDisabled) handleSaveDraft();
                }}
                aria-disabled={saveDisabled}
                className={`px-4 py-2.5 rounded-lg font-medium text-gray-900 bg-gray-100 transition ${
                  saveDisabled ? 'opacity-60 cursor-not-allowed' : 'hover:bg-gray-200 cursor-pointer'
                }`}
              >
                {isSaving ? 'Saving...' : 'Save as Draft'}
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!submitDisabled) handleSubmitClick();
                }}
                aria-disabled={submitDisabled}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium text-white bg-gradient-to-r from-violet-700 via-indigo-600 to-blue-600 transition ${
                  submitDisabled ? 'opacity-60 cursor-not-allowed' : 'hover:opacity-90 cursor-pointer'
                }`}
              >
                {isSubmitting ? 'Submitting...' : allSubmitted ? 'Submitted' : 'Submit Marks'}
              </button>
            </div>
          </div>,
          document.body
        )}

      <ConfirmDialog
        isOpen={showSubmitConfirm}
        onClose={() => setShowSubmitConfirm(false)}
        onConfirm={doSubmit}
        title="Some marks are still pending"
        description={`${pendingCount} student${pendingCount === 1 ? '' : 's'} have pending marks. Submit anyway?`}
        confirmLabel="Submit Anyway"
        isLoading={isSubmitting}
      />

      {toastMessage && <Toast message={toastMessage} onClose={() => setToastMessage('')} />}
    </div>
  );
}
