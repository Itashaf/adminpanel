'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

const GAP = 6;

// Same portal + measured-position + click-outside pattern as
// Dropdown.jsx/TimePicker.jsx, stripped down to a plain content slot — used
// by TimeTableClient.jsx's tap-to-assign/tap-to-configure chip panels so
// they never get clipped by the grid's scroll container. Also mirrors
// TimePicker's "open upward when there's no room below" check and clamps
// its own height to whatever space is actually available (with its own
// overflow-y-auto as a last-resort scroll) — a period near the bottom of
// the viewport would otherwise render a tall panel (search + filters + a
// long subject list + footer) partly off-screen, past where the inner
// list's own scroll region could ever reach.
export default function TapPopover({ anchorRef, isOpen, onClose, children, width = 280 }) {
  const panelRef = useRef(null);
  const [position, setPosition] = useState(null);

  const computePosition = useCallback(() => {
    if (!anchorRef.current) return;
    const rect = anchorRef.current.getBoundingClientRect();
    const panelWidth = panelRef.current?.offsetWidth ?? 240;
    const panelHeight = panelRef.current?.offsetHeight ?? 0;
    const left = Math.min(rect.left, window.innerWidth - panelWidth - GAP);

    const spaceBelow = window.innerHeight - rect.bottom - GAP;
    const spaceAbove = rect.top - GAP;
    const openUpward = panelHeight > spaceBelow && spaceAbove > spaceBelow;

    setPosition({
      top: openUpward ? rect.top - Math.min(panelHeight, spaceAbove) - GAP : rect.bottom + GAP,
      left: Math.max(GAP, left),
      maxHeight: Math.max(120, openUpward ? spaceAbove : spaceBelow),
    });
  }, [anchorRef]);

  useLayoutEffect(() => {
    if (!isOpen) return;
    computePosition();
    // A second pass once the panel has actually rendered its real content
    // (first pass uses panelRef's height from the previous render, which is
    // 0 the very first time a given popover kind opens).
    const raf = requestAnimationFrame(computePosition);
    return () => cancelAnimationFrame(raf);
  }, [isOpen, computePosition]);

  useEffect(() => {
    if (!isOpen) return;
    function handleClickOutside(event) {
      if (
        anchorRef.current &&
        !anchorRef.current.contains(event.target) &&
        panelRef.current &&
        !panelRef.current.contains(event.target)
      ) {
        onClose();
      }
    }
    window.addEventListener('scroll', computePosition, true);
    window.addEventListener('resize', computePosition);
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      window.removeEventListener('scroll', computePosition, true);
      window.removeEventListener('resize', computePosition);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, computePosition, anchorRef, onClose]);

  if (!isOpen || !position) return null;

  return createPortal(
    <div
      ref={panelRef}
      style={{ position: 'fixed', top: position.top, left: position.left, maxWidth: width, maxHeight: position.maxHeight }}
      className="z-50 bg-white rounded-xl shadow-xl border border-gray-100 p-3 overflow-y-auto"
    >
      {children}
    </div>,
    document.body
  );
}
