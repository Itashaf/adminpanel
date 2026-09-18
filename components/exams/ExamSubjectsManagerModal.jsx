'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { FiEdit2, FiTrash2, FiFileText } from 'react-icons/fi';
import Modal from '@/components/Modal';
import ConfirmDialog from '@/components/ConfirmDialog';
import ExamScheduleFormModal from './ExamScheduleFormModal';
import { deleteExamSchedule } from '@/lib/api';

function formatDate(iso) {
  return new Date(`${iso}T00:00:00`).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
}

function ManagerRow({ schedule, examClasses, examStartDate, examEndDate, onChanged }) {
  const router = useRouter();
  const [showEditModal, setShowEditModal] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await deleteExamSchedule(schedule.id);
      setShowConfirm(false);
      router.refresh();
      onChanged('Subject removed.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <div className="flex items-center gap-3 px-4 py-3">
        <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-violet-50 text-violet-600 shrink-0">
          <FiFileText className="w-4 h-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-gray-900 truncate">{schedule.subject}</p>
          <p className="text-xs text-gray-500 truncate">
            {schedule.className}
            {schedule.sectionName ? ` • Sec ${schedule.sectionName}` : ' • All Sections'} • {formatDate(schedule.examDate)}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowEditModal(true)}
          className="flex items-center justify-center w-8 h-8 rounded-lg text-gray-500 hover:bg-gray-100 transition cursor-pointer shrink-0"
        >
          <FiEdit2 className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => setShowConfirm(true)}
          className="flex items-center justify-center w-8 h-8 rounded-lg text-red-500 hover:bg-red-50 transition cursor-pointer shrink-0"
        >
          <FiTrash2 className="w-4 h-4" />
        </button>
      </div>

      <ExamScheduleFormModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        examId={schedule.examId}
        examClasses={examClasses}
        examStartDate={examStartDate}
        examEndDate={examEndDate}
        schedule={schedule}
        onSuccess={(message) => {
          setShowEditModal(false);
          onChanged(message);
        }}
      />

      <ConfirmDialog
        isOpen={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={handleDelete}
        title="Delete this subject's schedule?"
        description={`"${schedule.subject}" for ${schedule.className} will be removed from the date sheet, along with any marks already entered.`}
        confirmLabel="Delete"
        isLoading={isDeleting}
      />
    </>
  );
}

export default function ExamSubjectsManagerModal({ isOpen, onClose, examClasses, examStartDate, examEndDate, schedules, onChanged }) {
  return (
    <Modal
      title="Manage Subjects"
      description="Quickly review, edit, or remove any subject on this exam's schedule."
      isOpen={isOpen}
      onClose={onClose}
      size="lg"
    >
      {schedules.length === 0 ? (
        <p className="text-sm text-gray-500 text-center py-10">No subjects added yet.</p>
      ) : (
        <div className="border border-gray-100 rounded-xl divide-y divide-gray-50 max-h-96 overflow-y-auto">
          {schedules.map((schedule) => (
            <ManagerRow
              key={schedule.id}
              schedule={schedule}
              examClasses={examClasses}
              examStartDate={examStartDate}
              examEndDate={examEndDate}
              onChanged={onChanged}
            />
          ))}
        </div>
      )}
    </Modal>
  );
}
