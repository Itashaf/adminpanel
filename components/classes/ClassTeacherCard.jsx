'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { FiUser, FiUserPlus, FiUserMinus } from 'react-icons/fi';
import Button from '@/components/Button';
import ConfirmDialog from '@/components/ConfirmDialog';
import Toast from '@/components/Toast';
import AssignClassTeacherModal from './AssignClassTeacherModal';
import { assignClassTeacher } from '@/lib/api';

// A class with zero admin-created sections (e.g. Nursery/Playway) never
// shows the "Sections" grid — this replaces it with a single card for the
// one thing a section-less class still needs: its class
// teacher. `section` is the hidden, name-less Section row lib/classes.js's
// assignClassTeacher creates on first assignment (cls.sections[0] if it
// exists yet) — null before any assignment has ever been made.
export default function ClassTeacherCard({ classId, className, section, teacherOptions }) {
  const router = useRouter();
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showUnassignConfirm, setShowUnassignConfirm] = useState(false);
  const [isUnassigning, setIsUnassigning] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  const hasClassTeacher = Boolean(section?.classTeacherId);

  const handleUnassign = async () => {
    setIsUnassigning(true);
    try {
      await assignClassTeacher(classId, '');
      setShowUnassignConfirm(false);
      setToastMessage('Class teacher unassigned.');
      router.refresh();
    } finally {
      setIsUnassigning(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div className="flex items-center gap-3 min-w-0">
        <span className="flex items-center justify-center w-11 h-11 rounded-2xl bg-violet-100 text-violet-600 shrink-0">
          <FiUser className="w-5 h-5" />
        </span>
        <div className="min-w-0">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Class Teacher</p>
          <p className="text-base font-bold text-gray-900 truncate">{section?.classTeacherName || 'Unassigned'}</p>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {hasClassTeacher && (
          <Button
            label="Unassign"
            variant="secondary"
            icon={<FiUserMinus className="w-4 h-4" />}
            onClick={() => setShowUnassignConfirm(true)}
            fullWidth={false}
          />
        )}
        <Button
          label={hasClassTeacher ? 'Change Class Teacher' : 'Assign Class Teacher'}
          icon={<FiUserPlus className="w-4 h-4" />}
          onClick={() => setShowAssignModal(true)}
          fullWidth={false}
        />
      </div>

      <AssignClassTeacherModal
        isOpen={showAssignModal}
        onClose={() => setShowAssignModal(false)}
        classId={classId}
        className={className}
        currentClassTeacherId={section?.classTeacherId}
        teacherOptions={teacherOptions}
        onSuccess={(message) => {
          setShowAssignModal(false);
          setToastMessage(message);
          router.refresh();
        }}
      />

      <ConfirmDialog
        isOpen={showUnassignConfirm}
        onClose={() => setShowUnassignConfirm(false)}
        onConfirm={handleUnassign}
        title="Unassign class teacher?"
        description={`${section?.classTeacherName || 'This teacher'} will no longer be the class teacher of ${className}.`}
        confirmLabel="Unassign"
        isLoading={isUnassigning}
      />

      {toastMessage && <Toast message={toastMessage} onClose={() => setToastMessage('')} />}
    </div>
  );
}
