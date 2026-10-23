'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { FiX } from 'react-icons/fi';

// Draft keeping. A popup closed by clicking outside it, pressing Esc or the X (not by
// saving, and not by its own Cancel button) remembers what was typed into its fields
// for 5 minutes, and puts it back the next time the same popup opens for the same
// record. Passwords and file inputs are never kept.
//
// Works on the form fields found inside the popup (text, number, date, textarea,
// plain selects, checkboxes). Fields drawn by a custom component instead of a real
// input (the custom dropdowns) are not captured and open as usual.
const DRAFT_TTL_MS = 5 * 60 * 1000;
const drafts = globalThis.__MODAL_DRAFTS__ ?? (globalThis.__MODAL_DRAFTS__ = new Map());
const SKIPPED_TYPES = ['password', 'file', 'hidden', 'submit', 'button', 'reset', 'image'];

function collectFields(root) {
  return [...root.querySelectorAll('input, textarea, select')]
    .filter((el) => !SKIPPED_TYPES.includes(el.type))
    .map((el) => ({
      name: el.name || el.id || '',
      type: el.type,
      value: el.type === 'checkbox' || el.type === 'radio' ? '' : el.value,
      checked: Boolean(el.checked),
    }));
}

// What the popup looked like when it opened: the same record always gives the same key.
function draftKey(title, pathname, fields) {
  const label = typeof title === 'string' ? title : 'modal';
  return `${label}|${pathname}|${JSON.stringify(fields)}`;
}

function setNativeValue(el, value) {
  const proto = el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : el.tagName === 'SELECT' ? HTMLSelectElement.prototype : HTMLInputElement.prototype;
  Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, value);
  el.dispatchEvent(new Event('input', { bubbles: true }));
  el.dispatchEvent(new Event('change', { bubbles: true }));
}

function restoreFields(root, saved) {
  const elements = [...root.querySelectorAll('input, textarea, select')].filter((el) => !SKIPPED_TYPES.includes(el.type));
  if (elements.length !== saved.length) return false;
  elements.forEach((el, i) => {
    const d = saved[i];
    if (el.type === 'checkbox' || el.type === 'radio') {
      if (el.checked !== d.checked) el.click();
    } else if (el.value !== d.value) {
      setNativeValue(el, d.value);
    }
  });
  return true;
}

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
// `headerExtra` is optional too (see SupportModal.jsx's "+ New Ticket"
// button) — an extra node in the header row, between the title block and
// the close button, for a primary action that belongs in the header rather
// than the scrollable body. `title`/`description` can be any node, not just
// text — SupportModal.jsx passes a whole icon+title+subtitle block as
// `title` and omits `icon`, so nothing doubles up.
export default function Modal({ title, description, icon, isOpen, onClose, children, footer, headerExtra, size = 'md' }) {
  const pathname = usePathname();
  const bodyRef = useRef(null);
  const initialRef = useRef({ key: null, fields: null });
  const dismissedRef = useRef(false);
  const [restored, setRestored] = useState(false);

  // Closed by the user walking away (outside click, Esc, X): remember the typed fields.
  // Closed any other way (saved, or the form's own Cancel): nothing is kept.
  const dismiss = () => {
    const root = bodyRef.current;
    const { key, fields } = initialRef.current;
    if (root && key) {
      const now = collectFields(root);
      if (JSON.stringify(now) !== JSON.stringify(fields)) {
        for (const [k, v] of drafts) if (Date.now() - v.at > DRAFT_TTL_MS) drafts.delete(k);
        drafts.set(key, { at: Date.now(), fields: now });
        dismissedRef.current = true;
      }
    }
    onClose();
  };

  useEffect(() => {
    if (!isOpen) return undefined;
    dismissedRef.current = false;
    // Give the form a moment to fill in its own starting values before reading them.
    const timer = setTimeout(() => {
      const root = bodyRef.current;
      if (!root) return;
      const fields = collectFields(root);
      if (fields.length === 0) return;
      const key = draftKey(title, pathname, fields);
      initialRef.current = { key, fields };
      const draft = drafts.get(key);
      drafts.delete(key);
      if (draft && Date.now() - draft.at < DRAFT_TTL_MS && restoreFields(root, draft.fields)) setRestored(true);
    }, 150);
    return () => {
      clearTimeout(timer);
      setRestored(false);
      // Closed without being dismissed (saved or cancelled): forget any older draft too.
      if (!dismissedRef.current && initialRef.current.key) drafts.delete(initialRef.current.key);
      initialRef.current = { key: null, fields: null };
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- title/pathname only matter at the moment it opens
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    function handleKeyDown(e) {
      if (e.key === 'Escape') dismiss();
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- dismiss only reads refs and onClose
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={dismiss} />
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
          <div className="flex items-center gap-3 shrink-0">
            {headerExtra}
            <button
              type="button"
              onClick={dismiss}
              aria-label="Close"
              className="text-gray-400 hover:text-gray-600 cursor-pointer shrink-0"
            >
              <FiX className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div ref={bodyRef} className={`px-6 ${footer ? '' : 'pb-6'} overflow-y-auto`}>
          {restored && (
            <p className="mb-3 rounded-lg bg-indigo-50 px-3 py-2 text-xs text-indigo-700">Restored what you had typed.</p>
          )}
          {children}
        </div>

        {footer && (
          <div className="shrink-0 px-6 py-4 border-t border-gray-100 bg-white shadow-[0_-4px_12px_rgba(0,0,0,0.03)]">{footer}</div>
        )}
      </div>
    </div>
  );
}
