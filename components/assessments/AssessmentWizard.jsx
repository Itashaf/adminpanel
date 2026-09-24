'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  FiUser,
  FiCheck,
  FiChevronLeft,
  FiChevronRight,
  FiSave,
  FiSend,
  FiTrendingUp,
  FiHome,
  FiCheckCircle,
  FiActivity,
  FiCalendar,
  FiHeart,
  FiFileText,
  FiCheckSquare,
  FiPrinter,
  FiPlus,
  FiTrash2,
} from 'react-icons/fi';
import Toast from '@/components/Toast';
import Dropdown from '@/components/Dropdown';
import AssessmentPrintPreview from './AssessmentPrintPreview';
import { saveStudentAssessment } from '@/lib/api';
import {
  WIZARD_STEPS,
  OVERALL_PERFORMANCE_OPTIONS,
  OVERALL_PERFORMANCE_STYLES,
  OVERALL_TAGS,
  BEHAVIOUR_CATEGORIES,
  RATING_LEVELS,
  HOLISTIC_RATING_LEVELS,
  RATING_STYLES,
  ACTIVITY_TYPES,
  ACTIVITY_TYPE_OPTIONS,
  ACHIEVEMENT_LEVELS,
} from '@/lib/assessmentConstants';

const AUTOSAVE_DELAY = 1500;

const HOLISTIC_RATING_OPTIONS = HOLISTIC_RATING_LEVELS.map((level) => ({ value: level, label: level }));

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const MONTH_LABEL = (month) => MONTH_NAMES[month - 1];

function emptyForm(existing, subjects, autoFill) {
  return {
    attendanceDetail: {
      totalWorkingDays: existing?.attendanceDetail?.totalWorkingDays ?? autoFill?.totalWorkingDays ?? '',
      daysPresent: existing?.attendanceDetail?.daysPresent ?? autoFill?.daysPresent ?? '',
      remark: existing?.attendanceDetail?.remark || '',
    },
    overallPerformance: existing?.overallPerformance || '',
    overallTags: existing?.overallTags || [],
    overallRemark: existing?.overallRemark || '',
    behaviour: existing?.behaviour || {},
    academics:
      existing?.academics?.length > 0
        ? existing.academics
        : subjects.map((subject) => ({ subject, rating: '', remark: '' })),
    // Array of { type, option, achievement } entries — one per "Add Another
    // Activity" row. Starts with a single blank row rather than an empty
    // array, so the step never opens looking completely empty.
    activities:
      existing?.activities?.length > 0 ? existing.activities : [{ type: '', option: '', achievement: '' }],
    parentCommunication: {
      keyConcern: existing?.parentCommunication?.keyConcern || '',
      specificIntervention: existing?.parentCommunication?.specificIntervention || '',
      targetOutcome: existing?.parentCommunication?.targetOutcome || '',
      parentInvolvementNotes: existing?.parentCommunication?.parentInvolvementNotes || '',
    },
  };
}

function ChipButton({ isActive, onClick, children, activeClass, disabled }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`px-3.5 py-2 rounded-full text-sm font-medium border transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
        isActive ? activeClass : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
      }`}
    >
      {children}
    </button>
  );
}

// One icon per WIZARD_STEPS entry, keyed by step.key — used by the step
// indicator below.
const STEP_ICONS = {
  academic: FiCalendar,
  development: FiHeart,
  activities: FiActivity,
  concise: FiFileText,
  summary: FiCheckSquare,
};

