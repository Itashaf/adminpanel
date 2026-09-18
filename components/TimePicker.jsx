'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { FiClock } from 'react-icons/fi';

const GAP = 8;
const HOURS = Array.from({ length: 12 }, (_, i) => i + 1);
const MINUTES = Array.from({ length: 12 }, (_, i) => i * 5);

function pad(n) {
  return String(n).padStart(2, '0');
}

// "HH:mm" (24h, what the native <input type="time"> and this app's schema
// already store) <-> {hour12, minute, period} for the picker's own state.
function parse24(value) {
  if (!value) return null;
  const [h, m] = value.split(':').map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  const period = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return { hour12, minute: m, period };
}

function to24(hour12, minute, period) {
  let h = hour12 % 12;
  if (period === 'PM') h += 12;
  return `${pad(h)}:${pad(minute)}`;
}

function formatDisplay(value) {
  const parsed = parse24(value);
  if (!parsed) return '';
  return `${parsed.hour12}:${pad(parsed.minute)} ${parsed.period}`;
}

// Same portal + measured-position + Cancel/OK pattern as DatePicker.jsx —
// replaces the browser's native time input (Chrome/Edge render that as an
// unthemed spinner, see the redesign request) with one that matches the
// app's rounded/indigo styling.
export default function TimePicker({ value, onChange, placeholder = 'Select time', error }) {
  const [isOpen, setIsOpen] = useState(false);
  const [pending, setPending] = useState(() => parse24(value) || { hour12: 9, minute: 0, period: 'AM' });
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
    setPending(parse24(value) || { hour12: 9, minute: 0, period: 'AM' });
    const rect = buttonRef.current.getBoundingClientRect();
    setPosition({ top: rect.bottom + GAP, left: rect.left, width: rect.width });
    setIsOpen(true);
  };

  const handleOk = () => {
    onChange(to24(pending.hour12, pending.minute, pending.period));
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => (isOpen ? setIsOpen(false) : openPicker())}
        className={`w-full flex items-center justify-between gap-2 py-2.5 pl-4 pr-3 border rounded-full bg-white text-left cursor-pointer focus:outline-none focus:ring-2 ${
          error ? 'border-red-400 focus:ring-red-400' : 'border-gray-200 focus:ring-indigo-500'
        }`}
      >
        <span className={value ? 'text-gray-900' : 'text-gray-400'}>{formatDisplay(value) || placeholder}</span>
        <FiClock className="w-4 h-4 text-gray-400 shrink-0" />
      </button>
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}

      {isOpen &&
        position &&
        createPortal(
          <div
            ref={panelRef}
            style={{ position: 'fixed', top: position.top, left: position.left, width: Math.max(position.width, 220) }}
            className="z-50 bg-white rounded-lg shadow-xl border border-gray-100 overflow-hidden"
          >
            <div className="bg-gradient-to-r from-violet-700 via-indigo-600 to-blue-600 text-white px-3 py-2.5">
              <p className="text-[13px] font-medium">
                {pending.hour12}:{pad(pending.minute)} {pending.period}
              </p>
            </div>

            <div className="flex divide-x divide-gray-100">
              <div className="flex-1 h-44 overflow-y-auto py-1">
                {HOURS.map((h) => (
                  <button
                    key={h}
                    type="button"
                    onClick={() => setPending((prev) => ({ ...prev, hour12: h }))}
                    className={`w-full text-center py-1.5 text-[12px] cursor-pointer ${
                      pending.hour12 === h ? 'text-indigo-700 font-semibold bg-indigo-50' : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {pad(h)}
                  </button>
                ))}
              </div>
              <div className="flex-1 h-44 overflow-y-auto py-1">
                {MINUTES.map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setPending((prev) => ({ ...prev, minute: m }))}
                    className={`w-full text-center py-1.5 text-[12px] cursor-pointer ${
                      pending.minute === m ? 'text-indigo-700 font-semibold bg-indigo-50' : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {pad(m)}
                  </button>
                ))}
              </div>
              <div className="w-16 h-44 overflow-y-auto py-1">
                {['AM', 'PM'].map((period) => (
                  <button
                    key={period}
                    type="button"
                    onClick={() => setPending((prev) => ({ ...prev, period }))}
                    className={`w-full text-center py-1.5 text-[12px] font-medium cursor-pointer ${
                      pending.period === period ? 'text-white bg-gradient-to-br from-violet-700 to-blue-600' : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {period}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-end gap-1 px-2 py-2 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
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
