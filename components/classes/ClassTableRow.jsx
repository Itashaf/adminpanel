'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FiMoreVertical, FiEye, FiEdit2, FiUserX, FiUserCheck, FiTrash2 } from 'react-icons/fi';
import DropdownMenu from '@/components/DropdownMenu';
import ConfirmDialog from '@/components/ConfirmDialog';
import Toast from '@/components/Toast';
import ClassFormModal from './ClassFormModal';
import { updateClassStatus, deleteClass } from '@/lib/api';

const LEVEL_CHIP_LABELS = { Nursery: 'N', Playway: 'PW', LKG: 'LKG', UKG: 'UKG' };

const STATUS_STYLE = {
  true: { label: 'Active', dot: 'bg-emerald-600', className: 'bg-emerald-50 text-emerald-700' },
  false: { label: 'Inactive', dot: 'bg-gray-400', className: 'bg-gray-100 text-gray-500' },
};

export default function ClassTableRow({ cls, serialNumber, dragHandle }) {
  const router = useRouter();
  const [showEditModal, setShowEditModal] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [toastMessage, setToastMessage] = useState('');

  const isActive = cls.status === 'Active';
  const status = STATUS_STYLE[isActive];

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
      <tr className="hover:bg-gray-50/60 transition">
      <td className="py-5 pl-6 pr-2">{dragHandle}</td>
      <td className="py-5 pr-4 text-gray-400">{serialNumber}</td>
      <td className="py-5 pr-4">
        <Link href={`/dashboard/classes/${cls.id}`} className="flex items-center gap-3 min-w-0 cursor-pointer">
          <span className="flex items-center justify-center w-9 h-9 rounded-lg bg-blue-50 text-blue-600 text-sm font-bold shrink-0">
            {LEVEL_CHIP_LABELS[cls.level] || cls.level}
          </span>
          <div className="min-w-0">
            <p className="font-semibold text-gray-900 hover:text-indigo-700 truncate">{cls.name}</p>
            <p className="text-xs text-gray-400 truncate">{cls.wing}</p>
          </div>
        </Link>
      </td>
      <td className="py-5 pr-4">
        {cls.sections.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {cls.sections.map((section) => (
              <span key={section.id} className="flex items-center gap-1 text-xs border border-gray-200 rounded-lg px-2 py-1 shrink-0">
                <span className="font-semibold text-gray-900">{section.name}</span>
                <span className="text-gray-500">{section.studentCount}</span>
              </span>
            ))}
          </div>
        ) : (
          <span className="text-sm text-gray-400">No sections yet</span>
        )}
      </td>
      <td className="py-5 pr-4 text-center">
        <span className="font-semibold text-gray-900">{cls.totalStudents.toLocaleString()}</span>
      </td>
      <td className="py-5 pr-4 text-center">
        <span className="inline-flex items-center gap-1.5 text-xs text-gray-500">
          <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
          {cls.totalBoys}
          <span className="w-2 h-2 rounded-full bg-pink-500 shrink-0 ml-2" />
          {cls.totalGirls}
        </span>
      </td>
      <td className="py-5 pr-4 text-center">
        <span className={`inline-flex items-center gap-1.5 text-xs font-semibold rounded-full px-3 py-1 ${status.className}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
          {status.label}
        </span>
      </td>
      <td className="py-5 pr-6">
        <div className="flex items-center justify-center gap-1.5">
          <Link
            href={`/dashboard/classes/${cls.id}`}
            className="text-sm font-semibold text-indigo-700 hover:text-indigo-800 transition cursor-pointer"
          >
            Manage
          </Link>
          <DropdownMenu trigger={<FiMoreVertical className="w-4 h-4" />} items={menuItems} />
        </div>
      </td>
      </tr>

      {/* Mounted only while actually open — ClassFormModal calls
          useSubjects() unconditionally on mount (not gated on `isOpen`),
          so rendering it unconditionally here (once per table row) fired
          one parallel getSubjects() request per class on page load. */}
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
