'use client';

import { CALENDAR_FILTER_PILLS } from '@/lib/calendarEventConstants';

export default function CalendarFilterPills({ value, onChange }) {
  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-1 -mb-1">
      {CALENDAR_FILTER_PILLS.map((pill) => {
        const isActive = value === pill.value;
        return (
          <button
            key={pill.label}
            type="button"
            onClick={() => onChange(pill.value)}
            className={`shrink-0 px-4 py-2 rounded-full text-sm font-medium transition cursor-pointer ${
              isActive
                ? 'bg-gradient-to-r from-violet-700 via-indigo-600 to-blue-600 text-white shadow-sm'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {pill.label}
          </button>
        );
      })}
    </div>
  );
}
