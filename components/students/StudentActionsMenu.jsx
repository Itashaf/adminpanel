'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { FiMoreVertical, FiEye, FiEdit2, FiRepeat, FiUserX, FiTrash2 } from 'react-icons/fi';
import DropdownMenu from '@/components/DropdownMenu';
import ConfirmDialog from '@/components/ConfirmDialog';
import Toast from '@/components/Toast';
import { deleteStudent } from '@/lib/api';

export default function StudentActionsMenu({ student, onDeleted }) {
  const router = useRouter();
  const [showConfirm, setShowConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [showToast, setShowToast] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    setDeleteError('');
    try {
      await deleteStudent(student.id);
      setShowConfirm(false);
      setShowToast(true);
      // Optimistic update: remove this student from the parent's local list
      // directly (see StudentsExplorer) instead of router.refresh(), which
      // would re-run getAllStudents() just to reflect a change the client
      // already knows about. Toast still gets its 900ms — the row unmounts
      // the instant onDeleted() runs, taking the Toast with it otherwise.
      setTimeout(() => onDeleted?.(student.id), 900);
    } catch (err) {
      setDeleteError(err.message);
    } finally {
      setIsDeleting(false);
    }
  };

  const items = [
    {
      label: 'View Profile',
      icon: <FiEye className="w-4 h-4" />,
      onClick: () => router.push(`/dashboard/students/${student.id}`),
    },
    {
      label: 'Edit Student',
      icon: <FiEdit2 className="w-4 h-4" />,
      onClick: () => router.push(`/dashboard/students/${student.id}/edit`),
    },
    {
      label: 'Change Class/Section',
      icon: <FiRepeat className="w-4 h-4" />,
      onClick: () => {},
    },
    {
      label: 'Deactivate',
      icon: <FiUserX className="w-4 h-4" />,
      onClick: () => {},
    },
    {
      label: 'Delete',
      icon: <FiTrash2 className="w-4 h-4" />,
      onClick: () => setShowConfirm(true),
      danger: true,
    },
  ];

  return (
    <>
      <DropdownMenu trigger={<FiMoreVertical className="w-4 h-4" />} items={items} />

      <ConfirmDialog
        isOpen={showConfirm}
        onClose={() => {
          setShowConfirm(false);
          setDeleteError('');
        }}
        onConfirm={handleDelete}
        title="Delete student?"
        description={
          deleteError ||
          `${student.firstName} ${student.lastName} and all their records (attendance, fees, documents) will be permanently removed. This cannot be undone.`
        }
        confirmLabel="Delete"
        isLoading={isDeleting}
      />

      {showToast && <Toast message="Student deleted." onClose={() => setShowToast(false)} />}
    </>
  );
}
