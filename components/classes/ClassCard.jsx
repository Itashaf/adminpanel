'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FiMoreVertical, FiEye, FiEdit2, FiUserX, FiUserCheck, FiTrash2, FiArrowRight, FiUsers } from 'react-icons/fi';
import Badge from '@/components/Badge';
import DropdownMenu from '@/components/DropdownMenu';
import ConfirmDialog from '@/components/ConfirmDialog';
import Toast from '@/components/Toast';
import ClassFormModal from './ClassFormModal';
import { updateClassStatus, deleteClass } from '@/lib/api';

const LEVEL_CHIP_LABELS = { Nursery: 'N', Playway: 'PW', LKG: 'LKG', UKG: 'UKG' };

export default function ClassCard({ cls }) {
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
    {
      label: 'View Class',
      icon: <FiEye className="w-4 h-4" />,
      onClick: () => router.push(`/dashboard/classes/${cls.id}`),
    },
    {
      label: 'Edit Class',
      icon: <FiEdit2 className="w-4 h-4" />,
      onClick: () => setShowEditModal(true),
    },
    {
      label: isActive ? 'Deactivate' : 'Activate',
      icon: isActive ? <FiUserX className="w-4 h-4" /> : <FiUserCheck className="w-4 h-4" />,
      onClick: () => setShowConfirm(true),
      danger: isActive,
    },
    {
      label: 'Delete Class',
      icon: <FiTrash2 className="w-4 h-4" />,
      onClick: () => setShowDeleteConfirm(true),
      danger: true,
    },
  ];

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition overflow-hidden">
      <div className="p-4 flex flex-col gap-3.5">
        <div className="flex items-start justify-between gap-2">
          <Link href={`/dashboard/classes/${cls.id}`} className="flex items-center gap-3 min-w-0 cursor-pointer">
            <span className="flex items-center justify-center w-11 h-11 rounded-xl bg-blue-50 text-blue-600 text-base font-bold shrink-0">
              {LEVEL_CHIP_LABELS[cls.level] || cls.level}
            </span>
            <div className="min-w-0">
              <p className="text-lg font-bold text-gray-900 hover:text-indigo-700 truncate">{cls.name}</p>
              <p className="text-sm text-gray-400 truncate">{cls.wing}</p>
            </div>
          </Link>

          <div className="flex items-center gap-1.5 shrink-0">
            {!isActive && <Badge label="Inactive" variant="gray" />}
            <DropdownMenu trigger={<FiMoreVertical className="w-4 h-4" />} items={menuItems} />
          </div>
        </div>

        <div className="bg-gray-50 rounded-xl px-4 py-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <FiUsers className="w-4 h-4 text-gray-400 shrink-0" />
            <span className="text-lg font-bold text-gray-900">{cls.totalStudents.toLocaleString()}</span>
            <span className="text-sm text-gray-400">Total</span>
          </div>
          <div className="h-8 w-px bg-gray-200 shrink-0" />
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
            <span className="text-lg font-bold text-gray-900">{cls.totalBoys}</span>
            <span className="text-sm text-gray-400">Boys</span>
          </div>
          <div className="h-8 w-px bg-gray-200 shrink-0" />
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-pink-500 shrink-0" />
            <span className="text-lg font-bold text-gray-900">{cls.totalGirls}</span>
            <span className="text-sm text-gray-400">Girls</span>
          </div>
        </div>

        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center flex-wrap gap-2 min-w-0">
            {cls.sections.length > 0 ? (
              <>
                <span className="text-xs font-medium text-gray-400 uppercase tracking-wide shrink-0">
                  {cls.sectionCount} {cls.sectionCount === 1 ? 'Section' : 'Sections'}:
                </span>
                <div className="flex flex-wrap gap-1.5 min-w-0">
                  {cls.sections.map((section) => (
                    <span
                      key={section.id}
                      className="flex items-center gap-1 text-sm border border-gray-200 rounded-lg px-2 py-1 shrink-0"
                    >
                      <span className="font-bold text-gray-900">{section.name}</span>
                      <span className="text-gray-500">{section.studentCount}</span>
                    </span>
                  ))}
                </div>
              </>
            ) : (
              <span className="text-sm text-gray-400 truncate">No sections yet</span>
            )}
          </div>

          <Link
            href={`/dashboard/classes/${cls.id}`}
            className="group inline-flex items-center gap-1 text-sm font-semibold text-indigo-700 hover:text-indigo-800 transition cursor-pointer shrink-0"
          >
            Manage
            <FiArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
      </div>

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
    </div>
  );
}
