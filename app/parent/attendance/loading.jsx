// Mirrors app/parent/attendance/page.jsx + components/students/StudentAttendanceTab.jsx:
// page title, then the history card (header + summary chips, month picker
// row, 7-column calendar grid). Keep in sync with that card's shape.
export default function ParentAttendanceLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="space-y-2">
        <div className="h-7 w-40 bg-gray-100 rounded" />
        <div className="h-3.5 w-56 bg-gray-100 rounded" />
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sm:p-8">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
          <div className="flex items-center gap-4">
            <div className="w-11 h-11 rounded-2xl bg-gray-100 shrink-0" />
            <div className="space-y-2">
              <div className="h-4 w-44 bg-gray-100 rounded" />
              <div className="h-3 w-52 bg-gray-50 rounded" />
            </div>
          </div>
          <div className="flex flex-wrap gap-2.5">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-[60px] w-28 rounded-xl bg-gray-100" />
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="h-[42px] w-56 bg-gray-100 rounded-lg" />
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-gray-100" />
            <div className="w-9 h-9 rounded-lg bg-gray-100" />
            <div className="h-9 w-16 rounded-lg bg-gray-100" />
          </div>
        </div>

        <div className="rounded-2xl border border-gray-100 overflow-hidden">
          <div className="h-10 bg-gray-50" />
          {Array.from({ length: 5 }).map((_, row) => (
            <div key={row} className="grid grid-cols-7 border-t border-gray-100">
              {Array.from({ length: 7 }).map((_, col) => (
                <div key={col} className="flex flex-col items-center gap-1.5 py-3">
                  <div className="h-3 w-4 bg-gray-100 rounded" />
                  <div className="w-7 h-7 rounded-full bg-gray-50" />
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
