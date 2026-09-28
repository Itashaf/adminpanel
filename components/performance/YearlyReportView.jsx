'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { FiArrowLeft, FiCalendar, FiBook, FiAward, FiUsers, FiTrendingUp, FiMessageSquare, FiPrinter } from 'react-icons/fi';
import Dropdown from '@/components/Dropdown';
import Button from '@/components/Button';
import { Avatar } from '@/components/settings/RolesPermissionsExplorer';
import GrowthTrendChart from './GrowthTrendChart';
import { printYearlyReport } from './printYearlyReport';
import { setYearlyRating, setYearlyRemark, lockYearlyReport, unlockYearlyReport } from '@/lib/api';

const ACHIEVEMENT_LABEL = { PARTICIPANT: 'Participant', FIRST: '1st', SECOND: '2nd', THIRD: '3rd', SPECIAL_MENTION: 'Special Mention' };
const HOLISTIC_LABEL = { EXCELLENT: 'Excellent', GOOD: 'Good', SUPPORT: 'Support' };
const HOLISTIC_CATEGORIES = [
  { key: 'discipline', label: 'Discipline' },
  { key: 'homeworkCompletion', label: 'Homework Completion' },
  { key: 'englishCommunication', label: 'English Communication' },
  { key: 'punctuality', label: 'Punctuality' },
  { key: 'hygiene', label: 'Hygiene' },
];
const HOLISTIC_DOT = { EXCELLENT: 'bg-emerald-500', GOOD: 'bg-amber-400', SUPPORT: 'bg-red-500' };
const PERFORMANCE_DOT = { Excellent: 'bg-emerald-500', Good: 'bg-emerald-500', Average: 'bg-amber-400', 'Needs Support': 'bg-red-500' };

const RATING_OPTIONS = [
  { value: 'EXCELLENT', label: 'Excellent', style: 'bg-emerald-50 border-emerald-300 text-emerald-700' },
  { value: 'GOOD', label: 'Good', style: 'bg-blue-50 border-blue-300 text-blue-700' },
  { value: 'IMPROVING', label: 'Improving', style: 'bg-orange-50 border-orange-300 text-orange-700' },
  { value: 'SUPPORT_NEEDED', label: 'Support Needed', style: 'bg-red-50 border-red-300 text-red-700' },
];

const STATUS_BADGE = {
  DRAFT: 'bg-gray-100 text-gray-600',
  GENERATED: 'bg-blue-50 text-blue-700',
  LOCKED: 'bg-emerald-50 text-emerald-700',
};

