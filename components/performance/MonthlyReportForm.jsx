'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  FiArrowLeft,
  FiPlus,
  FiTrash2,
  FiCalendar,
  FiAward,
  FiBook,
  FiUsers,
  FiMessageSquare,
  FiClipboard,
  FiPrinter,
  FiInfo,
  FiClock,
  FiSave,
  FiUserCheck,
  FiXCircle,
  FiBarChart2,
} from 'react-icons/fi';
import { HiOutlineAcademicCap } from 'react-icons/hi2';
import { printMonthlyReport } from './printMonthlyReport';
import Button from '@/components/Button';
import Modal from '@/components/Modal';
import Dropdown from '@/components/Dropdown';
import Toast from '@/components/Toast';
import {
  addMonthlyActivity,
  removeMonthlyActivity,
  setMonthlyHolistic,
  setMonthlyRemarks,
  setMonthlyRating,
  createSubjectTest,
} from '@/lib/api';

const ACHIEVEMENT_OPTIONS = [
  { value: 'PARTICIPANT', label: 'Participant' },
  { value: 'FIRST', label: '1st' },
  { value: 'SECOND', label: '2nd' },
  { value: 'THIRD', label: '3rd' },
  { value: 'SPECIAL_MENTION', label: 'Special Mention' },
];

const HOLISTIC_CATEGORIES = [
  { key: 'discipline', label: 'Discipline' },
  { key: 'homeworkCompletion', label: 'Homework Completion' },
  { key: 'englishCommunication', label: 'English Communication' },
  { key: 'punctuality', label: 'Punctuality' },
  { key: 'hygiene', label: 'Hygiene' },
];

const HOLISTIC_OPTIONS = [
  { value: 'EXCELLENT', label: 'Excellent', dot: 'bg-emerald-500', ring: 'border-emerald-500', active: 'bg-emerald-50 text-emerald-700' },
  { value: 'GOOD', label: 'Good', dot: 'bg-amber-400', ring: 'border-amber-400', active: 'bg-amber-50 text-amber-700' },
  { value: 'SUPPORT', label: 'Support', dot: 'bg-red-500', ring: 'border-red-500', active: 'bg-red-50 text-red-700' },
];


const OVERALL_RATING_OPTIONS = [
  { value: 'EXCELLENT', label: 'Excellent', style: 'bg-emerald-50 border-emerald-300 text-emerald-700' },
  { value: 'GOOD', label: 'Good', style: 'bg-blue-50 border-blue-300 text-blue-700' },
  { value: 'IMPROVING', label: 'Improving', style: 'bg-orange-50 border-orange-300 text-orange-700' },
  { value: 'SUPPORT_NEEDED', label: 'Support Needed', style: 'bg-red-50 border-red-300 text-red-700' },
];

const STATUS_BADGE = {
  DRAFT: 'bg-gray-100 text-gray-600',
  COMPLETED: 'bg-blue-50 text-blue-700',
  LOCKED: 'bg-emerald-50 text-emerald-700',
};

const PERFORMANCE_DOT = {
  Excellent: 'bg-emerald-500',
  Good: 'bg-emerald-500',
  Average: 'bg-amber-400',
  'Needs Support': 'bg-red-500',
};

