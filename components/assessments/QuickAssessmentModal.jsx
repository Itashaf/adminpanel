'use client';

import { useState } from 'react';
import { FiZap } from 'react-icons/fi';
import Modal from '@/components/Modal';
import Button from '@/components/Button';
import { saveStudentAssessment } from '@/lib/api';
import {
  OVERALL_PERFORMANCE_OPTIONS,
  OVERALL_PERFORMANCE_STYLES,
  RATING_LEVELS,
  RATING_STYLES,
  BEHAVIOUR_CATEGORIES,
} from '@/lib/assessmentConstants';

function ChipButton({ isActive, onClick, children, activeClass }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3.5 py-2 rounded-full text-sm font-medium border transition cursor-pointer ${
        isActive ? activeClass : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
      }`}
    >
      {children}
    </button>
  );
}

// "Complete in 30 Seconds" — a single overall Behaviour/Academic rating gets
// applied uniformly across every real category/subject (same
// StudentAssessment.behaviour/academics shape the full wizard uses — this
// is just a fast way to fill it, not a separate data shape). Always submits
// as COMPLETED, per the spec's "System auto-generates assessment record".
export default function QuickAssessmentModal({ isOpen, onClose, student, month, year, subjects, onSuccess }) {
  const [overallPerformance, setOverallPerformance] = useState('');
  const [behaviourRating, setBehaviourRating] = useState('');
  const [academicRating, setAcademicRating] = useState('');
  const [parentContacted, setParentContacted] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  const reset = () => {
    setOverallPerformance('');
    setBehaviourRating('');
    setAcademicRating('');
    setParentContacted(null);
    setError('');
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSubmit = async () => {
    if (!overallPerformance) {
      setError('Pick an overall performance rating.');
      return;
    }
    setIsSaving(true);
    setError('');
    try {
      const behaviour = Object.fromEntries(BEHAVIOUR_CATEGORIES.map((cat) => [cat.key, behaviourRating || '']));
      const academics = subjects.map((subject) => ({ subject, rating: academicRating || '', remark: '' }));
      await saveStudentAssessment(
        student.studentId,
        month,
        year,
        {
          overallPerformance,
          behaviour,
          academics,
          parentCommunication: { parentContacted },
        },
        true
      );
      onSuccess?.(`${student.name}'s assessment completed.`);
      reset();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      title="Complete in 30 Seconds"
      description={student?.name}
      icon={<FiZap className="w-5 h-5" />}
      isOpen={isOpen}
      onClose={handleClose}
      footer={
        <div className="flex items-center justify-end gap-3">
          <Button label="Cancel" variant="secondary" onClick={handleClose} />
          <Button label={isSaving ? 'Submitting...' : 'Submit'} onClick={handleSubmit} disabled={isSaving} />
        </div>
      }
    >
      <div className="space-y-5">
        {error && <p className="text-xs text-red-500">{error}</p>}

        <div>
          <p className="text-sm font-semibold text-gray-900 mb-2">Overall Performance</p>
          <div className="flex flex-wrap gap-2">
            {OVERALL_PERFORMANCE_OPTIONS.map((option) => (
              <ChipButton
                key={option}
                isActive={overallPerformance === option}
                activeClass={OVERALL_PERFORMANCE_STYLES[option]}
                onClick={() => setOverallPerformance(option)}
              >
                {option}
              </ChipButton>
            ))}
          </div>
        </div>

        <div>
          <p className="text-sm font-semibold text-gray-900 mb-2">Behaviour Rating</p>
          <div className="flex flex-wrap gap-2">
            {RATING_LEVELS.map((level) => (
              <ChipButton key={level} isActive={behaviourRating === level} activeClass={RATING_STYLES[level]} onClick={() => setBehaviourRating(level)}>
                {level}
              </ChipButton>
            ))}
          </div>
        </div>

        <div>
          <p className="text-sm font-semibold text-gray-900 mb-2">Academic Rating</p>
          <div className="flex flex-wrap gap-2">
            {RATING_LEVELS.map((level) => (
              <ChipButton key={level} isActive={academicRating === level} activeClass={RATING_STYLES[level]} onClick={() => setAcademicRating(level)}>
                {level}
              </ChipButton>
            ))}
          </div>
        </div>

        <div>
          <p className="text-sm font-semibold text-gray-900 mb-2">Parent Contacted?</p>
          <div className="flex items-center gap-2">
            {[
              { label: 'Yes', val: true },
              { label: 'No', val: false },
            ].map((opt) => (
              <ChipButton
                key={opt.label}
                isActive={parentContacted === opt.val}
                activeClass="bg-indigo-600 text-white border-indigo-600"
                onClick={() => setParentContacted(opt.val)}
              >
                {opt.label}
              </ChipButton>
            ))}
          </div>
        </div>
      </div>
    </Modal>
  );
}
