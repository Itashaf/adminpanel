'use client';

import { useRef, useState } from 'react';
import { FiLayers, FiPlus, FiMenu } from 'react-icons/fi';
import ClassTableRow from './ClassTableRow';
import { reorderClasses } from '@/lib/api';

// List/table view — same wrapper/spacing/colors/fonts convention as
// StudentsTable.jsx / SubjectTestsExplorer.jsx's table, not this module's
// own independent design. Kept the ClassesGrid filename/export (only
// ClassesExplorer.jsx imports it) to avoid an unrelated rename ripple.
//
// Drag-to-reorder: native HTML5 drag-and-drop (draggable + onDragOver/
// onDrop) rather than adding a dependency — this is a single flat list
// with no nesting/virtualization, which the native API already handles
// fine. `items` is a local optimistic copy of `classes`; a prop change
// (add/delete elsewhere triggering router.refresh()) resyncs it via the
// same "adjust state during render" pattern StudentsExplorer.jsx uses,
// not a useEffect (which would cost an extra render pass).
export default function ClassesGrid({ classes, academicSession, onAddClass }) {
  const [items, setItems] = useState(classes);
  const [prevClasses, setPrevClasses] = useState(classes);
  if (classes !== prevClasses) {
    setPrevClasses(classes);
    setItems(classes);
  }

  const dragIndex = useRef(null);

  const persistOrder = (next) => {
    reorderClasses(academicSession, next.map((c) => c.id)).catch(() => {
      // Best-effort — a failed save just means the next real fetch (e.g. a
      // refresh) reverts to the server's last-known order; nothing else
      // in this list depends on the order being correct mid-drag.
    });
  };

  const handleDragStart = (index) => () => {
    dragIndex.current = index;
  };

  const handleDragOver = (index) => (e) => {
    e.preventDefault();
    const from = dragIndex.current;
    if (from === null || from === index) return;
    setItems((prev) => {
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(index, 0, moved);
      return next;
    });
    dragIndex.current = index;
  };

  const handleDrop = (e) => {
    e.preventDefault();
    dragIndex.current = null;
    persistOrder(items);
  };

  if (classes.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-10 sm:p-14 flex flex-col items-center text-center">
        <span className="flex items-center justify-center w-14 h-14 rounded-full bg-indigo-50 text-indigo-700 mb-4">
          <FiLayers className="w-6 h-6" />
        </span>
        <h3 className="text-base font-semibold text-gray-900">No classes created yet</h3>
        <p className="text-sm text-gray-500 mt-1 max-w-sm">
          Create your first class to start organizing students.
        </p>
        <button
          type="button"
          onClick={onAddClass}
          className="mt-5 inline-flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium text-white bg-gradient-to-r from-violet-700 via-indigo-600 to-blue-600 hover:opacity-90 transition cursor-pointer"
        >
          <FiPlus className="w-4 h-4" />
          Create Class
        </button>
      </div>
    );
  }

  return (
    <div className="relative bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
              <th className="py-4 pl-6 pr-2 w-8" />
              <th className="py-4 pr-4 w-10">#</th>
              <th className="py-4 pr-4">Class</th>
              <th className="py-4 pr-4">Sections</th>
              <th className="py-4 pr-4 text-center">Total Students</th>
              <th className="py-4 pr-4 text-center">Boys / Girls</th>
              <th className="py-4 pr-4 text-center">Status</th>
              <th className="py-4 pr-6 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {items.map((cls, index) => (
              <ClassTableRow
                key={cls.id}
                cls={cls}
                serialNumber={index + 1}
                dragHandle={
                  <span
                    draggable
                    onDragStart={handleDragStart(index)}
                    onDragOver={handleDragOver(index)}
                    onDrop={handleDrop}
                    onDragEnd={handleDrop}
                    className="flex items-center justify-center w-6 h-6 text-gray-300 hover:text-gray-500 cursor-grab active:cursor-grabbing"
                    title="Drag to reorder"
                  >
                    <FiMenu className="w-4 h-4" />
                  </span>
                }
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
