'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { FiArrowLeft, FiRefreshCw, FiUploadCloud, FiXCircle, FiEye, FiPrinter } from 'react-icons/fi';
import Badge from '@/components/Badge';
import Button from '@/components/Button';
import ConfirmDialog from '@/components/ConfirmDialog';
import Toast from '@/components/Toast';
import EffectiveResultModal from './EffectiveResultModal';
import { printReportCard } from './printReportCard';
import { generateExamResults, publishExamResults, unpublishExamResults, getStudentExamResult } from '@/lib/api';

export default function ExamResultsClient({ exam, initialResults, parentExam, school }) {
  const router = useRouter();
  const [results, setResults] = useState(initialResults);
  const sortedResults = [...results].sort((a, b) => (a.rank ?? Infinity) - (b.rank ?? Infinity));
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [showUnpublishConfirm, setShowUnpublishConfirm] = useState(false);
  const [effectiveResultStudent, setEffectiveResultStudent] = useState(null);
  const [printingStudentId, setPrintingStudentId] = useState(null);
  const [toastMessage, setToastMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const handlePrint = async (studentId) => {
    setPrintingStudentId(studentId);
    setErrorMessage('');
    try {
      const result = await getStudentExamResult(exam.id, studentId);
      printReportCard({ school, result });
    } catch (err) {
      setErrorMessage(err.message);
    } finally {
      setPrintingStudentId(null);
    }
  };

  const hasDraft = results.some((r) => r.status === 'Draft');
  const hasPublished = results.some((r) => r.status === 'Published');

  const handleGenerate = async () => {
    setIsGenerating(true);
    setErrorMessage('');
    try {
      const outcome = await generateExamResults(exam.id);
      setToastMessage(
        `${outcome.generated.length} result${outcome.generated.length === 1 ? '' : 's'} generated.` +
          (outcome.skippedStudentIds.length > 0 ? ` ${outcome.skippedStudentIds.length} skipped — not all subjects approved yet.` : '')
      );
      router.refresh();
    } catch (err) {
      setErrorMessage(err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePublish = async () => {
    setIsPublishing(true);
    setErrorMessage('');
    try {
      const updated = await publishExamResults(exam.id);
      setResults(updated);
      setToastMessage('Results published — parents can now view them.');
      router.refresh();
    } catch (err) {
      setErrorMessage(err.message);
    } finally {
      setIsPublishing(false);
    }
  };

  const handleUnpublish = async () => {
    setIsPublishing(true);
    setErrorMessage('');
    try {
      const updated = await unpublishExamResults(exam.id);
      setResults(updated);
      setShowUnpublishConfirm(false);
      setToastMessage('Results unpublished.');
      router.refresh();
    } catch (err) {
      setErrorMessage(err.message);
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <div className="space-y-6">
      <Link href={`/dashboard/exams/${exam.id}`} className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700">
        <FiArrowLeft className="w-4 h-4" />
        Back to {exam.name}
      </Link>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Results</h1>
          <p className="text-sm text-gray-500 mt-1">{exam.name} — generate, preview, and publish results.</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button
            label={isGenerating ? 'Generating...' : 'Generate Results'}
            icon={<FiRefreshCw className="w-4 h-4" />}
            variant="secondary"
            onClick={handleGenerate}
            disabled={isGenerating}
          />
          {hasPublished ? (
            <Button
              label="Unpublish"
              icon={<FiXCircle className="w-4 h-4" />}
              variant="secondary"
              onClick={() => setShowUnpublishConfirm(true)}
              disabled={isPublishing}
            />
          ) : (
            <Button
              label={isPublishing ? 'Publishing...' : 'Publish Results'}
              icon={<FiUploadCloud className="w-4 h-4" />}
              onClick={handlePublish}
              disabled={isPublishing || !hasDraft}
            />
          )}
        </div>
      </div>

      {errorMessage && (
        <p className="text-sm text-red-500 bg-red-50 border border-red-100 rounded-lg px-4 py-3">{errorMessage}</p>
      )}

      {parentExam && (
        <p className="text-sm text-indigo-700 bg-indigo-50 border border-indigo-100 rounded-lg px-4 py-3">
          This is a retake of <span className="font-medium">{parentExam.name}</span> — result policy:{' '}
          <span className="font-medium">{exam.retakeResultPolicy}</span>.{' '}
          {exam.retakeResultPolicy === 'Best' && 'The higher of the two exams counts.'}
          {exam.retakeResultPolicy === 'Latest' && "This retake's own result counts, whenever it exists."}
          {exam.retakeResultPolicy === 'Average' && 'The two exams are averaged together.'}
        </p>
      )}

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {results.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-12">
            No results yet — approve all subjects' marks in Verification, then click "Generate Results".
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  <th className="py-3 pl-5 pr-4">Rank</th>
                  <th className="py-3 pr-4">Student</th>
                  <th className="py-3 pr-4">Class</th>
                  <th className="py-3 pr-4">Total</th>
                  <th className="py-3 pr-4">%</th>
                  <th className="py-3 pr-4">Grade</th>
                  <th className="py-3 pr-4">Result</th>
                  <th className="py-3 pr-5">Status</th>
                  <th className="py-3 pr-5" />
                  {parentExam && <th className="py-3 pr-5" />}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {sortedResults.map((r) => (
                  <tr key={r.id}>
                    <td className="py-3 pl-5 pr-4">
                      <span
                        className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold ${
                          r.rank === 1 ? 'bg-amber-100 text-amber-700' : r.rank ? 'bg-gray-100 text-gray-600' : 'text-gray-300'
                        }`}
                      >
                        {r.rank ?? '—'}
                      </span>
                    </td>
                    <td className="py-3 pr-4">
                      <p className="font-medium text-gray-900">{r.studentName}</p>
                      <p className="text-xs text-gray-400">{r.admissionId}</p>
                    </td>
                    <td className="py-3 pr-4 text-gray-600">
                      {r.className}
                      {r.sectionName ? ` • Sec ${r.sectionName}` : ''}
                    </td>
                    <td className="py-3 pr-4 text-gray-700">
                      {r.totalMarks} / {r.totalMaxMarks}
                    </td>
                    <td className="py-3 pr-4 text-gray-700">{r.percentage.toFixed(1)}%</td>
                    <td className="py-3 pr-4">
                      <span className="inline-block text-xs font-semibold rounded-full px-2.5 py-1 text-white bg-gradient-to-r from-[#2563EB] to-[#7C3AED]">
                        {r.grade}
                      </span>
                    </td>
                    <td className="py-3 pr-4">
                      <Badge label={r.isPass ? 'Pass' : 'Fail'} variant={r.isPass ? 'green' : 'red'} />
                    </td>
                    <td className="py-3 pr-5">
                      <Badge label={r.status} variant={r.status === 'Published' ? 'purple' : 'gray'} />
                    </td>
                    <td className="py-3 pr-5">
                      {r.status === 'Published' && (
                        <button
                          type="button"
                          onClick={() => handlePrint(r.studentId)}
                          disabled={printingStudentId === r.studentId}
                          className="inline-flex items-center gap-1 text-xs font-medium text-gray-500 hover:text-gray-700 cursor-pointer disabled:opacity-50"
                        >
                          <FiPrinter className="w-3.5 h-3.5" />
                          {printingStudentId === r.studentId ? 'Preparing...' : 'Print'}
                        </button>
                      )}
                    </td>
                    {parentExam && (
                      <td className="py-3 pr-5">
                        <button
                          type="button"
                          onClick={() => setEffectiveResultStudent(r)}
                          className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-700 cursor-pointer"
                        >
                          <FiEye className="w-3.5 h-3.5" />
                          Effective
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <EffectiveResultModal
        isOpen={Boolean(effectiveResultStudent)}
        onClose={() => setEffectiveResultStudent(null)}
        examId={exam.id}
        student={effectiveResultStudent}
      />

      <ConfirmDialog
        isOpen={showUnpublishConfirm}
        onClose={() => setShowUnpublishConfirm(false)}
        onConfirm={handleUnpublish}
        title="Unpublish results?"
        description="Parents will no longer be able to view this exam's results until you publish again."
        confirmLabel="Unpublish"
        isLoading={isPublishing}
      />

      {toastMessage && <Toast message={toastMessage} onClose={() => setToastMessage('')} />}
    </div>
  );
}