// Single-row icon stepper, all steps in one line (small text/circles so they
// keep fitting instead of wrapping or scrolling — see the two earlier
// layouts this replaced). Done step: filled green circle, checkmark.
// Current step: bigger filled indigo circle with a ring glow, its own icon.
// Future step: light outline circle, its own icon in gray.
function StepIndicatorRow({ steps, currentStep, onSelect }) {
  return (
    <div className="flex items-start justify-center">
      {steps.map((s, index) => {
        const isDone = index < currentStep;
        const isCurrent = index === currentStep;
        const Icon = STEP_ICONS[s.key];
        return (
          <div key={s.key} className="flex items-start">
            <button type="button" onClick={() => onSelect(index)} className="flex flex-col items-center gap-1.5 px-0.5 w-12 sm:w-16 cursor-pointer group shrink-0">
              <span
                className={`flex items-center justify-center rounded-full shrink-0 transition ${
                  isCurrent
                    ? 'w-10 h-10 sm:w-11 sm:h-11 bg-indigo-600 text-white ring-4 ring-indigo-100'
                    : isDone
                    ? 'w-9 h-9 sm:w-10 sm:h-10 bg-green-500 text-white'
                    : 'w-9 h-9 sm:w-10 sm:h-10 bg-white border-2 border-gray-200 text-gray-300 group-hover:border-gray-300'
                }`}
              >
                {isDone ? <FiCheck className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
              </span>
              <span
                className={`text-[10px] sm:text-xs font-medium text-center leading-tight truncate w-full ${
                  isCurrent ? 'text-indigo-700' : isDone ? 'text-green-700' : 'text-gray-400'
                }`}
              >
                {s.label}
              </span>
            </button>
            {index < steps.length - 1 && <span className="w-2 sm:w-6 border-t-2 border-dotted border-gray-300 mx-0.5 shrink-0 mt-5" />}
          </div>
        );
      })}
    </div>
  );
}

function StudentCard({ student, autoFill }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-center gap-4 flex-wrap">
      <span className="flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 text-gray-400 shrink-0 overflow-hidden">
        {student.photoUrl ? (
          <img src={student.photoUrl} alt={student.name} className="w-full h-full object-cover" />
        ) : (
          <FiUser className="w-7 h-7" />
        )}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-lg font-bold text-gray-900">{student.name}</p>
        <p className="text-sm text-gray-500">
          {student.className} - {student.sectionName} • Admission No. {student.admissionId}
        </p>
        {student.transferredOrInactive && (
          <span className="inline-block mt-1 text-xs font-medium text-amber-700 bg-amber-50 rounded-full px-2 py-0.5">
            Not currently Active — assessment still saveable
          </span>
        )}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <span className="flex items-center justify-center w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-700 flex-col">
          <span className="text-lg font-bold leading-none">
            {autoFill.attendancePercentage != null ? `${autoFill.attendancePercentage}%` : '—'}
          </span>
        </span>
        <span className="text-xs text-gray-400">Attendance<br />this month</span>
      </div>
    </div>
  );
}

// Step 1 — attendance is auto-pulled from the real Attendance records (see
// autoFill.attendancePercentage), so this step is a confirmation display,
// not manual entry.
function attendanceRatingFor(percent) {
  if (percent == null) return null;
  if (percent >= 90) return 'Excellent';
  if (percent >= 75) return 'Good';
  if (percent >= 60) return 'Average';
  return 'Needs Improvement';
}

