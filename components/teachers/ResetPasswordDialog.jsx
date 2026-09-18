'use client';

import { useEffect, useState } from 'react';
import { FiCheckCircle } from 'react-icons/fi';
import Modal from '@/components/Modal';
import { resetTeacherPassword } from '@/lib/api';

export default function ResetPasswordDialog({ isOpen, onClose, teacher, onSuccess }) {
  const [isResetting, setIsResetting] = useState(false);
  const [isSent, setIsSent] = useState(false);
  const [formError, setFormError] = useState('');
  const isReinvite = !teacher?.loginAccess?.hasPassword;

  useEffect(() => {
    if (!isOpen) return;
    setIsSent(false);
    setFormError('');
  }, [isOpen]);

  const handleClose = () => {
    onClose();
    if (isSent) onSuccess?.();
  };

  const handleReset = async () => {
    setIsResetting(true);
    setFormError('');
    try {
      await resetTeacherPassword(teacher.id);
      setIsSent(true);
    } catch (err) {
      setFormError(err.message);
    } finally {
      setIsResetting(false);
    }
  };

  if (isSent) {
    return (
      <Modal title={isReinvite ? 'Login invite resent' : 'Password reset link sent'} isOpen={isOpen} onClose={handleClose}>
        <div className="text-center py-2">
          <span className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-green-100 text-green-600 mb-4">
            <FiCheckCircle className="w-7 h-7" />
          </span>
          <p className="text-sm text-gray-600 mb-4">
            {isReinvite ? 'A new login invite has been emailed to' : 'A password reset link has been emailed to'}{' '}
            <span className="font-semibold text-gray-900">
              {teacher?.firstName} {teacher?.lastName}
            </span>
            . They'll set their own {isReinvite ? '' : 'new '}password by opening it — it's valid for 7 days.
          </p>
          <button
            type="button"
            onClick={handleClose}
            className="w-full px-4 py-2.5 rounded-lg font-medium text-white bg-gradient-to-r from-violet-700 via-indigo-600 to-blue-600 hover:opacity-90 transition cursor-pointer"
          >
            Done
          </button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal
      title={isReinvite ? 'Resend login invite?' : 'Reset login password?'}
      description={
        teacher
          ? isReinvite
            ? `${teacher.firstName} ${teacher.lastName} hasn't set a password yet — their old invite link may have expired. They'll get a fresh one.`
            : `${teacher.firstName} ${teacher.lastName} will get an email to set a new password.`
          : ''
      }
      isOpen={isOpen}
      onClose={onClose}
    >
      {formError && (
        <p className="text-sm text-red-500 bg-red-50 border border-red-100 rounded-lg px-4 py-3 mb-4">{formError}</p>
      )}
      <div className="flex flex-col-reverse sm:flex-row justify-end gap-3">
        <button
          type="button"
          onClick={onClose}
          disabled={isResetting}
          className="w-full sm:w-auto px-4 py-2.5 rounded-lg font-medium text-gray-900 bg-gray-100 hover:bg-gray-200 transition cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleReset}
          disabled={isResetting}
          className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-medium text-white bg-gradient-to-r from-violet-700 via-indigo-600 to-blue-600 hover:opacity-90 transition cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {isResetting ? 'Sending...' : isReinvite ? 'Resend Invite' : 'Send Reset Link'}
        </button>
      </div>
    </Modal>
  );
}
