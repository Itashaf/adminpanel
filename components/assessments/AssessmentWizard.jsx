'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FiUser, FiCheck, FiChevronLeft, FiChevronRight, FiSave, FiSend, FiTrendingUp } from 'react-icons/fi';
import Toast from '@/components/Toast';
import { saveStudentAssessment } from '@/lib/api';
import {
  WIZARD_STEPS,
  OVERALL_PERFORMANCE_OPTIONS,
  OVERALL_PERFORMANCE_STYLES,
  OVERALL_TAGS,
  BEHAVIOUR_CATEGORIES,
  RATING_LEVELS,
  RATING_STYLES,
  ACTIVITY_OPTIONS,
  ACHIEVEMENT_LEVELS,
} from '@/lib/assessmentConstants';

const AUTOSAVE_DELAY = 1500;

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const MONTH_LABEL = (month) => MONTH_NAMES[month - 1];

function emptyForm(existing, subjects) {
  return {
    overallPerformance: existing?.overallPerformance || '',
    overallTags: existing?.overallTags || [],
    overallRemark: existing?.overallRemark || '',
    behaviour: existing?.behaviour || {},
    academics:
      existing?.academics?.length > 0
        ? existing.academics
        : subjects.map((subject) => ({ subject, rating: '', remark: '' })),
    activities: {
      selectedActivities: existing?.activities?.selectedActivities || [],
      achievementLevel: existing?.activities?.achievementLevel || '',
      note: existing?.activities?.note || '',
    },
    parentCommunication: {
      ptmConducted: existing?.parentCommunication?.ptmConducted ?? null,
      parentContacted: existing?.parentCommunication?.parentContacted ?? null,
      feedback: existing?.parentCommunication?.feedback || '',
      followUpRequired: existing?.parentCommunication?.followUpRequired ?? null,
      followUpNote: existing?.parentCommunication?.followUpNote || '',
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

function OverviewStep({ form, setForm, student, autoFill }) {
  const toggleTag = (tag) => {
    setForm((prev) => ({
      ...prev,
      overallTags: prev.overallTags.includes(tag) ? prev.overallTags.filter((t) => t !== tag) : [...prev.overallTags, tag],
    }));
  };

  return (
    <div className="space-y-6">
      <StudentCard student={student} autoFill={autoFill} />

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

        <h3 className="text-sm font-semibold text-gray-900 mt-5 mb-2">Remark (optional)</h3>
        <textarea
          rows={3}
          value={form.overallRemark}
          onChange={(e) => setForm((prev) => ({ ...prev, overallRemark: e.target.value }))}
          placeholder="Any overall observation..."
          className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
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
      <h3 className="text-sm font-semibold text-gray-900">Behaviour Assessment</h3>
      {BEHAVIOUR_CATEGORIES.map((cat) => (
        <div key={cat.key} className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 pb-4 border-b border-gray-50 last:border-b-0 last:pb-0">
          <p className="text-sm font-medium text-gray-700 sm:w-44 shrink-0">{cat.label}</p>
          <div className="flex flex-wrap gap-2">
            {RATING_LEVELS.map((level) => (
              <ChipButton
                key={level}
                isActive={form.behaviour[cat.key] === level}
                activeClass={RATING_STYLES[level]}
                onClick={() => setRating(cat.key, level)}
              >
                {level}
              </ChipButton>
            ))}
          </div>
        </div>
      ))}
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

function ActivitiesStep({ form, setForm }) {
  const toggleActivity = (activity) => {
    setForm((prev) => ({
      ...prev,
      activities: {
        ...prev.activities,
        selectedActivities: prev.activities.selectedActivities.includes(activity)
          ? prev.activities.selectedActivities.filter((a) => a !== activity)
          : [...prev.activities.selectedActivities, activity],
      },
    }));
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-5">
      <div>
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Co-Curricular Activities</h3>
        <div className="flex flex-wrap gap-2">
          {ACTIVITY_OPTIONS.map((activity) => (
            <ChipButton
              key={activity}
              isActive={form.activities.selectedActivities.includes(activity)}
              activeClass="bg-indigo-600 text-white border-indigo-600"
              onClick={() => toggleActivity(activity)}
            >
              {form.activities.selectedActivities.includes(activity) && <FiCheck className="inline w-3.5 h-3.5 mr-1 -mt-0.5" />}
              {activity}
            </ChipButton>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Achievement Level</h3>
        <div className="flex flex-wrap gap-2">
          {ACHIEVEMENT_LEVELS.map((level) => (
            <ChipButton
              key={level}
              isActive={form.activities.achievementLevel === level}
              activeClass="bg-violet-600 text-white border-violet-600"
              onClick={() => setForm((prev) => ({ ...prev, activities: { ...prev.activities, achievementLevel: level } }))}
            >
              {level}
            </ChipButton>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-gray-900 mb-2">Note (optional)</h3>
        <textarea
          rows={3}
          value={form.activities.note}
          onChange={(e) => setForm((prev) => ({ ...prev, activities: { ...prev.activities, note: e.target.value } }))}
          placeholder="Any achievement or activity note..."
          className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>
    </div>
  );
}

function YesNoToggle({ value, onChange }) {
  return (
    <div className="flex items-center gap-2">
      {[
        { label: 'Yes', val: true },
        { label: 'No', val: false },
      ].map((opt) => (
        <ChipButton
          key={opt.label}
          isActive={value === opt.val}
          activeClass="bg-indigo-600 text-white border-indigo-600"
          onClick={() => onChange(opt.val)}
        >
          {opt.label}
        </ChipButton>
      ))}
    </div>
  );
}

function ParentStep({ form, setForm }) {
  const pc = form.parentCommunication;
  const update = (patch) => setForm((prev) => ({ ...prev, parentCommunication: { ...prev.parentCommunication, ...patch } }));

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-5">
      <div>
        <h3 className="text-sm font-semibold text-gray-900 mb-2">PTM Conducted?</h3>
        <YesNoToggle value={pc.ptmConducted} onChange={(v) => update({ ptmConducted: v })} />
      </div>
      <div>
        <h3 className="text-sm font-semibold text-gray-900 mb-2">Parent Contacted?</h3>
        <YesNoToggle value={pc.parentContacted} onChange={(v) => update({ parentContacted: v })} />
      </div>
      <div>
        <h3 className="text-sm font-semibold text-gray-900 mb-2">Parent Feedback</h3>
        <textarea
          rows={2}
          value={pc.feedback}
          onChange={(e) => update({ feedback: e.target.value })}
          placeholder="Short note on parent's feedback..."
          className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>
      <div>
        <h3 className="text-sm font-semibold text-gray-900 mb-2">Follow-up Required?</h3>
        <YesNoToggle value={pc.followUpRequired} onChange={(v) => update({ followUpRequired: v })} />
      </div>
      {pc.followUpRequired && (
        <div>
          <h3 className="text-sm font-semibold text-gray-900 mb-2">Follow-up Note</h3>
          <textarea
            rows={2}
            value={pc.followUpNote}
            onChange={(e) => update({ followUpNote: e.target.value })}
            placeholder="What needs to be followed up..."
            className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      )}
    </div>
  );
}

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

function ReviewStep({ form, autoFill, goToStep }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <ReviewSection title="Overview" onEdit={() => goToStep(0)}>
        <p className="text-sm text-gray-700">
          {form.overallPerformance || 'Not set'} • Attendance {autoFill.attendancePercentage ?? '—'}%
        </p>
        {form.overallTags.length > 0 && <p className="text-xs text-gray-400 mt-1">{form.overallTags.join(', ')}</p>}
      </ReviewSection>

      <ReviewSection title="Behaviour" onEdit={() => goToStep(1)}>
        <div className="space-y-1">
          {BEHAVIOUR_CATEGORIES.map((cat) => (
            <div key={cat.key} className="flex items-center justify-between text-sm">
              <span className="text-gray-500">{cat.label}</span>
              <span className="text-gray-900 font-medium">{form.behaviour[cat.key] || '—'}</span>
            </div>
          ))}
        </div>
      </ReviewSection>

      <ReviewSection title="Academics" onEdit={() => goToStep(2)}>
        <div className="space-y-1">
          {form.academics.map((row) => (
            <div key={row.subject} className="flex items-center justify-between text-sm">
              <span className="text-gray-500">{row.subject}</span>
              <span className="text-gray-900 font-medium">{row.rating || '—'}</span>
            </div>
          ))}
        </div>
      </ReviewSection>

      <ReviewSection title="Activities" onEdit={() => goToStep(3)}>
        <p className="text-sm text-gray-700">{form.activities.selectedActivities.join(', ') || 'None selected'}</p>
        {form.activities.achievementLevel && <p className="text-xs text-gray-400 mt-1">Level: {form.activities.achievementLevel}</p>}
      </ReviewSection>

      <ReviewSection title="Parent Notes" onEdit={() => goToStep(4)}>
        <p className="text-sm text-gray-700">
          PTM: {form.parentCommunication.ptmConducted === null ? '—' : form.parentCommunication.ptmConducted ? 'Yes' : 'No'} • Contacted:{' '}
          {form.parentCommunication.parentContacted === null ? '—' : form.parentCommunication.parentContacted ? 'Yes' : 'No'}
        </p>
        {form.parentCommunication.followUpRequired && <p className="text-xs text-amber-600 mt-1">Follow-up needed</p>}
      </ReviewSection>
    </div>
  );
}

export default function AssessmentWizard({ studentId, month, year, data, prevStudentId, nextStudentId, initialStep = 0 }) {
  const router = useRouter();
  const { student, subjects, autoFill, assessment } = data;
  const [step, setStep] = useState(Math.max(0, Math.min(WIZARD_STEPS.length - 1, initialStep)));
  const [form, setForm] = useState(() => emptyForm(assessment, subjects));
  const [status, setStatus] = useState(assessment?.status === 'Completed' ? 'Completed' : assessment ? 'Draft' : 'Not Started');
  const [saveState, setSaveState] = useState('idle'); // idle | saving | saved
  const [isDirty, setIsDirty] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const isFirstRun = useRef(true);
  const debounceTimer = useRef(null);

  const persist = useCallback(
    async (submit = false) => {
      setSaveState('saving');
      try {
        const result = await saveStudentAssessment(studentId, month, year, { ...form, attendancePercentage: autoFill.attendancePercentage }, submit);
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

  const stepProps = { form, setForm, student, autoFill };

  return (
    <div className="space-y-6 pb-24">
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

      {/* Previous/Next Student — same class roster, same month, keeps
          whichever step is currently open (see goToStudent). */}
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

      {/* Step indicator */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 overflow-x-auto">
        <div className="flex items-center gap-1 min-w-max">
          {WIZARD_STEPS.map((s, index) => (
            <div key={s.key} className="flex items-center">
              <button
                type="button"
                onClick={() => goToStep(index)}
                className={`flex items-center gap-2 px-3 py-2 rounded-full text-sm font-medium cursor-pointer transition ${
                  index === step ? 'bg-gradient-to-r from-violet-700 via-indigo-600 to-blue-600 text-white' : 'text-gray-500 hover:bg-gray-50'
                }`}
              >
                <span
                  className={`flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold shrink-0 ${
                    index === step ? 'bg-white/20 text-white' : index < step ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'
                  }`}
                >
                  {index < step ? <FiCheck className="w-3 h-3" /> : index + 1}
                </span>
                {s.label}
              </button>
              {index < WIZARD_STEPS.length - 1 && <span className="w-4 h-px bg-gray-200 mx-1 shrink-0" />}
            </div>
          ))}
        </div>
      </div>

      {step === 0 && <OverviewStep {...stepProps} />}
      {step === 1 && <BehaviourStep {...stepProps} />}
      {step === 2 && <AcademicsStep {...stepProps} />}
      {step === 3 && <ActivitiesStep {...stepProps} />}
      {step === 4 && <ParentStep {...stepProps} />}
      {step === 5 && <ReviewStep form={form} autoFill={autoFill} goToStep={goToStep} />}

      {/* Sticky footer */}
      <div className="fixed bottom-0 left-0 right-0 lg:left-64 bg-white border-t border-gray-100 px-4 sm:px-6 py-3 flex items-center justify-between gap-3 z-30">
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
    </div>
  );
}
