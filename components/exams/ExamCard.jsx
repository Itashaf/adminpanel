'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  FiMoreVertical,
  FiEdit2,
  FiTrash2,
  FiEye,
  FiCopy,
  FiUploadCloud,
  FiCheckCircle,
  FiCalendar,
  FiLayers,
} from 'react-icons/fi';
import Badge from '@/components/Badge';
import DropdownMenu from '@/components/DropdownMenu';
import ConfirmDialog from '@/components/ConfirmDialog';
import Toast from '@/components/Toast';
import ExamFormModal from './ExamFormModal';
import { deleteExam, duplicateExam, setExamStatus } from '@/lib/api';

export const EXAM_GRID_COLS = '40px minmax(0,2.4fr) minmax(0,1fr) minmax(0,1.6fr) minmax(0,1.4fr) 100px 44px';

const STATUS_VARIANTS = { Draft: 'gray', Published: 'blue', Completed: 'green' };

function formatDate(iso) {
  return new Date(`${iso}T00:00:00`).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
}

function durationInDays(startIso, endIso) {
  const start = new Date(`${startIso}T00:00:00`);
  const end = new Date(`${endIso}T00:00:00`);
  return Math.round((end.getTime() - start.getTime()) / 86400000) + 1;
}

function ClassesPreview({ classes }) {
  if (!classes.length) return <span className="text-gray-400">—</span>;
  const shown = classes.slice(0, 2);
  const rest = classes.length - shown.length;
  return (
    <span className="truncate">
      {shown.join(', ')}
      {rest > 0 && ` +${rest}`}
    </span>
  );
}

export default function ExamCard({ exam, serialNumber, sessionOptions, defaultSession, examTypeOptions, backHref, isAdmin = true }) {
  const router = useRouter();
  const [showEditModal, setShowEditModal] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isWorking, setIsWorking] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  const detailHref = backHref
    ? `/dashboard/exams/${exam.id}?from=${encodeURIComponent(backHref)}`
    : `/dashboard/exams/${exam.id}`;

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await deleteExam(exam.id);
      setShowConfirm(false);
      router.refresh();
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDuplicate = async () => {
    setIsWorking(true);
    try {
      await duplicateExam(exam.id);
      setToastMessage('Exam duplicated as a new draft.');
      router.refresh();
    } finally {
      setIsWorking(false);
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

  // A Class Teacher can open the exam (to add their own class's subjects)
  // but never edit/publish/duplicate/delete its metadata — those stay
  // admin-only, same restriction lib/exams.js's createExam/updateExam/
  // deleteExam already enforce server-side.
  const menuItems = [
    { label: 'View Exam', icon: <FiEye className="w-4 h-4" />, onClick: () => router.push(detailHref) },
    ...(isAdmin
      ? [
          { label: 'Edit Exam', icon: <FiEdit2 className="w-4 h-4" />, onClick: () => setShowEditModal(true) },
          ...(exam.status === 'Draft'
            ? [{ label: 'Publish Exam', icon: <FiUploadCloud className="w-4 h-4" />, onClick: () => handleStatusChange('Published') }]
            : []),
          ...(exam.status === 'Published'
            ? [{ label: 'Mark Completed', icon: <FiCheckCircle className="w-4 h-4" />, onClick: () => handleStatusChange('Completed') }]
            : []),
          { label: 'Duplicate Exam', icon: <FiCopy className="w-4 h-4" />, onClick: handleDuplicate },
          { label: 'Delete Exam', icon: <FiTrash2 className="w-4 h-4" />, onClick: () => setShowConfirm(true), danger: true },
        ]
      : []),
  ];

  return (
    <div>
      <div
        role="button"
        tabIndex={0}
        onClick={() => router.push(detailHref)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') router.push(detailHref);
        }}
        style={{ gridTemplateColumns: EXAM_GRID_COLS }}
        className="w-full hidden md:grid items-center gap-x-6 gap-y-6 px-5 sm:px-6 py-5 text-left cursor-pointer hover:bg-gray-50/60 transition"
      >
        <span className="text-sm text-gray-500">{serialNumber}</span>

        <div className="min-w-0">
          <p className="text-sm font-semibold text-gray-900 truncate">{exam.name}</p>
          <p className="text-xs text-gray-500 truncate mt-0.5">{exam.examType}</p>
        </div>

        <div className="flex items-center gap-1.5 text-xs text-gray-600">
          <FiCalendar className="w-3.5 h-3.5 text-gray-400 shrink-0" />
          {exam.academicSession}
        </div>

        <div className="min-w-0">
          <p className="text-xs text-gray-600 truncate">
            {formatDate(exam.startDate)} – {formatDate(exam.endDate)}
          </p>
          <p className="text-xs text-gray-400 mt-0.5">{durationInDays(exam.startDate, exam.endDate)} days</p>
        </div>

        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-xs text-gray-600">
            <FiLayers className="w-3.5 h-3.5 text-gray-400 shrink-0" />
            <ClassesPreview classes={exam.classes} />
          </p>
          <p className="text-xs text-gray-400 mt-0.5">
            {exam.classes.length} class{exam.classes.length === 1 ? '' : 'es'}
          </p>
        </div>

        <div>
          <Badge label={exam.status} variant={STATUS_VARIANTS[exam.status]} />
        </div>

        <div className="flex justify-end" onClick={(e) => e.stopPropagation()}>
          <DropdownMenu trigger={<FiMoreVertical className="w-4 h-4" />} items={menuItems} />
        </div>
      </div>

      <div
        role="button"
        tabIndex={0}
        onClick={() => router.push(detailHref)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') router.push(detailHref);
        }}
        className="w-full md:hidden flex items-start gap-3 px-4 py-3 text-left cursor-pointer hover:bg-gray-50/60 transition"
      >
        <span className="text-xs font-medium text-gray-400 mt-1 w-5 shrink-0">{serialNumber}</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900 truncate">{exam.name}</p>
          <p className="text-xs text-gray-500 truncate mt-0.5">
            {exam.examType} • {exam.academicSession}
          </p>
          <p className="text-xs text-gray-500 mt-0.5">
            {formatDate(exam.startDate)} – {formatDate(exam.endDate)}
          </p>
          <div className="flex items-center flex-wrap gap-1.5 mt-1.5">
            <Badge label={exam.status} variant={STATUS_VARIANTS[exam.status]} />
            <span className="flex items-center gap-1 text-xs text-gray-500 bg-gray-50 rounded-full px-2.5 py-1">
              <FiLayers className="w-3 h-3" />
              <ClassesPreview classes={exam.classes} />
            </span>
          </div>
        </div>
        <span onClick={(e) => e.stopPropagation()} className="shrink-0">
          <DropdownMenu trigger={<FiMoreVertical className="w-4 h-4" />} items={menuItems} />
        </span>
      </div>

      <ExamFormModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        exam={exam}
        sessionOptions={sessionOptions}
        defaultSession={defaultSession}
        examTypeOptions={examTypeOptions}
        onSuccess={(message) => {
          setShowEditModal(false);
          setToastMessage(message);
          router.refresh();
        }}
      />

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
