'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';

const MENU_WIDTH = 208;
const ITEM_HEIGHT = 40;
const GAP = 4;

export default function DropdownMenu({ trigger, items, align = 'right' }) {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState(null);
  const buttonRef = useRef(null);
  const menuRef = useRef(null);

  const computePosition = useCallback(() => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    const menuHeight = items.length * ITEM_HEIGHT + 8;
    const spaceBelow = window.innerHeight - rect.bottom;
    const openUpward = spaceBelow < menuHeight + GAP && rect.top > menuHeight + GAP;

    setPosition({
      top: openUpward ? rect.top - menuHeight - GAP : rect.bottom + GAP,
      left: align === 'right' ? rect.right - MENU_WIDTH : rect.left,
    });
  }, [align, items.length]);

  const handleToggle = () => {
    if (isOpen) {
      setIsOpen(false);
      return;
    }
    computePosition();
    setIsOpen(true);
  };

  useEffect(() => {
    if (!isOpen) return;

    function handleClickOutside(event) {
      if (
        buttonRef.current &&
        !buttonRef.current.contains(event.target) &&
        menuRef.current &&
        !menuRef.current.contains(event.target)
      ) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('scroll', computePosition, true);
    window.addEventListener('resize', computePosition);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('scroll', computePosition, true);
      window.removeEventListener('resize', computePosition);
    };
  }, [isOpen, computePosition]);

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={handleToggle}
        className="inline-flex items-center justify-center text-gray-400 hover:text-gray-600 cursor-pointer"
      >
        {trigger}
      </button>

      {isOpen &&
        position &&
        createPortal(
          <div
            ref={menuRef}
            style={{ position: 'fixed', top: position.top, left: position.left, width: MENU_WIDTH }}
            className="z-50 bg-white rounded-lg border border-gray-100 shadow-lg py-1"
          >
            {items.map((item) => (
              <button
                key={item.label}
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  item.onClick?.();
                }}
                className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-left cursor-pointer hover:bg-gray-50 ${
                  item.danger ? 'text-red-600' : 'text-gray-700'
                }`}
              >
                {item.icon}
                {item.label}
              </button>
            ))}
          </div>,
          document.body
        )}
    </>
  );
}
