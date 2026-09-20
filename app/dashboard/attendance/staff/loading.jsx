// Mirrors StaffAttendanceBoard.jsx's real layout (header + date/action row,
// 4 stat cards, search+filter toolbar, table) — same bespoke-skeleton
// convention as app/dashboard/attendance/daily/loading.jsx.
function StatCardSkeleton() {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="w-11 h-11 rounded-xl bg-gray-100" />
        <div className="h-8 w-16 bg-gray-50 rounded" />
      </div>
      <div className="h-3.5 w-16 bg-gray-100 rounded mt-3" />
      <div className="h-7 w-10 bg-gray-100 rounded mt-2" />
    </div>
  );
}

function TableRowSkeleton() {
  return (
    <div className="flex items-center gap-4 px-6 py-3 border-t border-gray-100 animate-pulse">
      <div className="h-3 w-4 bg-gray-100 rounded shrink-0" />
      <div className="flex items-center gap-2.5 flex-1 min-w-0">
        <div className="w-8 h-8 rounded-full bg-gray-100 shrink-0" />
        <div className="h-3.5 w-28 bg-gray-100 rounded" />
      </div>
      <div className="h-3.5 w-20 bg-gray-50 rounded shrink-0" />
      <div className="h-3.5 w-24 bg-gray-50 rounded shrink-0" />
      <div className="h-6 w-16 bg-gray-100 rounded-full shrink-0" />
      <div className="h-3.5 w-10 bg-gray-50 rounded shrink-0" />
      <div className="flex gap-1.5 shrink-0">
        <div className="h-8 w-8 rounded-full bg-gray-100" />
        <div className="h-8 w-8 rounded-full bg-gray-100" />
        <div className="h-8 w-8 rounded-full bg-gray-100" />
      </div>
    </div>
  );
}

export default function StaffAttendanceLoading() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="space-y-2 animate-pulse">
          <div className="h-7 w-48 bg-gray-100 rounded" />
          <div className="h-4 w-72 bg-gray-100 rounded" />
        </div>
        <div className="flex items-center gap-2 animate-pulse">
          <div className="h-11 w-44 bg-gray-100 rounded-full" />
          <div className="h-11 w-40 bg-gray-100 rounded-lg" />
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <StatCardSkeleton key={i} />
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-3 animate-pulse">
        <div className="h-11 flex-1 min-w-[220px] bg-gray-100 rounded-full" />
        <div className="h-11 w-40 bg-gray-100 rounded-full" />
        <div className="h-11 w-44 bg-gray-100 rounded-full" />
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-3 border-b border-gray-100 animate-pulse">
          <div className="h-3 w-full bg-gray-50 rounded" />
        </div>
        {Array.from({ length: 7 }).map((_, i) => (
          <TableRowSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}
