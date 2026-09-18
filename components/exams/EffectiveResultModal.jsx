'use client';

import { useEffect, useState } from 'react';
import Modal from '@/components/Modal';
import Badge from '@/components/Badge';
import { getEffectiveExamResult } from '@/lib/api';

export default function EffectiveResultModal({ isOpen, onClose, examId, student }) {
  const [result, setResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen || !student) return;
    setIsLoading(true);
    setError('');
    getEffectiveExamResult(examId, student.studentId)
      .then(setResult)
      .catch((err) => setError(err.message))
      .finally(() => setIsLoading(false));
  }, [isOpen, examId, student]);

  return (
    <Modal
      title="Effective Result"
      description={student ? `${student.studentName} — reconciled result after applying the retake policy.` : ''}
      isOpen={isOpen}
      onClose={onClose}
    >
      {error && <p className="text-sm text-red-500 bg-red-50 border border-red-100 rounded-lg px-4 py-3">{error}</p>}

      {isLoading ? (
        <p className="text-sm text-gray-500 text-center py-8">Calculating...</p>
      ) : result ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-xs text-gray-500">Total</p>
              <p className="text-sm font-semibold text-gray-900 mt-0.5">
                {result.totalMarks} / {result.totalMaxMarks}
              </p>
            </div>
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-xs text-gray-500">Percentage</p>
              <p className="text-sm font-semibold text-gray-900 mt-0.5">{result.percentage?.toFixed(1)}%</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-xs text-gray-500">Grade</p>
              <Badge label={result.grade} variant="violet" />
            </div>
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-xs text-gray-500">Result</p>
              <Badge label={result.isPass ? 'Pass' : 'Fail'} variant={result.isPass ? 'green' : 'red'} />
            </div>
          </div>
          <p className="text-xs text-gray-400">
            {result.sourceExamId
              ? 'This value comes from whichever exam won under the configured retake policy.'
              : 'The two exams were averaged together to produce this value.'}
          </p>
        </div>
      ) : (
        !error && <p className="text-sm text-gray-500 text-center py-8">No result available yet.</p>
      )}
    </Modal>
  );
}
