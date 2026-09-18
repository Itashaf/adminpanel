'use client';

import { useEffect } from 'react';
import { FiX } from 'react-icons/fi';

// A right-side drawer on desktop, a bottom sheet on mobile — one component,
// responsive CSS switches the anchor edge (see EventDrawer.jsx, the Academic
// Calendar's Add/Edit Event experience) rather than two separate
// implementations of the same header/body/footer shell. Modeled off
// Modal.jsx's structure (backdrop, Escape-to-close, optional sticky footer).
export default function SlideOver({ title, description, icon, isOpen, onClose, children, footer }) {
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
    <div className="fixed inset-0 z-50 flex items-end sm:items-stretch sm:justify-end">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative bg-white w-full sm:w-[560px] sm:max-w-[92vw] max-h-[88vh] sm:max-h-none sm:h-full flex flex-col overflow-hidden rounded-t-[20px] sm:rounded-t-none sm:rounded-l-[20px] shadow-xl transition-transform"
      >
        <div className="flex items-start justify-between gap-3 px-6 pt-6 pb-5 shrink-0 border-b border-gray-100">
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

        <div className={`px-6 pt-5 ${footer ? '' : 'pb-6'} overflow-y-auto flex-1`}>{children}</div>

        {footer && (
          <div className="shrink-0 px-6 py-4 border-t border-gray-100 bg-white shadow-[0_-4px_12px_rgba(0,0,0,0.03)]">{footer}</div>
        )}
      </div>
    </div>
  );
}
