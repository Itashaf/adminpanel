'use client';

import { useEffect, useState } from 'react';
import { FiCheckCircle } from 'react-icons/fi';
import Modal from '@/components/Modal';
import { resetAdminPassword } from '@/lib/api';

export default function ResetPasswordDialog({ isOpen, onClose, admin, onSuccess }) {
  const [isResetting, setIsResetting] = useState(false);
  const [tempPassword, setTempPassword] = useState('');
  const [formError, setFormError] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setTempPassword('');
    setFormError('');
  }, [isOpen]);

  const handleClose = () => {
    onClose();
    if (tempPassword) onSuccess?.();
  };

  const handleReset = async () => {
    setIsResetting(true);
    setFormError('');
    try {
      const result = await resetAdminPassword(admin.id);
      setTempPassword(result.tempPassword);
    } catch (err) {
      setFormError(err.message);
    } finally {
      setIsResetting(false);
    }
  };

  if (tempPassword) {
    return (
      <Modal title="Password reset" isOpen={isOpen} onClose={handleClose}>
        <div className="text-center py-2">
          <span className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-green-100 text-green-600 mb-4">
            <FiCheckCircle className="w-7 h-7" />
          </span>
          <p className="text-sm text-gray-600 mb-4">
            A new temporary password has been set for <span className="font-semibold text-gray-900">{admin?.name}</span>. Share it
            with them securely — it won't be shown again.
          </p>
          <p className="font-mono text-lg font-bold text-indigo-700 bg-indigo-50 rounded-lg px-4 py-3">{tempPassword}</p>
          <button
            type="button"
            onClick={handleClose}
            className="w-full mt-5 px-4 py-2.5 rounded-lg font-medium text-white bg-gradient-to-r from-violet-700 via-indigo-600 to-blue-600 hover:opacity-90 transition cursor-pointer"
          >
            Done
          </button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal
      title="Reset admin password?"
      description={admin ? `${admin.name} will need to sign in with a new temporary password.` : ''}
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
          {isResetting ? 'Resetting...' : 'Reset Password'}
        </button>
      </div>
    </Modal>
  );
}