export default function YearlyReportView({ report, academicSession, sessionOptions, canManage, canUnlock, school }) {
  const router = useRouter();
  const [finalRating, setFinalRating] = useState(report.finalRating);
  const [teacherRemark, setTeacherRemark] = useState(report.teacherRemark || '');
  const [status, setStatus] = useState(report.status);
  const [savingRemark, setSavingRemark] = useState(false);
  const [isLocking, setIsLocking] = useState(false);
  const [formError, setFormError] = useState('');

  const isLocked = status === 'LOCKED';
  const readOnly = isLocked || !canManage;

  const handlePrint = () => {
    printYearlyReport({ school, academicSession, report: { ...report, finalRating, teacherRemark } });
  };

  const handleLock = async () => {
    setIsLocking(true);
    setFormError('');
    try {
      const locked = await lockYearlyReport(report.studentId, { academicSession });
      setStatus(locked.status);
    } catch (err) {
      setFormError(err.message);
    } finally {
      setIsLocking(false);
    }
  };

  const handleUnlock = async () => {
    setIsLocking(true);
    setFormError('');
    try {
      const unlocked = await unlockYearlyReport(report.studentId, { academicSession });
      setStatus(unlocked.status);
    } catch (err) {
      setFormError(err.message);
    } finally {
      setIsLocking(false);
    }
  };

  const changeSession = (nextSession) => {
    router.push(`/dashboard/performance/yearly/${report.studentId}?academicSession=${encodeURIComponent(nextSession)}`);
  };

  const handlePickRating = async (value) => {
    setFinalRating(value);
    try {
      const updated = await setYearlyRating(report.studentId, { academicSession, finalRating: value });
      setStatus(updated.status);
    } catch (err) {
      setFormError(err.message);
    }
  };

  const handleSaveRemark = async () => {
    setSavingRemark(true);
    setFormError('');
    try {
      const updated = await setYearlyRemark(report.studentId, { academicSession, teacherRemark });
      setStatus(updated.status);
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSavingRemark(false);
    }
  };

  return (
    <div className="space-y-6">
      <button
        type="button"
        onClick={() => router.push('/dashboard/performance/yearly')}
        className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-indigo-700 transition cursor-pointer"
      >
        <FiArrowLeft className="w-4 h-4" />
        Yearly Reports
      </button>

      {formError && <p className="text-sm text-red-500 bg-red-50 border border-red-100 rounded-lg px-4 py-3">{formError}</p>}

      {/* Student Header */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center gap-5">
        <Avatar name={report.studentName} photoUrl={report.photoUrl} seed={0} />
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold text-gray-900">{report.studentName}</h1>
          <p className="text-sm text-gray-400 mt-0.5">{report.admissionId}</p>
          <div className="flex items-center flex-wrap gap-2 mt-2.5">
            <span className="text-sm text-gray-600 bg-gray-50 rounded-lg px-3 py-1">
              {report.className} - {report.sectionName}
            </span>
            <span className={`inline-block text-xs font-semibold rounded-full px-2.5 py-1 ${STATUS_BADGE[status] || 'bg-gray-100 text-gray-600'}`}>
              {status}
            </span>
            <span className="text-xs text-gray-400">{report.monthsReported} month{report.monthsReported === 1 ? '' : 's'} reported</span>
          </div>
        </div>
        <div className="w-40">
          <Dropdown value={academicSession} onChange={changeSession} options={sessionOptions} />
        </div>
      </div>

      {isLocked && (
        <p className="text-xs text-gray-400 bg-gray-50 border border-gray-100 rounded-lg px-4 py-2.5">
          This report is locked — read-only, except Attendance which always shows live data.
        </p>
      )}

      {/* Yearly Attendance */}
      <Section icon={FiCalendar} iconBg="bg-cyan-100 text-cyan-700" title="Yearly Attendance" subtitle="Auto-generated, always live">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <MiniStat label="Working Days" value={report.attendance.workingDays} accent="text-gray-900" />
          <MiniStat label="Present Days" value={report.attendance.presentDays} accent="text-emerald-600" />
          <MiniStat label="Absent Days" value={report.attendance.absentDays} accent="text-red-600" />
          <MiniStat label="Attendance %" value={`${report.attendance.percent}%`} accent="text-blue-600" />
        </div>
      </Section>

      {/* Yearly Academic Performance */}
      <Section icon={FiBook} iconBg="bg-violet-100 text-violet-700" title="Academic Performance" subtitle="Averaged across the whole session">
        {report.academicPerformance.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-6">No tests recorded this session.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs font-medium text-gray-400 uppercase tracking-wide border-b border-gray-100">
                  <th className="py-2 pr-4">Subject</th>
                  <th className="py-2 pr-4">Avg %</th>
                  <th className="py-2 pr-4">Grade</th>
                </tr>
              </thead>
              <tbody>
                {report.academicPerformance.map((s) => (
                  <tr key={s.subjectId} className="border-b border-gray-50 last:border-0">
                    <td className="py-3 pr-4 font-medium text-gray-900 flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${PERFORMANCE_DOT[s.status] || 'bg-gray-300'}`} />
                      {s.subjectName}
                    </td>
                    <td className="py-3 pr-4 text-gray-700">{s.averagePercent}%</td>
                    <td className="py-3 pr-4 font-bold text-violet-700">{s.grade}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      {/* Yearly Activities */}
      <Section icon={FiAward} iconBg="bg-amber-100 text-amber-700" title="Activities & Achievements" subtitle="Combined from every monthly report">
        {report.activities.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-6">No activities recorded this session.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {report.activities.map((a, i) => (
              <span key={a.id || i} className="inline-flex items-center gap-1.5 text-sm bg-gray-50 rounded-full px-3.5 py-1.5">
                {a.activityName}
                <span className="text-xs font-semibold text-indigo-700">{ACHIEVEMENT_LABEL[a.achievement] || a.achievement}</span>
              </span>
            ))}
          </div>
        )}
      </Section>

      {/* Yearly Holistic Performance */}
      <Section icon={FiUsers} iconBg="bg-blue-100 text-blue-700" title="Holistic Performance" subtitle="Averaged across every monthly assessment">
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {HOLISTIC_CATEGORIES.map(({ key, label }) => {
            const value = report.holistic?.[key];
            return (
              <div key={key} className="rounded-xl bg-gray-50 p-3 text-center">
                <p className="text-xs text-gray-400">{label}</p>
                <div className="flex items-center justify-center gap-1.5 mt-1.5">
                  {value && <span className={`w-2 h-2 rounded-full ${HOLISTIC_DOT[value]}`} />}
                  <span className="text-sm font-semibold text-gray-900">{value ? HOLISTIC_LABEL[value] : '—'}</span>
                </div>
              </div>
            );
          })}
        </div>
      </Section>

      {/* Growth Trend */}
      <Section icon={FiTrendingUp} iconBg="bg-emerald-100 text-emerald-700" title="Performance Trend" subtitle="Monthly academic average over the session">
        <GrowthTrendChart trend={report.growthTrend} />
      </Section>

      {/* Yearly Teacher Remark */}
      <Section icon={FiMessageSquare} iconBg="bg-pink-100 text-pink-700" title="Teacher Remark" subtitle="One final remark for the session">
        <textarea
          value={teacherRemark}
          onChange={(e) => setTeacherRemark(e.target.value.slice(0, 1000))}
          disabled={readOnly}
          rows={4}
          placeholder="Final remark for the year..."
          className="w-full text-sm border border-gray-200 rounded-2xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-50 disabled:text-gray-400"
        />
        <p className="text-xs text-gray-400 mt-1 text-right">{teacherRemark.length}/1000</p>
        {!readOnly && (
          <div className="flex justify-end mt-2">
            <Button label={savingRemark ? 'Saving...' : 'Save Remark'} onClick={handleSaveRemark} disabled={savingRemark} />
          </div>
        )}

        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mt-5 mb-2">Final Rating</p>
        <div className="flex flex-wrap gap-2">
          {RATING_OPTIONS.map((opt) => {
            const isSelected = finalRating === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                disabled={readOnly}
                onClick={() => handlePickRating(opt.value)}
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
          {isLocked
            ? canUnlock && (
                <Button label={isLocking ? 'Unlocking...' : 'Unlock Report'} variant="secondary" onClick={handleUnlock} disabled={isLocking} />
              )
            : canManage && (
                <Button label={isLocking ? 'Locking...' : 'Lock Report'} onClick={handleLock} disabled={isLocking} />
              )}
        </div>
      </Section>
    </div>
  );
}

function Section({ icon: Icon, iconBg, title, subtitle, children }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sm:p-8">
      <div className="flex items-center gap-3 mb-5">
        <span className={`flex items-center justify-center w-10 h-10 rounded-xl shrink-0 ${iconBg}`}>
          <Icon className="w-5 h-5" />
        </span>
        <div>
          <h3 className="text-lg font-bold text-gray-900">{title}</h3>
          <p className="text-sm text-gray-500">{subtitle}</p>
        </div>
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
