'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { FiCalendar, FiChevronDown, FiChevronLeft, FiChevronRight } from 'react-icons/fi';

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const GAP = 8;

function toDateOnly(value) {
  if (!value) return null;
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function toISODate(date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function isSameDay(a, b) {
  return a && b && a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function buildCalendarDays(viewYear, viewMonth) {
  const firstDay = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const cells = Array.from({ length: firstDay }, () => null);
  for (let day = 1; day <= daysInMonth; day++) cells.push(new Date(viewYear, viewMonth, day));
  return cells;
}

export default function DatePicker({
  value,
  onChange,
  placeholder = 'Select date',
  error,
  minYear = 1950,
  maxYear = new Date().getFullYear() + 1,
  // Restrict pickable days to a range (e.g. an exam's own start/end date) —
  // ISO strings, both inclusive. Days outside the range render greyed out
  // and unclickable rather than being hidden, so the calendar's shape stays
  // predictable.
  minDate,
  maxDate,
}) {
  const selectedDate = toDateOnly(value);
  const today = new Date();
  const minBound = toDateOnly(minDate);
  const maxBound = toDateOnly(maxDate);
  const isDisabled = (date) => (minBound && date < minBound) || (maxBound && date > maxBound);

  const [isOpen, setIsOpen] = useState(false);
  const [view, setView] = useState('day');
  const [viewDate, setViewDate] = useState(selectedDate || today);
  const [pendingDate, setPendingDate] = useState(selectedDate);
  const [position, setPosition] = useState(null);
  const buttonRef = useRef(null);
  const panelRef = useRef(null);

  // Renders the panel in a portal at `position: fixed` coordinates computed
  // from the trigger button — same fix DropdownMenu.jsx already uses for the
  // same problem. An `absolute`-positioned panel inside a Modal's
  // `overflow-y-auto` body gets counted in that container's scrollable
  // height, so opening it near the bottom of a modal used to force the whole
  // modal to grow/scroll to "reveal" a panel that was actually rendering
  // detached from its input. Fixed positioning + a portal escapes that
  // ancestor entirely, and flipping upward when there's no room below stops
  // it from ever needing that scroll space in the first place.
  //
  // The open-up/open-down decision uses the panel's *measured* height
  // (`panelRef.current.offsetHeight`), not a guessed constant — day view and
  // year view render at different heights, and guessing wrong here doesn't
  // just misjudge the flip, it also leaves a gap between the trigger and the
  // panel sized for the guess rather than the real content (this was a real
  // bug: an earlier version's flat height guess made a 3-row grid "flip
  // upward" using room meant for a much taller panel, landing on top of
  // unrelated fields above it).
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

  // Re-measures after every render while open (first pass mounts the panel
  // so it has a real height to measure; this then corrects the position to
  // that real height before the browser paints) — also re-runs when
  // switching between day/year view, since those differ in height.
  useLayoutEffect(() => {
    if (!isOpen) return;
    computePosition();
  }, [isOpen, view, computePosition]);

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
    setPendingDate(selectedDate);
    setViewDate(selectedDate || minBound || today);
    setView('day');
    // Provisional "open below" guess for the panel's very first render
    // (before it can be measured) — the useLayoutEffect above corrects this
    // to the real position before the browser paints, so it's never visible.
    const rect = buttonRef.current.getBoundingClientRect();
    setPosition({ top: rect.bottom + GAP, left: rect.left, width: rect.width });
    setIsOpen(true);
  };

  const handleCancel = () => setIsOpen(false);

  const handleOk = () => {
    if (pendingDate) onChange(toISODate(pendingDate));
    setIsOpen(false);
  };

  const goToMonth = (offset) => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + offset, 1));
  };

  const years = Array.from({ length: maxYear - minYear + 1 }, (_, i) => maxYear - i);
  const days = buildCalendarDays(viewDate.getFullYear(), viewDate.getMonth());

  const headerLabel = pendingDate
    ? pendingDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
    : 'Select date';

  const triggerLabel = selectedDate
    ? selectedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : '';

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

            {view === 'day' ? (
              <div className="p-3">
                <div className="flex items-center justify-between mb-2">
                  <button
                    type="button"
                    onClick={() => setView('year')}
                    className="flex items-center gap-1 text-[11px] font-medium text-gray-700 hover:text-gray-900 cursor-pointer"
                  >
                    {viewDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                    <FiChevronDown className="w-3.5 h-3.5" />
                  </button>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => goToMonth(-1)}
                      className="flex items-center justify-center w-6 h-6 rounded-full text-gray-500 hover:bg-gray-100 cursor-pointer"
                    >
                      <FiChevronLeft className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => goToMonth(1)}
                      className="flex items-center justify-center w-6 h-6 rounded-full text-gray-500 hover:bg-gray-100 cursor-pointer"
                    >
                      <FiChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-7 gap-y-0.5 text-center">
                  {WEEKDAYS.map((day, index) => (
                    <span key={`${day}-${index}`} className="text-[10px] font-medium text-gray-400 py-1">
                      {day}
                    </span>
                  ))}
                  {days.map((date, index) => {
                    if (!date) return <span key={`empty-${index}`} />;
                    const isSelected = isSameDay(date, pendingDate);
                    const isToday = isSameDay(date, today);
                    const disabled = isDisabled(date);

                    return (
                      <button
                        key={date.toISOString()}
                        type="button"
                        onClick={() => !disabled && setPendingDate(date)}
                        disabled={disabled}
                        className={`flex items-center justify-center w-6 h-6 mx-auto rounded-full text-[11px] ${
                          disabled
                            ? 'text-gray-300 cursor-not-allowed'
                            : isSelected
                            ? 'bg-gradient-to-br from-violet-700 to-blue-600 text-white font-medium cursor-pointer'
                            : isToday
                            ? 'border border-gray-400 text-gray-900 cursor-pointer'
                            : 'text-gray-700 hover:bg-gray-100 cursor-pointer'
                        }`}
                      >
                        {date.getDate()}
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="h-48 overflow-y-auto p-1.5">
                {years.map((year) => (
                  <button
                    key={year}
                    type="button"
                    onClick={() => {
                      setViewDate(new Date(year, viewDate.getMonth(), 1));
                      setView('day');
                    }}
                    className={`w-full text-center py-1.5 rounded-lg text-[11px] cursor-pointer ${
                      year === viewDate.getFullYear()
                        ? 'text-indigo-700 font-semibold bg-indigo-50'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {year}
                  </button>
                ))}
              </div>
            )}

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
