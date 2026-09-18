'use client';

import { useEffect, useState } from 'react';
import { FiCheckCircle, FiUsers } from 'react-icons/fi';
import Modal from '@/components/Modal';
import Input from '@/components/Input';
import {
  getStudentParentAccount,
  linkOrCreateParentAccount,
  unlinkParentAccount,
  resetParentAccountPassword,
} from '@/lib/api';

// Entering the SAME email for a second sibling links them into one existing
// account instead of creating a new one — see lib/parentAccounts.js's
// linkOrCreateParentAccount — so this dialog doesn't need its own "search
// for an existing parent" step; typing the known email is the search.
export default function SetPortalAccessDialog({ isOpen, onClose, student, onSuccess }) {
  const [account, setAccount] = useState(undefined); // undefined = loading, null = none linked
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [tempPassword, setTempPassword] = useState('');
  const [linkedExisting, setLinkedExisting] = useState(false);
  const [formError, setFormError] = useState('');
  const [showUnlinkConfirm, setShowUnlinkConfirm] = useState(false);

  useEffect(() => {
    if (!isOpen || !student) return;
    setAccount(undefined);
    setEmail('');
    setName('');
    setTempPassword('');
    setLinkedExisting(false);
    setFormError('');
    setShowUnlinkConfirm(false);
    getStudentParentAccount(student.id)
      .then(setAccount)
      .catch((err) => setFormError(err.message));
  }, [isOpen, student]);

  const handleClose = () => {
    onClose();
    if (tempPassword || linkedExisting) onSuccess?.();
  };

  const handleGrant = async () => {
    setFormError('');
    setIsSubmitting(true);
    try {
      const result = await linkOrCreateParentAccount(student.id, { email, name });
      if (result.isNewAccount) {
        setTempPassword(result.tempPassword);
      } else {
        setLinkedExisting(true);
      }
      setAccount(result.account);
    } catch (err) {
      setFormError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetPassword = async () => {
    setFormError('');
    setIsSubmitting(true);
    try {
      const result = await resetParentAccountPassword(student.id);
      setTempPassword(result.tempPassword);
    } catch (err) {
      setFormError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUnlink = async () => {
    setIsSubmitting(true);
    try {
      await unlinkParentAccount(student.id);
      setAccount(null);
      setShowUnlinkConfirm(false);
      onSuccess?.();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const siblings = (account?.students || []).filter((s) => s.id !== student?.id);

  if (tempPassword) {
    return (
      <Modal title="Parent portal access issued" isOpen={isOpen} onClose={handleClose}>
        <div className="text-center py-2">
          <span className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-green-100 text-green-600 mb-4">
            <FiCheckCircle className="w-7 h-7" />
          </span>
          <p className="text-sm text-gray-600 mb-4">
            Share these with {student?.firstName}'s parent — the password won't be shown again.
          </p>
          <div className="bg-indigo-50 rounded-lg px-4 py-3 text-left space-y-1">
            <p className="text-xs text-gray-500">Portal Email</p>
            <p className="font-mono text-sm font-semibold text-gray-900">{account?.email}</p>
            <p className="text-xs text-gray-500 mt-2">Temporary Password</p>
            <p className="font-mono text-lg font-bold text-indigo-700">{tempPassword}</p>
          </div>
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

  if (linkedExisting) {
    return (
      <Modal title="Linked to existing parent account" isOpen={isOpen} onClose={handleClose}>
        <div className="text-center py-2">
          <span className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-green-100 text-green-600 mb-4">
            <FiCheckCircle className="w-7 h-7" />
          </span>
          <p className="text-sm text-gray-600 mb-4">
            {student?.firstName} is now linked to <span className="font-semibold text-gray-900">{account?.email}</span> — that
            parent's existing login already has access, nothing new to share.
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
      title="Parent Portal Access"
      description={student ? `${student.firstName} ${student.lastName}` : ''}
      isOpen={isOpen}
      onClose={onClose}
    >
      {formError && (
        <p className="text-sm text-red-500 bg-red-50 border border-red-100 rounded-lg px-4 py-3 mb-4">{formError}</p>
      )}

      {account === undefined && <p className="text-sm text-gray-400 text-center py-6">Loading...</p>}

      {account === null && (
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Set up parent login access. If this parent already has an account (e.g. from a sibling), enter the same email
            to link this student to it instead of creating a new one.
          </p>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Parent Email <span className="text-red-500">*</span>
            </label>
            <Input type="email" placeholder="parent@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Parent Name (optional)</label>
            <Input placeholder="e.g. Rakesh Verma" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="w-full sm:w-auto px-4 py-2.5 rounded-lg font-medium text-gray-900 bg-gray-100 hover:bg-gray-200 transition cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleGrant}
              disabled={isSubmitting || !email.trim()}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-medium text-white bg-gradient-to-r from-violet-700 via-indigo-600 to-blue-600 hover:opacity-90 transition cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Setting up...' : 'Grant Portal Access'}
            </button>
          </div>
        </div>
      )}

      {account && (
        <div className="space-y-4">
          <div className="bg-indigo-50 rounded-lg px-4 py-3">
            <p className="text-xs text-gray-500">Linked Parent Account</p>
            <p className="font-mono text-sm font-semibold text-gray-900">{account.email}</p>
          </div>

          {siblings.length > 0 && (
            <div>
              <p className="text-xs font-medium text-gray-500 flex items-center gap-1.5 mb-2">
                <FiUsers className="w-3.5 h-3.5" />
                Also linked to this account
              </p>
              <div className="space-y-1">
                {siblings.map((s) => (
                  <p key={s.id} className="text-sm text-gray-700">
                    {s.firstName} {s.lastName}
                    {s.class ? ` — ${s.class}${s.section ? ` - ${s.section}` : ''}` : ''}
                  </p>
                ))}
              </div>
            </div>
          )}

          {showUnlinkConfirm ? (
            <div className="bg-red-50 border border-red-100 rounded-lg px-4 py-3 space-y-3">
              <p className="text-sm text-red-600">
                Unlink {student?.firstName} from this parent account? The account itself (and any other linked siblings)
                stays intact — only this student's access is removed.
              </p>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowUnlinkConfirm(false)}
                  className="px-3 py-1.5 text-sm font-medium text-gray-700 hover:text-gray-900 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleUnlink}
                  disabled={isSubmitting}
                  className="px-3 py-1.5 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg cursor-pointer disabled:opacity-60"
                >
                  {isSubmitting ? 'Removing...' : 'Unlink'}
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowUnlinkConfirm(true)}
                disabled={isSubmitting}
                className="w-full sm:w-auto px-4 py-2.5 rounded-lg font-medium text-gray-900 bg-gray-100 hover:bg-gray-200 transition cursor-pointer disabled:opacity-60"
              >
                Unlink
              </button>
              <button
                type="button"
                onClick={handleResetPassword}
                disabled={isSubmitting}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-medium text-white bg-gradient-to-r from-violet-700 via-indigo-600 to-blue-600 hover:opacity-90 transition cursor-pointer disabled:opacity-60"
              >
                {isSubmitting ? 'Resetting...' : 'Reset Password'}
              </button>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
