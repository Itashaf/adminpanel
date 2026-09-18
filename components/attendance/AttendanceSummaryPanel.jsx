'use client';

import { useState } from 'react';
import { FiChevronRight } from 'react-icons/fi';
import { STATUS_META, STATUS_ORDER } from './statusStyles';

function Kbd({ children }) {
  return (
    <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded bg-gray-100 text-gray-600 font-mono text-[10px] font-semibold">
      {children}
    </span>
  );
}

export default function AttendanceSummaryPanel({ students, statuses, rollNumbers }) {
  const [expanded, setExpanded] = useState(null);
  const total = students.length;

  const grouped = STATUS_ORDER.reduce((acc, status) => {
    acc[status] = students.filter((s) => (statuses[s.id] || 'Present') === status);
    return acc;
  }, {});

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 lg:sticky lg:top-6 h-fit">
      <h3 className="text-base font-bold text-gray-900 mb-2">Attendance Summary</h3>

      <div>
        {STATUS_ORDER.map((status) => {
          const meta = STATUS_META[status];
          const list = grouped[status];
          const percent = total > 0 ? Math.round((list.length / total) * 1000) / 10 : 0;
          const isExpanded = expanded === status;

          return (
            <div key={status} className="border-b border-gray-50 last:border-0">
              <button
                type="button"
                onClick={() => setExpanded(isExpanded ? null : status)}
                disabled={list.length === 0}
                className="w-full flex items-center justify-between py-2.5 text-left cursor-pointer disabled:cursor-default"
              >
                <span className="flex items-center gap-2 text-sm text-gray-700">
                  <span className={`w-2 h-2 rounded-full shrink-0 ${meta.dot}`} />
                  {meta.label}
                </span>
                <span className="flex items-center gap-2 shrink-0">
                  <span className="text-sm font-bold text-gray-900">{list.length}</span>
                  <span className="text-xs text-gray-400">({percent}%)</span>
                  {list.length > 0 && (
                    <FiChevronRight className={`w-3.5 h-3.5 text-gray-300 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                  )}
                </span>
              </button>

              {isExpanded && (
                <div className="pb-2.5 space-y-1.5 max-h-48 overflow-y-auto">
                  {list.map((student) => (
                    <p key={student.id} className="flex items-center gap-2 text-xs text-gray-500 pl-4">
                      <span className="font-semibold text-gray-400 shrink-0">{String(rollNumbers[student.id]).padStart(2, '0')}</span>
                      <span className="truncate">{student.name}</span>
                    </p>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="pt-4 mt-3 border-t border-gray-100 space-y-2">
        <p className="text-xs font-semibold text-gray-500">Quick Keys</p>
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <Kbd>Click</Kbd> Cycle status
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-500 flex-wrap">
          <Kbd>P</Kbd> Present <Kbd>A</Kbd> Absent <Kbd>V</Kbd> Leave
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <Kbd>0-9</Kbd> Jump to roll number
        </div>
      </div>
    </div>
  );
}
