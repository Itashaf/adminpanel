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

export default function ProfileHeader({ student, canManage = true }) {
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

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center gap-5">
        {student.photoUrl ? (
          <img
            src={student.photoUrl}
            alt={`${student.firstName} ${student.lastName}`}
            className="w-24 h-24 rounded-full object-cover shrink-0"
          />
        ) : (
          <span className="flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-700 to-blue-600 text-white text-xl font-semibold shrink-0">
            {student.initials}
          </span>
        )}

        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold text-gray-900">
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
              className={`inline-flex items-center gap-1.5 text-xs font-semibold rounded-full px-3 py-1 ${
                isActive ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-green-600' : 'bg-gray-400'}`} />
              {student.status}
            </span>
          </div>
        </div>

        {canManage && (
          <div className="flex items-center gap-2 shrink-0">
            <Button
              label="Edit Student"
              variant="secondary"
              icon={<FiEdit2 className="w-4 h-4" />}
              onClick={() => router.push(`/dashboard/students/${student.id}/edit`)}
            />
            <DropdownMenu trigger={<FiMoreVertical className="w-5 h-5" />} items={moreItems} />
          </div>
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
