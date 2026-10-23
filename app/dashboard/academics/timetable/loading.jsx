import { Fragment } from 'react';

// Mirrors TimeTableClient.jsx's actual layout (header + actions, a filter
// card with 4 fields, day tabs, then the Period × Day grid) — same bespoke-
// skeleton convention as app/dashboard/classes/loading.jsx, replacing the
// old generic PageLoader spinner shared across all of academics/*.
const DAY_COUNT = 6;
const PERIOD_COLS = 6;

export default function TimetableLoading() {
  return (
    <div className="space-y-5 animate-pulse">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="space-y-2">
          <div className="h-7 w-28 bg-gray-100 rounded" />
          <div className="h-4 w-72 bg-gray-100 rounded" />
        </div>
        <div className="h-10 w-40 bg-gray-100 rounded-lg" />
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-4">
        <div className="flex flex-wrap gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex-1 min-w-[160px] space-y-1.5">
              <div className="h-3 w-20 bg-gray-100 rounded" />
              <div className="h-10 bg-gray-50 rounded-full" />
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between gap-3">
        <div className="h-10 w-80 bg-gray-100 rounded-xl" />
        <div className="h-10 w-32 bg-gray-50 rounded-lg" />
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="grid" style={{ gridTemplateColumns: `110px repeat(${PERIOD_COLS}, minmax(0, 1fr))` }}>
          <div className="h-12 bg-gray-50 border-b border-r border-gray-100" />
          {Array.from({ length: PERIOD_COLS }).map((_, i) => (
            <div key={i} className="h-12 bg-gray-50 border-b border-gray-100 flex items-center justify-center">
              <div className="h-3 w-10 bg-gray-200 rounded" />
            </div>
          ))}
          {Array.from({ length: DAY_COUNT }).map((_, rowIndex) => (
            <Fragment key={rowIndex}>
              <div className="h-14 border-r border-gray-100 flex items-center px-3">
                <div className="h-3 w-14 bg-gray-100 rounded" />
              </div>
              {Array.from({ length: PERIOD_COLS }).map((_, colIndex) => (
                <div key={colIndex} className="p-1">
                  <div className="h-full min-h-[48px] bg-gray-50 rounded-lg" />
                </div>
              ))}
            </Fragment>
          ))}
        </div>
      </div>
    </div>
  );
}
