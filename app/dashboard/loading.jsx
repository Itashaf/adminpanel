// Mirrors app/dashboard/page.jsx's actual current layout (plain greeting
// heading, 4 KPI cards, 5 Quick Action pills, Fee/Attendance charts row,
// Fee Defaulters/Upcoming Exams row) — same bespoke-skeleton convention as
// app/dashboard/classes/loading.jsx, homework/loading.jsx, etc., rather
// than the generic PageLoader spinner (see components/PageLoader.jsx for
// when that's the better fit instead). Kept in sync whenever page.jsx's
// own card count/shape changes, so the shimmer never reflows once the
// real content swaps in.
function KPICardSkeleton() {
  return (
    <div className="rounded-xl shadow-sm p-5 bg-gray-200 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="h-3 w-20 bg-gray-300/70 rounded" />
        <div className="w-9 h-9 rounded-xl bg-gray-300/70" />
      </div>
      <div className="h-8 w-20 bg-gray-300/70 rounded mt-3" />
    </div>
  );
}

function QuickActionSkeleton() {
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-white border border-gray-100 shadow-sm px-4 py-3 animate-pulse">
      <div className="w-9 h-9 rounded-full bg-gray-100 shrink-0" />
      <div className="h-3.5 flex-1 bg-gray-100 rounded" />
    </div>
  );
}

function ChartCardSkeleton() {
  return (
    <div className="bg-white rounded-[24px] border border-gray-100 shadow-sm p-6 animate-pulse">
      <div className="flex items-center justify-between mb-5">
        <div className="h-4 w-36 bg-gray-100 rounded" />
        <div className="h-7 w-32 bg-gray-100 rounded-full" />
      </div>
      <div className="h-56 bg-gray-50 rounded-xl" />
    </div>
  );
}

function ListCardSkeleton() {
  return (
    <div className="bg-white rounded-[24px] border border-gray-100 shadow-sm p-6 animate-pulse">
      <div className="flex items-center justify-between mb-5">
        <div className="h-4 w-36 bg-gray-100 rounded" />
        <div className="h-3 w-20 bg-gray-100 rounded" />
      </div>
      <div className="space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center justify-between gap-3">
            <div className="space-y-1.5 flex-1">
              <div className="h-3.5 w-32 bg-gray-100 rounded" />
              <div className="h-2.5 w-20 bg-gray-50 rounded" />
            </div>
            <div className="h-3.5 w-16 bg-gray-100 rounded shrink-0" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function DashboardLoading() {
  return (
    <div className="space-y-6">
      <div className="h-8 w-64 bg-gray-100 rounded animate-pulse" />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <KPICardSkeleton key={i} />
        ))}
      </div>

      <div className="grid grid-cols-5 gap-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <QuickActionSkeleton key={i} />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCardSkeleton />
        <ChartCardSkeleton />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ListCardSkeleton />
        <ListCardSkeleton />
      </div>
    </div>
  );
}
