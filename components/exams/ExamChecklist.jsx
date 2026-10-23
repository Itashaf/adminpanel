'use client';

import { FiCheck, FiBook, FiBarChart2, FiShield, FiFileText } from 'react-icons/fi';

// One icon per step, shown when that step is current/upcoming — a DONE step
// always shows a checkmark instead (see Step below), same as the reference
// design: "Exam"/"Publish" are done here so they show checks, "Subjects" is
// current so it shows its own icon, "Marks"/"Verify"/"Results" are upcoming
// so they show their icons faded.
const STEPS = [
  { title: 'Exam', icon: FiCheck },
  { title: 'Subjects', icon: FiBook },
  { title: 'Publish', icon: FiCheck },
  { title: 'Marks', icon: FiBarChart2 },
  { title: 'Verify', icon: FiShield },
  { title: 'Results', icon: FiFileText },
];

// Chevron/arrow shape — a point on the right, a notch on the left so the
// next segment's point tucks into it, overlapped via a negative margin so
// the row reads as one continuous arrow strip with no gaps.
const CHEVRON_CLIP = 'polygon(0 0, calc(100% - 16px) 0, 100% 50%, calc(100% - 16px) 100%, 0 100%, 16px 50%)';

const STATUS_LABEL = { done: 'Completed', current: 'In progress', upcoming: 'Pending' };

function Step({ title, Icon, status, isFirst }) {
  const bg = status === 'done' ? 'bg-green-100' : status === 'current' ? 'bg-indigo-100' : 'bg-gray-100';
  const text = status === 'upcoming' ? 'text-gray-400' : 'text-gray-900';
  const iconCircle =
    status === 'done'
      ? 'bg-green-500 text-white'
      : status === 'current'
      ? 'bg-gradient-to-br from-violet-700 to-blue-600 text-white'
      : 'bg-gray-200 text-gray-400';

  return (
    <div
      style={{ clipPath: CHEVRON_CLIP, marginLeft: isFirst ? 0 : -16 }}
      className={`flex-1 flex items-center justify-center gap-2.5 pl-6 pr-6 py-3 drop-shadow-lg ${bg}`}
    >
      <span className={`flex items-center justify-center w-7 h-7 rounded-full shrink-0 ${iconCircle}`}>
        {status === 'done' ? <FiCheck className="w-4 h-4" /> : <Icon className="w-3.5 h-3.5" />}
      </span>
      <div className="min-w-0">
        <p className={`text-sm font-semibold whitespace-nowrap ${text}`}>{title}</p>
        <p className={`text-xs whitespace-nowrap ${status === 'current' ? 'text-indigo-600' : status === 'done' ? 'text-gray-500' : 'text-gray-400'}`}>
          {STATUS_LABEL[status]}
        </p>
      </div>
    </div>
  );
}

export default function ExamChecklist({ exam, progress, verificationSummary, hasPublishedResults }) {
  const hasSchedules = exam.schedules.length > 0;
  const isPublished = exam.status !== 'Draft';
  const totalStudents = progress.reduce((sum, p) => sum + p.totalStudents, 0);
  const totalEntered = progress.reduce((sum, p) => sum + p.entered, 0);
  const marksFullyEntered = progress.length > 0 && totalEntered === totalStudents && totalStudents > 0;
  const marksFullyVerified = verificationSummary.totalSchedules > 0 && verificationSummary.approvedSchedules === verificationSummary.totalSchedules;

  const statuses = [
    'done',
    hasSchedules ? 'done' : 'current',
    isPublished ? 'done' : hasSchedules ? 'current' : 'upcoming',
    marksFullyEntered ? 'done' : isPublished && hasSchedules ? 'current' : 'upcoming',
    marksFullyVerified ? 'done' : verificationSummary.pendingReviewSchedules > 0 ? 'current' : 'upcoming',
    hasPublishedResults ? 'done' : marksFullyVerified ? 'current' : 'upcoming',
  ];

  return (
    <div className="flex items-center overflow-x-auto">
      {STEPS.map((step, index) => (
        <Step key={step.title} title={step.title} Icon={step.icon} status={statuses[index]} isFirst={index === 0} />
      ))}
    </div>
  );
}
