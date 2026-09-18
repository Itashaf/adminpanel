'use client';

import { useEffect } from 'react';
import { FiX } from 'react-icons/fi';

const SIZES = {
  md: 'max-w-md',
  lg: 'max-w-[640px]',
  xl: 'max-w-4xl',
};

// `footer` is optional — when a caller passes one (see NoticeFormModal.jsx),
// it renders pinned to the bottom of the modal, outside the scrollable body,
// so its actions (Cancel/Submit) never scroll out of view on a tall form.
// Callers that don't pass it keep the old behavior: everything (header +
// content) lives in one scrollable area, just as before this was added.
export default function Modal({ title, description, icon, isOpen, onClose, children, footer, size = 'md' }) {
  useEffect(() => {
    if (!isOpen) return;
    function handleKeyDown(e) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div
        onClick={(e) => e.stopPropagation()}
        className={`relative bg-white rounded-[24px] shadow-xl w-full ${SIZES[size]} max-h-[85vh] sm:max-h-[85vh] flex flex-col overflow-hidden`}
      >
        <div className="flex items-start justify-between gap-3 px-6 pt-6 pb-5 shrink-0">
          <div className="flex items-start gap-3 text-left min-w-0">
            {icon && (
              <span className="flex items-center justify-center w-11 h-11 rounded-xl bg-indigo-100 text-indigo-700 shrink-0">
                {icon}
              </span>
            )}
            <div className="min-w-0">
              <h2 className="text-lg font-semibold text-indigo-700 text-left">{title}</h2>
              {description && <p className="text-sm text-gray-500 mt-1 text-left">{description}</p>}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 cursor-pointer shrink-0"
          >
            <FiX className="w-5 h-5" />
          </button>
        </div>

        <div className={`px-6 ${footer ? '' : 'pb-6'} overflow-y-auto`}>{children}</div>

        {footer && (
          <div className="shrink-0 px-6 py-4 border-t border-gray-100 bg-white shadow-[0_-4px_12px_rgba(0,0,0,0.03)]">{footer}</div>
        )}
      </div>
    </div>
  );
}
