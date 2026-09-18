'use client';

import { useEffect } from 'react';
import { FiCheckCircle, FiX } from 'react-icons/fi';

export default function Toast({ message, onClose, duration = 4000 }) {
  useEffect(() => {
    const timer = setTimeout(onClose, duration);
    return () => clearTimeout(timer);
  }, [onClose, duration]);

  return (
    <div className="fixed top-4 right-4 z-50 flex items-center gap-3 bg-white border border-gray-100 shadow-lg rounded-xl px-4 py-3 max-w-sm">
      <FiCheckCircle className="w-5 h-5 text-green-600 shrink-0" />
      <p className="text-sm text-gray-700 flex-1">{message}</p>
      <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600 cursor-pointer">
        <FiX className="w-4 h-4" />
      </button>
    </div>
  );
}
