'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { FiMoreVertical, FiEye, FiEdit2, FiUserPlus, FiUserMinus, FiUserX, FiUserCheck } from 'react-icons/fi';
import DropdownMenu from '@/components/DropdownMenu';
import ConfirmDialog from '@/components/ConfirmDialog';
import Toast from '@/components/Toast';
import AssignClassModal from './AssignClassModal';
import UnassignClassModal from './UnassignClassModal';
import { updateTeacherStatus, removeTeacherAssignment } from '@/lib/api';

export default function TeacherActionsMenu({ teacher, classOptions }) {
  const router = useRouter();
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showUnassignModal, setShowUnassignModal] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  const isActive = teacher.status === 'Active';
  const hasAssignments = teacher.assignments.length > 0;

  // A single assignment unassigns directly (no picker needed) — the
  // UnassignClassModal's list picker only shows up when there's more than
  // one and it's actually ambiguous which one "Unassign Class" means.
  const handleQuickUnassign = async () => {
    await removeTeacherAssignment(teacher.id, teacher.assignments[0].id);
    setToastMessage('Assignment removed.');
    setShowToast(true);
    router.refresh();
  };

  const handleToggleStatus = async () => {
    setIsUpdating(true);
    try {
      await updateTeacherStatus(teacher.id, isActive ? 'Inactive' : 'Active');
      setShowConfirm(false);
      setToastMessage(isActive ? 'Teacher deactivated.' : 'Teacher activated.');
      setShowToast(true);
      router.refresh();
    } finally {
      setIsUpdating(false);
    }
  };

  const items = [
    {
      label: 'View Profile',
      icon: <FiEye className="w-4 h-4" />,
      onClick: () => router.push(`/dashboard/teachers/${teacher.id}`),
    },
    {
      label: 'Edit Teacher',
      icon: <FiEdit2 className="w-4 h-4" />,
      onClick: () => router.push(`/dashboard/teachers/${teacher.id}/edit`),
    },
    hasAssignments
      ? {
          label: 'Unassign Class',
          icon: <FiUserMinus className="w-4 h-4" />,
          // A single assignment removes right away; more than one opens the
          // picker (UnassignClassModal) since "Unassign Class" alone
          // wouldn't say which one.
          onClick: () => (teacher.assignments.length === 1 ? handleQuickUnassign() : setShowUnassignModal(true)),
        }
      : {
          label: 'Assign Class',
          icon: <FiUserPlus className="w-4 h-4" />,
          onClick: () => setShowAssignModal(true),
        },
    {
      label: isActive ? 'Deactivate' : 'Activate',
      icon: isActive ? <FiUserX className="w-4 h-4" /> : <FiUserCheck className="w-4 h-4" />,
      onClick: () => setShowConfirm(true),
      danger: isActive,
    },
  ];

  return (
    <>
      <DropdownMenu trigger={<FiMoreVertical className="w-4 h-4" />} items={items} />

      <AssignClassModal
        isOpen={showAssignModal}
        onClose={() => setShowAssignModal(false)}
        teacherId={teacher.id}
        existingAssignments={teacher.assignments}
        classOptions={classOptions}
        onSuccess={() => {
          setShowAssignModal(false);
          router.refresh();
        }}
      />

      <UnassignClassModal
        isOpen={showUnassignModal}
        onClose={() => setShowUnassignModal(false)}
        teacherId={teacher.id}
        assignments={teacher.assignments}
        onSuccess={(message) => {
          setShowUnassignModal(false);
          setToastMessage(message);
          setShowToast(true);
          router.refresh();
        }}
      />

      <ConfirmDialog
        isOpen={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={handleToggleStatus}
        title={isActive ? 'Deactivate teacher?' : 'Activate teacher?'}
        description={
          isActive
            ? `${teacher.firstName} ${teacher.lastName} will lose access and be marked inactive. You can reactivate them anytime.`
            : `${teacher.firstName} ${teacher.lastName} will be marked active again.`
        }
        confirmLabel={isActive ? 'Deactivate' : 'Activate'}
        isLoading={isUpdating}
      />

      {showToast && <Toast message={toastMessage} onClose={() => setShowToast(false)} />}
    </>
  );
}
