'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FiPlus, FiCalendar, FiChevronDown, FiX, FiTag } from 'react-icons/fi';
import Toast from '@/components/Toast';
import Pagination from '@/components/Pagination';
import Dropdown from '@/components/Dropdown';
import Badge from '@/components/Badge';
import CalendarFilterPills from './CalendarFilterPills';
import MonthCalendarGrid from './MonthCalendarGrid';
import UpcomingEventsSidebar from './UpcomingEventsSidebar';
import EventsTable from './EventsTable';
import EventDrawer from './EventDrawer';
import { COLOR_STYLES, CALENDAR_FILTER_PILLS } from '@/lib/calendarEventConstants';

const EVENT_TYPE_OPTIONS = CALENDAR_FILTER_PILLS.map((pill) => ({
  value: pill.value,
  label: pill.value ? pill.label : 'All Events',
}));

const PAGE_SIZE = 8;
const MOBILE_TABS = [
  { key: 'upcoming', label: 'Upcoming' },
  { key: 'thisWeek', label: 'This Week' },
  { key: 'thisMonth', label: 'This Month' },
  { key: 'all', label: 'All Events' },
];

function isoToday() {
  return new Date().toISOString().slice(0, 10);
}

function addDaysISO(iso, days) {
  const date = new Date(`${iso}T00:00:00`);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function formatDate(dateString) {
  return new Date(`${dateString}T00:00:00`).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function CalendarExplorer({ events, sessionOptions, defaultSession }) {
  const router = useRouter();
  const today = isoToday();
  const now = new Date();

  const [session, setSession] = useState(defaultSession || '');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState('startDate');
  const [sortDir, setSortDir] = useState('asc');
  const [page, setPage] = useState(1);
  const [selectedDate, setSelectedDate] = useState(null);
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth());
  const [viewMode, setViewMode] = useState('month');
  const [viewTab, setViewTab] = useState('calendar');
  const [showDrawer, setShowDrawer] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [toastMessage, setToastMessage] = useState('');
  const [mobileTab, setMobileTab] = useState('upcoming');
  const [showMobileCalendar, setShowMobileCalendar] = useState(false);

  const sessionEvents = useMemo(
    () => events.filter((e) => !session || !e.academicSession || e.academicSession === session),
    [events, session]
  );

  const categoryEvents = useMemo(
    () => sessionEvents.filter((e) => !categoryFilter || e.category === categoryFilter),
    [sessionEvents, categoryFilter]
  );

  const upcomingEvents = useMemo(
    () => categoryEvents.filter((e) => (e.endDate || e.startDate) >= today).sort((a, b) => a.startDate.localeCompare(b.startDate)).slice(0, 10),
    [categoryEvents, today]
  );

  // Clicking a date on the calendar narrows the table/mobile list to just
  // that day's events, on top of whatever category pill is active — the
  // Upcoming Events sidebar deliberately stays unfiltered by it (it's a
  // "what's next" list, not tied to whichever date happens to be selected).
  const dateFilteredEvents = useMemo(() => {
    if (!selectedDate) return categoryEvents;
    return categoryEvents.filter((e) => selectedDate >= e.startDate && selectedDate <= (e.endDate || e.startDate));
  }, [categoryEvents, selectedDate]);

  const searchedEvents = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return dateFilteredEvents;
    return dateFilteredEvents.filter((e) => e.title.toLowerCase().includes(query));
  }, [dateFilteredEvents, search]);

  const sortedEvents = useMemo(() => {
    const sorted = [...searchedEvents].sort((a, b) => {
      const aVal = (a[sortKey] || '').toLowerCase?.() ?? a[sortKey];
      const bVal = (b[sortKey] || '').toLowerCase?.() ?? b[sortKey];
      if (aVal < bVal) return sortDir === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
    return sorted;
  }, [searchedEvents, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sortedEvents.length / PAGE_SIZE));
  const pagedEvents = sortedEvents.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const mobileEvents = useMemo(() => {
    const sorted = [...dateFilteredEvents].sort((a, b) => a.startDate.localeCompare(b.startDate));
    if (mobileTab === 'upcoming') return sorted.filter((e) => (e.endDate || e.startDate) >= today);
    if (mobileTab === 'thisWeek') {
      const weekEnd = addDaysISO(today, 6);
      return sorted.filter((e) => e.startDate <= weekEnd && (e.endDate || e.startDate) >= today);
    }
    if (mobileTab === 'thisMonth') {
      const monthPrefix = today.slice(0, 7);
      return sorted.filter((e) => e.startDate.startsWith(monthPrefix));
    }
    return sorted;
  }, [dateFilteredEvents, mobileTab, today]);

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
    setPage(1);
  };

  const handleSortChange = (key, dir) => {
    setSortKey(key);
    setSortDir(dir);
    setPage(1);
  };

  const handleOpenAdd = () => {
    setEditingEvent(null);
    setShowDrawer(true);
  };

  const handleOpenEdit = (event) => {
    setEditingEvent(event);
    setShowDrawer(true);
  };

  const handleDrawerSuccess = (message) => {
    setShowDrawer(false);
    setToastMessage(message);
    router.refresh();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <span className="flex items-center justify-center w-12 h-12 rounded-2xl bg-indigo-100 text-indigo-700 shrink-0">
              <FiCalendar className="w-6 h-6" />
            </span>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Academic Calendar</h1>
              <p className="text-sm text-gray-500 mt-0.5">Plan and manage all academic activities, holidays, exams and events.</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <div className="hidden md:flex items-center gap-1 bg-gray-100 rounded-lg p-1">
              {['calendar', 'agenda'].map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setViewTab(tab)}
                  className={`px-4 h-9 rounded-md text-sm font-semibold capitalize cursor-pointer transition ${
                    viewTab === tab ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={handleOpenAdd}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-medium text-white bg-gradient-to-r from-violet-700 via-indigo-600 to-blue-600 hover:opacity-90 transition cursor-pointer whitespace-nowrap"
            >
              <FiPlus className="w-4 h-4" />
              Add Event
            </button>
          </div>
        </div>
      </div>

      {/* Desktop layout */}
      <div className="hidden md:block space-y-6">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-wrap items-center gap-3">
          <div className="w-44">
            <Dropdown icon={<FiCalendar className="w-4 h-4" />} options={sessionOptions} value={session} onChange={setSession} />
          </div>
          <div className="w-52">
            <Dropdown icon={<FiTag className="w-4 h-4" />} options={EVENT_TYPE_OPTIONS} value={categoryFilter} onChange={setCategoryFilter} />
          </div>

          {viewTab === 'agenda' && (
            <div className="relative flex-1 min-w-[200px]">
              <input
                type="text"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                autoComplete="off"
                placeholder="Search events..."
                className="w-full pl-4 pr-4 py-2.5 text-sm border border-gray-200 rounded-full focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          )}

          {selectedDate && (
            <button
              type="button"
              onClick={() => setSelectedDate(null)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 transition cursor-pointer shrink-0 ml-auto"
            >
              {formatDate(selectedDate)}
              <FiX className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {viewTab === 'calendar' ? (
          <div className="grid grid-cols-1 lg:grid-cols-10 gap-6 items-start">
            <div className="lg:col-span-7">
              <MonthCalendarGrid
                year={viewYear}
                month={viewMonth}
                events={categoryEvents}
                selectedDate={selectedDate}
                onSelectDate={handleSelectDate}
                onMonthChange={handleMonthChange}
                viewMode={viewMode}
                onViewModeChange={setViewMode}
                onYearChange={handleYearChange}
                onSelectMonth={handleSelectMonth}
                onEditEvent={handleOpenEdit}
              />
            </div>
            <div className="lg:col-span-3">
              <UpcomingEventsSidebar events={upcomingEvents} onSelectEvent={handleOpenEdit} onViewAll={() => setViewTab('agenda')} />
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <EventsTable events={pagedEvents} onEdit={handleOpenEdit} sortKey={sortKey} sortDir={sortDir} onSortChange={handleSortChange} />

            {sortedEvents.length > 0 && (
              <Pagination page={page} totalPages={totalPages} onPageChange={setPage} totalCount={sortedEvents.length} pageSize={PAGE_SIZE} itemLabel="events" />
            )}
          </div>
        )}
      </div>

      {/* Mobile layout */}
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
            events={categoryEvents}
            selectedDate={selectedDate}
            onSelectDate={handleSelectDate}
            onMonthChange={handleMonthChange}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            onYearChange={handleYearChange}
            onSelectMonth={handleSelectMonth}
            onEditEvent={handleOpenEdit}
          />
        )}

        <CalendarFilterPills value={categoryFilter} onChange={setCategoryFilter} />

        {selectedDate && (
          <button
            type="button"
            onClick={() => setSelectedDate(null)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-medium text-indigo-700 bg-indigo-50 cursor-pointer"
          >
            {formatDate(selectedDate)}
            <FiX className="w-3.5 h-3.5" />
          </button>
        )}

        <div className="flex items-center gap-1.5 bg-gray-100 rounded-full p-1">
          {MOBILE_TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setMobileTab(tab.key)}
              className={`flex-1 px-2 py-2 rounded-full text-xs font-semibold cursor-pointer transition ${
                mobileTab === tab.key ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-500'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {mobileEvents.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm py-14 text-center">
            <p className="text-sm text-gray-400">No events found.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {mobileEvents.map((event) => (
              <button
                key={event.id}
                type="button"
                onClick={() => handleOpenEdit(event)}
                className="w-full text-left bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-start gap-3 cursor-pointer"
              >
                <span className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${COLOR_STYLES[event.color]?.dot || 'bg-gray-400'}`} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-900 truncate">{event.title}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{formatDate(event.startDate)}</p>
                  <div className="mt-2">
                    <Badge label={event.category} variant={COLOR_STYLES[event.color]?.badge || 'gray'} />
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Floating Add Event button */}
        <button
          type="button"
          onClick={handleOpenAdd}
          className="fixed bottom-6 right-5 z-40 flex items-center justify-center w-14 h-14 rounded-full bg-gradient-to-r from-violet-700 via-indigo-600 to-blue-600 text-white shadow-lg cursor-pointer"
        >
          <FiPlus className="w-6 h-6" />
        </button>
      </div>

      <EventDrawer
        isOpen={showDrawer}
        onClose={() => setShowDrawer(false)}
        event={editingEvent}
        defaultSession={session || defaultSession}
        sessionOptions={sessionOptions}
        onSuccess={handleDrawerSuccess}
      />

      {toastMessage && <Toast message={toastMessage} onClose={() => setToastMessage('')} />}
    </div>
  );
}
