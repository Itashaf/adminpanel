// Mirrors DailyAttendanceBoard.jsx's real layout (filter row + roster panel
// with a narrower side panel) — same bespoke-skeleton convention as
// app/dashboard/classes/loading.jsx.
function RosterRowSkeleton() {
  return (
    <div className="flex items-center gap-3 px-6 py-3 border-t border-gray-100 animate-pulse">
      <div className="w-9 h-9 rounded-full bg-gray-100 shrink-0" />
      <div className="flex-1 space-y-1.5">
        <div className="h-3.5 w-32 bg-gray-100 rounded" />
        <div className="h-3 w-20 bg-gray-50 rounded" />
      </div>
      <div className="flex gap-1.5">
        <div className="h-8 w-8 rounded-lg bg-gray-100" />
        <div className="h-8 w-8 rounded-lg bg-gray-100" />
        <div className="h-8 w-8 rounded-lg bg-gray-100" />
      </div>
    </div>
  );
}

export default function DailyAttendanceLoading() {
  return (
    <div className="space-y-6">
      <div className="space-y-2 animate-pulse">
        <div className="h-7 w-48 bg-gray-100 rounded" />
        <div className="h-4 w-64 bg-gray-100 rounded" />
      </div>

      <div className="flex items-center gap-3 flex-wrap animate-pulse">
        <div className="h-10 w-40 bg-gray-100 rounded-full" />
        <div className="h-10 w-40 bg-gray-100 rounded-full" />
        <div className="h-10 w-40 bg-gray-100 rounded-full" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6 items-start">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 animate-pulse">
            <div className="h-4 w-40 bg-gray-100 rounded" />
            <div className="h-8 w-24 bg-gray-100 rounded-lg" />
          </div>
          {Array.from({ length: 6 }).map((_, i) => (
            <RosterRowSkeleton key={i} />
          ))}
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4 animate-pulse">
          <div className="h-4 w-24 bg-gray-100 rounded" />
          <div className="h-24 bg-gray-50 rounded-xl" />
          <div className="h-10 bg-gray-100 rounded-lg" />
        </div>
      </div>
    </div>
  );
}
