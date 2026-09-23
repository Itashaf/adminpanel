'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { FiX, FiUser, FiChevronLeft, FiChevronRight, FiRotateCcw, FiExternalLink, FiCheckCircle, FiClock } from 'react-icons/fi';
import AssessmentWizard from './AssessmentWizard';
import { getStudentAssessment } from '@/lib/api';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function shiftMonth(month, year, delta) {
  const index = month - 1 + delta;
  const nextYear = year + Math.floor(index / 12);
  const nextMonth = ((index % 12) + 12) % 12;
  return { month: nextMonth + 1, year: nextYear };
}

function HeaderSkeleton() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="flex items-center gap-4">
        <div className="w-20 h-20 rounded-full bg-white/20 shrink-0" />
        <div className="space-y-2 flex-1">
          <div className="h-5 w-40 bg-white/20 rounded" />
          <div className="h-3 w-56 bg-white/20 rounded" />
          <div className="h-3 w-48 bg-white/20 rounded" />
        </div>
      </div>
    </div>
  );
}

// Right-side off-canvas "View" panel for one student's monthly assessment —
// same student-card + month-nav + step-wizard content the full
// /dashboard/assessments/[studentId] page shows, opened in place instead of
// navigating away from the roster table. Reuses AssessmentWizard itself
// (embedded=true hides its page-only chrome) so autosave/keyboard-nav/step
// forms all stay identical between the drawer and the full page — see
// AssessmentWizard.jsx's `embedded` prop.
//
// The caller (AssessmentDashboard) only renders this while a student is
// being viewed, and passes `key={studentId}` — mounting/unmounting is what
// resets month/year back to the clicked row's month each time, rather than
// a reset-on-open effect (React's own "you might not need an effect" case).
export default function AssessmentDrawer({ studentId, initialMonth, initialYear, onClose, onSaved }) {
  const [month, setMonth] = useState(initialMonth);
  const [year, setYear] = useState(initialYear);
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setIsLoading(true);
      try {
        const result = await getStudentAssessment(studentId, month, year);
        if (!cancelled) setData(result);
      } catch {
        if (!cancelled) setData(null);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [studentId, month, year]);

  // Roster status/stat cards can go stale while the drawer is open (a Save
  // Draft or Submit in here doesn't touch the table behind it) — closing
  // re-fetches the roster once, cheaper than re-fetching on every autosave.
  const handleClose = () => {
    onSaved?.();
    onClose();
  };

  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape') handleClose();
    };
    document.addEventListener('keydown', handler);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handler);
      document.body.style.overflow = '';
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const changeMonth = (delta) => {
    const next = shiftMonth(month, year, delta);
    setMonth(next.month);
    setYear(next.year);
  };

  const student = data?.student;
  const status = data?.assessment?.status === 'COMPLETED' ? 'Completed' : data?.assessment ? 'Draft' : 'Not Started';
  const isCompleted = status === 'Completed';
  const parents = [student?.fatherName && `Father: ${student.fatherName}`, student?.motherName && `Mother: ${student.motherName}`]
    .filter(Boolean)
    .join('  |  ');

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-stretch sm:justify-end">
      <div className="absolute inset-0 bg-black/40" onClick={handleClose} />
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative bg-gray-50 w-full sm:w-[640px] sm:max-w-[95vw] max-h-[92vh] sm:max-h-none sm:h-full flex flex-col overflow-hidden rounded-t-2xl sm:rounded-t-none sm:rounded-l-2xl shadow-xl"
      >
        <div className="bg-gradient-to-br from-violet-700 via-indigo-600 to-blue-600 px-6 pt-6 pb-5 shrink-0 relative">
          <button
            type="button"
            onClick={handleClose}
            className="absolute top-4 right-4 text-white/80 hover:text-white cursor-pointer"
          >
            <FiX className="w-5 h-5" />
          </button>
          {isLoading || !student ? (
            <HeaderSkeleton />
          ) : (
            <div className="flex items-start gap-4 pr-8">
              <span className="flex items-center justify-center w-20 h-20 rounded-full bg-white/20 text-white shrink-0 overflow-hidden border-2 border-white/30">
                {student.photoUrl ? (
                  <img src={student.photoUrl} alt={student.name} className="w-full h-full object-cover" />
                ) : (
                  <FiUser className="w-8 h-8" />
                )}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-lg font-bold text-white uppercase tracking-wide truncate">{student.name}</h2>
                  <span
                    className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full shrink-0 ${
                      isCompleted ? 'bg-green-400/90 text-green-950' : 'bg-amber-400/90 text-amber-950'
                    }`}
                  >
                    {isCompleted ? <FiCheckCircle className="w-3 h-3" /> : <FiClock className="w-3 h-3" />}
                    {isCompleted ? 'Completed' : 'Pending'}
                  </span>
                </div>
                <p className="text-sm text-white/90 mt-1">
                  {student.className} - {student.sectionName} &nbsp;|&nbsp; Adm. No.: {student.admissionId}
                </p>
                {parents && <p className="text-sm text-white/90 mt-1">{parents}</p>}
                <p className="text-xs text-white/70 mt-1">Session: {student.academicSession}</p>
              </div>
            </div>
          )}
        </div>

        <div className="bg-white px-6 py-3 flex items-center justify-between gap-3 border-b border-gray-100 shrink-0">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => changeMonth(-1)}
              className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 cursor-pointer transition"
            >
              <FiChevronLeft className="w-4 h-4" />
            </button>
            <p className="text-sm font-bold text-gray-900 min-w-[130px] text-center">
              {MONTH_NAMES[month - 1]} {year}
            </p>
            <button
              type="button"
              onClick={() => changeMonth(1)}
              className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 cursor-pointer transition"
            >
              <FiChevronRight className="w-4 h-4" />
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => changeMonth(-1)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 transition cursor-pointer"
            >
              <FiRotateCcw className="w-3.5 h-3.5" />
              View Previous
            </button>
            {studentId && (
              <Link
                href={`/dashboard/assessments/${studentId}?month=${month}&year=${year}`}
                title="Open Full Page"
                className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 cursor-pointer transition"
              >
                <FiExternalLink className="w-4 h-4" />
              </Link>
            )}
          </div>
        </div>

        <div className="px-6 pt-5 pb-5 overflow-y-auto flex-1">
          {isLoading ? (
            <div className="animate-pulse space-y-4">
              <div className="h-10 bg-white rounded-2xl border border-gray-100" />
              <div className="h-64 bg-white rounded-2xl border border-gray-100" />
            </div>
          ) : !data ? (
            <p className="text-sm text-gray-500 text-center py-10">Could not load this assessment.</p>
          ) : (
            <AssessmentWizard key={`${studentId}-${month}-${year}`} studentId={studentId} month={month} year={year} data={data} embedded />
          )}
        </div>
      </div>
    </div>
  );
}
