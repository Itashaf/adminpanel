'use client';

import { useMemo, useState } from 'react';
import { FiCalendar, FiChevronDown } from 'react-icons/fi';
import MonthCalendarGrid from '@/components/calendar/MonthCalendarGrid';
import UpcomingEventsSidebar from '@/components/calendar/UpcomingEventsSidebar';
import { COLOR_STYLES, appliesToLabel } from '@/lib/calendarEventConstants';

function isoToday() {
  return new Date().toISOString().slice(0, 10);
}

function formatDate(dateString) {
  return new Date(`${dateString}T00:00:00`).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
}

// Read-only for a Parent — no Add/Edit drawer, so onEditEvent (fired when a
// day-popup or sidebar row is clicked) is a no-op; the popup itself already
// shows everything a parent needs to see about that event.
export default function ParentCalendarView({ events, student }) {
  const today = isoToday();
  const now = new Date();

  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth());
  const [viewMode, setViewMode] = useState('month');
  const [selectedDate, setSelectedDate] = useState(null);
  const [showMobileCalendar, setShowMobileCalendar] = useState(false);

  const upcomingEvents = useMemo(
    () =>
      [...events]
        .filter((e) => (e.endDate || e.startDate) >= today)
        .sort((a, b) => a.startDate.localeCompare(b.startDate))
        .slice(0, 10),
    [events, today]
  );

  const dateFilteredEvents = useMemo(() => {
    if (!selectedDate) return events;
    return events.filter((e) => selectedDate >= e.startDate && selectedDate <= (e.endDate || e.startDate));
  }, [events, selectedDate]);

  const sortedAgenda = useMemo(
    () => [...dateFilteredEvents].sort((a, b) => (a.startDate < b.startDate ? -1 : 1)),
    [dateFilteredEvents]
  );

  const handleMonthChange = (delta, jumpToToday) => {
    if (jumpToToday) {
      setViewYear(now.getFullYear());
      setViewMonth(now.getMonth());
      return;
    }
    let nextMonth = viewMonth + delta;
    let nextYear = viewYear;
    if (nextMonth < 0) {
      nextMonth = 11;
      nextYear -= 1;
    } else if (nextMonth > 11) {
      nextMonth = 0;
      nextYear += 1;
    }
    setViewMonth(nextMonth);
    setViewYear(nextYear);
  };

  const handleYearChange = (delta, jumpToToday) => {
    setViewYear(jumpToToday ? now.getFullYear() : viewYear + delta);
  };

  const handleSelectMonth = (monthIndex) => {
    setViewMonth(monthIndex);
    setViewMode('month');
  };

  const handleSelectDate = (date) => {
    setSelectedDate((prev) => (prev === date ? null : date));
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Calendar</h1>
        <p className="text-sm text-gray-500 mt-1">
          For {student.firstName} — {student.class}
          {student.section ? ` - ${student.section}` : ''} &amp; whole-school events
        </p>
      </div>

      {/* Desktop */}
      <div className="hidden md:grid grid-cols-1 lg:grid-cols-10 gap-6 items-start">
        <div className="lg:col-span-7">
          <MonthCalendarGrid
            year={viewYear}
            month={viewMonth}
            events={events}
            selectedDate={selectedDate}
            onSelectDate={handleSelectDate}
            onMonthChange={handleMonthChange}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            onYearChange={handleYearChange}
            onSelectMonth={handleSelectMonth}
            onEditEvent={() => {}}
          />
        </div>
        <div className="lg:col-span-3">
          <UpcomingEventsSidebar events={upcomingEvents} onSelectEvent={() => {}} />
        </div>
      </div>

      {/* Mobile */}
      <div className="md:hidden space-y-4">
        <button
          type="button"
          onClick={() => setShowMobileCalendar((prev) => !prev)}
          className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-white border border-gray-100 shadow-sm cursor-pointer"
        >
          <span className="text-sm font-medium text-gray-700">Monthly Calendar</span>
          <FiChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showMobileCalendar ? 'rotate-180' : ''}`} />
        </button>
        {showMobileCalendar && (
          <MonthCalendarGrid
            year={viewYear}
            month={viewMonth}
            events={events}
            selectedDate={selectedDate}
            onSelectDate={handleSelectDate}
            onMonthChange={handleMonthChange}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            onYearChange={handleYearChange}
            onSelectMonth={handleSelectMonth}
            onEditEvent={() => {}}
          />
        )}
      </div>

      {/* Agenda list — full list, or just the selected day when one is picked */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {selectedDate && (
          <div className="px-4 sm:px-5 py-3 border-b border-gray-100 bg-indigo-50/50 text-xs font-medium text-indigo-700">
            Showing events for {formatDate(selectedDate)}
          </div>
        )}
        {sortedAgenda.length === 0 ? (
          <div className="text-center py-16 px-6">
            <span className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gray-50 text-gray-300 mb-3">
              <FiCalendar className="w-6 h-6" />
            </span>
            <p className="text-sm text-gray-500">No events found.</p>
          </div>
        ) : (
          sortedAgenda.map((event) => {
            const styles = COLOR_STYLES[event.color] || COLOR_STYLES.Purple;
            const dateLabel =
              event.endDate && event.endDate !== event.startDate
                ? `${formatDate(event.startDate)} – ${formatDate(event.endDate)}`
                : formatDate(event.startDate);
            return (
              <div key={event.id} className="flex items-start gap-3 px-4 sm:px-5 py-4 border-b border-gray-100 last:border-b-0">
                <span className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${styles.dot}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold text-gray-900 truncate">{event.title}</p>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${styles.chip}`}>{event.category}</span>
                  </div>
                  {event.description && <p className="text-xs text-gray-500 mt-0.5">{event.description}</p>}
                  <p className="text-xs text-gray-400 mt-1">{appliesToLabel(event)}</p>
                </div>
                <span className="hidden sm:block text-xs text-gray-400 whitespace-nowrap pl-2">{dateLabel}</span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
