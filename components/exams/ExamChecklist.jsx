'use client';

import { Fragment } from 'react';
import { FiCheck } from 'react-icons/fi';

const STEP_TITLES = ['Exam created', 'Add subjects', 'Publish exam', 'Teachers enter marks', 'Verify marks', 'Generate results'];

const STATUS_LABEL = { done: 'Completed', current: 'In progress', upcoming: 'Pending' };

function Step({ index, title, status }) {
  return (
    <div className="flex items-center gap-2 px-2 min-w-[132px]">
      <span
        className={`flex items-center justify-center w-8 h-8 rounded-full text-xs font-semibold shrink-0 ${
          status === 'done'
            ? 'bg-green-500 text-white'
            : status === 'current'
            ? 'bg-gradient-to-br from-violet-700 to-blue-600 text-white'
            : 'bg-gray-100 text-gray-400'
        }`}
      >
        {status === 'done' ? <FiCheck className="w-3.5 h-3.5" /> : index + 1}
      </span>
      <div className="min-w-0 text-left">
        <p className={`text-xs font-semibold truncate ${status === 'upcoming' ? 'text-gray-400' : 'text-gray-900'}`}>{title}</p>
        <p className={`text-[11px] ${status === 'current' ? 'text-indigo-600' : status === 'done' ? 'text-gray-500' : 'text-gray-400'}`}>
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
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <div className="flex items-center overflow-x-auto">
        {STEP_TITLES.map((title, index) => (
          <Fragment key={title}>
            <Step index={index} title={title} status={statuses[index]} />
            {index < STEP_TITLES.length - 1 && (
              <div className={`flex-1 h-0.5 min-w-[16px] ${statuses[index] === 'done' ? 'bg-green-200' : 'bg-gray-100'}`} />
            )}
          </Fragment>
        ))}
      </div>
    </div>
  );
}
