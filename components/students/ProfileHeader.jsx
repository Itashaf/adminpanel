'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FiArrowLeft, FiEdit2, FiMoreVertical, FiUserX, FiTrash2, FiKey } from 'react-icons/fi';
import Button from '@/components/Button';
import DropdownMenu from '@/components/DropdownMenu';
import ConfirmDialog from '@/components/ConfirmDialog';
import Toast from '@/components/Toast';
import SetPortalAccessDialog from './SetPortalAccessDialog';
import { deleteStudent } from '@/lib/api';

export default function ProfileHeader({ student, canManage = true, canEdit = canManage }) {
  const router = useRouter();
  const isActive = student.status === 'Active';
  const [showConfirm, setShowConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [showToast, setShowToast] = useState(false);
  const [showPortalAccess, setShowPortalAccess] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  const handleDelete = async () => {
    setIsDeleting(true);
    setDeleteError('');
    try {
      await deleteStudent(student.id);
      setShowConfirm(false);
      setShowToast(true);
      setTimeout(() => router.push('/dashboard/students'), 900);
    } catch (err) {
      setDeleteError(err.message);
      setIsDeleting(false);
    }
  };

  const moreItems = [
    { label: 'Deactivate', icon: <FiUserX className="w-4 h-4" />, onClick: () => {} },
    { label: 'Set Portal Access', icon: <FiKey className="w-4 h-4" />, onClick: () => setShowPortalAccess(true) },
    { label: 'Delete', icon: <FiTrash2 className="w-4 h-4" />, onClick: () => setShowConfirm(true), danger: true },
  ];

  return (
    <div className="space-y-3">
      <Link
        href="/dashboard/students"
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-indigo-700 transition cursor-pointer"
      >
        <FiArrowLeft className="w-4 h-4" />
        Students
      </Link>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-8 flex items-center gap-4 sm:gap-5">
        <div className="relative shrink-0">
        {student.photoUrl ? (
          <img
            src={student.photoUrl}
            alt={`${student.firstName} ${student.lastName}`}
            className="w-20 h-20 sm:w-24 sm:h-24 rounded-full object-cover shrink-0"
          />
        ) : (
          <span className="flex items-center justify-center w-20 h-20 rounded-full bg-violet-100 text-violet-700 sm:w-16 sm:h-16 sm:rounded-2xl sm:bg-gradient-to-br sm:from-violet-700 sm:to-blue-600 sm:text-white text-2xl sm:text-xl font-semibold shrink-0">
            {student.initials}
          </span>
        )}
        {/* Phone: status shown as a dot on the avatar instead of the chip. */}
        <span
          title={student.status}
          className={`sm:hidden absolute top-0 right-0 w-4 h-4 rounded-full border-2 border-white ${isActive ? 'bg-green-500' : 'bg-red-500'}`}
        />
        </div>

        <div className="flex-1 min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
            {student.firstName} {student.lastName}
          </h1>
          <p className="text-sm text-gray-400 mt-0.5">{student.admissionId}</p>
          <div className="flex items-center flex-wrap gap-2 mt-2.5">
            <span className="flex items-center gap-1.5 text-sm text-gray-600 bg-gray-50 rounded-lg px-3 py-1">
              {student.class}
              {student.section && (
                <span className="flex items-center justify-center w-5 h-5 rounded-md bg-gray-100 text-xs font-semibold text-gray-600">
                  {student.section}
                </span>
              )}
            </span>
            <span
              className={`hidden sm:inline-flex items-center gap-1.5 text-xs font-semibold rounded-full px-3 py-1 ${
                isActive ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-green-600' : 'bg-gray-400'}`} />
              {student.status}
            </span>
          </div>
        </div>

        {(canEdit || canManage) && (
          <>
            {/* Phone: edit + more as stacked icon buttons, split off by a divider. */}
            <div className="sm:hidden flex flex-col gap-2 pl-4 border-l border-gray-100 shrink-0">
              {canEdit && (
                <button
                  type="button"
                  aria-label="Edit Student"
                  onClick={() => router.push(`/dashboard/students/${student.id}/edit`)}
                  className="flex items-center justify-center w-11 h-11 rounded-xl bg-gray-100 text-gray-800 cursor-pointer"
                >
                  <FiEdit2 className="w-4 h-4" />
                </button>
              )}
              {canManage && (
                <div className="[&_button]:flex [&_button]:items-center [&_button]:justify-center [&_button]:w-11 [&_button]:h-11 [&_button]:rounded-xl [&_button]:bg-gray-100 [&_button]:text-gray-800">
                  <DropdownMenu trigger={<FiMoreVertical className="w-5 h-5" />} items={moreItems} />
                </div>
              )}
            </div>
          <div className="hidden sm:flex items-center justify-end gap-2 sm:shrink-0">
            {canEdit && (
              <Button
                label="Edit Student"
                variant="secondary"
                icon={<FiEdit2 className="w-4 h-4" />}
                onClick={() => router.push(`/dashboard/students/${student.id}/edit`)}
              />
            )}
            {canManage && <DropdownMenu trigger={<FiMoreVertical className="w-5 h-5" />} items={moreItems} />}
          </div>
          </>
        )}
      </div>

      {canManage && (
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
      )}

      {canManage && (
        <SetPortalAccessDialog
          isOpen={showPortalAccess}
          onClose={() => setShowPortalAccess(false)}
          student={student}
          onSuccess={() => setToastMessage('Parent portal access issued.')}
        />
      )}

      {showToast && <Toast message="Student deleted." onClose={() => setShowToast(false)} />}
      {toastMessage && <Toast message={toastMessage} onClose={() => setToastMessage('')} />}
    </div>
  );
}
