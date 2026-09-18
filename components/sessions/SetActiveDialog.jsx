'use client';

import { useState } from 'react';
import Modal from '@/components/Modal';
import { setActiveAcademicSession } from '@/lib/api';

export default function SetActiveDialog({ isOpen, onClose, session, currentActiveSession, onSuccess }) {
  const [isLoading, setIsLoading] = useState(false);

  if (!session) return null;

  const replacesAnotherSession = currentActiveSession && currentActiveSession.id !== session.id;

  const handleConfirm = async () => {
    setIsLoading(true);
    try {
      await setActiveAcademicSession(session.id);
      onSuccess?.(`${session.name} is now the active session.`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      title="Set Active Session?"
      description="Setting this session as active will make it the default academic session throughout the school system."
      isOpen={isOpen}
      onClose={onClose}
    >
      {replacesAnotherSession && (
        <div className="flex items-center justify-center gap-3 bg-gray-50 rounded-xl px-4 py-4 mb-4 text-sm font-semibold">
          <span className="text-gray-400">{currentActiveSession.name}</span>
          <span className="text-gray-300">→</span>
          <span className="text-indigo-700">{session.name}</span>
        </div>
      )}
      <p className="text-sm text-gray-500 mb-5 text-center">
        {replacesAnotherSession
          ? `${currentActiveSession.name} will no longer be the active session.`
          : `${session.name} will become the active session.`}
      </p>

      <div className="flex flex-col-reverse sm:flex-row justify-end gap-3">
        <button
          type="button"
          onClick={onClose}
          disabled={isLoading}
          className="w-full sm:w-auto px-4 py-2.5 rounded-lg font-medium text-gray-900 bg-gray-100 hover:bg-gray-200 transition cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleConfirm}
          disabled={isLoading}
          className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-medium text-white bg-gradient-to-r from-violet-700 via-indigo-600 to-blue-600 hover:opacity-90 transition cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Please wait...' : 'Set as Active'}
        </button>
      </div>
    </Modal>
  );
}
