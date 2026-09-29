'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { FiCalendar, FiChevronLeft, FiChevronRight } from 'react-icons/fi';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const GAP = 8;

function parseValue(value) {
  if (!value) return null;
  const [year, month] = value.split('-').map(Number);
  return { year, month: month - 1 };
}

// Same themed-calendar convention as DatePicker.jsx (portal positioning,
// gradient header, Cancel/OK footer) — this is the month-only variant for
// fields that only ever need "YYYY-MM" (e.g. the Bulk Import popup), so a
// day grid there isn't just unnecessary, it's the wrong picker for the job.
export default function MonthPicker({ value, onChange, placeholder = 'Select month', error }) {
  const selected = parseValue(value);
  const today = new Date();

  const [isOpen, setIsOpen] = useState(false);
  const [viewYear, setViewYear] = useState(selected?.year ?? today.getFullYear());
  const [pending, setPending] = useState(selected);
  const [position, setPosition] = useState(null);
  const buttonRef = useRef(null);
  const panelRef = useRef(null);

  const computePosition = useCallback(() => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    const panelHeight = panelRef.current?.offsetHeight ?? 0;
    const spaceBelow = window.innerHeight - rect.bottom;
    const openUpward = panelHeight > 0 && spaceBelow < panelHeight + GAP && rect.top > panelHeight + GAP;

    setPosition({
      top: openUpward ? rect.top - panelHeight - GAP : rect.bottom + GAP,
      left: rect.left,
      width: rect.width,
    });
  }, []);

  useEffect(() => {
    function handleClickOutside(event) {
      if (
        buttonRef.current &&
        !buttonRef.current.contains(event.target) &&
        panelRef.current &&
        !panelRef.current.contains(event.target)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useLayoutEffect(() => {
    if (!isOpen) return;
    computePosition();
  }, [isOpen, computePosition]);

  useEffect(() => {
    if (!isOpen) return;
    window.addEventListener('scroll', computePosition, true);
    window.addEventListener('resize', computePosition);
    return () => {
      window.removeEventListener('scroll', computePosition, true);
      window.removeEventListener('resize', computePosition);
    };
  }, [isOpen, computePosition]);

  const openPicker = () => {
    setPending(selected);
    setViewYear(selected?.year ?? today.getFullYear());
    const rect = buttonRef.current.getBoundingClientRect();
    setPosition({ top: rect.bottom + GAP, left: rect.left, width: rect.width });
    setIsOpen(true);
  };

  const handleCancel = () => setIsOpen(false);
  const handleOk = () => {
    if (pending) onChange(`${pending.year}-${String(pending.month + 1).padStart(2, '0')}`);
    setIsOpen(false);
  };

  const triggerLabel = selected
    ? new Date(selected.year, selected.month, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : '';
  const headerLabel = pending
    ? new Date(pending.year, pending.month, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : 'Select month';

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={openPicker}
        className={`w-full flex items-center justify-between gap-2 py-2.5 pl-4 pr-3 border rounded-full bg-white text-left cursor-pointer focus:outline-none focus:ring-2 ${
          error ? 'border-red-400 focus:ring-red-400' : 'border-gray-200 focus:ring-indigo-500'
        }`}
      >
        <span className={triggerLabel ? 'text-gray-900' : 'text-gray-400'}>{triggerLabel || placeholder}</span>
        <FiCalendar className="w-4 h-4 text-gray-400 shrink-0" />
      </button>
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}

      {isOpen &&
        position &&
        createPortal(
          <div
            ref={panelRef}
            style={{ position: 'fixed', top: position.top, left: position.left, width: position.width }}
            className="z-50 bg-white rounded-lg shadow-xl border border-gray-100 overflow-hidden"
          >
            <div className="bg-gradient-to-r from-violet-700 via-indigo-600 to-blue-600 text-white px-3 py-2.5">
              <p className="text-[13px] font-medium">{headerLabel}</p>
            </div>

            <div className="p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-medium text-gray-700">{viewYear}</span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setViewYear((y) => y - 1)}
                    className="flex items-center justify-center w-6 h-6 rounded-full text-gray-500 hover:bg-gray-100 cursor-pointer"
                  >
                    <FiChevronLeft className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewYear((y) => y + 1)}
                    className="flex items-center justify-center w-6 h-6 rounded-full text-gray-500 hover:bg-gray-100 cursor-pointer"
                  >
                    <FiChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-1.5">
                {MONTHS.map((label, index) => {
                  const isSelected = pending && pending.year === viewYear && pending.month === index;
                  const isCurrent = today.getFullYear() === viewYear && today.getMonth() === index;
                  return (
                    <button
                      key={label}
                      type="button"
                      onClick={() => setPending({ year: viewYear, month: index })}
                      className={`py-2 rounded-lg text-[11px] cursor-pointer ${
                        isSelected
                          ? 'bg-gradient-to-br from-violet-700 to-blue-600 text-white font-medium'
                          : isCurrent
                          ? 'border border-gray-400 text-gray-900'
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center justify-end gap-1 px-2 pb-2">
              <button
                type="button"
                onClick={handleCancel}
                className="px-2.5 py-1.5 text-[11px] font-semibold text-indigo-700 hover:bg-indigo-50 rounded-lg cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleOk}
                className="px-2.5 py-1.5 text-[11px] font-semibold text-indigo-700 hover:bg-indigo-50 rounded-lg cursor-pointer"
              >
                OK
              </button>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
