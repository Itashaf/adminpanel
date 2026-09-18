'use client';

import { FiCalendar, FiArrowRight } from 'react-icons/fi';
import { COLOR_STYLES, appliesToLabel } from '@/lib/calendarEventConstants';

function dateParts(dateString) {
  const date = new Date(`${dateString}T00:00:00`);
  return {
    day: date.getDate(),
    month: date.toLocaleDateString('en-US', { month: 'short' }),
  };
}

export default function UpcomingEventsSidebar({ events, onSelectEvent, onViewAll }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col h-full">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-semibold text-gray-900">Upcoming Events</h3>
        {onViewAll && (
          <button
            type="button"
            onClick={onViewAll}
            className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700 cursor-pointer"
          >
            View All
            <FiArrowRight className="w-3 h-3" />
          </button>
        )}
      </div>

      {events.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center py-10">
          <span className="flex items-center justify-center w-12 h-12 rounded-full bg-gray-50 text-gray-300 mb-3">
            <FiCalendar className="w-6 h-6" />
          </span>
          <p className="text-sm text-gray-400">No upcoming events.</p>
        </div>
      ) : (
        <div className="space-y-2 overflow-y-auto max-h-[420px] lg:max-h-[520px] -mr-1 pr-1">
          {events.map((event) => {
            const { day, month } = dateParts(event.startDate);
            return (
              <button
                key={event.id}
                type="button"
                onClick={() => onSelectEvent(event)}
                className="w-full flex items-start gap-3 text-left p-2.5 rounded-xl hover:bg-gray-50 transition cursor-pointer"
              >
                <span className="flex flex-col items-center justify-center w-12 h-12 rounded-xl bg-gray-50 text-gray-700 shrink-0">
                  <span className="text-sm font-bold leading-none">{day}</span>
                  <span className="text-[10px] font-medium text-gray-400 uppercase mt-0.5">{month}</span>
                </span>
                <div className="min-w-0 flex-1 pt-0.5">
                  <div className="flex items-center gap-1.5">
                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${COLOR_STYLES[event.color]?.dot || 'bg-gray-400'}`} />
                    <p className="text-sm font-semibold text-gray-900 truncate">{event.title}</p>
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5 truncate">{appliesToLabel(event)}</p>
                </div>
              </button>
            );
          })}
        </div>
      )}

      <div className="mt-4 pt-4 border-t border-gray-100">
        <div className="flex items-center gap-3 rounded-xl bg-gradient-to-br from-violet-50 to-indigo-50 p-4">
          <span className="flex items-center justify-center w-9 h-9 rounded-full bg-white text-indigo-600 shrink-0">
            <FiCalendar className="w-4 h-4" />
          </span>
          <p className="text-xs text-gray-600 italic leading-relaxed">
            "A well-planned academic year builds a brighter future." — SchoolApp360
          </p>
        </div>
      </div>
    </div>
  );
}
