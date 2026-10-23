// Mirrors CalendarExplorer.jsx's actual layout (plain heading, filter bar
// with session/category dropdowns + Calendar/Agenda toggle, then a month
// grid + Upcoming Events sidebar) — same bespoke-skeleton convention as
// app/dashboard/classes/loading.jsx, replacing the old generic PageLoader
// spinner shared across all of academics/*.
export default function CalendarLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="space-y-2">
        <div className="h-7 w-48 bg-gray-100 rounded" />
        <div className="h-4 w-72 bg-gray-100 rounded" />
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-4 flex flex-wrap items-center gap-3">
        <div className="h-10 w-44 bg-gray-50 rounded-full" />
        <div className="h-10 w-52 bg-gray-50 rounded-full" />
        <div className="h-10 w-36 bg-gray-100 rounded-lg ml-auto" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-10 gap-6 items-start">
        <div className="lg:col-span-7 bg-white border border-gray-200 rounded-xl p-4">
          <div className="grid grid-cols-7 gap-2 mb-3">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="h-3 bg-gray-100 rounded mx-auto w-6" />
            ))}
          </div>
          <div className="grid grid-cols-7 gap-2">
            {Array.from({ length: 35 }).map((_, i) => (
              <div key={i} className="h-16 bg-gray-50 rounded-lg" />
            ))}
          </div>
        </div>

        <div className="lg:col-span-3 bg-white border border-gray-200 rounded-xl p-4 space-y-3">
          <div className="h-4 w-32 bg-gray-100 rounded mb-2" />
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-gray-200 shrink-0" />
              <div className="h-3 flex-1 bg-gray-100 rounded" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
