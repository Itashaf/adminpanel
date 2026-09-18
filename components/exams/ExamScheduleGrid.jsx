'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { FiMoreVertical, FiEdit2, FiTrash2, FiCalendar, FiClock, FiLayers, FiPlus, FiUsers } from 'react-icons/fi';
import Badge from '@/components/Badge';
import Button from '@/components/Button';
import Dropdown from '@/components/Dropdown';
import DropdownMenu from '@/components/DropdownMenu';
import ConfirmDialog from '@/components/ConfirmDialog';
import Toast from '@/components/Toast';
import ExamScheduleFormModal from './ExamScheduleFormModal';
import ExamEnrollmentModal from './ExamEnrollmentModal';
import ExamSubjectsManagerModal from './ExamSubjectsManagerModal';
import { deleteExamSchedule } from '@/lib/api';

const SCHEDULE_GRID_COLS = '48px minmax(0,1fr) 140px 160px 160px 56px';

function formatDate(iso) {
  return new Date(`${iso}T00:00:00`).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatTimeRange(start, end) {
  if (!start && !end) return '—';
  return [start, end].filter(Boolean).join(' – ');
}

function ScheduleRow({ schedule, examClasses, examStartDate, examEndDate, serialNumber, onChanged }) {
  const router = useRouter();
  const [showEditModal, setShowEditModal] = useState(false);
  const [showEnrollModal, setShowEnrollModal] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await deleteExamSchedule(schedule.id);
      setShowConfirm(false);
      router.refresh();
    } finally {
      setIsDeleting(false);
    }
  };

  const menuItems = [
    { label: 'Edit Schedule', icon: <FiEdit2 className="w-4 h-4" />, onClick: () => setShowEditModal(true) },
    ...(schedule.isOptional
      ? [{ label: 'Manage Enrollment', icon: <FiUsers className="w-4 h-4" />, onClick: () => setShowEnrollModal(true) }]
      : []),
    { label: 'Delete Schedule', icon: <FiTrash2 className="w-4 h-4" />, onClick: () => setShowConfirm(true), danger: true },
  ];

  return (
    <>
      <div style={{ gridTemplateColumns: SCHEDULE_GRID_COLS }} className="hidden md:grid items-center gap-4 px-4 sm:px-5 py-4 hover:bg-gray-50/60 transition">
        <span className="text-sm text-gray-500">{serialNumber}</span>

        <div className="min-w-0">
          <p className="text-sm text-gray-900 truncate">
            <span className="font-semibold">{schedule.subject}</span>
            <span className="text-gray-500"> • {schedule.examMode}</span>
          </p>
          {schedule.isOptional && (
            <div className="mt-0.5">
              <Badge label="Optional" variant="violet" />
            </div>
          )}
        </div>

        <div className="flex items-center gap-1.5 text-xs text-gray-600">
          <FiCalendar className="w-3.5 h-3.5 text-gray-400 shrink-0" />
          {formatDate(schedule.examDate)}
        </div>

        <div className="flex items-center gap-1.5 text-xs text-gray-500">
          <FiClock className="w-3.5 h-3.5 text-gray-400 shrink-0" />
          {formatTimeRange(schedule.startTime, schedule.endTime)}
        </div>

        <div className="flex items-center gap-1.5 text-xs text-gray-600 min-w-0">
          <FiLayers className="w-3.5 h-3.5 text-gray-400 shrink-0" />
          <span className="truncate">
            {schedule.className}
            {schedule.sectionName ? ` • Sec ${schedule.sectionName}` : ' • All Sections'}
          </span>
        </div>

        <div className="flex justify-end">
          <DropdownMenu trigger={<FiMoreVertical className="w-4 h-4" />} items={menuItems} />
        </div>
      </div>

      <div className="md:hidden flex items-start gap-3 px-4 py-3 hover:bg-gray-50/60 transition">
        <div className="flex-1 min-w-0">
          <p className="text-sm text-gray-900 truncate">
            <span className="font-semibold">{schedule.subject}</span>
            <span className="text-gray-500"> • {schedule.examMode}</span>
          </p>
          <p className="text-xs text-gray-500 truncate">
            {schedule.className}
            {schedule.sectionName ? ` • Sec ${schedule.sectionName}` : ' • All Sections'}
          </p>
          <p className="text-xs text-gray-500 mt-0.5">
            {formatDate(schedule.examDate)} • {formatTimeRange(schedule.startTime, schedule.endTime)}
          </p>
          {schedule.isOptional && (
            <div className="mt-1.5">
              <Badge label="Optional" variant="violet" />
            </div>
          )}
        </div>
        <DropdownMenu trigger={<FiMoreVertical className="w-4 h-4" />} items={menuItems} />
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

      <ExamEnrollmentModal
        isOpen={showEnrollModal}
        onClose={() => setShowEnrollModal(false)}
        schedule={schedule}
        onSuccess={(message) => {
          setShowEnrollModal(false);
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

export default function ExamScheduleGrid({ examId, examClasses, examStartDate, examEndDate, schedules }) {
  const router = useRouter();
  const [showAddModal, setShowAddModal] = useState(false);
  const [showManageModal, setShowManageModal] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [classFilter, setClassFilter] = useState('');

  const handleChanged = (message) => {
    setToastMessage(message);
    router.refresh();
  };

  const classFilterOptions = [{ value: '', label: 'All Classes' }, ...examClasses.map((c) => ({ value: c, label: c }))];
  const filteredSchedules = classFilter ? schedules.filter((s) => s.className === classFilter) : schedules;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm h-full flex flex-col">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-5 py-4 border-b border-gray-100 shrink-0">
        <div>
          <h2 className="text-base font-bold text-gray-900">Subjects &amp; Exam Schedule</h2>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {schedules.length > 0 && (
            <div className="w-40">
              <Dropdown
                placeholder="All Classes"
                icon={<FiLayers className="w-4 h-4" />}
                options={classFilterOptions}
                value={classFilter}
                onChange={setClassFilter}
              />
            </div>
          )}
          <Button label="Manage Subjects" variant="secondary" onClick={() => setShowManageModal(true)} />
          <Button label="Add Subject" icon={<FiPlus className="w-4 h-4" />} onClick={() => setShowAddModal(true)} />
        </div>
      </div>

      {schedules.length === 0 ? (
        <div className="flex-1 min-h-[140px] flex flex-col items-center justify-center text-center px-5">
          <p className="text-sm font-semibold text-gray-900">No subjects added yet</p>
          <p className="text-xs text-gray-500 mt-1">Add subjects to start creating the exam schedule.</p>
        </div>
      ) : filteredSchedules.length === 0 ? (
        <div className="flex-1 min-h-[140px] flex flex-col items-center justify-center text-center px-5">
          <p className="text-sm font-semibold text-gray-900">No subjects for {classFilter}</p>
          <p className="text-xs text-gray-500 mt-1">Try a different class, or clear the filter.</p>
        </div>
      ) : (
        <div className="flex-1 flex flex-col">
          <div
            style={{ gridTemplateColumns: SCHEDULE_GRID_COLS }}
            className="hidden md:grid gap-4 px-4 sm:px-5 py-2.5 bg-gray-50/80 border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase tracking-wide shrink-0"
          >
            <span>#</span>
            <span>Subject</span>
            <span>Date</span>
            <span>Time</span>
            <span>Classes</span>
            <span className="text-right">Actions</span>
          </div>
          <div className="divide-y divide-gray-50">
            {filteredSchedules.map((schedule, index) => (
              <ScheduleRow
                key={schedule.id}
                schedule={schedule}
                examClasses={examClasses}
                examStartDate={examStartDate}
                examEndDate={examEndDate}
                serialNumber={index + 1}
                onChanged={handleChanged}
              />
            ))}
          </div>
        </div>
      )}

      <ExamScheduleFormModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        examId={examId}
        examClasses={examClasses}
        examStartDate={examStartDate}
        examEndDate={examEndDate}
        schedule={null}
        onSuccess={(message) => {
          setShowAddModal(false);
          handleChanged(message);
        }}
      />

      <ExamSubjectsManagerModal
        isOpen={showManageModal}
        onClose={() => setShowManageModal(false)}
        examClasses={examClasses}
        examStartDate={examStartDate}
        examEndDate={examEndDate}
        schedules={schedules}
        onChanged={handleChanged}
      />

      {toastMessage && <Toast message={toastMessage} onClose={() => setToastMessage('')} />}
    </div>
  );
}
