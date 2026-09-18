'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FiArrowLeft, FiEdit2, FiMoreVertical, FiUserX, FiUserCheck, FiKey } from 'react-icons/fi';
import Button from '@/components/Button';
import DropdownMenu from '@/components/DropdownMenu';
import ConfirmDialog from '@/components/ConfirmDialog';
import Toast from '@/components/Toast';
import ResetPasswordDialog from './ResetPasswordDialog';
import { updateTeacherStatus } from '@/lib/api';

export default function TeacherProfileHeader({ teacher }) {
  const router = useRouter();
  const [showConfirm, setShowConfirm] = useState(false);
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [resetToastMessage, setResetToastMessage] = useState('');
  const isActive = teacher.status === 'Active';

  const handleToggleStatus = async () => {
    setIsUpdating(true);
    try {
      await updateTeacherStatus(teacher.id, isActive ? 'Inactive' : 'Active');
      setShowConfirm(false);
      setShowToast(true);
      router.refresh();
    } finally {
      setIsUpdating(false);
    }
  };

  const moreItems = [
    ...(teacher.loginAccess?.enabled
      ? [
          {
            // A teacher who's never actually set a password yet (didn't use
            // their first invite, or it expired — see /set-password's
            // "Link invalid or expired") needs a fresh invite, not a
            // "reset" of something that was never set.
            label: teacher.loginAccess?.hasPassword ? 'Reset Login Password' : 'Resend Login Invite',
            icon: <FiKey className="w-4 h-4" />,
            onClick: () => setShowResetDialog(true),
          },
        ]
      : []),
    {
      label: isActive ? 'Deactivate' : 'Activate',
      icon: isActive ? <FiUserX className="w-4 h-4" /> : <FiUserCheck className="w-4 h-4" />,
      onClick: () => setShowConfirm(true),
      danger: isActive,
    },
  ];

  return (
    <>
      <div className="space-y-3">
        <Link
          href="/dashboard/teachers"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-indigo-700 transition cursor-pointer"
        >
          <FiArrowLeft className="w-4 h-4" />
          Teachers
        </Link>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center gap-5">
          {teacher.photoUrl ? (
            <img src={teacher.photoUrl} alt="" className="w-16 h-16 rounded-2xl object-cover shrink-0" />
          ) : (
            <span className="flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-700 to-blue-600 text-white text-xl font-semibold shrink-0">
              {teacher.initials}
            </span>
          )}

          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold text-gray-900">
              {teacher.firstName} {teacher.lastName}
            </h1>
            <p className="text-sm text-gray-400 mt-0.5">{teacher.employeeId}</p>
            <div className="flex items-center flex-wrap gap-2 mt-2.5">
              <span className="text-sm text-gray-600 bg-gray-50 rounded-lg px-3 py-1">{teacher.designation}</span>
              <span
                className={`inline-flex items-center gap-1.5 text-xs font-semibold rounded-full px-3 py-1 ${
                  isActive ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-green-600' : 'bg-gray-400'}`} />
                {teacher.status}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              label="Edit Teacher"
              variant="secondary"
              icon={<FiEdit2 className="w-4 h-4" />}
              onClick={() => router.push(`/dashboard/teachers/${teacher.id}/edit`)}
            />
            <DropdownMenu trigger={<FiMoreVertical className="w-5 h-5" />} items={moreItems} />
          </div>
        </div>
      </div>

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

      <ResetPasswordDialog
        isOpen={showResetDialog}
        onClose={() => setShowResetDialog(false)}
        teacher={teacher}
        onSuccess={() =>
          setResetToastMessage(teacher.loginAccess?.hasPassword ? 'Password reset link sent.' : 'Login invite resent.')
        }
      />

      {showToast && (
        <Toast message={isActive ? 'Teacher deactivated.' : 'Teacher activated.'} onClose={() => setShowToast(false)} />
      )}
      {resetToastMessage && <Toast message={resetToastMessage} onClose={() => setResetToastMessage('')} />}
    </>
  );
}
