// Mirrors components/parent/ParentCalendarView.jsx: title + subtitle, month
// grid (7 of 10 columns) beside the upcoming-events sidebar, then the agenda
// list. On mobile the grid is collapsed behind a toggle, so only the toggle
// bar shows there.
export default function ParentCalendarLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="space-y-2">
        <div className="h-7 w-36 bg-gray-100 rounded" />
        <div className="h-3.5 w-72 max-w-full bg-gray-100 rounded" />
      </div>

      <div className="hidden md:grid grid-cols-1 lg:grid-cols-10 gap-6 items-start">
        <div className="lg:col-span-7 bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="h-6 w-40 bg-gray-100 rounded" />
            <div className="h-8 w-36 bg-gray-100 rounded-lg" />
          </div>
          <div className="grid grid-cols-7 gap-px">
            {Array.from({ length: 42 }).map((_, i) => (
              <div key={i} className="h-16 bg-gray-50 rounded" />
            ))}
          </div>
        </div>
        <div className="lg:col-span-3 bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
          <div className="h-4 w-32 bg-gray-100 rounded" />
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gray-100 shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-3.5 w-3/4 bg-gray-100 rounded" />
                <div className="h-3 w-1/2 bg-gray-50 rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="md:hidden h-12 bg-white rounded-xl border border-gray-100 shadow-sm" />

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex items-start gap-3 px-4 sm:px-5 py-4 border-b border-gray-100 last:border-b-0">
            <div className="mt-1.5 w-2 h-2 rounded-full bg-gray-100 shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-3.5 w-48 bg-gray-100 rounded" />
              <div className="h-3 w-2/3 bg-gray-50 rounded" />
            </div>
            <div className="hidden sm:block h-3 w-24 bg-gray-100 rounded shrink-0" />
          </div>
        ))}
      </div>
    </div>
  );
}
