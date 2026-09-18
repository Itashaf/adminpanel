'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { FiEdit2, FiTrash2, FiCheckCircle, FiCalendar, FiLayers, FiClock, FiArrowRight, FiCheckSquare, FiBarChart2 } from 'react-icons/fi';
import { HiOutlineAcademicCap } from 'react-icons/hi2';
import Badge from '@/components/Badge';
import Button from '@/components/Button';
import ConfirmDialog from '@/components/ConfirmDialog';
import Toast from '@/components/Toast';
import ExamFormModal from './ExamFormModal';
import ExamScheduleGrid from './ExamScheduleGrid';
import ExamChecklist from './ExamChecklist';
import ExamAuditLogModal from './ExamAuditLogModal';
import { deleteExam, setExamStatus } from '@/lib/api';

const STATUS_VARIANTS = { Draft: 'gray', Published: 'blue', Completed: 'green' };

function formatDate(iso) {
  return new Date(`${iso}T00:00:00`).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function ExamDetailsClient({
  exam,
  progress,
  verificationSummary,
  hasPublishedResults,
  sessionOptions,
  examTypeOptions,
  role,
  classTeacherScope = [],
}) {
  const isAdmin = role === 'SchoolAdmin' || role === 'SuperAdmin';
  // A Class Teacher only ever sees/manages their own class(es) within this
  // exam — not the other classes it also covers. Scope is per-class, not
  // per-section (see lib/examSchedules.js's getClassTeacherScopeForExam):
  // being Class Teacher of just one section of a class grants the whole
  // class, since a class's exam schedule is one shared date sheet either way.
  const myClasses = [...new Set(classTeacherScope.map((s) => s.className))];
  // Publishing is the one exception: a Class Teacher of ANY class this exam
  // covers can publish it (see lib/exams.js's assertCanSetExamStatus) —
  // that flips the whole exam live, not just their own class, since
  // Exam.status isn't per-class.
  const canPublish = isAdmin || classTeacherScope.length > 0;
  const visibleSchedules = isAdmin ? exam.schedules : exam.schedules.filter((s) => myClasses.includes(s.className));

  const router = useRouter();
  const searchParams = useSearchParams();
  const fromParam = searchParams.get('from');
  const backHref = fromParam ? decodeURIComponent(fromParam) : '/dashboard/exams/list';
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAuditLog, setShowAuditLog] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isWorking, setIsWorking] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await deleteExam(exam.id);
      router.push(backHref);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleStatusChange = async (status) => {
    setIsWorking(true);
    try {
      await setExamStatus(exam.id, status);
      setToastMessage(`Exam marked as ${status}.`);
      router.refresh();
    } finally {
      setIsWorking(false);
    }
  };

  return (
    <div className={`flex flex-col h-full gap-6 ${canPublish && exam.status === 'Draft' ? 'pb-20' : ''}`}>
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 shrink-0">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold text-gray-900">{exam.name}</h1>
              <Badge label={exam.status} variant={STATUS_VARIANTS[exam.status]} />
            </div>
            <div className="flex items-center flex-wrap gap-3 mt-3 text-xs text-gray-600">
              <span className="flex items-center gap-1.5 bg-gray-50 rounded-full px-3 py-1">
                <FiCalendar className="w-3.5 h-3.5 text-gray-400" />
                {formatDate(exam.startDate)} – {formatDate(exam.endDate)}
              </span>
              <span className="flex items-center gap-1.5 bg-gray-50 rounded-full px-3 py-1">
                <FiLayers className="w-3.5 h-3.5 text-gray-400" />
                {exam.classes.join(', ')}
              </span>
              <span className="flex items-center gap-1.5 bg-gray-50 rounded-full px-3 py-1">
                <HiOutlineAcademicCap className="w-3.5 h-3.5 text-gray-400" />
                {exam.academicSession}
              </span>
            </div>
          </div>

          {isAdmin && (
            <div className="flex items-center gap-2 shrink-0">
              {exam.status !== 'Draft' && (
                <>
                  <Button
                    label="Verify Marks"
                    icon={<FiCheckSquare className="w-4 h-4" />}
                    variant="secondary"
                    onClick={() => router.push(`/dashboard/exams/${exam.id}/verify`)}
                  />
                  <Button
                    label="Results"
                    icon={<FiBarChart2 className="w-4 h-4" />}
                    variant="secondary"
                    onClick={() => router.push(`/dashboard/exams/${exam.id}/results`)}
                  />
                </>
              )}
              {exam.status === 'Published' && (
                <Button
                  label="Mark Completed"
                  icon={<FiCheckCircle className="w-4 h-4" />}
                  variant="secondary"
                  onClick={() => handleStatusChange('Completed')}
                  disabled={isWorking}
                />
              )}
              <Button label="Activity Log" icon={<FiClock className="w-4 h-4" />} variant="secondary" onClick={() => setShowAuditLog(true)} />
              <Button label="Edit" icon={<FiEdit2 className="w-4 h-4" />} variant="secondary" onClick={() => setShowEditModal(true)} />
              <button
                type="button"
                onClick={() => setShowConfirm(true)}
                className="flex items-center justify-center w-10 h-10 rounded-lg border border-gray-200 text-red-500 hover:bg-red-50 transition cursor-pointer shrink-0"
              >
                <FiTrash2 className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      {isAdmin && (
        <div className="shrink-0">
          <ExamChecklist exam={exam} progress={progress} verificationSummary={verificationSummary} hasPublishedResults={hasPublishedResults} />
        </div>
      )}

      <div id="exam-schedule" className="flex-1 pb-24">
        <ExamScheduleGrid
          examId={exam.id}
          examClasses={isAdmin ? exam.classes : myClasses}
          examStartDate={exam.startDate}
          examEndDate={exam.endDate}
          schedules={visibleSchedules}
        />
      </div>

      {canPublish && exam.status === 'Draft' && (
        <div className="fixed bottom-0 left-0 right-0 lg:left-64 z-30 bg-gray-50 border-t border-gray-100 px-4 sm:px-6 py-3 print:hidden">
          <div className="flex items-center justify-end gap-3">
            <Button label="Save as Draft" variant="secondary" onClick={() => router.push(backHref)} />
            <Button
              label={isWorking ? 'Publishing...' : 'Next: Publish Exam'}
              icon={<FiArrowRight className="w-4 h-4" />}
              onClick={() => handleStatusChange('Published')}
              disabled={isWorking}
            />
          </div>
        </div>
      )}

      <ExamFormModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        exam={exam}
        sessionOptions={sessionOptions}
        defaultSession={exam.academicSession}
        examTypeOptions={examTypeOptions}
        onSuccess={(message) => {
          setShowEditModal(false);
          setToastMessage(message);
          router.refresh();
        }}
      />

      <ExamAuditLogModal isOpen={showAuditLog} onClose={() => setShowAuditLog(false)} examId={exam.id} />

      <ConfirmDialog
        isOpen={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={handleDelete}
        title="Delete exam?"
        description={`"${exam.name}" and its entire schedule, marks, and results will be permanently removed.`}
        confirmLabel="Delete"
        isLoading={isDeleting}
      />

      {toastMessage && <Toast message={toastMessage} onClose={() => setToastMessage('')} />}
    </div>
  );
}
