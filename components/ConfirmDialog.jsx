'use client';

import Modal from './Modal';

export default function ConfirmDialog({ isOpen, onClose, onConfirm, title, description, confirmLabel = 'Confirm', isLoading = false }) {
  return (
    <Modal title={title} description={description} isOpen={isOpen} onClose={onClose}>
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
          onClick={onConfirm}
          disabled={isLoading}
          className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-medium text-white bg-red-600 hover:bg-red-700 transition cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Please wait...' : confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
