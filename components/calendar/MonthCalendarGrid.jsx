'use client';

import { useState } from 'react';
import { FiChevronLeft, FiChevronRight, FiCalendar } from 'react-icons/fi';
import Modal from '@/components/Modal';
import Badge from '@/components/Badge';
import { COLOR_STYLES, CALENDAR_LEGEND, appliesToLabel } from '@/lib/calendarEventConstants';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function toISODate(date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function buildCalendarDays(viewYear, viewMonth) {
  const firstDay = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const cells = Array.from({ length: firstDay }, () => null);
  for (let day = 1; day <= daysInMonth; day++) cells.push(new Date(viewYear, viewMonth, day));
  return cells;
}

function formatFullDate(iso) {
  return new Date(`${iso}T00:00:00`).toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

// Up to 2 event chips render inside a day cell — a 3rd+ event collapses into
// a single "+N more" chip instead of cramming more text into an already
// small cell; both the visible chips and the overflow chip open the same Day
// Events popup listing every event that day.
const MAX_VISIBLE_CHIPS = 2;

function ViewModeSwitcher({ viewMode, onViewModeChange }) {
  return (
    <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
      {['month', 'year'].map((mode) => (
        <button
          key={mode}
          type="button"
          onClick={() => onViewModeChange(mode)}
          className={`px-3 h-7 rounded-md text-xs font-semibold capitalize cursor-pointer transition ${
            viewMode === mode ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          {mode}
        </button>
      ))}
    </div>
  );
}

function YearGrid({ year, events, onSelectMonth }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      {MONTH_NAMES.map((name, monthIndex) => {
        const monthPrefix = `${year}-${`${monthIndex + 1}`.padStart(2, '0')}`;
        const monthEvents = events.filter((e) => e.startDate.startsWith(monthPrefix));
        const colors = [...new Set(monthEvents.map((e) => e.color))];

        return (
          <button
            key={name}
            type="button"
            onClick={() => onSelectMonth(monthIndex)}
            className="flex flex-col items-start gap-2 p-4 rounded-xl border border-gray-100 hover:border-indigo-200 hover:bg-indigo-50/40 transition cursor-pointer text-left"
          >
            <span className="text-sm font-semibold text-gray-900">{name}</span>
            <span className="text-xs text-gray-400">{monthEvents.length} event{monthEvents.length === 1 ? '' : 's'}</span>
            {colors.length > 0 && (
              <span className="flex items-center gap-1">
                {colors.slice(0, 3).map((color) => (
                  <span key={color} className={`w-1.5 h-1.5 rounded-full ${COLOR_STYLES[color]?.dot || 'bg-gray-400'}`} />
                ))}
                {colors.length > 3 && <span className="text-[10px] text-gray-400">+{colors.length - 3}</span>}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

function DayEventsPopup({ date, events, onClose, onEditEvent }) {
  return (
    <Modal title={formatFullDate(date)} icon={<FiCalendar className="w-5 h-5" />} isOpen={Boolean(date)} onClose={onClose}>
      <div className="space-y-2 pb-1">
        {events.map((event) => (
          <button
            key={event.id}
            type="button"
            onClick={() => onEditEvent(event)}
            className="w-full flex items-start gap-3 text-left p-3 rounded-xl border border-gray-100 hover:bg-gray-50 transition cursor-pointer"
          >
            <span className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${COLOR_STYLES[event.color]?.dot || 'bg-gray-400'}`} />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-gray-900 truncate">{event.title}</p>
              <p className="text-xs text-gray-400 mt-0.5">{appliesToLabel(event)}</p>
            </div>
            <Badge label={event.category} variant={COLOR_STYLES[event.color]?.badge || 'gray'} />
          </button>
        ))}
      </div>
    </Modal>
  );
}

export default function MonthCalendarGrid({
  year,
  month,
  events,
  selectedDate,
  onSelectDate,
  onMonthChange,
  viewMode = 'month',
  onViewModeChange,
  onYearChange,
  onSelectMonth,
  onEditEvent,
}) {
  const [popupDate, setPopupDate] = useState(null);
  const today = toISODate(new Date());
  const cells = buildCalendarDays(year, month);
  const isYearView = viewMode === 'year';

  const eventsForDay = (iso) => events.filter((e) => iso >= e.startDate && iso <= (e.endDate || e.startDate));

  const handlePrev = () => (isYearView ? onYearChange(-1) : onMonthChange(-1));
  const handleNext = () => (isYearView ? onYearChange(1) : onMonthChange(1));
  const handleToday = () => (isYearView ? onYearChange(0, true) : onMonthChange(0, true));

  const handleDayClick = (iso, dayEvents) => {
    onSelectDate(iso);
    if (dayEvents.length > 0) setPopupDate(iso);
  };

  const handleEditFromPopup = (event) => {
    setPopupDate(null);
    onEditEvent(event);
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h3 className="text-base font-semibold text-gray-900">{isYearView ? year : `${MONTH_NAMES[month]} ${year}`}</h3>
        <div className="flex items-center gap-2">
          {onViewModeChange && <ViewModeSwitcher viewMode={viewMode} onViewModeChange={onViewModeChange} />}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handlePrev}
              className="flex items-center justify-center w-9 h-9 rounded-lg bg-gray-100 text-gray-500 hover:bg-gray-200 cursor-pointer transition"
            >
              <FiChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleToday}
              className="px-3 h-9 rounded-lg text-xs font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 cursor-pointer transition"
            >
              Today
            </button>
            <button
              type="button"
              onClick={handleNext}
              className="flex items-center justify-center w-9 h-9 rounded-lg bg-gray-100 text-gray-500 hover:bg-gray-200 cursor-pointer transition"
            >
              <FiChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {isYearView ? (
        <YearGrid year={year} events={events} onSelectMonth={onSelectMonth} />
      ) : (
        <>
          <div className="grid grid-cols-7">
            {WEEKDAYS.map((day) => (
              <div key={day} className="text-center text-[11px] font-semibold text-gray-400 uppercase tracking-wide py-2">
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 border-t border-l border-gray-100 rounded-lg overflow-hidden">
            {cells.map((date, index) => {
              if (!date) return <div key={`empty-${index}`} className="min-h-[64px] sm:min-h-[104px] border-r border-b border-gray-100" />;

              const iso = toISODate(date);
              const dayEvents = eventsForDay(iso);
              const visibleEvents = dayEvents.slice(0, MAX_VISIBLE_CHIPS);
              const overflowCount = dayEvents.length - visibleEvents.length;
              const isSelected = selectedDate === iso;
              const isToday = today === iso;

              return (
                <button
                  key={iso}
                  type="button"
                  onClick={() => handleDayClick(iso, dayEvents)}
                  className={`relative flex flex-col items-start gap-1 min-h-[64px] sm:min-h-[104px] p-1.5 sm:p-2 border-r border-b text-left cursor-pointer transition ${
                    isSelected
                      ? 'bg-gradient-to-br from-violet-700 via-indigo-600 to-blue-600 border-gray-100'
                      : isToday
                      ? 'bg-indigo-50/60 border-indigo-100 ring-1 ring-inset ring-indigo-200'
                      : 'border-gray-100 hover:bg-gray-50'
                  }`}
                >
                  <span
                    className={`text-xs sm:text-sm font-semibold ${
                      isSelected
                        ? 'text-white'
                        : isToday
                        ? 'flex items-center justify-center w-6 h-6 rounded-full bg-indigo-600 text-white'
                        : 'text-gray-700 font-medium'
                    }`}
                  >
                    {date.getDate()}
                  </span>

                  <div className="flex flex-col gap-1 w-full">
                    {visibleEvents.map((event) => (
                      <span
                        key={event.id}
                        className={`flex items-center gap-1 w-full px-1.5 py-0.5 rounded-md text-[9px] sm:text-[10px] font-medium truncate ${
                          isSelected ? 'bg-white/20 text-white' : COLOR_STYLES[event.color]?.chip || 'bg-gray-50 text-gray-600'
                        }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${isSelected ? 'bg-white' : COLOR_STYLES[event.color]?.dot || 'bg-gray-400'}`} />
                        <span className="truncate">{event.title}</span>
                      </span>
                    ))}
                    {overflowCount > 0 && (
                      <span
                        className={`px-1.5 py-0.5 rounded-md text-[9px] sm:text-[10px] font-medium ${
                          isSelected ? 'bg-white/20 text-white' : 'bg-gray-50 text-gray-500'
                        }`}
                      >
                        +{overflowCount} more
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-4 pt-4 border-t border-gray-100">
            {CALENDAR_LEGEND.map(({ category, color }) => (
              <span key={category} className="flex items-center gap-1.5 text-xs text-gray-500">
                <span className={`w-2 h-2 rounded-full ${COLOR_STYLES[color]?.dot || 'bg-gray-400'}`} />
                {category}
              </span>
            ))}
          </div>
        </>
      )}

      <DayEventsPopup
        date={popupDate}
        events={popupDate ? eventsForDay(popupDate) : []}
        onClose={() => setPopupDate(null)}
        onEditEvent={handleEditFromPopup}
      />
    </div>
  );
}
