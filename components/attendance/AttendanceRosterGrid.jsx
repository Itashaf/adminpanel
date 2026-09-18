'use client';

import { useRef } from 'react';
import { FiMessageSquare } from 'react-icons/fi';
import { STATUS_META, STATUS_KEY_MAP, nextStatus } from './statusStyles';

// Dense, click/keyboard-driven roster for fast attendance marking:
// - Click a card to cycle Present → Absent → On Leave → ...
// - With a card focused, press P/A/V to set that status outright
// - Typing digits anywhere in the grid jumps focus to that roll number
export default function AttendanceRosterGrid({ students, rollNumbers, statuses, remarks, onStatusChange, onOpenRemark }) {
  const cardRefs = useRef({});
  const digitBuffer = useRef('');
  const digitTimer = useRef(null);

  const focusRoll = (roll) => {
    const entry = Object.entries(rollNumbers).find(([, r]) => r === roll);
    if (entry) cardRefs.current[entry[0]]?.focus();
  };

  const handleKeyDown = (e, studentId) => {
    const key = e.key.toLowerCase();
    if (STATUS_KEY_MAP[key]) {
      e.preventDefault();
      onStatusChange(studentId, STATUS_KEY_MAP[key]);
      return;
    }
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onStatusChange(studentId, nextStatus(statuses[studentId] || 'Present'));
      return;
    }
    if (/^[0-9]$/.test(e.key)) {
      digitBuffer.current += e.key;
      clearTimeout(digitTimer.current);
      digitTimer.current = setTimeout(() => {
        const roll = parseInt(digitBuffer.current, 10);
        digitBuffer.current = '';
        if (roll) focusRoll(roll);
      }, 500);
    }
  };

  return (
    <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-2.5">
      {students.map((student) => {
        const status = statuses[student.id] || 'Present';
        const meta = STATUS_META[status];
        const remark = remarks[student.id];
        const roll = rollNumbers[student.id];

        return (
          <div
            key={student.id}
            ref={(el) => {
              cardRefs.current[student.id] = el;
            }}
            role="button"
            tabIndex={0}
            onClick={() => onStatusChange(student.id, nextStatus(status))}
            onKeyDown={(e) => handleKeyDown(e, student.id)}
            title={`${student.name} — click to cycle status, or press P/A/L/V/N`}
            className={`relative flex flex-col gap-1.5 rounded-xl border px-2.5 py-2.5 text-left transition cursor-pointer select-none focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1 ${meta.card}`}
          >
            <div className="flex items-center justify-between gap-1">
              <span className="text-[10px] font-bold text-gray-400">{String(roll).padStart(2, '0')}</span>
              <span className={`text-[10px] font-bold rounded-full px-1.5 py-0.5 ${meta.pill}`}>{meta.shortLabel}</span>
            </div>
            <span className="flex flex-col min-w-0">
              <span className="text-xs font-semibold text-gray-900 truncate">{student.firstName}</span>
              {student.lastName && (
                <span className="text-[10px] font-normal text-gray-500 truncate">{student.lastName}</span>
              )}
            </span>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onOpenRemark(student);
              }}
              className={`absolute bottom-1.5 right-1.5 flex items-center justify-center w-4 h-4 rounded-full cursor-pointer ${
                remark ? 'text-indigo-600' : 'text-gray-300 hover:text-gray-400'
              }`}
            >
              <FiMessageSquare className="w-2.5 h-2.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