// Total Working Days / Days Present start out auto-filled from real
// attendance records (autoFill, via emptyForm) but stay teacher-editable —
// the % below recomputes live from whatever's currently typed, same
// RATING_LEVELS/RATING_STYLES scale the Behaviour/Academics steps use for
// its qualitative badge.
function AttendanceStep({ form, setForm, month, year }) {
  const { totalWorkingDays, daysPresent } = form.attendanceDetail;
  const percent =
    totalWorkingDays !== '' && daysPresent !== '' && Number(totalWorkingDays) > 0
      ? Math.round((Number(daysPresent) / Number(totalWorkingDays)) * 1000) / 10
      : null;
  const rating = attendanceRatingFor(percent);

  const update = (patch) => setForm((prev) => ({ ...prev, attendanceDetail: { ...prev.attendanceDetail, ...patch } }));

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-5">
      <div className="flex items-start gap-3">
        <span className="flex items-center justify-center w-10 h-10 rounded-xl bg-indigo-100 text-indigo-600 shrink-0">
          <FiHome className="w-5 h-5" />
        </span>
        <div>
          <h3 className="text-sm font-semibold text-gray-900">Monthly Attendance</h3>
          <p className="text-xs text-gray-500 mt-0.5">
            Enter the total working days and days present for {MONTH_LABEL(month)} {year}.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1.5">Total Working Days</label>
          <input
            type="number"
            min="0"
            value={totalWorkingDays}
            onChange={(e) => update({ totalWorkingDays: e.target.value })}
            className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1.5">Days Present</label>
          <input
            type="number"
            min="0"
            value={daysPresent}
            onChange={(e) => update({ daysPresent: e.target.value })}
            className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <div className="bg-green-50 rounded-lg p-3 flex flex-col items-center justify-center text-center">
          <p className="text-xs font-medium text-gray-500">Attendance %</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{percent != null ? `${percent}%` : '—'}</p>
          {rating && (
            <span
              className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full mt-1.5 border ${RATING_STYLES[rating]}`}
            >
              <FiCheckCircle className="w-3 h-3" />
              {rating}
            </span>
          )}
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold text-gray-500 mb-1.5">Remarks (Optional)</label>
        <textarea
          rows={3}
          value={form.attendanceDetail.remark}
          onChange={(e) => update({ remark: e.target.value })}
          placeholder="Add any remarks about attendance..."
          className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>
    </div>
  );
}

function ConciseReportStep({ form, setForm }) {
  const toggleTag = (tag) => {
    setForm((prev) => ({
      ...prev,
      overallTags: prev.overallTags.includes(tag) ? prev.overallTags.filter((t) => t !== tag) : [...prev.overallTags, tag],
    }));
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <h3 className="text-sm font-semibold text-gray-900 mb-3">Overall Performance</h3>
      <div className="flex flex-wrap gap-2">
        {OVERALL_PERFORMANCE_OPTIONS.map((option) => (
          <ChipButton
            key={option}
            isActive={form.overallPerformance === option}
            activeClass={OVERALL_PERFORMANCE_STYLES[option]}
            onClick={() => setForm((prev) => ({ ...prev, overallPerformance: option }))}
          >
            {option}
          </ChipButton>
        ))}
      </div>

      <h3 className="text-sm font-semibold text-gray-900 mt-5 mb-3">Quick Tags</h3>
      <div className="flex flex-wrap gap-2">
        {OVERALL_TAGS.map((tag) => (
          <ChipButton
            key={tag}
            isActive={form.overallTags.includes(tag)}
            activeClass="bg-indigo-600 text-white border-indigo-600"
            onClick={() => toggleTag(tag)}
          >
            {tag}
          </ChipButton>
        ))}
      </div>
    </div>
  );
}

function BehaviourStep({ form, setForm }) {
  const setRating = (categoryKey, rating) => {
    setForm((prev) => ({ ...prev, behaviour: { ...prev.behaviour, [categoryKey]: rating } }));
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-5">
      <div className="flex items-start gap-3">
        <span className="flex items-center justify-center w-10 h-10 rounded-xl bg-indigo-100 text-indigo-600 shrink-0">
          <FiActivity className="w-5 h-5" />
        </span>
        <div>
          <h3 className="text-sm font-semibold text-gray-900">Holistic Development</h3>
          <p className="text-xs text-gray-500 mt-0.5">Rate the student&apos;s overall development in different areas for this month.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {BEHAVIOUR_CATEGORIES.map((cat) => (
          <div key={cat.key}>
            <label className="block text-[10px] font-semibold text-gray-500 mb-1.5">{cat.label}</label>
            <Dropdown
              options={HOLISTIC_RATING_OPTIONS}
              value={form.behaviour[cat.key] || ''}
              onChange={(v) => setRating(cat.key, v)}
              placeholder="Select..."
            />
          </div>
        ))}
      </div>

      <div>
        <label className="block text-xs font-semibold text-gray-500 mb-1.5">Overall Comments (Optional)</label>
        <textarea
          rows={3}
          value={form.behaviour.overallComment || ''}
          onChange={(e) => setRating('overallComment', e.target.value)}
          placeholder="Shows good curiosity and participates actively in class activities."
          className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>
    </div>
  );
}

function AcademicsStep({ form, setForm, autoFill }) {
  const updateSubject = (index, patch) => {
    setForm((prev) => ({
      ...prev,
      academics: prev.academics.map((row, i) => (i === index ? { ...row, ...patch } : row)),
    }));
  };

  return (
    <div className="space-y-4">
      {(autoFill.lastExamPercent != null || autoFill.classRank != null) && (
        <div className="flex items-center gap-4 bg-indigo-50 border border-indigo-100 rounded-2xl px-4 py-3 text-sm text-indigo-700">
          <FiTrendingUp className="w-4 h-4 shrink-0" />
          {autoFill.lastExamPercent != null && <span>Last Exam: {autoFill.lastExamPercent}%</span>}
          {autoFill.classRank != null && <span>Class Rank: #{autoFill.classRank}</span>}
        </div>
      )}
      {form.academics.map((row, index) => (
        <div key={row.subject} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">{row.subject}</h3>
          <div className="flex flex-wrap gap-2 mb-3">
            {RATING_LEVELS.map((level) => (
              <ChipButton
                key={level}
                isActive={row.rating === level}
                activeClass={RATING_STYLES[level]}
                onClick={() => updateSubject(index, { rating: level })}
              >
                {level}
              </ChipButton>
            ))}
          </div>
          <input
            type="text"
            value={row.remark}
            onChange={(e) => updateSubject(index, { remark: e.target.value })}
            placeholder="Optional remark..."
            className="w-full px-4 py-2 text-sm border border-gray-200 rounded-full focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      ))}
    </div>
  );
}

const ACTIVITY_TYPE_OPTION_LIST = ACTIVITY_TYPES.map((t) => ({ value: t, label: t }));
const ACHIEVEMENT_OPTION_LIST = ACHIEVEMENT_LEVELS.map((a) => ({ value: a, label: a }));

// One "Add Another Activity" row — Type picks which fixed option list
// applies (Competition/Olympiad/Sports each have their own, per
// ACTIVITY_TYPE_OPTIONS; "Activity" has none, so that one's second field is
// free text instead of a dropdown), then an optional Achievement.
function ActivityEntryRow({ entry, onChange, onRemove, canRemove }) {
  const typeOptions = entry.type && ACTIVITY_TYPE_OPTIONS[entry.type] ? ACTIVITY_TYPE_OPTIONS[entry.type].map((o) => ({ value: o, label: o })) : [];
  const isFreeText = entry.type === 'Activity';

  return (
    <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_1fr_auto] gap-3 items-end bg-gray-50 rounded-xl p-4">
      <div>
        <label className="block text-xs font-semibold text-gray-500 mb-1.5">Type</label>
        <Dropdown
          options={ACTIVITY_TYPE_OPTION_LIST}
          value={entry.type}
          onChange={(v) => onChange({ type: v, option: '' })}
          placeholder="Select type..."
        />
      </div>

      <div>
        <label className="block text-xs font-semibold text-gray-500 mb-1.5">{isFreeText ? 'Activity' : 'Details'}</label>
        {isFreeText ? (
          <input
            type="text"
            value={entry.option}
            onChange={(e) => onChange({ option: e.target.value })}
            placeholder="Describe the activity..."
            className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-full bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        ) : (
          <Dropdown
            options={typeOptions}
            value={entry.option}
            onChange={(v) => onChange({ option: v })}
            placeholder={entry.type ? 'Select...' : 'Pick a type first'}
            disabled={!entry.type}
          />
        )}
      </div>

      <div>
        <label className="block text-xs font-semibold text-gray-500 mb-1.5">Achievement (if any)</label>
        <Dropdown
          options={ACHIEVEMENT_OPTION_LIST}
          value={entry.achievement}
          onChange={(v) => onChange({ achievement: v })}
          placeholder="None"
        />
      </div>

      <button
        type="button"
        onClick={onRemove}
        disabled={!canRemove}
        title="Remove"
        className="flex items-center justify-center w-10 h-10 rounded-full text-red-500 bg-white border border-gray-200 hover:bg-red-50 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition shrink-0"
      >
        <FiTrash2 className="w-4 h-4" />
      </button>
    </div>
  );
}

function ActivitiesStep({ form, setForm }) {
  const entries = form.activities;

  const updateEntry = (index, patch) => {
    setForm((prev) => ({
      ...prev,
      activities: prev.activities.map((e, i) => (i === index ? { ...e, ...patch } : e)),
    }));
  };

  const addEntry = () => {
    setForm((prev) => ({ ...prev, activities: [...prev.activities, { type: '', option: '', achievement: '' }] }));
  };

  const removeEntry = (index) => {
    setForm((prev) => ({ ...prev, activities: prev.activities.filter((_, i) => i !== index) }));
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
      <h3 className="text-sm font-semibold text-gray-900">Co-Curricular Activities</h3>

      <div className="space-y-3">
        {entries.map((entry, index) => (
          <ActivityEntryRow
            key={index}
            entry={entry}
            onChange={(patch) => updateEntry(index, patch)}
            onRemove={() => removeEntry(index)}
            canRemove={entries.length > 1}
          />
        ))}
      </div>

      <button
        type="button"
        onClick={addEntry}
        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 cursor-pointer transition"
      >
        <FiPlus className="w-4 h-4" />
        Add Another Activity
      </button>
    </div>
  );
}

const TEACHER_REMARKS_FIELDS = [
  { key: 'keyConcern', label: 'Key Concern', placeholder: 'Needs improvement in handwriting and often forgets to complete homework.' },
  { key: 'specificIntervention', label: 'Specific Intervention Next Month', placeholder: 'Daily handwriting practice and weekly homework checklist.' },
  { key: 'targetOutcome', label: 'Target Outcome', placeholder: 'Improved handwriting and 100% homework submission.' },
  { key: 'parentInvolvementNotes', label: 'Parent Involvement Notes', placeholder: 'Parents requested to monitor homework at home and encourage reading daily.' },
];

function ReviewSection({ title, onEdit, children }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
        <button type="button" onClick={onEdit} className="text-xs font-medium text-indigo-600 hover:text-indigo-700 cursor-pointer">
          Edit
        </button>
      </div>
      {children}
    </div>
  );
}

// Final step — a quick recap of the other 4 steps (edit-jump per card, no
// separate Review step anymore) followed by the structured action-plan
// fields, then Submit (handled by the shared footer since this is the last
// step). parentCommunication is the same Json field the old Parent Notes
// step used, just this different shape — no schema change needed.
function SummaryStep({ form, setForm, goToStep, onPrintPreview }) {
  const update = (patch) => setForm((prev) => ({ ...prev, parentCommunication: { ...prev.parentCommunication, ...patch } }));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end">
        <button
          type="button"
          onClick={onPrintPreview}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 cursor-pointer transition"
        >
          <FiPrinter className="w-4 h-4" />
          Print Preview
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <ReviewSection title="Academic" onEdit={() => goToStep(0)}>
          <p className="text-sm text-gray-700">
            Attendance: {form.attendanceDetail.daysPresent || '—'} / {form.attendanceDetail.totalWorkingDays || '—'} days present
          </p>
          <div className="space-y-1 mt-2">
            {form.academics.map((row) => (
              <div key={row.subject} className="flex items-center justify-between text-sm">
                <span className="text-gray-500">{row.subject}</span>
                <span className="text-gray-900 font-medium">{row.rating || '—'}</span>
              </div>
            ))}
          </div>
        </ReviewSection>

        <ReviewSection title="Development" onEdit={() => goToStep(1)}>
          <div className="space-y-1">
            {BEHAVIOUR_CATEGORIES.map((cat) => (
              <div key={cat.key} className="flex items-center justify-between text-sm">
                <span className="text-gray-500">{cat.label}</span>
                <span className="text-gray-900 font-medium">{form.behaviour[cat.key] || '—'}</span>
              </div>
            ))}
          </div>
        </ReviewSection>

        <ReviewSection title="Activities" onEdit={() => goToStep(2)}>
          {form.activities.some((e) => e.type) ? (
            <div className="space-y-1">
              {form.activities
                .filter((e) => e.type)
                .map((e, i) => (
                  <p key={i} className="text-sm text-gray-700">
                    {e.type}: {e.option || '—'}
                    {e.achievement && <span className="text-xs text-gray-400"> ({e.achievement})</span>}
                  </p>
                ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400">None added</p>
          )}
        </ReviewSection>

        <ReviewSection title="Concise Report" onEdit={() => goToStep(3)}>
          <p className="text-sm text-gray-700">{form.overallPerformance || 'Not set'}</p>
          {form.overallTags.length > 0 && <p className="text-xs text-gray-400 mt-1">{form.overallTags.join(', ')}</p>}
        </ReviewSection>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-5">
        <div className="flex items-start gap-3">
          <span className="flex items-center justify-center w-10 h-10 rounded-xl bg-indigo-100 text-indigo-600 shrink-0">
            <FiHome className="w-5 h-5" />
          </span>
          <div>
            <h3 className="text-sm font-semibold text-gray-900">Teacher Remarks &amp; Action Plan</h3>
            <p className="text-xs text-gray-500 mt-0.5">Identify key areas and plan next steps for the student&apos;s growth.</p>
          </div>
        </div>

        {TEACHER_REMARKS_FIELDS.map((field) => (
          <div key={field.key}>
            <label className="block text-xs font-semibold text-gray-500 mb-1.5">{field.label}</label>
            <textarea
              rows={2}
              value={form.parentCommunication[field.key] || ''}
              onChange={(e) => update({ [field.key]: e.target.value })}
              placeholder={field.placeholder}
              className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        ))}
      </div>
    </div>
  );
}

// `embedded` — used when this renders inside AssessmentDrawer.jsx (the
// roster table's right-side off-canvas "View" panel) instead of its own
// page. The drawer supplies its own student header + month nav, so the
// page-only chrome (back link, title, Previous/Next Student bar) is
// skipped, and the sticky footer switches from viewport-fixed to the
// drawer's own scroll container so it doesn't render behind the sidebar.
export default function AssessmentWizard({
  studentId,
  month,
  year,
  data,
  prevStudentId,
  nextStudentId,
  initialStep = 0,
  embedded = false,
  schoolName,
  schoolLogoUrl,
}) {
  const router = useRouter();
  const { student, subjects, autoFill, assessment } = data;
  const [step, setStep] = useState(Math.max(0, Math.min(WIZARD_STEPS.length - 1, initialStep)));
  const [form, setForm] = useState(() => emptyForm(assessment, subjects, autoFill));
  const [status, setStatus] = useState(assessment?.status === 'COMPLETED' ? 'Completed' : assessment ? 'Draft' : 'Not Started');
  const [saveState, setSaveState] = useState('idle'); // idle | saving | saved
  const [isDirty, setIsDirty] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const isFirstRun = useRef(true);
  const debounceTimer = useRef(null);

  const persist = useCallback(
    async (submit = false) => {
      setSaveState('saving');
      try {
        // attendancePercentage is computed from the Attendance step's own
        // Total Working Days / Days Present fields (teacher-editable, see
        // AttendanceStep) — falls back to the auto-pulled figure only while
        // those fields are still empty (a fresh, untouched assessment).
        const { totalWorkingDays, daysPresent } = form.attendanceDetail;
        const computedPercent =
          totalWorkingDays !== '' && daysPresent !== '' && Number(totalWorkingDays) > 0
            ? Math.round((Number(daysPresent) / Number(totalWorkingDays)) * 1000) / 10
            : autoFill.attendancePercentage;
        const result = await saveStudentAssessment(studentId, month, year, { ...form, attendancePercentage: computedPercent }, submit);
        setStatus(result.status === 'COMPLETED' ? 'Completed' : 'Draft');
        setSaveState('saved');
        setIsDirty(false);
        return result;
      } catch (err) {
        setSaveState('idle');
        setToastMessage(err.message);
        return null;
      }
    },
    [studentId, month, year, form, autoFill.attendancePercentage]
  );

  // Debounced autosave — skips the very first render (that's just the
  // loaded/initial data, nothing to save yet).
  useEffect(() => {
    if (isFirstRun.current) {
      isFirstRun.current = false;
      return;
    }
    setIsDirty(true);
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => persist(false), AUTOSAVE_DELAY);
    return () => clearTimeout(debounceTimer.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form]);

  // Unsaved-changes warning — only a real risk in the ~1.5s autosave window
  // (or if a save request itself is in flight/failed), but real
  // nonetheless: a closed tab or refresh right then loses that edit.
  useEffect(() => {
    if (!isDirty) return;
    const handler = (e) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty]);

  const goToStep = (index) => setStep(Math.max(0, Math.min(WIZARD_STEPS.length - 1, index)));

  const handleSubmit = async () => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    const result = await persist(true);
    if (result) setToastMessage('Assessment submitted.');
  };

  const handleSaveDraft = async () => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    const result = await persist(false);
    if (result) setToastMessage('Draft saved.');
  };

  const handleBack = () => {
    if (isDirty && !window.confirm('You have unsaved changes. Leave anyway?')) return;
    router.push('/dashboard/assessments');
  };

  // Previous/Next Student — same class roster, same month (see this page's
  // server component), staying on whichever step the teacher is currently
  // on rather than resetting to Overview each time.
  const goToStudent = (id) => {
    if (!id) return;
    if (isDirty && !window.confirm('You have unsaved changes. Leave anyway?')) return;
    router.push(`/dashboard/assessments/${id}?month=${month}&year=${year}&step=${step}`);
  };

  // Keyboard navigation — Left/Right steps through the wizard, Ctrl/Cmd+S
  // saves a draft immediately instead of waiting for the debounce. Ignored
  // while typing in a text field so arrow keys/selection still work there.
  useEffect(() => {
    const handler = (e) => {
      const tag = document.activeElement?.tagName;
      const isTyping = tag === 'INPUT' || tag === 'TEXTAREA';
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        handleSaveDraft();
        return;
      }
      if (isTyping) return;
      if (e.key === 'ArrowRight') goToStep(step + 1);
      if (e.key === 'ArrowLeft') goToStep(step - 1);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  const stepProps = { form, setForm, student, autoFill, month, year, goToStep, onPrintPreview: () => setShowPrintPreview(true) };

  // Embedded (drawer) layout is a flex column filling the drawer's full
  // height: step content scrolls in its own flex-1 region, the footer is a
  // normal (non-sticky, non-absolute) flex child that naturally lands flush
  // against the drawer's bottom edge regardless of how short the current
  // step's content is — the standard flexbox sticky-footer pattern, instead
  // of `sticky`/`position:absolute` tricks that only "activate" once
  // content actually overflows. The full page keeps its own unchanged
  // normal-flow + viewport-fixed-footer layout.
  return (
    // print:hidden — AssessmentPrintPreview now portals to document.body
    // (a sibling, not a descendant), so this whole wizard is safe to hide
    // during print without hiding the preview too. Needed for the
    // full-page route; redundant-but-harmless when embedded, since
    // AssessmentDashboard's own print:hidden already covers the drawer.
    <div className={`${embedded ? 'h-full flex flex-col' : 'space-y-6 pb-24'} print:hidden`}>
      <div className={embedded ? 'flex-1 overflow-y-auto px-6 pt-5 pb-6 space-y-6' : 'space-y-6'}>
      {!embedded && (
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <button type="button" onClick={handleBack} className="text-sm text-gray-500 hover:text-gray-700 cursor-pointer">
              ← Back to Assessments
            </button>
            <h1 className="text-2xl font-bold text-gray-900 mt-1">Monthly Assessment</h1>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`text-xs font-semibold px-3 py-1.5 rounded-full ${
                status === 'Completed' ? 'bg-green-50 text-green-700' : status === 'Draft' ? 'bg-amber-50 text-amber-700' : 'bg-gray-100 text-gray-500'
              }`}
            >
              {status}
            </span>
            <span className="text-xs text-gray-400">
              {saveState === 'saving' ? 'Saving...' : isDirty ? 'Unsaved changes' : saveState === 'saved' ? 'Saved' : ''}
            </span>
          </div>
        </div>
      )}

      {!embedded && (
        // Previous/Next Student — same class roster, same month, keeps
        // whichever step is currently open (see goToStudent).
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => goToStudent(prevStudentId)}
            disabled={!prevStudentId}
            className="flex items-center justify-center w-9 h-9 rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition shrink-0"
          >
            <FiChevronLeft className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-3 min-w-0">
            <span className="flex items-center justify-center w-10 h-10 rounded-full bg-gray-100 text-gray-400 shrink-0 overflow-hidden">
              {student.photoUrl ? (
                <img src={student.photoUrl} alt={student.name} className="w-full h-full object-cover" />
              ) : (
                <FiUser className="w-4 h-4" />
              )}
            </span>
            <div className="min-w-0">
              <p className="text-sm font-bold text-gray-900 truncate">{student.name}</p>
              <p className="text-xs text-gray-400 truncate">
                {student.className} - {student.sectionName} • {MONTH_LABEL(month)} {year}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => goToStudent(nextStudentId)}
            disabled={!nextStudentId}
            className="flex items-center justify-center w-9 h-9 rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition shrink-0"
          >
            <FiChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Step indicator — single row, icon-per-step circles connected by a
          dotted line (see StepIndicatorRow above). Done: green check.
          Current: bigger indigo circle with a ring glow. Upcoming: gray
          outline with its own icon. Text/circles sized small enough to
          keep all 7 on one row instead of wrapping or scrolling. */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <StepIndicatorRow steps={WIZARD_STEPS} currentStep={step} onSelect={goToStep} />
      </div>

      {step === 0 && (
        <div className="space-y-6">
          <AttendanceStep {...stepProps} />
          <AcademicsStep {...stepProps} />
        </div>
      )}
      {step === 1 && <BehaviourStep {...stepProps} />}
      {step === 2 && <ActivitiesStep {...stepProps} />}
      {step === 3 && <ConciseReportStep {...stepProps} />}
      {step === 4 && <SummaryStep {...stepProps} />}
      </div>

      {/* Footer — viewport-fixed on the full page (unchanged). Embedded: a
          plain flex child at the end of the drawer's flex-column layout
          (see the wrapping divs above) — always flush with the drawer's
          bottom edge, no sticky/absolute needed. */}
      <div
        className={`bg-white border-t border-gray-100 px-4 sm:px-6 py-3 flex items-center justify-between gap-3 z-30 ${
          embedded ? 'shrink-0' : 'fixed bottom-0 left-0 right-0 lg:left-64'
        }`}
      >
        <button
          type="button"
          onClick={() => goToStep(step - 1)}
          disabled={step === 0}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition"
        >
          <FiChevronLeft className="w-4 h-4" />
          Previous
        </button>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleSaveDraft}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 cursor-pointer transition"
          >
            <FiSave className="w-4 h-4" />
            Save Draft
          </button>
          {step === WIZARD_STEPS.length - 1 ? (
            <button
              type="button"
              onClick={handleSubmit}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-lg text-sm font-medium text-white bg-gradient-to-r from-violet-700 via-indigo-600 to-blue-600 hover:opacity-90 cursor-pointer transition"
            >
              <FiSend className="w-4 h-4" />
              Submit Report
            </button>
          ) : (
            <button
              type="button"
              onClick={() => goToStep(step + 1)}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-lg text-sm font-medium text-white bg-gradient-to-r from-violet-700 via-indigo-600 to-blue-600 hover:opacity-90 cursor-pointer transition"
            >
              Next
              <FiChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {toastMessage && <Toast message={toastMessage} onClose={() => setToastMessage('')} />}

      {showPrintPreview && (
        <AssessmentPrintPreview
          student={student}
          month={month}
          year={year}
          status={status}
          form={form}
          schoolName={schoolName}
          schoolLogoUrl={schoolLogoUrl}
          onClose={() => setShowPrintPreview(false)}
        />
      )}
    </div>
  );
}
