'use client';

import { useState } from 'react';
import { FiBook, FiUser, FiCalendar, FiChevronDown } from 'react-icons/fi';
import Badge from '@/components/Badge';

function formatDate(dateString) {
  return new Date(`${dateString}T00:00:00`).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
}

function HomeworkRow({ homework }) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="border-b border-gray-100 last:border-b-0">
      <div
        role="button"
        tabIndex={0}
        onClick={() => setIsExpanded((prev) => !prev)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setIsExpanded((prev) => !prev);
          }
        }}
        className="w-full flex items-start gap-3 px-4 sm:px-5 py-4 text-left cursor-pointer hover:bg-gray-50/60 transition"
      >
        <span className="mt-1.5 w-2 h-2 rounded-full shrink-0 bg-violet-400" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-semibold text-gray-900 truncate">{homework.title}</p>
            <Badge label={homework.subject} variant="violet" />
          </div>
          {!isExpanded && homework.description && (
            <p className="text-xs text-gray-500 truncate mt-0.5">{homework.description}</p>
          )}
        </div>
        <div className="flex items-center gap-3 shrink-0 pl-2">
          <span className="hidden sm:block text-xs whitespace-nowrap font-medium text-gray-400">
            {formatDate(homework.assignedDate)}
          </span>
          <FiChevronDown className={`w-4 h-4 text-gray-300 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
        </div>
      </div>

      {isExpanded && (
        <div className="px-4 sm:px-5 pb-4 pl-9">
          {homework.description && <p className="text-sm text-gray-600 whitespace-pre-wrap">{homework.description}</p>}
          <div className="flex items-center flex-wrap gap-x-4 gap-y-1 text-xs text-gray-400 mt-3">
            <span className="flex items-center gap-1.5">
              <FiUser className="w-3.5 h-3.5" />
              {homework.assignedByName}
            </span>
            <span className="flex items-center gap-1.5">
              <FiCalendar className="w-3.5 h-3.5" />
              Assigned {formatDate(homework.assignedDate)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ParentHomeworkView({ homework, student }) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Homework</h1>
        <p className="text-sm text-gray-500 mt-1">
          For {student.firstName} — {student.class}
          {student.section ? ` - ${student.section}` : ''}
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {homework.length === 0 ? (
          <div className="text-center py-16 px-6">
            <span className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gray-50 text-gray-300 mb-3">
              <FiBook className="w-6 h-6" />
            </span>
            <p className="text-sm text-gray-500">No homework assigned yet.</p>
          </div>
        ) : (
          homework.map((hw) => <HomeworkRow key={hw.id} homework={hw} />)
        )}
      </div>
    </div>
  );
}
