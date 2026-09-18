'use client';

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { FiChevronDown, FiChevronUp, FiPlus, FiSearch } from 'react-icons/fi';

const GAP = 8;

// `creatable` (only meaningful alongside `searchable`) lets typing a value
// with no matching option submit that typed text itself as the value — for
// a field like Exam Type where schools use their own short codes (SA1, FA1,
// ...) rather than picking from one fixed list. The preset `options` still
// show first as suggestions; typing something new just adds it instead of
// dead-ending on "No results found."
export default function Dropdown({
  options,
  value,
  onChange,
  placeholder = 'Select',
  icon,
  error,
  disabled,
  searchable = false,
  creatable = false,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [position, setPosition] = useState(null);
  const buttonRef = useRef(null);
  const panelRef = useRef(null);

  const selectedOption = options.find((option) => option.value === value);
  // A creatable dropdown's current value may be custom text no preset option
  // matches (e.g. a school's own "SA1") — fall back to showing it as-is
  // rather than the placeholder.
  const triggerLabel = selectedOption ? selectedOption.label : creatable && value ? value : null;

  const filteredOptions = useMemo(() => {
    if (!searchable || !query.trim()) return options;
    const normalizedQuery = query.trim().toLowerCase();
    return options.filter((option) => option.label.toLowerCase().includes(normalizedQuery));
  }, [options, query, searchable]);

  const trimmedQuery = query.trim();
  const canCreate =
    creatable && trimmedQuery && !options.some((option) => option.label.toLowerCase() === trimmedQuery.toLowerCase());

  const handleCreate = () => {
    onChange(trimmedQuery);
    setIsOpen(false);
    setQuery('');
  };

  // Two-pass positioning: a panel with 2 options and one with 20 render at
  // very different heights, so a single guessed height (an earlier version
  // of this fix used a flat 320px estimate) makes the wrong open-up/open-down
  // call for anything shorter than that guess — a 3-item list would "flip
  // upward" into empty space meant for a much taller panel, landing on top
  // of unrelated fields above it. Instead: render the panel first (creating
  // it off-screen-invisible costs nothing, `useLayoutEffect` runs before the
  // browser paints), measure its *actual* rendered height via `panelRef`,
  // then compute the real position from that — the same portal-to-body +
  // fixed-position fix as DatePicker.jsx/DropdownMenu.jsx, just with a
  // measured height instead of a guessed one.
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
        setQuery('');
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Runs after every render while open — first with the panel just mounted
  // (0 or stale height), correcting to the true measured height a moment
  // later, and again whenever the option list's length changes (typing into
  // the search box grows/shrinks the panel, which can change whether it
  // still fits below the trigger).
  useLayoutEffect(() => {
    if (!isOpen) return;
    computePosition();
  }, [isOpen, computePosition, filteredOptions.length]);

  useEffect(() => {
    if (!isOpen) return;
    window.addEventListener('scroll', computePosition, true);
    window.addEventListener('resize', computePosition);
    return () => {
      window.removeEventListener('scroll', computePosition, true);
      window.removeEventListener('resize', computePosition);
    };
  }, [isOpen, computePosition]);

  const handleSelect = (option) => {
    onChange(option.value);
    setIsOpen(false);
    setQuery('');
  };

  const handleToggle = () => {
    if (disabled) return;
    if (!isOpen) {
      // A provisional "open below" guess so the panel has *some* position
      // for its very first render (before it can be measured) — the
      // useLayoutEffect above corrects this to the real position, before
      // the browser paints, so this guess is never actually visible.
      const rect = buttonRef.current.getBoundingClientRect();
      setPosition({ top: rect.bottom + GAP, left: rect.left, width: rect.width });
    }
    setIsOpen((prev) => !prev);
  };

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        disabled={disabled}
        onClick={handleToggle}
        className={`w-full flex items-center gap-2 py-2.5 px-4 rounded-full border bg-white text-left cursor-pointer transition disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed ${
          error
            ? 'border-red-400'
            : isOpen
            ? 'border-gray-900'
            : 'border-gray-200 hover:border-gray-300'
        }`}
      >
        {icon && <span className="text-gray-400 shrink-0">{icon}</span>}
        <span className={`flex-1 truncate text-sm ${triggerLabel ? 'text-gray-900' : 'text-gray-400'}`}>
          {triggerLabel || placeholder}
        </span>
        {isOpen ? (
          <FiChevronUp className="w-4 h-4 text-gray-400 shrink-0" />
        ) : (
          <FiChevronDown className="w-4 h-4 text-gray-400 shrink-0" />
        )}
      </button>
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}

      {isOpen &&
        position &&
        createPortal(
          <div
            ref={panelRef}
            style={{ position: 'fixed', top: position.top, left: position.left, width: position.width }}
            className="z-50 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden"
          >
            {searchable && (
              <div className="relative p-2 border-b border-gray-100">
                <FiSearch className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 w-3.5 h-3.5" />
                <input
                  type="text"
                  autoFocus
                  autoComplete="off"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search..."
                  className="w-full pl-8 pr-3 py-1.5 text-sm rounded-full border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            )}

            <div className="max-h-64 overflow-y-auto py-2">
              {canCreate && (
                <button
                  type="button"
                  onClick={handleCreate}
                  className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-left text-indigo-700 font-medium hover:bg-indigo-50 cursor-pointer transition"
                >
                  <FiPlus className="w-3.5 h-3.5 shrink-0" />
                  Use "{trimmedQuery}"
                </button>
              )}
              {filteredOptions.length === 0 && !canCreate && (
                <p className="px-4 py-3 text-sm text-gray-400">No results found.</p>
              )}
              {filteredOptions.map((option) => {
                const isSelected = option.value === value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => handleSelect(option)}
                    className={`w-full flex items-center justify-between gap-2 px-4 py-2.5 text-sm text-left cursor-pointer transition ${
                      isSelected ? 'bg-indigo-50 text-indigo-700 font-medium' : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <span className="flex items-center gap-2 truncate">
                      {option.icon && <span className="text-gray-400 shrink-0">{option.icon}</span>}
                      {option.label}
                    </span>
                    {option.tag && <span className="text-xs text-gray-400 shrink-0">{option.tag}</span>}
                  </button>
                );
              })}
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