function monthLabel(month) {
  const [year, m] = month.split('-');
  return new Date(Number(year), Number(m) - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

export default function MonthlyReportForm({
  report,
  academicSession,
  month,
  sessionOptions,
  canManage,
  school,
  canManageTests,
  isTeacher,
  subjects,
  teacherOptions,
}) {
  const router = useRouter();
  const [activities, setActivities] = useState(report.activities);
  const [holistic, setHolisticState] = useState(report.holistic);
  // Rapid pill clicks across categories land inside the same React batch,
  // so a second handleHolisticPick call reading the `holistic` state
  // variable would still see the pre-first-click value (stale closure) and
  // silently drop that first pick when it builds `next`. A ref always
  // holds the latest value synchronously, so back-to-back clicks never
  // race each other.
  const holisticRef = useRef(report.holistic);
  const setHolistic = (value) => {
    holisticRef.current = value;
    setHolisticState(value);
  };
  const [remarkText, setRemarkText] = useState(report.remarks?.remarkText || '');
  const [overallRating, setOverallRatingState] = useState(report.overallRating);
  const [status, setStatus] = useState(report.status);
  const [showAddActivity, setShowAddActivity] = useState(false);
  const [showAddTest, setShowAddTest] = useState(false);
  const [savingRemarks, setSavingRemarks] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [formError, setFormError] = useState('');

  // A report locked before this feature was removed from the UI still
  // renders read-only — the schema/backend lock state is untouched, only
  // the Lock/Unlock controls are gone.
  const isLocked = status === 'LOCKED';
  const readOnly = isLocked || !canManage;

  const changeMonth = (nextMonth) => {
    router.push(`/dashboard/performance/monthly/${report.studentId}?academicSession=${encodeURIComponent(academicSession)}&month=${nextMonth}`);
  };
  const changeSession = (nextSession) => {
    router.push(`/dashboard/performance/monthly/${report.studentId}?academicSession=${encodeURIComponent(nextSession)}&month=${month}`);
  };

  const handleAddActivity = async ({ activityName, achievement }) => {
    const activity = await addMonthlyActivity(report.studentId, { academicSession, month, activityName, achievement });
    setActivities((prev) => [...prev, activity]);
    setShowAddActivity(false);
    setStatus('COMPLETED');
  };

  const handleRemoveActivity = async (activityId) => {
    await removeMonthlyActivity(report.studentId, activityId, { academicSession, month });
    setActivities((prev) => prev.filter((a) => a.id !== activityId));
  };

  const handleHolisticPick = async (category, value) => {
    const next = { ...(holisticRef.current || {}), [category]: value };
    const complete = HOLISTIC_CATEGORIES.every((c) => next[c.key]);
    setHolistic(next);
    if (!complete) return; // save once all 5 categories have a value
    try {
      const saved = await setMonthlyHolistic(report.studentId, { academicSession, month, ...next });
      setHolistic(saved);
      setStatus('COMPLETED');
    } catch (err) {
      setFormError(err.message);
    }
  };

  const handleSaveRemarks = async () => {
    setSavingRemarks(true);
    setFormError('');
    try {
      await setMonthlyRemarks(report.studentId, { academicSession, month, remarkText });
      setToastMessage('Report saved.');
      setStatus('COMPLETED');
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSavingRemarks(false);
    }
  };

  const handlePrint = () => {
    printMonthlyReport({
      school,
      academicSession,
      month,
      report: {
        ...report,
        activities,
        holistic,
        remarks: { remarkText },
        overallRating,
      },
    });
  };

  const handlePickOverallRating = async (value) => {
    setOverallRatingState(value);
    try {
      const updated = await setMonthlyRating(report.studentId, { academicSession, month, overallRating: value });
      setStatus(updated.status);
    } catch (err) {
      setFormError(err.message);
    }
  };

  return (
    <div className="space-y-6">
      <button
        type="button"
        onClick={() => router.push('/dashboard/performance/monthly')}
        className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-indigo-700 transition cursor-pointer"
      >
        <FiArrowLeft className="w-4 h-4" />
        Monthly Reports
      </button>

      {formError && <p className="text-sm text-red-500 bg-red-50 border border-red-100 rounded-lg px-4 py-3">{formError}</p>}

      {/* Student Details + Attendance — side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Student Header */}
        <div className="relative overflow-hidden bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col">
          <div className="relative overflow-hidden bg-gradient-to-br from-indigo-50 via-purple-50 to-blue-50 p-6 sm:p-8 pb-5">
            <div className="pointer-events-none absolute -bottom-10 -right-10 w-48 h-48 rounded-full bg-white/40 blur-2xl" />
            <div className="pointer-events-none absolute bottom-0 right-0 w-40 h-40 rounded-full border-[24px] border-indigo-100/50" />
            <div className="relative flex items-center gap-4">
              <div className="flex-1 min-w-0">
                <h1 className="text-2xl font-bold text-gray-900">{report.studentName}</h1>
                <p className="text-sm text-gray-500 mt-0.5">{report.admissionId}</p>
                <div className="flex items-center flex-wrap gap-2 mt-2.5">
                  <span className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-700 bg-white/70 rounded-full px-3 py-1">
                    <HiOutlineAcademicCap className="w-4 h-4" />
                    {report.className} - {report.sectionName}
                  </span>
                  <span className={`inline-flex items-center gap-1.5 text-xs font-semibold uppercase rounded-full px-2.5 py-1 ${STATUS_BADGE[status] || 'bg-gray-100 text-gray-600'}`}>
                    <span className="w-1.5 h-1.5 rounded-full bg-current" />
                    {status}
                  </span>
                </div>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 p-6 sm:p-8 pt-5">
            <div>
              <label className="flex items-center gap-1.5 text-xs font-medium text-gray-400 mb-1.5">
                <FiCalendar className="w-3.5 h-3.5" />
                Academic Session
              </label>
              <Dropdown value={academicSession} onChange={changeSession} options={sessionOptions} />
            </div>
            <div>
              <label className="flex items-center gap-1.5 text-xs font-medium text-gray-400 mb-1.5">
                <FiCalendar className="w-3.5 h-3.5" />
                Month
              </label>
              <input
                type="month"
                value={month}
                onChange={(e) => changeMonth(e.target.value)}
                className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-full focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
        </div>

        {/* Attendance — always live, never editable */}
        <Section icon={FiCalendar} iconBg="bg-cyan-100 text-cyan-700" title="Attendance" subtitle={`${monthLabel(month)} • Auto-generated, always live`} compact>
          <div className="grid grid-cols-2 gap-3">
            <AttendanceStat icon={FiUserCheck} label="Present Days" value={report.attendance.presentDays} tone="emerald" />
            <AttendanceStat icon={FiXCircle} label="Absent Days" value={report.attendance.absentDays} tone="red" />
            <AttendanceStat icon={FiClock} label="Late Days" value={report.attendance.lateDays} tone="amber" />
            <AttendanceStat icon={FiBarChart2} label="Attendance %" value={`${report.attendance.percent}%`} tone="blue" />
          </div>
        </Section>
      </div>

      {/* Section 2: Academic Performance — traffic-light cards */}
      <Section
        icon={FiBook}
        iconBg="bg-violet-100 text-violet-700"
        title="Academic Performance"
        subtitle="Auto-fetched from Subject Tests"
        action={canManageTests && <Button label="Add Test" icon={<FiPlus className="w-4 h-4" />} onClick={() => setShowAddTest(true)} />}
      >
        {report.academicPerformance.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-6">No tests recorded this month.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {report.academicPerformance.map((s) => (
              <div key={s.subjectId} className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                <p className="font-semibold text-gray-900">{s.subjectName}</p>
                <p className="text-xs text-gray-400 mt-0.5">Latest: {s.latestTest}</p>
                <div className="flex items-center gap-2 mt-2">
                  <span className={`w-2.5 h-2.5 rounded-full ${PERFORMANCE_DOT[s.status]}`} />
                  <span className="text-sm font-medium text-gray-700">{s.status}</span>
                </div>
                <p className="text-2xl font-bold text-gray-900 mt-1">{s.averagePercent}%</p>
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* Section 3: Activities & Achievements */}
      <Section
        icon={FiAward}
        iconBg="bg-amber-100 text-amber-700"
        title="Activities & Achievements"
        subtitle="Class Teacher section"
        action={!readOnly && <Button label="Add Activity" icon={<FiPlus className="w-4 h-4" />} onClick={() => setShowAddActivity(true)} />}
      >
        {activities.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-6">No activities added yet.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {activities.map((a) => (
              <div key={a.id} className="rounded-xl border border-gray-100 bg-gray-50 p-4 flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-medium text-gray-900 truncate">{a.activityName}</p>
                  <span className="inline-block text-xs font-semibold rounded-full px-2.5 py-1 mt-2 bg-indigo-50 text-indigo-700">
                    {ACHIEVEMENT_OPTIONS.find((o) => o.value === a.achievement)?.label || a.achievement}
                  </span>
                </div>
                {!readOnly && (
                  <button type="button" onClick={() => handleRemoveActivity(a.id)} className="text-gray-300 hover:text-red-500 cursor-pointer shrink-0">
                    <FiTrash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* Section 4 + 5: Holistic Assessment + Class/Subject Teacher Remarks — side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Section
          icon={FiUsers}
          iconBg="bg-blue-100 text-blue-700"
          title="Holistic Assessment"
          subtitle="Overall development and behaviour this month"
          action={
            <span className="hidden sm:inline-flex items-center gap-1.5 text-xs font-medium text-blue-700 bg-blue-50 rounded-full px-3 py-1.5 whitespace-nowrap">
              <FiInfo className="w-3.5 h-3.5" />
              Single tap to select
            </span>
          }
        >
          <div>
            {HOLISTIC_CATEGORIES.map((cat, i) => (
              <div
                key={cat.key}
                className={`flex items-center justify-between gap-3 flex-wrap py-3.5 ${i < HOLISTIC_CATEGORIES.length - 1 ? 'border-b border-gray-50' : ''}`}
              >
                <div className="flex items-center gap-3">
                  <p className="text-sm font-medium text-gray-800">{cat.label}</p>
                </div>
                <div className="flex gap-2">
                  {HOLISTIC_OPTIONS.map((opt) => {
                    const isSelected = holistic?.[cat.key] === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        disabled={readOnly}
                        onClick={() => handleHolisticPick(cat.key, opt.value)}
                        className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full text-[11px] font-medium border transition cursor-pointer disabled:cursor-not-allowed disabled:opacity-60 ${
                          isSelected ? `${opt.active} border-transparent` : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                        }`}
                      >
                        <span
                          className={`flex items-center justify-center w-3.5 h-3.5 rounded-full border-2 shrink-0 ${
                            isSelected ? opt.ring : 'border-gray-300'
                          }`}
                        >
                          {isSelected && <span className={`w-1.5 h-1.5 rounded-full ${opt.dot}`} />}
                        </span>
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </Section>

        <Section icon={FiMessageSquare} iconBg="bg-pink-100 text-pink-700" title="Class/Subject Teacher Remarks" subtitle="Additional remarks for this month">
          <div className="space-y-4">
            <div>
              <textarea
                value={remarkText}
                onChange={(e) => setRemarkText(e.target.value.slice(0, 500))}
                disabled={readOnly}
                rows={7}
                placeholder="Write additional remarks about the student's performance, behaviour, participation, or any areas of improvement..."
                className="w-full text-sm border border-gray-200 rounded-2xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-50 disabled:text-gray-400 resize-y"
              />
              <p className="text-xs text-gray-400 mt-1 text-right">{remarkText.length}/500</p>
            </div>

            <div className="flex items-start gap-3 bg-indigo-50 rounded-2xl px-4 py-3.5">
              <span className="flex items-center justify-center w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 shrink-0">
                <FiInfo className="w-4 h-4" />
              </span>
              <div>
                <p className="text-sm font-semibold text-gray-900">Tips</p>
                <p className="text-xs text-gray-500 mt-0.5">Mention strengths, areas of improvement, or specific observations for this month.</p>
              </div>
            </div>

            {!readOnly && (
              <div className="flex justify-end">
                <Button label={savingRemarks ? 'Saving...' : 'Save Remarks'} icon={<FiSave className="w-4 h-4" />} onClick={handleSaveRemarks} disabled={savingRemarks} />
              </div>
            )}
          </div>
        </Section>
      </div>

      {/* Section 6: Final Review */}
      <Section icon={FiClipboard} iconBg="bg-gray-100 text-gray-700" title="Final Review" subtitle="Summary & overall rating">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-5">
          <MiniStat label="Attendance %" value={`${report.attendance.percent}%`} accent="text-blue-600" />
          <MiniStat label="Activities" value={activities.length} accent="text-amber-600" />
          <MiniStat
            label="Achievements"
            value={activities.filter((a) => a.achievement !== 'PARTICIPANT').length}
            accent="text-violet-600"
          />
          <MiniStat label="Tests" value={report.academicPerformance.length} accent="text-emerald-600" />
        </div>

        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Overall Performance</p>
        <div className="flex flex-wrap gap-2">
          {OVERALL_RATING_OPTIONS.map((opt) => {
            const isSelected = overallRating === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                disabled={readOnly}
                onClick={() => handlePickOverallRating(opt.value)}
                className={`px-4 py-2 rounded-full text-sm font-medium border transition cursor-pointer disabled:cursor-not-allowed disabled:opacity-60 ${
                  isSelected ? opt.style : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>

        <div className="flex justify-end gap-2 mt-6 pt-5 border-t border-gray-100">
          <Button label="Generate PDF" variant="secondary" icon={<FiPrinter className="w-4 h-4" />} onClick={handlePrint} />
          {!readOnly && (
            <Button
              label={savingRemarks ? 'Saving...' : 'Save Report'}
              icon={<FiSave className="w-4 h-4" />}
              onClick={handleSaveRemarks}
              disabled={savingRemarks}
            />
          )}
        </div>
      </Section>

      {showAddActivity && (
        <AddActivityModal onClose={() => setShowAddActivity(false)} onAdd={handleAddActivity} />
      )}

      {showAddTest && (
        <AddTestModal
          academicSession={academicSession}
          className={report.className}
          sectionName={report.sectionName}
          subjects={subjects}
          teacherOptions={teacherOptions}
          isTeacher={isTeacher}
          onClose={() => setShowAddTest(false)}
          onCreated={(test) => {
            setShowAddTest(false);
            router.push(`/dashboard/performance/tests/${test.id}/marks`);
          }}
        />
      )}

      {toastMessage && <Toast message={toastMessage} onClose={() => setToastMessage('')} />}
    </div>
  );
}

function Section({ icon: Icon, iconBg, title, subtitle, action, compact, children }) {
  return (
    <div className={`bg-white rounded-2xl border border-gray-100 shadow-sm ${compact ? 'p-5' : 'p-6 sm:p-8'}`}>
      <div className={`flex items-center justify-between gap-3 flex-wrap ${compact ? 'mb-3' : 'mb-5'}`}>
        <div className="flex items-center gap-3">
          <span className={`flex items-center justify-center rounded-xl shrink-0 ${compact ? 'w-9 h-9' : 'w-10 h-10'} ${iconBg}`}>
            <Icon className={compact ? 'w-4 h-4' : 'w-5 h-5'} />
          </span>
          <div>
            <h3 className={`font-bold text-gray-900 ${compact ? 'text-base' : 'text-lg'}`}>{title}</h3>
            <p className="text-sm text-gray-500">{subtitle}</p>
          </div>
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

function MiniStat({ label, value, accent }) {
  return (
    <div className="rounded-xl bg-gray-50 p-4">
      <p className="text-xs text-gray-400">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${accent}`}>{value}</p>
    </div>
  );
}

const ATTENDANCE_TONE = {
  emerald: { bg: 'bg-emerald-50', iconBg: 'bg-emerald-500', text: 'text-emerald-600', ring: 'border-emerald-100' },
  red: { bg: 'bg-red-50', iconBg: 'bg-red-500', text: 'text-red-600', ring: 'border-red-100' },
  amber: { bg: 'bg-amber-50', iconBg: 'bg-amber-500', text: 'text-amber-600', ring: 'border-amber-100' },
  blue: { bg: 'bg-blue-50', iconBg: 'bg-blue-500', text: 'text-blue-600', ring: 'border-blue-100' },
};

function AttendanceStat({ icon: Icon, label, value, tone }) {
  const c = ATTENDANCE_TONE[tone];
  return (
    <div className={`relative overflow-hidden rounded-2xl p-3 ${c.bg}`}>
      <div className={`pointer-events-none absolute -bottom-5 -right-5 w-16 h-16 rounded-full border-[11px] ${c.ring}`} />
      <span className={`relative flex items-center justify-center w-7 h-7 rounded-full text-white shrink-0 ${c.iconBg}`}>
        <Icon className="w-3.5 h-3.5" />
      </span>
      <p className="relative text-xs text-gray-600 mt-1.5">{label}</p>
      <p className={`relative text-xl font-bold mt-0.5 ${c.text}`}>{value}</p>
    </div>
  );
}

// Quick-create a Subject Test scoped to this student's own class/section
// (no class/section picker needed — reachable straight from their Academic
// Performance section, unlike the full Subject Tests screen's version).
// Creating a test doesn't put marks on it — on success this hands off to
// the test's own marks-entry page so the next step is obvious.
function AddTestModal({ academicSession, className, sectionName, subjects, teacherOptions, isTeacher, onClose, onCreated }) {
  const [subjectId, setSubjectId] = useState('');
  const [teacherId, setTeacherId] = useState('');
  const [testName, setTestName] = useState('');
  const [testDate, setTestDate] = useState('');
  const [maxMarks, setMaxMarks] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    setError('');
    if (!subjectId || !testName || !testDate || !maxMarks || (!isTeacher && !teacherId)) {
      setError('All fields are required.');
      return;
    }
    setIsSaving(true);
    try {
      const test = await createSubjectTest({
        academicSession,
        className,
        sectionName,
        subjectId,
        testName,
        testDate,
        maxMarks: Number(maxMarks),
        ...(isTeacher ? {} : { teacherId }),
      });
      onCreated(test);
    } catch (err) {
      setError(err.message);
      setIsSaving(false);
    }
  };

  return (
    <Modal
      title="Add Test"
      description={`${className} - ${sectionName}`}
      isOpen
      onClose={onClose}
      footer={
        <div className="flex justify-end gap-2">
          <Button label="Cancel" variant="secondary" onClick={onClose} />
          <Button label={isSaving ? 'Creating...' : 'Create & Enter Marks'} onClick={handleSubmit} disabled={isSaving} />
        </div>
      }
    >
      {error && <p className="text-sm text-red-500 bg-red-50 border border-red-100 rounded-lg px-4 py-3 mb-3">{error}</p>}
      <div className="space-y-3 pb-[10px]">
        <Dropdown placeholder="Subject" value={subjectId} onChange={setSubjectId} options={subjects} />
        {!isTeacher && <Dropdown placeholder="Teacher" value={teacherId} onChange={setTeacherId} options={teacherOptions} searchable />}
        <input
          type="text"
          placeholder="Test name (e.g. Unit Test 1)"
          value={testName}
          onChange={(e) => setTestName(e.target.value)}
          className="w-full text-sm border border-gray-200 rounded-full px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <div className="grid grid-cols-2 gap-3">
          <input
            type="date"
            value={testDate}
            onChange={(e) => setTestDate(e.target.value)}
            className="w-full text-sm border border-gray-200 rounded-full px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <input
            type="number"
            placeholder="Max marks"
            value={maxMarks}
            onChange={(e) => setMaxMarks(e.target.value)}
            className="w-full text-sm border border-gray-200 rounded-full px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>
    </Modal>
  );
}

function AddActivityModal({ onClose, onAdd }) {
  const [activityName, setActivityName] = useState('');
  const [achievement, setAchievement] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!activityName || !achievement) {
      setError('Activity name and achievement are required.');
      return;
    }
    setIsSaving(true);
    setError('');
    try {
      await onAdd({ activityName, achievement });
    } catch (err) {
      setError(err.message);
      setIsSaving(false);
    }
  };

  return (
    <Modal
      title="Add Activity"
      isOpen
      onClose={onClose}
      footer={
        <div className="flex justify-end gap-2">
          <Button label="Cancel" variant="secondary" onClick={onClose} />
          <Button label={isSaving ? 'Adding...' : 'Add'} onClick={handleSubmit} disabled={isSaving} />
        </div>
      }
    >
      {error && <p className="text-sm text-red-500 bg-red-50 border border-red-100 rounded-lg px-4 py-3 mb-3">{error}</p>}
      <div className="space-y-3 pt-[10px] pb-[10px]">
        <input
          type="text"
          placeholder="Activity name (e.g. Inter-school Debate)"
          value={activityName}
          onChange={(e) => setActivityName(e.target.value)}
          className="w-full text-sm border border-gray-200 rounded-full px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <div className="flex flex-wrap gap-2">
          {ACHIEVEMENT_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setAchievement(opt.value)}
              className={`px-3.5 py-1.5 rounded-full text-sm font-medium border transition cursor-pointer ${
                achievement === opt.value ? 'bg-indigo-50 border-indigo-300 text-indigo-700' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>
    </Modal>
  );
}
