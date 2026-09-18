'use client';

import { useEffect, useMemo, useState } from 'react';
import { FiCalendar, FiChevronLeft, FiChevronRight, FiPieChart } from 'react-icons/fi';
import Dropdown from '@/components/Dropdown';
import Button from '@/components/Button';
import { STATUS_META, STATUS_ORDER } from '@/components/attendance/statusStyles';
import { getStudentAttendance } from '@/lib/api';

const WEEKDAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

// `date.toISOString()` converts to UTC first, which shifts a local-midnight
// `Date` back a calendar day in any timezone ahead of UTC — only matters here
// for the padding cells' `key` prop (they carry no real attendance lookup),
// but keep it local-date-based anyway rather than reintroducing that bug.
function toLocalDateStr(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

// Goes back to the student's own admission month (attendance can't exist
// before that), not a fixed window — a student who joined a year ago should
// be able to page all the way back to it, same as one who joined last month.
function monthOptions(startMonth) {
  const options = [];
  const now = new Date();
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const [startYear, startMonthNum] = (startMonth || `${now.getFullYear()}-${now.getMonth() + 1}`).split('-').map(Number);
  const start = new Date(Math.min(new Date(startYear, startMonthNum - 1, 1).getTime(), currentMonthStart.getTime()));

  for (let d = new Date(currentMonthStart); d >= start; d.setMonth(d.getMonth() - 1)) {
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    options.push({ value, label });
  }
  return options;
}

// Monday-start weeks covering the whole month, padded with the leading/
// trailing days of the neighboring months so every week row has all 7 cells
// — those padding cells never carry attendance data (no fetch for a month
// outside the one requested), they're rendered dimmed and non-interactive
// purely so the grid lines up, same as any standard calendar widget.
function buildCalendarWeeks(monthKey, days) {
  const [year, month] = monthKey.split('-').map(Number);
  const dayByDate = new Map(days.map((d) => [d.date, d.status]));
  const firstOfMonth = new Date(year, month - 1, 1);
  const daysInMonth = new Date(year, month, 0).getDate();

  // JS getDay(): 0=Sun..6=Sat. Convert to a Monday-start offset (0=Mon..6=Sun).
  const leadingOffset = (firstOfMonth.getDay() + 6) % 7;

  const cells = [];
  for (let i = leadingOffset; i > 0; i--) {
    const d = new Date(year, month - 1, 1 - i);
    cells.push({ key: toLocalDateStr(d), dayNum: d.getDate(), inMonth: false, status: null });
  }
  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${monthKey}-${String(day).padStart(2, '0')}`;
    const isSunday = new Date(year, month - 1, day).getDay() === 0;
    cells.push({ key: dateStr, dayNum: day, inMonth: true, status: dayByDate.get(dateStr) ?? null, isSunday });
  }
  while (cells.length % 7 !== 0) {
    const trailingIndex = cells.length - (leadingOffset + daysInMonth);
    const d = new Date(year, month, trailingIndex + 1);
    cells.push({ key: toLocalDateStr(d), dayNum: d.getDate(), inMonth: false, status: null });
  }

  const weeks = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

function SummaryChip({ status, count }) {
  const meta = STATUS_META[status];
  const Icon = meta.icon;
  return (
    <div className={`flex items-center gap-2.5 rounded-xl px-4 py-3 ${meta.card}`}>
      <span className={`flex items-center justify-center w-8 h-8 rounded-full bg-white/70 ${meta.iconText}`}>
        <Icon className="w-4 h-4" />
      </span>
      <div>
        <p className="text-xs font-medium opacity-80">{meta.label}</p>
        <p className="text-lg font-bold leading-tight">{count}</p>
      </div>
    </div>
  );
}

function DayCell({ cell }) {
  const meta = cell.status ? STATUS_META[cell.status] : null;
  const Icon = meta?.icon;
  // Sunday is always a holiday — disabled regardless of any stray status a
  // teacher might have somehow marked, never counted toward the summary
  // (see getStudentAttendanceStats — it only ever sees weekday marks in
  // practice, this is purely the calendar's own display rule).
  const isHoliday = cell.inMonth && cell.isSunday;

  return (
    <div
      className={`flex flex-col items-center justify-center gap-1.5 py-3 border-t border-l border-gray-100 [&:nth-child(7n)]:border-r ${
        isHoliday ? 'bg-gray-50' : cell.inMonth ? 'bg-white' : 'bg-gray-50/60'
      }`}
    >
      <span className={`text-xs font-medium ${isHoliday ? 'text-gray-300' : cell.inMonth ? 'text-gray-500' : 'text-gray-300'}`}>
        {cell.dayNum}
      </span>
      {isHoliday ? (
        <span className="text-[9px] font-medium text-gray-300 uppercase tracking-wide">Holiday</span>
      ) : meta ? (
        <span className={`flex items-center justify-center w-7 h-7 rounded-full ${meta.pill}`}>
          <Icon className="w-3.5 h-3.5" />
        </span>
      ) : (
        <span className="w-7 h-7 rounded-full border border-dashed border-gray-200" />
      )}
    </div>
  );
}

export default function StudentAttendanceTab({ studentId, admissionDate }) {
  const options = useMemo(() => monthOptions(admissionDate?.slice(0, 7)), [admissionDate]);
  const [monthIndex, setMonthIndex] = useState(0);
  const month = options[monthIndex].value;
  const [stats, setStats] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError('');
    getStudentAttendance(studentId, month)
      .then((data) => {
        if (!cancelled) setStats(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [studentId, month]);

  const weeks = stats ? buildCalendarWeeks(month, stats.days) : [];

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sm:p-8">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
        <div className="flex items-center gap-4">
          <span className="flex items-center justify-center w-11 h-11 rounded-2xl bg-violet-100 text-violet-600 shrink-0">
            <FiCalendar className="w-5 h-5" />
          </span>
          <div>
            <h3 className="text-lg font-bold text-gray-900">Attendance History</h3>
            <p className="text-sm text-gray-500 mt-0.5">{options[monthIndex].label} attendance record.</p>
          </div>
        </div>

        {stats && (
          <div className="flex flex-wrap items-center gap-2.5">
            {STATUS_ORDER.map((status) => (
              <SummaryChip key={status} status={status} count={stats[status] || 0} />
            ))}
            <div className="flex items-center gap-2.5 rounded-xl px-4 py-3 bg-indigo-50 text-indigo-700">
              <span className="flex items-center justify-center w-8 h-8 rounded-full bg-white/70">
                <FiPieChart className="w-4 h-4" />
              </span>
              <div>
                <p className="text-xs font-medium opacity-80">Attendance</p>
                <p className="text-lg font-bold leading-tight">{stats.percent}%</p>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <div className="w-full sm:w-56">
          <Dropdown options={options} value={month} onChange={(value) => setMonthIndex(options.findIndex((o) => o.value === value))} />
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setMonthIndex((i) => Math.min(i + 1, options.length - 1))}
            disabled={monthIndex >= options.length - 1}
            className="flex items-center justify-center w-9 h-9 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            aria-label="Previous month"
          >
            <FiChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => setMonthIndex((i) => Math.max(i - 1, 0))}
            disabled={monthIndex === 0}
            className="flex items-center justify-center w-9 h-9 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            aria-label="Next month"
          >
            <FiChevronRight className="w-4 h-4" />
          </button>
          <Button label="Today" variant="secondary" onClick={() => setMonthIndex(0)} disabled={monthIndex === 0} />
        </div>
      </div>

      {isLoading && (
        <div className="animate-pulse space-y-2">
          <div className="h-8 bg-gray-50 rounded-lg" />
          <div className="h-64 bg-gray-50 rounded-2xl" />
        </div>
      )}

      {!isLoading && error && <p className="text-sm text-red-500 text-center py-10">{error}</p>}

      {!isLoading && !error && stats && (
        <>
          <div className="rounded-2xl border border-gray-100 border-r-0 border-b-0 overflow-hidden">
            <div className="grid grid-cols-7 bg-gray-50">
              {WEEKDAY_LABELS.map((label) => (
                <div key={label} className="py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide border-t border-l border-gray-100 [&:nth-child(7n)]:border-r">
                  {label}
                </div>
              ))}
            </div>
            {weeks.map((week, i) => (
              <div key={i} className="grid grid-cols-7 border-b border-gray-100">
                {week.map((cell) => (
                  <DayCell key={cell.key} cell={cell} />
                ))}
              </div>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 mt-5">
            {STATUS_ORDER.map((status) => {
              const meta = STATUS_META[status];
              const Icon = meta.icon;
              return (
                <div key={status} className="flex items-center gap-1.5 text-xs text-gray-500">
                  <span className={`flex items-center justify-center w-5 h-5 rounded-full ${meta.pill}`}>
                    <Icon className="w-3 h-3" />
                  </span>
                  {meta.label}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
