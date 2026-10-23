'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { FiMoreVertical, FiEye, FiEdit2, FiUserX, FiUserCheck, FiTrash2 } from 'react-icons/fi';
import DropdownMenu from '@/components/DropdownMenu';
import ConfirmDialog from '@/components/ConfirmDialog';
import Toast from '@/components/Toast';
import ClassFormModal from './ClassFormModal';
import { updateClassStatus, deleteClass } from '@/lib/api';

// The "⋮" menu for one class (View / Edit / Activate-Deactivate / Delete) plus
// the edit modal, confirmations and toast it opens, for the phone cards.
// Mirrors the actions in ClassTableRow (desktop), which is left untouched.
export default function ClassActionsMenu({ cls }) {
  const router = useRouter();
  const [showEditModal, setShowEditModal] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [toastMessage, setToastMessage] = useState('');

  const isActive = cls.status === 'Active';

  const handleToggleStatus = async () => {
    setIsUpdating(true);
    try {
      await updateClassStatus(cls.id, isActive ? 'Inactive' : 'Active');
      setShowConfirm(false);
      setToastMessage(isActive ? 'Class deactivated.' : 'Class activated.');
      router.refresh();
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    setDeleteError('');
    try {
      await deleteClass(cls.id);
      setShowDeleteConfirm(false);
      setToastMessage(`${cls.name} deleted.`);
      router.refresh();
    } catch (err) {
      setDeleteError(err.message);
    } finally {
      setIsDeleting(false);
    }
  };

  const menuItems = [
    { label: 'View Class', icon: <FiEye className="w-4 h-4" />, onClick: () => router.push(`/dashboard/classes/${cls.id}`) },
    { label: 'Edit Class', icon: <FiEdit2 className="w-4 h-4" />, onClick: () => setShowEditModal(true) },
    {
      label: isActive ? 'Deactivate' : 'Activate',
      icon: isActive ? <FiUserX className="w-4 h-4" /> : <FiUserCheck className="w-4 h-4" />,
      onClick: () => setShowConfirm(true),
      danger: isActive,
    },
    { label: 'Delete Class', icon: <FiTrash2 className="w-4 h-4" />, onClick: () => setShowDeleteConfirm(true), danger: true },
  ];

  return (
    <>
      <DropdownMenu trigger={<FiMoreVertical className="w-4 h-4" />} items={menuItems} />

      {/* Mounted only while actually open — ClassFormModal calls
          useSubjects() unconditionally on mount (not gated on `isOpen`),
          so rendering it unconditionally (once per class) fired one parallel
          getSubjects() request per class on page load. */}
      {showEditModal && (
        <ClassFormModal
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          cls={cls}
          onSuccess={(message) => {
            setShowEditModal(false);
            setToastMessage(message);
            router.refresh();
          }}
        />
      )}

      <ConfirmDialog
        isOpen={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={handleToggleStatus}
        title={isActive ? 'Deactivate class?' : 'Activate class?'}
        description={
          isActive
            ? `${cls.name} will be marked inactive and hidden from active listings. You can reactivate it anytime.`
            : `${cls.name} will be marked active again.`
        }
        confirmLabel={isActive ? 'Deactivate' : 'Activate'}
        isLoading={isUpdating}
      />

      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => {
          setShowDeleteConfirm(false);
          setDeleteError('');
        }}
        onConfirm={handleDelete}
        title="Delete class?"
        description={
          deleteError ||
          `${cls.name} and all ${cls.sectionCount} of its section(s) will be permanently removed. This cannot be undone.`
        }
        confirmLabel="Delete"
        isLoading={isDeleting}
      />

      {toastMessage && <Toast message={toastMessage} onClose={() => setToastMessage('')} />}
    </>
  );
}
