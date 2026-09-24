'use client';

import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { FiX, FiPrinter, FiUser } from 'react-icons/fi';
import { BEHAVIOUR_CATEGORIES } from '@/lib/assessmentConstants';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function Field({ label, value }) {
  return (
    <div>
      <p className="text-[9px] print:text-[8px] font-semibold text-gray-400 uppercase tracking-wide">{label}</p>
      <p className="text-sm print:text-[11px] text-gray-900 font-medium">{value || '—'}</p>
    </div>
  );
}

function SectionTitle({ children }) {
  return (
    <h2 className="text-xs print:text-[11px] font-bold text-indigo-700 uppercase tracking-wide border-b-2 border-indigo-100 pb-1.5 mb-3 print:mb-2">
      {children}
    </h2>
  );
}

// Full-screen document preview for one student's monthly assessment —
// "Print Preview" on the Summary step. Same print: Tailwind + dynamic @page
// <style> tag convention as components/students/StudentListReport.jsx (this
// one is always portrait, unlike that report's runtime-swapped orientation)
// rather than a separate print route — window.print() prints exactly what's
// already on screen here, with the toolbar hidden via print:hidden.
export default function AssessmentPrintPreview({ student, month, year, status, form, autoFill, schoolName, schoolLogoUrl, onClose }) {
  useEffect(() => {
    const styleTag = document.getElementById('assessment-print-page-size') || document.createElement('style');
    styleTag.id = 'assessment-print-page-size';
    styleTag.textContent = '@media print { @page { size: A4 portrait; margin: 14mm 16mm; } }';
    document.head.appendChild(styleTag);
    return () => styleTag.remove();
  }, []);

  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handler);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  const monthLabel = `${MONTH_NAMES[month - 1]} ${year}`;
  const parents = [student.fatherName && `Father: ${student.fatherName}`, student.motherName && `Mother: ${student.motherName}`]
    .filter(Boolean)
    .join('   |   ');
  // Total Working Days/Days Present/% come from autoFill (real Attendance
  // records), not form.attendanceDetail — those fields aren't user-editable
  // (see AssessmentWizard.jsx's AttendanceStep), only `remark` is.
  const attendanceRemark = form.attendanceDetail?.remark || '';
  const pc = form.parentCommunication || {};

  // Portaled to document.body — this used to render nested inside
  // AssessmentDrawer/AssessmentWizard's own DOM tree, so printing also
  // printed whatever page content was still sitting behind it (the drawer
  // chrome, dashboard, wizard step UI) all overlapping on the same pages.
  // As a body-level sibling, marking that other content `print:hidden`
  // (see AssessmentDashboard.jsx/AssessmentWizard.jsx) hides it without
  // also hiding this, since print:hidden only affects its own subtree.
  return createPortal(
    <div className="fixed inset-0 z-[60] bg-gray-100 overflow-y-auto print:static print:bg-white print:overflow-visible">
      <div className="print:hidden sticky top-0 z-10 bg-white border-b border-gray-200 px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-gray-900">Print Preview — {student.name}</p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium text-white bg-gradient-to-r from-violet-700 via-indigo-600 to-blue-600 hover:opacity-90 cursor-pointer transition"
          >
            <FiPrinter className="w-4 h-4" />
            Print
          </button>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center justify-center w-9 h-9 rounded-lg text-gray-500 bg-gray-100 hover:bg-gray-200 cursor-pointer transition"
          >
            <FiX className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* print:grayscale — the printed page converts every color (badges,
          photo, logo) to grayscale via a CSS filter rather than hand-
          neutralizing each colored class; the on-screen preview stays
          colored since the filter only applies under @media print. */}
      <div className="max-w-[800px] mx-auto bg-white shadow-sm my-6 p-10 print:my-0 print:p-0 print:shadow-none print:max-w-none print:grayscale">
        {(schoolName || schoolLogoUrl) && (
          <div className="flex items-center gap-3 justify-center mb-4 print:mb-3">
            {schoolLogoUrl && <img src={schoolLogoUrl} alt="" className="h-10 print:h-9 w-auto object-contain" />}
            {schoolName && <p className="text-lg print:text-base font-bold text-gray-900 tracking-wide">{schoolName}</p>}
          </div>
        )}

        <div className="flex items-center justify-between border-b-2 border-gray-900 pb-4 mb-6 print:pb-2 print:mb-4">
          <div>
            <h1 className="text-xl print:text-lg font-bold text-gray-900">Monthly Assessment Report</h1>
            <p className="text-sm print:text-xs text-gray-500 mt-0.5">{monthLabel}</p>
          </div>
          <span
            className={`text-xs print:text-[10px] font-semibold px-3 py-1 rounded-full ${
              status === 'Completed' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-amber-50 text-amber-700 border border-amber-200'
            }`}
          >
            {status}
          </span>
        </div>

        <div className="flex items-start gap-4 mb-8 print:mb-5">
          <span className="flex items-center justify-center w-16 h-16 print:w-14 print:h-14 rounded-full bg-gray-100 text-gray-400 shrink-0 overflow-hidden">
            {student.photoUrl ? (
              <img src={student.photoUrl} alt={student.name} className="w-full h-full object-cover" />
            ) : (
              <FiUser className="w-6 h-6" />
            )}
          </span>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-2 flex-1">
            <Field label="Student Name" value={student.name} />
            <Field label="Class" value={`${student.className} - ${student.sectionName}`} />
            <Field label="Admission No." value={student.admissionId} />
            <Field label="Session" value={student.academicSession} />
            <Field label="Parents" value={parents} />
          </div>
        </div>

        <div className="space-y-6 print:space-y-4">
          <div>
            <SectionTitle>Attendance</SectionTitle>
            <div className="grid grid-cols-4 gap-4">
              <Field label="Total Working Days" value={autoFill?.totalWorkingDays} />
              <Field label="Days Present" value={autoFill?.daysPresent} />
              <Field label="Attendance %" value={autoFill?.attendancePercentage != null ? `${autoFill.attendancePercentage}%` : null} />
              <Field label="Remarks" value={attendanceRemark} />
            </div>
          </div>

          <div className="break-inside-avoid">
            <SectionTitle>Academic Performance</SectionTitle>
            <table className="w-full text-sm print:text-[10px] border-collapse">
              <thead>
                <tr className="bg-gray-50 text-left text-[10px] print:text-[9px] font-semibold text-gray-500 uppercase border-b border-gray-200">
                  <th className="py-2 px-3">Subject</th>
                  <th className="py-2 px-3">Rating</th>
                </tr>
              </thead>
              <tbody>
                {(form.academics || []).map((row) => (
                  <tr key={row.subject} className="border-b border-gray-100">
                    <td className="py-2 px-3 font-medium text-gray-900">{row.subject}</td>
                    <td className="py-2 px-3 text-gray-700">{row.rating || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="break-inside-avoid">
            <SectionTitle>Holistic Development</SectionTitle>
            <div className="grid grid-cols-2 gap-x-8 gap-y-1.5">
              {BEHAVIOUR_CATEGORIES.map((cat) => (
                <div key={cat.key} className="flex items-center justify-between text-sm print:text-[10px] border-b border-gray-50 py-1">
                  <span className="text-gray-500">{cat.label}</span>
                  <span className="font-medium text-gray-900">{form.behaviour?.[cat.key] || '—'}</span>
                </div>
              ))}
            </div>
            {form.behaviour?.overallComment && (
              <p className="text-sm print:text-[10px] text-gray-700 mt-3 italic">&ldquo;{form.behaviour.overallComment}&rdquo;</p>
            )}
          </div>

          <div className="break-inside-avoid">
            <SectionTitle>Co-Curricular Activities</SectionTitle>
            {(form.activities || []).some((e) => e.type) ? (
              <table className="w-full text-sm print:text-[10px] border-collapse">
                <thead>
                  <tr className="bg-gray-50 text-left text-[10px] print:text-[9px] font-semibold text-gray-500 uppercase border-b border-gray-200">
                    <th className="py-2 px-3">Type</th>
                    <th className="py-2 px-3">Details</th>
                    <th className="py-2 px-3">Achievement</th>
                  </tr>
                </thead>
                <tbody>
                  {(form.activities || [])
                    .filter((e) => e.type)
                    .map((e, i) => (
                      <tr key={i} className="border-b border-gray-100">
                        <td className="py-2 px-3 font-medium text-gray-900">{e.type}</td>
                        <td className="py-2 px-3 text-gray-700">{e.option || '—'}</td>
                        <td className="py-2 px-3 text-gray-500">{e.achievement || '—'}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            ) : (
              <p className="text-sm print:text-[10px] text-gray-400">None added</p>
            )}
          </div>

          <div className="break-inside-avoid">
            <SectionTitle>Concise Report</SectionTitle>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Parent Informed" value={form.conciseReport?.parentInformed} />
              <Field label="Date Informed" value={form.conciseReport?.dateInformed} />
              <Field label="PTM Attended" value={form.conciseReport?.ptmAttended} />
              <Field label="Health Status" value={form.conciseReport?.healthStatus} />
              <Field label="Overall Progress" value={form.overallPerformance} />
            </div>
            {(form.conciseReport?.parentFeedback || form.conciseReport?.followUp) && (
              <div className="grid grid-cols-2 gap-4 mt-3">
                <Field label="Parent Feedback" value={form.conciseReport?.parentFeedback} />
                <Field label="Follow Up" value={form.conciseReport?.followUp} />
              </div>
            )}
          </div>

          <div className="break-inside-avoid">
            <SectionTitle>Teacher Remarks &amp; Action Plan</SectionTitle>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Key Concern" value={pc.keyConcern} />
              <Field label="Specific Intervention Next Month" value={pc.specificIntervention} />
              <Field label="Target Outcome" value={pc.targetOutcome} />
              <Field label="Parent Involvement Notes" value={pc.parentInvolvementNotes} />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-12 mt-14 print:mt-10 break-inside-avoid">
          <div>
            <div className="border-t border-gray-400 pt-1.5">
              <p className="text-xs print:text-[10px] text-gray-500">Class Teacher Signature</p>
            </div>
          </div>
          <div>
            <div className="border-t border-gray-400 pt-1.5">
              <p className="text-xs print:text-[10px] text-gray-500">Parent Signature</p>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
